import path from 'node:path'
import {
  ensureGalleryDl,
  probeGalleryDl,
  downloadPhotoItem,
  type GalleryDlItem,
  type PhotoDownloadProgress,
} from './gallerydl.js'
import {
  download,
  probe,
  type DownloadChoice,
  type DownloadProgress,
  type ProbeResult,
  type SubtitleOptions,
  type ThumbnailOptions,
  type VideoInfo,
} from './ytdlp.js'
import {formatTrackFilename, type PlaylistEntry, type PlaylistMetadata} from './playlist.js'

export const MIXED_OR_PHOTO_DOMAINS = [
  'x.com',
  'twitter.com',
  't.co',
  'instagram.com',
  'instagr.am',
  'reddit.com',
  'redd.it',
  'facebook.com',
  'fb.com',
  'fb.watch',
  'pinterest.com',
  'pin.it',
  'flickr.com',
  'pixiv.net',
  'bsky.app',
  'threads.net',
  'tumblr.com',
  'weibo.com',
]

export function isMixedOrPhotoPlatform(url: string): boolean {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '')
    return MIXED_OR_PHOTO_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`))
  } catch {
    return false
  }
}

export type MediaKind = 'video' | 'audio' | 'photo'

export type UnifiedMediaItem = {
  id: string
  index: number
  title: string
  kind: MediaKind
  engine: 'ytdlp' | 'gallerydl'
  url: string
  ext: string
  width?: number
  height?: number
  duration?: number | null
  sizeEstimate?: number
}

export type UnifiedPostResult = {
  id: string
  title: string
  uploader?: string
  webpageUrl: string
  isSingle: boolean
  items: UnifiedMediaItem[]
}

export function filterMediaItems(
  items: UnifiedMediaItem[],
  filter?: 'all' | 'photos' | 'videos',
): UnifiedMediaItem[] {
  if (!filter || filter === 'all') return items
  if (filter === 'photos') return items.filter(item => item.kind === 'photo')
  if (filter === 'videos') return items.filter(item => item.kind === 'video' || item.kind === 'audio')
  return items
}

export function normalizeGalleryDlToUnified(
  galleryItems: GalleryDlItem[],
  originalUrl: string,
): UnifiedPostResult {
  if (galleryItems.length === 0) {
    throw new Error('No items to normalize')
  }

  const first = galleryItems[0]
  const postTitle = first.title || (first.uploader ? `Post by ${first.uploader}` : 'Post')
  const isSingle = galleryItems.length === 1

  const items: UnifiedMediaItem[] = galleryItems.map((g, idx) => {
    const itemTitle = g.title || `Item ${g.index || idx + 1}`
    return {
      id: String(g.index || idx + 1),
      index: g.index || idx + 1,
      title: itemTitle,
      kind: g.kind,
      engine: g.kind === 'video' ? 'ytdlp' : 'gallerydl',
      url: g.url,
      ext: g.ext,
      width: g.width,
      height: g.height,
    }
  })

  return {
    id: first.filename || 'post',
    title: postTitle,
    uploader: first.uploader,
    webpageUrl: originalUrl,
    isSingle,
    items,
  }
}

export function normalizeYtDlpToUnified(
  probeResult: ProbeResult,
  originalUrl: string,
): UnifiedPostResult {
  if (probeResult.kind === 'single') {
    const info = probeResult.info
    const title = info.title || 'Video'
    return {
      id: info.webpage_url || originalUrl,
      title,
      uploader: info.uploader,
      webpageUrl: originalUrl,
      isSingle: true,
      items: [
        {
          id: '1',
          index: 1,
          title,
          kind: 'video',
          engine: 'ytdlp',
          url: originalUrl,
          ext: 'mp4',
          duration: info.duration,
        },
      ],
    }
  }

  const playlist = probeResult.playlist
  const items: UnifiedMediaItem[] = playlist.validEntries.map(entry => ({
    id: entry.id,
    index: entry.index,
    title: entry.title,
    kind: 'video',
    engine: 'ytdlp',
    url: entry.url,
    ext: 'mp4',
    duration: entry.duration,
  }))

  return {
    id: playlist.id,
    title: playlist.title,
    uploader: playlist.uploader,
    webpageUrl: originalUrl,
    isSingle: false,
    items,
  }
}

export function postToPlaylistMetadata(post: UnifiedPostResult): PlaylistMetadata {
  const validEntries: PlaylistEntry[] = post.items.map(item => ({
    id: item.id,
    title: item.title,
    url: item.url,
    duration: item.duration,
    index: item.index,
    kind: item.kind,
    ext: item.ext,
  }))

  return {
    id: post.id,
    title: post.title,
    uploader: post.uploader,
    webpageUrl: post.webpageUrl,
    entries: post.items,
    validEntries,
  }
}

export type UnifiedProbeResult =
  | {
      kind: 'single_photo'
      item: UnifiedMediaItem
      postTitle: string
      uploader?: string
    }
  | {
      kind: 'single_video'
      info: VideoInfo
      infoJsonPath: string
    }
  | {
      kind: 'playlist'
      playlist: PlaylistMetadata
      singleVideoUrl?: string
    }
  | {
      kind: 'mixed_post'
      post: UnifiedPostResult
      playlist: PlaylistMetadata
    }

export type ProbeUnifiedOptions = {
  url: string
  ytdlp: string
  gallerydl?: string
  mediaFilter?: 'all' | 'photos' | 'videos'
  signal?: AbortSignal
  onStatus?: (status: string) => void
  probeGalleryDlFn?: typeof probeGalleryDl
  probeYtDlpFn?: typeof probe
}

export async function probeUnified(options: ProbeUnifiedOptions): Promise<UnifiedProbeResult> {
  const {url, ytdlp, gallerydl, mediaFilter, signal, onStatus} = options
  const runProbeGalleryDl = options.probeGalleryDlFn || probeGalleryDl
  const runProbeYtDlp = options.probeYtDlpFn || probe

  if (isMixedOrPhotoPlatform(url)) {
    try {
      const gdl = gallerydl || (await ensureGalleryDl(onStatus, signal))
      onStatus?.('Probing post items with gallery-dl…')
      const rawItems = await runProbeGalleryDl(gdl, url, signal)

      if (rawItems && rawItems.length > 0) {
        const unifiedPost = normalizeGalleryDlToUnified(rawItems, url)
        const filteredItems = filterMediaItems(unifiedPost.items, mediaFilter)

        if (filteredItems.length === 0) {
          throw new Error(`No media items found matching the specified filter (${mediaFilter})`)
        }

        // Single photo post
        if (filteredItems.length === 1 && filteredItems[0].kind === 'photo') {
          return {
            kind: 'single_photo',
            item: filteredItems[0],
            postTitle: unifiedPost.title,
            uploader: unifiedPost.uploader,
          }
        }

        // Single video: probe with yt-dlp to get rich quality options
        if (filteredItems.length === 1 && filteredItems[0].kind === 'video') {
          try {
            onStatus?.('Fetching video formats with yt-dlp…')
            const ytProbe = await runProbeYtDlp(ytdlp, url, signal)
            if (ytProbe.kind === 'single') {
              return {
                kind: 'single_video',
                info: ytProbe.info,
                infoJsonPath: ytProbe.infoJsonPath,
              }
            }
          } catch {
            // yt-dlp failed, proceed with gallery-dl item
          }
        }

        // Multi-photo carousel, mixed photo+video post, or filtered multi-item post
        const post: UnifiedPostResult = {
          ...unifiedPost,
          isSingle: filteredItems.length === 1,
          items: filteredItems,
        }
        return {
          kind: 'mixed_post',
          post,
          playlist: postToPlaylistMetadata(post),
        }
      }
    } catch (err) {
      if (signal?.aborted) throw err
      // If error was about filter yielding 0 items, bubble up
      if (err instanceof Error && err.message.includes('No media items found matching')) {
        throw err
      }
      // Otherwise fall through to yt-dlp
    }
  }

  try {
    onStatus?.('fetching video info…')
    const ytProbe = await runProbeYtDlp(ytdlp, url, signal)

    if (ytProbe.kind === 'playlist') {
      if (mediaFilter === 'photos') {
        throw new Error('No photos found in video playlist (--photos-only specified)')
      }
      return {
        kind: 'playlist',
        playlist: ytProbe.playlist,
        singleVideoUrl: ytProbe.singleVideoUrl,
      }
    }

    if (mediaFilter === 'photos') {
      throw new Error('No photos found in video link (--photos-only specified)')
    }

    return {
      kind: 'single_video',
      info: ytProbe.info,
      infoJsonPath: ytProbe.infoJsonPath,
    }
  } catch (ytErr) {
    if (signal?.aborted) throw ytErr
    if (ytErr instanceof Error && ytErr.message.includes('No photos found')) {
      throw ytErr
    }

    // If url was not already probed by gallery-dl, try gallery-dl fallback
    if (!isMixedOrPhotoPlatform(url)) {
      try {
        const gdl = gallerydl || (await ensureGalleryDl(onStatus, signal))
        onStatus?.('Probing post items with gallery-dl…')
        const rawItems = await runProbeGalleryDl(gdl, url, signal)

        if (rawItems && rawItems.length > 0) {
          const unifiedPost = normalizeGalleryDlToUnified(rawItems, url)
          const filteredItems = filterMediaItems(unifiedPost.items, mediaFilter)

          if (filteredItems.length === 0) {
            throw new Error(`No media items found matching the specified filter (${mediaFilter})`)
          }

          if (filteredItems.length === 1 && filteredItems[0].kind === 'photo') {
            return {
              kind: 'single_photo',
              item: filteredItems[0],
              postTitle: unifiedPost.title,
              uploader: unifiedPost.uploader,
            }
          }

          const post: UnifiedPostResult = {
            ...unifiedPost,
            isSingle: filteredItems.length === 1,
            items: filteredItems,
          }
          return {
            kind: 'mixed_post',
            post,
            playlist: postToPlaylistMetadata(post),
          }
        }
      } catch (gdlErr) {
        if (signal?.aborted) throw gdlErr
        if (gdlErr instanceof Error && gdlErr.message.includes('No media items found matching')) {
          throw gdlErr
        }
        // Fallback also failed; throw original yt-dlp error
        throw ytErr
      }
    }
    throw ytErr
  }
}

export type DownloadUnifiedItemOptions = {
  item: PlaylistEntry
  destDir: string
  filename?: string
  totalCount?: number
  ytdlp: string
  gallerydl?: string
  ffmpegLocation?: string
  choice: DownloadChoice
  subtitles?: SubtitleOptions
  thumbnail?: ThumbnailOptions
  signal?: AbortSignal
  onProgress?: (progress: DownloadProgress) => void
  onProcessing?: () => void
  downloadPhotoFn?: typeof downloadPhotoItem
  downloadVideoFn?: typeof download
}

export async function downloadUnifiedItem(options: DownloadUnifiedItemOptions): Promise<string> {
  const {
    item,
    destDir,
    filename,
    totalCount,
    ytdlp,
    gallerydl,
    ffmpegLocation,
    choice,
    subtitles,
    thumbnail,
    signal,
    onProgress,
    onProcessing,
  } = options
  const runDownloadPhoto = options.downloadPhotoFn || downloadPhotoItem
  const runDownloadVideo = options.downloadVideoFn || download

  const ext = item.kind === 'photo' ? item.ext || 'jpg' : '%(ext)s'
  const resolvedFilename =
    filename || formatTrackFilename(item.index, totalCount ?? Math.max(item.index, 1), item.title, ext)

  if (item.kind === 'photo') {
    const gdl = gallerydl || (await ensureGalleryDl(undefined, signal))
    return runDownloadPhoto({
      url: item.url,
      destDir,
      filename: resolvedFilename,
      gallerydl: gdl,
      signal,
      onProgress: onProgress
        ? p =>
            onProgress({
              downloadedBytes: p.downloadedBytes,
              totalBytes: p.totalBytes,
              speed: p.speed,
              eta: p.eta,
              part: p.part,
              totalParts: p.totalParts,
            })
        : undefined,
    })
  }

  return runDownloadVideo(
    {
      ytdlp,
      ffmpegLocation,
      url: item.url,
      choice,
      outDir: destDir,
      outputTemplate: path.join(destDir, resolvedFilename),
      subtitles,
      thumbnail,
    },
    {
      onProgress: onProgress ?? (() => {}),
      onProcessing: onProcessing ?? (() => {}),
    },
    signal,
  )
}
