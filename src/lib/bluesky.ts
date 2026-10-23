import {createWriteStream} from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import {Readable} from 'node:stream'
import {pipeline} from 'node:stream/promises'
import {spawn} from 'node:child_process'

const BLUESKY_HOSTS = new Set([
  'bsky.app',
  'www.bsky.app',
  'main.bsky.app',
])

export const BLUESKY_PUBLIC_API = 'https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread'

export interface BlueskyMediaItem {
  url: string
  kind: 'video' | 'photo'
  ext: string
  width?: number
  height?: number
  alt?: string
}

export interface BlueskyMediaResult {
  rkey: string
  author: string
  handle: string
  title: string
  caption: string
  items: BlueskyMediaItem[]
}

/**
 * Checks if a given URL belongs to Bluesky.
 */
export function isBlueskyUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false
  const trimmed = rawUrl.trim()
  if (trimmed.startsWith('at://')) {
    return trimmed.includes('/app.bsky.feed.post/')
  }
  try {
    const parsed = new URL(trimmed)
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '')
    return BLUESKY_HOSTS.has(host) || host === 'bsky.app'
  } catch {
    return false
  }
}

/**
 * Checks if a URL points to Bluesky's CDN (images or video streams).
 */
export function isBlueskyCdnUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false
  try {
    const parsed = new URL(rawUrl.trim())
    const host = parsed.hostname.toLowerCase()
    return host.includes('bsky.app') || host.includes('bsky.network')
  } catch {
    return false
  }
}

/**
 * Extracts handle/DID and post record key (rkey) from a Bluesky URL.
 */
export function extractBlueskyPostInfo(rawUrl: string): {handleOrDid: string; rkey: string} | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null
  const trimmed = rawUrl.trim()

  // Handle at:// format
  if (trimmed.startsWith('at://')) {
    const match = /^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([^/?#]+)/i.exec(trimmed)
    if (match && match[1] && match[2]) {
      return {handleOrDid: match[1], rkey: match[2]}
    }
    return null
  }

  // Handle web URL format: https://bsky.app/profile/{handleOrDid}/post/{rkey}
  try {
    const parsed = new URL(trimmed)
    const segments = parsed.pathname.split('/').filter(Boolean)
    const profileIdx = segments.findIndex(s => s.toLowerCase() === 'profile')
    const postIdx = segments.findIndex(s => s.toLowerCase() === 'post')

    if (profileIdx !== -1 && postIdx !== -1 && postIdx === profileIdx + 2) {
      const handleOrDid = segments[profileIdx + 1]
      const rkey = segments[postIdx + 1]
      if (handleOrDid && rkey) {
        return {handleOrDid, rkey}
      }
    }
  } catch {}

  return null
}

/**
 * Builds the AT Protocol URI for a post.
 */
export function buildBlueskyAtUri(handleOrDid: string, rkey: string): string {
  return `at://${handleOrDid}/app.bsky.feed.post/${rkey}`
}

/**
 * Builds the public AppView API query URL for a post thread.
 */
export function buildBlueskyApiUrl(handleOrDid: string, rkey: string): string {
  const atUri = buildBlueskyAtUri(handleOrDid, rkey)
  const params = new URLSearchParams({uri: atUri, depth: '0'})
  return `${BLUESKY_PUBLIC_API}?${params.toString()}`
}

function parseImageExtension(url: string): string {
  if (url.includes('@png')) return 'png'
  if (url.includes('@webp')) return 'webp'
  if (url.includes('@gif')) return 'gif'
  return 'jpg'
}

/**
 * Parses raw JSON from the Bluesky getPostThread endpoint into media items.
 */
export function parseBlueskyThread(data: unknown, rkey: string): BlueskyMediaResult {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid Bluesky API response: expected JSON object')
  }

  const thread = (data as {thread?: Record<string, unknown>}).thread
  if (!thread || typeof thread !== 'object') {
    throw new Error('Bluesky thread not found or post has been deleted')
  }

  if (thread.$type === 'app.bsky.feed.defs#notFoundPost') {
    throw new Error('Bluesky post not found')
  }
  if (thread.$type === 'app.bsky.feed.defs#blockedPost') {
    throw new Error('Bluesky post is blocked or author account is suspended')
  }

  const post = (thread.post || thread) as Record<string, unknown>
  const authorObj = (post.author || {}) as Record<string, unknown>
  const handle = String(authorObj.handle || 'unknown')
  const author = String(authorObj.displayName || authorObj.handle || 'Bluesky User')

  const recordObj = (post.record || {}) as Record<string, unknown>
  const caption = String(recordObj.text || '').trim()
  const title = caption ? (caption.length > 60 ? caption.slice(0, 60) : caption) : `Post by @${handle}`

  const items: BlueskyMediaItem[] = []

  function inspectEmbed(embed: unknown): void {
    if (!embed || typeof embed !== 'object') return
    const embedObj = embed as Record<string, unknown>
    const type = String(embedObj.$type || '')

    // Case 1: Direct images
    if (type.includes('app.bsky.embed.images') && Array.isArray(embedObj.images)) {
      for (const img of embedObj.images as Array<Record<string, unknown>>) {
        const fullsize = String(img.fullsize || img.thumb || '')
        if (fullsize) {
          const aspect = (img.aspectRatio || {}) as Record<string, number | undefined>
          items.push({
            url: fullsize,
            kind: 'photo',
            ext: parseImageExtension(fullsize),
            width: aspect.width,
            height: aspect.height,
            alt: typeof img.alt === 'string' ? img.alt : undefined,
          })
        }
      }
    }

    // Case 2: Direct video
    if (type.includes('app.bsky.embed.video')) {
      const playlist = String(embedObj.playlist || '')
      if (playlist) {
        const aspect = (embedObj.aspectRatio || {}) as Record<string, number | undefined>
        items.push({
          url: playlist,
          kind: 'video',
          ext: 'mp4',
          width: aspect.width,
          height: aspect.height,
        })
      }
    }

    // Case 3: Record with media (quoted post with media)
    if (type.includes('app.bsky.embed.recordWithMedia') && embedObj.media) {
      inspectEmbed(embedObj.media)
    }

    // Case 4: External link with preview image
    if (type.includes('app.bsky.embed.external')) {
      const extObj = (embedObj.external || {}) as Record<string, unknown>
      const thumb = String(extObj.thumb || '')
      if (thumb && items.length === 0) {
        items.push({
          url: thumb,
          kind: 'photo',
          ext: parseImageExtension(thumb),
        })
      }
    }
  }

  inspectEmbed(post.embed)

  if (items.length === 0) {
    throw new Error('No downloadable media (images or videos) found in Bluesky post')
  }

  return {
    rkey,
    author,
    handle,
    title,
    caption,
    items,
  }
}

/**
 * Resolves media items from a Bluesky post URL via the unauthenticated public AppView API.
 */
export async function resolveBlueskyMedia(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<BlueskyMediaResult> {
  const info = extractBlueskyPostInfo(url)
  if (!info) {
    throw new Error(`Could not extract Bluesky post information from URL: ${url}`)
  }

  const apiUrl = buildBlueskyApiUrl(info.handleOrDid, info.rkey)
  const response = await fetchImpl(apiUrl, {
    headers: {
      'User-Agent': 'OpenOmni-Media-Resolver/1.5',
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Bluesky public API request failed: HTTP ${response.status} ${response.statusText || ''}`.trim())
  }

  const data: unknown = await response.json()
  return parseBlueskyThread(data, info.rkey)
}

/**
 * Downloads a single media item from Bluesky.
 * Uses native Node HTTP stream for photos, and ffmpeg/yt-dlp or direct stream for video.
 */
export async function downloadBlueskyItem(
  item: BlueskyMediaItem,
  outputPath: string,
  onProgress?: (downloadedBytes: number, totalBytes?: number) => void,
  fetchImpl: typeof fetch = fetch,
  ffmpegLocation?: string,
): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), {recursive: true})

  // Video download handling (HLS playlist stream)
  if (item.kind === 'video' && item.url.includes('.m3u8')) {
    if (ffmpegLocation) {
      return new Promise<void>((resolve, reject) => {
        const child = spawn(
          ffmpegLocation,
          ['-y', '-i', item.url, '-c', 'copy', '-bsf:a', 'aac_adtstoasc', outputPath],
          {stdio: 'ignore'},
        )
        child.on('error', reject)
        child.on('close', code => {
          if (code === 0) resolve()
          else reject(new Error(`ffmpeg failed to convert Bluesky video stream (exit code ${code})`))
        })
      })
    }
  }

  // Native HTTP stream download for photos and direct media
  const response = await fetchImpl(item.url, {
    headers: {
      'User-Agent': 'OpenOmni-Media-Resolver/1.5',
    },
  })

  if (!response.ok || !response.body) {
    throw new Error(`Failed to download Bluesky media: HTTP ${response.status}`)
  }

  const contentLengthHeader = response.headers.get('content-length')
  const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : undefined
  let receivedBytes = 0

  const nodeStream = Readable.fromWeb(response.body as never)
  nodeStream.on('data', (chunk: Buffer) => {
    receivedBytes += chunk.length
    onProgress?.(receivedBytes, totalBytes)
  })

  const fileStream = createWriteStream(outputPath)
  await pipeline(nodeStream, fileStream)
}
