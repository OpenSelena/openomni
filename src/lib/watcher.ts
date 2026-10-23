import fs from 'node:fs/promises'
import path from 'node:path'
import {readClipboardAsync} from './clipboard.js'
import {isProbablyUrl, detectPlatform} from './platforms.js'
import {getCompletedDownload, recordDownloadWithStat} from './ledger.js'
import {
  probeUnified,
  downloadUnifiedItem,
  type UnifiedProbeResult,
} from './dispatcher.js'
import {
  ensureYtDlp,
  findFfmpeg,
  download,
  buildChoices,
  type DownloadChoice,
  type DownloadHandlers,
  type SubtitleOptions,
  type ThumbnailOptions,
  type MetadataOptions,
} from './ytdlp.js'
import {
  resolvePlaylistDir,
  buildQualityTierArgs,
  sanitizeFilename,
  type QualityTier,
  type PlaylistEntry,
} from './playlist.js'
import {asyncPool} from './pool.js'
import {normalizeToYtdlpSection} from './time.js'
import {sanitizeError} from './sanitizer.js'
import type {AudioFormat, VideoFormat, FormatMode} from './args.js'

export type WatcherLogFn = (message: string) => void

export type WatcherOptions = {
  outDir: string
  format?: FormatMode
  audioFormat?: AudioFormat
  videoFormat?: VideoFormat
  subtitles?: SubtitleOptions
  thumbnail?: ThumbnailOptions
  metadata?: MetadataOptions
  photosOnly?: boolean
  videosOnly?: boolean
  proxy?: string
  geoBypass?: boolean
  geoCountry?: string
  limitRate?: string
  sponsorblock?: boolean
  sponsorblockRemove?: string
  outputTemplate?: string
  concurrency?: number
  skipExisting?: boolean
  force?: boolean
  time?: string
  cookieFile?: string
  cookieHeader?: string
  pollIntervalMs?: number
  clipboardReader?: () => Promise<string>
  downloadFn?: (url: string, opts: WatcherOptions) => Promise<string>
  onLog?: WatcherLogFn
  onUrlDetected?: (url: string) => void
  onDownloadStart?: (url: string, title?: string) => void
  onDownloadComplete?: (url: string, filepath: string) => void
  onDownloadError?: (url: string, error: string) => void
  onSkip?: (url: string, reason: string) => void
  signal?: AbortSignal
}

export type WatcherHandle = {
  stop: () => void
  isWatching: () => boolean
  getQueueLength: () => number
}

const DEFAULT_POLL_INTERVAL = 1500
const MAX_SEEN_CACHE = 500

/**
 * Extracts a candidate HTTP/HTTPS URL from raw clipboard text.
 */
export function extractUrlFromText(text: string): string | null {
  if (!text || typeof text !== 'string') return null
  const trimmed = text.trim()
  if (isProbablyUrl(trimmed)) {
    return trimmed
  }
  const match = /(https?:\/\/[^\s"'<>]+)/i.exec(trimmed)
  if (match && match[1] && isProbablyUrl(match[1])) {
    return match[1]
  }
  return null
}

/**
 * Default download pipeline used by the watcher when no mock downloadFn is passed.
 */
export async function defaultWatchDownload(url: string, opts: WatcherOptions): Promise<string> {
  await fs.mkdir(opts.outDir, {recursive: true})
  const ytdlp = await ensureYtDlp(status => opts.onLog?.(`[watch] ${status}`))
  const ffmpegLocation = await findFfmpeg()
  const mediaFilter = opts.photosOnly ? 'photos' : opts.videosOnly ? 'videos' : 'all'

  const probeResult: UnifiedProbeResult = await probeUnified({
    url,
    ytdlp,
    mediaFilter,
    cookieFile: opts.cookieFile,
    cookieHeader: opts.cookieHeader,
    proxy: opts.proxy,
    geoBypass: opts.geoBypass,
    geoCountry: opts.geoCountry,
    limitRate: opts.limitRate,
    onStatus: status => opts.onLog?.(`[watch] ${status}`),
  })

  // 1. Single Photo
  if (probeResult.kind === 'single_photo') {
    const item = probeResult.item
    const filename = `${sanitizeFilename(probeResult.postTitle)}.${item.ext || 'jpg'}`
    const filepath = await downloadUnifiedItem({
      item: {
        id: item.id,
        title: probeResult.postTitle,
        url: item.url,
        index: 1,
        kind: 'photo',
        ext: item.ext,
      },
      destDir: opts.outDir,
      filename,
      outputTemplate: opts.outputTemplate,
      ytdlp,
      cookieFile: opts.cookieFile,
      cookieHeader: opts.cookieHeader,
      choice: {
        label: 'original photo',
        kind: 'photo',
        args: [],
      },
      skipExisting: opts.skipExisting,
      force: opts.force,
      time: opts.time,
      proxy: opts.proxy,
      limitRate: opts.limitRate,
    })
    return filepath
  }

  // 2. Playlist / Mixed-Post Carousel
  if (probeResult.kind === 'playlist' || probeResult.kind === 'mixed_post') {
    const playlist = probeResult.playlist
    const playlistDir = resolvePlaylistDir(opts.outDir, playlist.title)
    await fs.mkdir(playlistDir, {recursive: true})

    const tier = (opts.format ?? (opts.audioFormat ? 'mp3' : 'best')) as QualityTier
    const choice: DownloadChoice = {
      label: tier === 'mp3' && opts.audioFormat ? `audio (${opts.audioFormat})` : tier,
      kind: tier === 'mp3' ? 'audio' : 'video',
      args: buildQualityTierArgs(tier, opts.audioFormat, opts.videoFormat),
    }

    const defaultConcurrency =
      probeResult.kind === 'mixed_post' || playlist.validEntries.every((e: PlaylistEntry) => e.kind === 'photo') ? 4 : 1
    const effectiveConcurrency = opts.concurrency ?? defaultConcurrency

    let lastFilepath = playlistDir
    await asyncPool<PlaylistEntry, void>(effectiveConcurrency, playlist.validEntries, async (entry: PlaylistEntry) => {
      if (opts.skipExisting && !opts.force && entry.completed) {
        return
      }
      const downloaded = await downloadUnifiedItem({
        item: entry,
        destDir: playlistDir,
        outputTemplate: opts.outputTemplate,
        totalCount: playlist.validEntries.length,
        ytdlp,
        ffmpegLocation,
        choice,
        subtitles: opts.subtitles,
        thumbnail: opts.thumbnail,
        metadata: opts.metadata,
        cookieFile: opts.cookieFile,
        cookieHeader: opts.cookieHeader,
        skipExisting: opts.skipExisting,
        force: opts.force,
        time: opts.time,
        proxy: opts.proxy,
        geoBypass: opts.geoBypass,
        geoCountry: opts.geoCountry,
        limitRate: opts.limitRate,
        sponsorblock: opts.sponsorblock,
        sponsorblockRemove: opts.sponsorblockRemove,
      })
      lastFilepath = downloaded
    })
    return lastFilepath
  }

  // 3. Single Video / Audio
  const {info, infoJsonPath} = probeResult
  const choices = buildChoices(info, {audioFormat: opts.audioFormat, videoFormat: opts.videoFormat})
  const isAudio = opts.format === 'mp3' || (opts.format === undefined && Boolean(opts.audioFormat))
  const choice =
    isAudio
      ? (choices.find(c => c.kind === 'audio') ?? choices[choices.length - 1]!)
      : (choices.find(c => c.kind === 'video') ?? choices[0]!)

  const section = opts.time ? normalizeToYtdlpSection(opts.time) ?? undefined : undefined
  const resolvedTemplate = opts.outputTemplate
    ? path.isAbsolute(opts.outputTemplate)
      ? opts.outputTemplate
      : path.join(opts.outDir, opts.outputTemplate)
    : undefined

  const handlers: DownloadHandlers = {
    onProgress: () => {},
    onProcessing: () => {},
  }

  const filepath = await download(
    {
      ytdlp,
      ffmpegLocation,
      url,
      choice,
      outDir: opts.outDir,
      outputTemplate: resolvedTemplate,
      infoJsonPath,
      subtitles: opts.subtitles,
      thumbnail: opts.thumbnail,
      metadata: opts.metadata,
      cookieFile: opts.cookieFile,
      section,
      proxy: opts.proxy,
      geoBypass: opts.geoBypass,
      geoCountry: opts.geoCountry,
      limitRate: opts.limitRate,
      sponsorblock: opts.sponsorblock,
      sponsorblockRemove: opts.sponsorblockRemove,
    },
    handlers,
    opts.signal,
  )

  const platform = detectPlatform(url).key || info.extractor || 'yt-dlp'
  await recordDownloadWithStat({
    mediaId: info.id || path.basename(filepath),
    platform,
    url,
    title: info.title || path.basename(filepath),
    outputPath: filepath,
    format: choice.label,
  })

  return filepath
}

/**
 * Starts the background clipboard watcher daemon.
 */
export function startClipboardWatcher(options: WatcherOptions): WatcherHandle {
  const pollInterval = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL
  const clipboardReader = options.clipboardReader ?? readClipboardAsync
  const downloadFn = options.downloadFn ?? defaultWatchDownload

  const seenUrls = new Set<string>()
  const queue: string[] = []
  let active = true
  let isProcessing = false
  let pollTimeout: NodeJS.Timeout | undefined

  function rememberUrl(url: string): void {
    seenUrls.add(url)
    if (seenUrls.size > MAX_SEEN_CACHE) {
      const oldest = seenUrls.values().next().value
      if (oldest) seenUrls.delete(oldest)
    }
  }

  function stop(): void {
    active = false
    if (pollTimeout) {
      clearTimeout(pollTimeout)
      pollTimeout = undefined
    }
  }

  if (options.signal) {
    if (options.signal.aborted) {
      stop()
    } else {
      options.signal.addEventListener('abort', stop, {once: true})
    }
  }

  async function processQueue(): Promise<void> {
    if (isProcessing || !active) return
    isProcessing = true

    while (queue.length > 0 && active) {
      const url = queue.shift()!
      options.onDownloadStart?.(url)
      try {
        const filepath = await downloadFn(url, options)
        if (process.stdout.isTTY) {
          process.stdout.write('\x07')
        }
        options.onDownloadComplete?.(url, filepath)
      } catch (err) {
        const sanitized = sanitizeError(err)
        options.onDownloadError?.(url, sanitized)
      }
    }

    isProcessing = false
  }

  async function poll(): Promise<void> {
    if (!active) return

    try {
      const rawText = await clipboardReader()
      const candidateUrl = extractUrlFromText(rawText)

      if (candidateUrl && !seenUrls.has(candidateUrl)) {
        rememberUrl(candidateUrl)
        options.onUrlDetected?.(candidateUrl)

        // Check if already downloaded and exists on disk
        const recorded = getCompletedDownload({url: candidateUrl})
        if (recorded && (options.skipExisting ?? true) && !options.force) {
          options.onSkip?.(candidateUrl, `already downloaded → ${recorded.outputPath}`)
        } else {
          queue.push(candidateUrl)
          void processQueue()
        }
      }
    } catch (err) {
      options.onLog?.(`[watch] clipboard poll error: ${sanitizeError(err)}`)
    }

    if (active) {
      pollTimeout = setTimeout(poll, pollInterval)
    }
  }

  // Pre-seed seenUrls with the current clipboard content so existing text is not immediately downloaded
  void clipboardReader()
    .then(raw => {
      const initial = extractUrlFromText(raw)
      if (initial) {
        rememberUrl(initial)
      }
    })
    .catch(() => {})
    .finally(() => {
      if (active) {
        pollTimeout = setTimeout(poll, pollInterval)
      }
    })

  return {
    stop,
    isWatching: () => active,
    getQueueLength: () => queue.length,
  }
}
