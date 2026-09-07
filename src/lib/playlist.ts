import path from 'node:path'

export type QualityTier = 'best' | '1080p' | '720p' | 'mp3'

export type PlaylistEntry = {
  id: string
  title: string
  url: string
  duration?: number | null
  index: number
}

export type PlaylistMetadata = {
  id: string
  title: string
  uploader?: string
  webpageUrl?: string
  entries: unknown[]
  validEntries: PlaylistEntry[]
}

/**
 * Sanitize strings for use in file and directory names.
 * Replaces illegal OS characters: / \ : * ? " < > |
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Format a zero-padded track filename like "01 - Title.mp4"
 */
export function formatTrackFilename(
  index: number,
  total: number,
  title: string,
  ext: string
): string {
  const padWidth = Math.max(2, String(total).length)
  const paddedIndex = String(index).padStart(padWidth, '0')
  const cleanTitle = sanitizeFilename(title)
  const cleanExt = ext.replace(/^\./, '')
  return `${paddedIndex} - ${cleanTitle}.${cleanExt}`
}

/**
 * Resolve and sanitize a destination subfolder for the playlist.
 */
export function resolvePlaylistDir(baseDir: string, playlistTitle: string): string {
  const cleanName = sanitizeFilename(playlistTitle) || 'Playlist'
  return path.join(baseDir, cleanName)
}

/**
 * Build yt-dlp format arguments for universal quality tiers.
 */
export function buildQualityTierArgs(tier: QualityTier): string[] {
  switch (tier) {
    case 'best':
      return ['-f', 'bv*+ba/b', '--merge-output-format', 'mp4']
    case '1080p':
      return [
        '-f',
        'bv*[height<=1080]+ba/b[height<=1080]/best[height<=1080]',
        '--merge-output-format',
        'mp4',
      ]
    case '720p':
      return [
        '-f',
        'bv*[height<=720]+ba/b[height<=720]/best[height<=720]',
        '--merge-output-format',
        'mp4',
      ]
    case 'mp3':
      return ['-x', '--audio-format', 'mp3']
  }
}

/**
 * Parse raw JSON output from yt-dlp --flat-playlist -J into typed PlaylistMetadata.
 */
export function parsePlaylistOutput(rawJson: string): PlaylistMetadata {
  const data = JSON.parse(rawJson)
  const rawEntries: Array<Record<string, unknown>> = Array.isArray(data.entries)
    ? data.entries
    : []

  const validEntries: PlaylistEntry[] = []
  let currentIndex = 1

  for (const entry of rawEntries) {
    const title = typeof entry.title === 'string' ? entry.title.trim() : ''
    const id = typeof entry.id === 'string' ? entry.id : ''

    // Exclude deleted or private videos
    if (
      !id ||
      !title ||
      title.toLowerCase() === '[deleted video]' ||
      title.toLowerCase() === '[private video]'
    ) {
      continue
    }

    const url =
      typeof entry.url === 'string'
        ? entry.url
        : typeof entry.webpage_url === 'string'
          ? entry.webpage_url
          : `https://www.youtube.com/watch?v=${id}`

    const duration =
      typeof entry.duration === 'number' ? entry.duration : null

    validEntries.push({
      id,
      title,
      url,
      duration,
      index: currentIndex++,
    })
  }

  return {
    id: typeof data.id === 'string' ? data.id : '',
    title: typeof data.title === 'string' ? data.title : 'Playlist',
    uploader: typeof data.uploader === 'string' ? data.uploader : undefined,
    webpageUrl:
      typeof data.webpage_url === 'string' ? data.webpage_url : undefined,
    entries: rawEntries,
    validEntries,
  }
}
