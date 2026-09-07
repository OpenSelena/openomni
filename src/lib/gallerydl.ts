import {spawn, type ChildProcess} from 'node:child_process'
import {createWriteStream} from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {Readable} from 'node:stream'
import {pipeline} from 'node:stream/promises'

const OPEN_OMNI_DIR = path.join(os.homedir(), '.open-omni', 'bin')
const GITHUB_RELEASE_BASE = 'https://github.com/mikf/gallery-dl/releases/latest/download'

export const PHOTO_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'avif',
  'bmp',
  'tiff',
])

export const VIDEO_EXTENSIONS = new Set([
  'mp4',
  'webm',
  'mov',
  'mkv',
  'm4v',
  'ts',
])

export function isPhotoExtension(ext: string): boolean {
  const clean = ext.replace(/^\./, '').toLowerCase().trim()
  return PHOTO_EXTENSIONS.has(clean)
}

export function isVideoExtension(ext: string): boolean {
  const clean = ext.replace(/^\./, '').toLowerCase().trim()
  return VIDEO_EXTENSIONS.has(clean)
}

export function galleryDlAssetName(): string {
  return process.platform === 'win32' ? 'gallery-dl.exe' : 'gallery-dl.bin'
}

export function resolveGalleryDlPath(env: NodeJS.ProcessEnv = process.env): string {
  const binaryName = process.platform === 'win32' ? 'gallery-dl.exe' : 'gallery-dl'
  const targetDir = env.OPEN_OMNI_DIR || OPEN_OMNI_DIR
  return path.join(targetDir, binaryName)
}

export type GalleryDlItem = {
  url: string
  filename: string
  ext: string
  kind: 'photo' | 'video'
  title?: string
  uploader?: string
  width?: number
  height?: number
  index: number
}

function normalizeExtension(ext?: string, filename?: string, url?: string): string {
  if (ext) return ext.replace(/^\./, '').toLowerCase().trim()
  const candidate = filename || url || ''
  const match = /\.([a-zA-Z0-9]+)(?:[?#:]|$)/.exec(candidate)
  return match ? match[1].toLowerCase() : 'jpg'
}

export function parseGalleryDlOutput(raw: string): GalleryDlItem[] {
  let parsed: unknown
  try {
    const trimmed = raw.trim()
    if (!trimmed) {
      throw new Error('Empty output')
    }
    parsed = JSON.parse(trimmed)
  } catch (error) {
    throw new Error(`Failed to parse gallery-dl JSON output: ${error instanceof Error ? error.message : String(error)}`)
  }

  const rawEntries: unknown[] = Array.isArray(parsed)
    ? parsed
    : typeof parsed === 'object' && parsed !== null
      ? [parsed]
      : []

  if (rawEntries.length === 0) {
    throw new Error('No media entries found in gallery-dl output')
  }

  const items: GalleryDlItem[] = []
  let index = 1

  for (const entry of rawEntries) {
    let url = ''
    let filename = ''
    let ext = ''
    let title: string | undefined
    let uploader: string | undefined
    let width: number | undefined
    let height: number | undefined

    if (Array.isArray(entry)) {
      // Tuple format: [type_id, url, metadata]
      const [typeId, entryUrl, meta] = entry
      if (typeof entryUrl === 'string') {
        url = entryUrl
      }
      if (meta && typeof meta === 'object') {
        const m = meta as Record<string, unknown>
        filename = typeof m.filename === 'string' ? m.filename : ''
        ext = typeof m.extension === 'string' ? m.extension : ''
        if (typeof m.content === 'string' && m.content.trim()) {
          title = m.content.trim()
        } else if (typeof m.title === 'string' && m.title.trim()) {
          title = m.title.trim()
        }

        if (m.author && typeof m.author === 'object') {
          const authorObj = m.author as Record<string, unknown>
          uploader = typeof authorObj.name === 'string' && authorObj.name ? authorObj.name : typeof authorObj.nick === 'string' ? authorObj.nick : undefined
        } else if (typeof m.uploader === 'string') {
          uploader = m.uploader
        }

        if (typeof m.width === 'number') width = m.width
        if (typeof m.height === 'number') height = m.height
      }
    } else if (entry && typeof entry === 'object') {
      const obj = entry as Record<string, unknown>
      url = typeof obj.url === 'string' ? obj.url : ''
      filename = typeof obj.filename === 'string' ? obj.filename : ''
      ext = typeof obj.extension === 'string' ? obj.extension : ''
      title = typeof obj.title === 'string' ? obj.title : undefined
      uploader = typeof obj.uploader === 'string' ? obj.uploader : undefined
      if (typeof obj.width === 'number') width = obj.width
      if (typeof obj.height === 'number') height = obj.height
    }

    if (!url) continue

    const finalExt = normalizeExtension(ext, filename, url)
    const kind: 'photo' | 'video' = isVideoExtension(finalExt) ? 'video' : 'photo'
    const finalFilename = filename || path.basename(new URL(url).pathname) || `item_${index}.${finalExt}`

    items.push({
      url,
      filename: finalFilename,
      ext: finalExt,
      kind,
      title,
      uploader,
      width,
      height,
      index: index++,
    })
  }

  if (items.length === 0) {
    throw new Error('No media entries found in gallery-dl output')
  }

  return items
}

async function commandWorks(cmd: string, args: string[]): Promise<boolean> {
  return new Promise(resolve => {
    try {
      const p = spawn(cmd, args, {stdio: 'ignore'})
      p.on('error', () => resolve(false))
      p.on('close', code => resolve(code === 0))
    } catch {
      resolve(false)
    }
  })
}

export async function downloadLatestGalleryDl(targetDir = OPEN_OMNI_DIR, signal?: AbortSignal): Promise<string> {
  if (process.platform === 'darwin') {
    throw new Error(
      "Standalone gallery-dl binary is not distributed for macOS. Please install it via Homebrew: 'brew install gallery-dl'",
    )
  }
  await fs.mkdir(targetDir, {recursive: true})
  const binaryName = process.platform === 'win32' ? 'gallery-dl.exe' : 'gallery-dl'
  const local = path.join(targetDir, binaryName)
  const assetName = galleryDlAssetName()
  const downloadUrl = `${GITHUB_RELEASE_BASE}/${assetName}`

  const response = await fetch(downloadUrl, {signal})
  if (!response.ok || !response.body) {
    throw new Error(`Could not download gallery-dl (${response.status}). Check your connection and try again.`)
  }

  const tmp = `${local}.download`
  await pipeline(Readable.fromWeb(response.body as never), createWriteStream(tmp), {signal})
  await fs.chmod(tmp, 0o755)
  await fs.rename(tmp, local)
  return local
}

export async function ensureGalleryDl(
  onStatus?: (status: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (await commandWorks('gallery-dl', ['--version'])) {
    return 'gallery-dl'
  }

  const local = resolveGalleryDlPath()
  if (await commandWorks(local, ['--version'])) {
    return local
  }

  onStatus?.('Setting up gallery-dl for image downloads...')
  return downloadLatestGalleryDl(path.dirname(local), signal)
}

export async function probeGalleryDl(
  gallerydl: string,
  url: string,
  signal?: AbortSignal,
): Promise<GalleryDlItem[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(gallerydl, ['-j', '--no-part', url], {signal})
    let out = ''
    let err = ''
    child.stdout.on('data', chunk => (out += chunk))
    child.stderr.on('data', chunk => (err += chunk))
    child.on('error', reject)
    child.on('close', code => {
      if (code !== 0) {
        reject(new Error(err.trim() || `gallery-dl exited with code ${code}`))
      } else {
        try {
          resolve(parseGalleryDlOutput(out))
        } catch (e) {
          reject(e)
        }
      }
    })
  })
}

export type PhotoDownloadProgress = {
  percent?: number
  downloadedBytes: number
  totalBytes?: number
  speed?: number
  eta?: number
  part: number
  totalParts: number
}

export type DownloadPhotoOptions = {
  url: string
  destDir: string
  filename: string
  gallerydl?: string
  signal?: AbortSignal
  onProgress?: (progress: PhotoDownloadProgress) => void
}

export async function downloadPhotoItem({
  url,
  destDir,
  filename,
  gallerydl,
  signal,
  onProgress,
}: DownloadPhotoOptions): Promise<string> {
  await fs.mkdir(destDir, {recursive: true})
  const destPath = path.join(destDir, filename)

  const bin = gallerydl || (await ensureGalleryDl(undefined, signal))
  return new Promise<string>((resolve, reject) => {
    const child = spawn(bin, ['-D', destDir, '-f', filename, '--no-part', url], {signal})
    let stderr = ''
    child.stderr.on('data', chunk => (stderr += chunk))
    child.on('error', reject)
    child.on('close', code => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `gallery-dl exited with code ${code}`))
      } else {
        onProgress?.({
          percent: 100,
          downloadedBytes: 0,
          part: 0,
          totalParts: 1,
        })
        resolve(destPath)
      }
    })
  })
}
