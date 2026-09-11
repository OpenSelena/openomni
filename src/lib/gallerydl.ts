import {spawn, type ChildProcess} from 'node:child_process'
import {createWriteStream} from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {Readable} from 'node:stream'
import {pipeline} from 'node:stream/promises'

const OPEN_OMNI_DIR = path.join(os.homedir(), '.open-omni', 'bin')
const CODEBERG_RELEASE_API = 'https://codeberg.org/api/v1/repos/mikf/gallery-dl/releases/latest'
export const CODEBERG_MASTER_ARCHIVE = 'https://codeberg.org/mikf/gallery-dl/archive/master.tar.gz'

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

export function parseGalleryDlOutput(rawJson: string): GalleryDlItem[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawJson.trim())
  } catch (err) {
    throw new Error(`failed to parse gallery-dl json: ${err instanceof Error ? err.message : String(err)}`)
  }

  const items: GalleryDlItem[] = []
  let abortError: string | undefined

  if (Array.isArray(parsed)) {
    let index = 1
    for (const entry of parsed) {
      if (Array.isArray(entry) && entry.length >= 2) {
        const itemType = entry[0]
        const mediaUrl = entry[1]
        const meta = (entry[2] && typeof entry[2] === 'object' ? entry[2] : {}) as Record<string, unknown>

        // Detect AbortExtraction or error tuples: [-1, {"error": "AbortExtraction", "message": "..."}]
        if (itemType === -1 && typeof entry[1] === 'object' && entry[1] !== null) {
          const errObj = entry[1] as Record<string, unknown>
          const errMsg = typeof errObj.message === 'string'
            ? errObj.message
            : String(errObj.error || 'extraction aborted')
          abortError = errMsg
          continue
        }

        if (typeof mediaUrl === 'string' && mediaUrl.startsWith('http')) {
          const rawExt = (typeof meta.extension === 'string' ? meta.extension : '') || ''
          const rawFilename = (typeof meta.filename === 'string' ? meta.filename : '') || ''
          const ext = normalizeExtension(rawExt, rawFilename, mediaUrl)
          const kind: 'photo' | 'video' = isVideoExtension(ext) ? 'video' : 'photo'
          const title = (typeof meta.title === 'string' ? meta.title : undefined) ||
            (typeof meta.content === 'string' ? meta.content : undefined) ||
            (typeof meta.description === 'string' ? meta.description : undefined)
          const uploader = typeof meta.uploader === 'string' ? meta.uploader :
            (typeof meta.author === 'object' && meta.author !== null && 'nick' in meta.author ? String(meta.author.nick) : undefined)

          items.push({
            url: mediaUrl,
            filename: rawFilename || `item_${index}.${ext}`,
            ext,
            kind,
            title,
            uploader,
            width: typeof meta.width === 'number' ? meta.width : undefined,
            height: typeof meta.height === 'number' ? meta.height : undefined,
            index,
          })
          index++
        }
      } else if (entry && typeof entry === 'object' && 'url' in entry && typeof entry.url === 'string') {
        const obj = entry as Record<string, unknown>
        const mediaUrl = String(obj.url)
        const rawExt = typeof obj.extension === 'string' ? obj.extension : ''
        const rawFilename = typeof obj.filename === 'string' ? obj.filename : ''
        const ext = normalizeExtension(rawExt, rawFilename, mediaUrl)
        const kind: 'photo' | 'video' = isVideoExtension(ext) ? 'video' : 'photo'

        items.push({
          url: mediaUrl,
          filename: rawFilename || `item_${index}.${ext}`,
          ext,
          kind,
          title: typeof obj.title === 'string' ? obj.title : undefined,
          uploader: typeof obj.uploader === 'string' ? obj.uploader : undefined,
          width: typeof obj.width === 'number' ? obj.width : undefined,
          height: typeof obj.height === 'number' ? obj.height : undefined,
          index,
        })
        index++
      }
    }
  }

  if (items.length === 0) {
    if (abortError) {
      throw new Error(`gallery-dl extraction aborted: ${abortError}`)
    }
    throw new Error('no media entries found in gallery-dl output')
  }

  return items
}

function commandWorks(command: string, args: string[]): Promise<boolean> {
  return new Promise(resolve => {
    let child: ChildProcess
    try {
      child = spawn(command, args, {stdio: 'ignore'})
    } catch {
      resolve(false)
      return
    }
    child.on('error', () => resolve(false))
    child.on('close', code => resolve(code === 0))
  })
}

export function isGalleryDlUpToDateMessage(output: string): boolean {
  return /up-to-date|already up to date|latest version is already installed/i.test(output)
}

export function isGalleryDlPackageManaged(output: string): boolean {
  return /pip|homebrew|apt|pacman|dnf|package manager/i.test(output)
}

export async function getGalleryDlVersion(binaryPath: string): Promise<string | undefined> {
  return new Promise(resolve => {
    let child: ChildProcess
    let out = ''
    try {
      child = spawn(binaryPath, ['--version'])
    } catch {
      resolve(undefined)
      return
    }
    child.stdout?.on('data', (d: Buffer) => {
      out += d.toString()
    })
    child.on('error', () => resolve(undefined))
    child.on('close', code => {
      if (code === 0 && out.trim()) {
        resolve(out.trim())
      } else {
        resolve(undefined)
      }
    })
  })
}

export async function getGalleryDlDownloadUrls(
  assetName: string,
  fetchFn: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<string[]> {
  const urls: string[] = []

  // Try Codeberg API for latest release assets (primary development and release repository)
  try {
    const res = await fetchFn(CODEBERG_RELEASE_API, {
      signal,
      headers: {'User-Agent': 'open-omni'},
    })
    if (res.ok) {
      const data = (await res.json()) as {
        tag_name?: string
        assets?: Array<{
          name?: string
          download_url?: string
          browser_download_url?: string
        }>
      }
      const asset = data.assets?.find(a => a.name === assetName)
      const downloadUrl = asset?.browser_download_url || asset?.download_url
      if (downloadUrl) {
        urls.push(downloadUrl)
      } else if (data.tag_name) {
        urls.push(`https://codeberg.org/mikf/gallery-dl/releases/download/${data.tag_name}/${assetName}`)
      }
    }
  } catch {
    // ignore Codeberg API errors and return whatever URLs were resolved
  }

  return urls
}

export async function downloadLatestGalleryDl(
  targetDir = OPEN_OMNI_DIR,
  signal?: AbortSignal,
  onStatus?: (msg: string) => void,
): Promise<string> {
  if (process.platform === 'darwin') {
    throw new Error(
      "Standalone gallery-dl binary is not distributed for macOS. Please install it via Homebrew: 'brew install gallery-dl'",
    )
  }
  await fs.mkdir(targetDir, {recursive: true})
  const binaryName = process.platform === 'win32' ? 'gallery-dl.exe' : 'gallery-dl'
  const local = path.join(targetDir, binaryName)
  const assetName = galleryDlAssetName()

  const candidateUrls = await getGalleryDlDownloadUrls(assetName, fetch, signal)
  let response: Response | undefined
  let lastError: Error | undefined

  for (const candidateUrl of candidateUrls) {
    try {
      if (onStatus) {
        onStatus('fetching gallery-dl from Codeberg…')
      }
      const res = await fetch(candidateUrl, {signal})
      if (res.ok && res.body) {
        response = res
        break
      }
      lastError = new Error(`HTTP ${res.status}`)
    } catch (err) {
      if (signal?.aborted) throw err
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  if (!response || !response.body) {
    throw new Error(
      `Could not download gallery-dl from Codeberg (${lastError?.message || 'unknown error'}). Check your connection and try again.`,
    )
  }

  const tmp = `${local}.download`
  await pipeline(Readable.fromWeb(response.body as never), createWriteStream(tmp), {signal})
  await fs.chmod(tmp, 0o755)
  await fs.rename(tmp, local)
  return local
}

export type GalleryDlUpdateResult = {
  previousVersion?: string
  currentVersion: string
  updated: boolean
}

async function installGalleryDlStandalone(
  previousVersion: string | undefined,
  signal?: AbortSignal,
  onStatus?: (msg: string) => void,
): Promise<GalleryDlUpdateResult> {
  const downloadedPath = await downloadLatestGalleryDl(OPEN_OMNI_DIR, signal, onStatus)
  const currentVersion = (await getGalleryDlVersion(downloadedPath)) ?? 'unknown'
  return {
    previousVersion,
    currentVersion,
    updated: true,
  }
}

export async function updateGalleryDl(options?: {
  force?: boolean
  onStatus?: (msg: string) => void
  signal?: AbortSignal
}): Promise<GalleryDlUpdateResult> {
  const onStatus = options?.onStatus ?? (() => {})
  const signal = options?.signal

  if (options?.force) {
    if (process.platform === 'darwin') {
      throw new Error(
        "Standalone gallery-dl binary is not distributed for macOS. Please upgrade it via Homebrew: 'brew upgrade gallery-dl'",
      )
    }
    onStatus('downloading fresh standalone gallery-dl from Codeberg…')
    return await installGalleryDlStandalone(undefined, signal, onStatus)
  }

  const binary = await ensureGalleryDl(onStatus, signal)
  const previousVersion = await getGalleryDlVersion(binary)
  onStatus(`checking for gallery-dl updates (current: ${previousVersion ?? 'unknown'})…`)

  const nativeResult = await new Promise<{code: number | null; output: string}>(resolve => {
    let child: ChildProcess
    let combined = ''
    try {
      child = spawn(binary, ['--update'], {signal})
    } catch (e) {
      resolve({code: -1, output: String(e)})
      return
    }
    child.stdout?.on('data', (d: Buffer) => {
      combined += d.toString()
    })
    child.stderr?.on('data', (d: Buffer) => {
      combined += d.toString()
    })
    child.on('error', err => resolve({code: -1, output: err.message}))
    child.on('close', code => resolve({code, output: combined}))
  })

  if (nativeResult.code !== 0 || isGalleryDlPackageManaged(nativeResult.output)) {
    if (process.platform === 'darwin') {
      throw new Error(
        "System gallery-dl cannot self-update. On macOS, please upgrade via Homebrew: 'brew upgrade gallery-dl'",
      )
    }
    onStatus(`system binary cannot self-update; downloading standalone release into ${OPEN_OMNI_DIR}…`)
    return await installGalleryDlStandalone(previousVersion, signal, onStatus)
  }

  const currentVersion = (await getGalleryDlVersion(binary)) ?? previousVersion ?? 'unknown'
  const isUpToDate = isGalleryDlUpToDateMessage(nativeResult.output)
  const updated = previousVersion ? currentVersion !== previousVersion : !isUpToDate

  return {
    previousVersion,
    currentVersion,
    updated,
  }
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
  return downloadLatestGalleryDl(path.dirname(local), signal, onStatus)
}

export async function probeGalleryDl(
  gallerydl: string,
  url: string,
  signal?: AbortSignal,
  cookieFile?: string,
): Promise<GalleryDlItem[]> {
  return new Promise((resolve, reject) => {
    let child: ChildProcess
    let stdout = ''
    let stderr = ''

    const args = ['-j', '--no-part']
    if (cookieFile) {
      args.push('--cookies', cookieFile)
    }
    args.push(url)

    try {
      child = spawn(
        gallerydl,
        args,
        {signal},
      )
    } catch (err) {
      reject(new Error(`failed to spawn gallery-dl: ${err instanceof Error ? err.message : String(err)}`))
      return
    }

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })

    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    child.on('error', err => {
      reject(err)
    })

    child.on('close', code => {
      if (code !== 0) {
        const errorMsg = stderr.trim() || stdout.trim() || `gallery-dl exited with code ${code}`
        reject(new Error(errorMsg))
        return
      }

      try {
        const items = parseGalleryDlOutput(stdout)
        resolve(items)
      } catch (err) {
        reject(err)
      }
    })
  })
}

export type PhotoDownloadProgress = {
  downloadedBytes: number
  totalBytes?: number
  speed?: number
  eta?: number
  part: number
  totalParts: number
}

export async function downloadPhotoItem(options: {
  onProgress?: (progress: PhotoDownloadProgress) => void
  gallerydl: string
  url: string
  destDir: string
  filename?: string
  signal?: AbortSignal
  cookieFile?: string
}): Promise<string> {
  const {gallerydl, url, destDir, filename, signal, cookieFile} = options
  await fs.mkdir(destDir, {recursive: true})

  return new Promise((resolve, reject) => {
    const args: string[] = [
      '-D',
      destDir,
      '--no-part',
    ]

    if (cookieFile) {
      args.push('--cookies', cookieFile)
    }

    if (filename) {
      args.push('-f', filename)
    }

    args.push(url)

    let child: ChildProcess
    let stderr = ''

    try {
      child = spawn(gallerydl, args, {signal})
    } catch (err) {
      reject(new Error(`failed to spawn gallery-dl for download: ${err instanceof Error ? err.message : String(err)}`))
      return
    }

    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    child.on('error', err => {
      reject(err)
    })

    child.on('close', code => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `gallery-dl download exited with code ${code}`))
        return
      }

      if (filename) {
        resolve(path.join(destDir, filename))
      } else {
        resolve(destDir)
      }
    })
  })
}
