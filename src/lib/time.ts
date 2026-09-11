export interface ParsedTimeRange {
  startSeconds: number
  endSeconds: number
  startFormatted: string
  endFormatted: string
}

function parsePartToSeconds(part: string): number | null {
  const trimmed = part.trim()
  if (!trimmed) return null

  // Raw seconds: "90", "120"
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10)
  }

  // Format MM:SS or HH:MM:SS
  const segments = trimmed.split(':').map(s => parseInt(s, 10))
  if (segments.some(isNaN)) return null

  if (segments.length === 2) {
    const [m, s] = segments
    if (s < 0 || s >= 60 || m < 0) return null
    return m * 60 + s
  }

  if (segments.length === 3) {
    const [h, m, s] = segments
    if (s < 0 || s >= 60 || m < 0 || m >= 60 || h < 0) return null
    return h * 3600 + m * 60 + s
  }

  return null
}

function formatSecondsToHms(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

/**
 * Parses section slicing ranges such as:
 * - "01:30-03:45"
 * - "01:15:30-02:00:00"
 * - "90-180"
 */
export function parseTimeRange(input: string): ParsedTimeRange | null {
  if (!input || typeof input !== 'string') return null
  const parts = input.split('-')
  if (parts.length !== 2) return null

  const startSec = parsePartToSeconds(parts[0])
  const endSec = parsePartToSeconds(parts[1])

  if (startSec === null || endSec === null) return null
  if (startSec >= endSec) return null

  return {
    startSeconds: startSec,
    endSeconds: endSec,
    startFormatted: formatSecondsToHms(startSec),
    endFormatted: formatSecondsToHms(endSec),
  }
}

/**
 * Normalizes input range to yt-dlp --download-sections format (*HH:MM:SS-HH:MM:SS)
 */
export function normalizeToYtdlpSection(input: string): string | null {
  const parsed = parseTimeRange(input)
  if (!parsed) return null
  return `*${parsed.startFormatted}-${parsed.endFormatted}`
}
