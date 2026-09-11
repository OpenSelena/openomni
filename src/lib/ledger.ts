import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export interface LedgerEntry {
  mediaId: string
  platform: string
  url: string
  title: string
  outputPath: string
  fileSizeBytes?: number
  format?: string
  completedAt: string
}

export const LEDGER_LIMIT = 1000

export function getLedgerPath(): string {
  if (process.env.OPEN_OMNI_LEDGER_FILE) {
    return process.env.OPEN_OMNI_LEDGER_FILE
  }
  const xdg = process.env.XDG_CONFIG_HOME
  const base = xdg ? path.join(xdg, 'open-omni') : path.join(os.homedir(), '.config', 'open-omni')
  return path.join(base, 'ledger.json')
}

/**
 * Loads download ledger from disk. Returns empty array if file missing or corrupt.
 */
export function loadLedger(): LedgerEntry[] {
  const filePath = getLedgerPath()
  try {
    if (!fs.existsSync(filePath)) return []
    const content = fs.readFileSync(filePath, 'utf8')
    const parsed: unknown = JSON.parse(content)
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is LedgerEntry => {
        return (
          item &&
          typeof item === 'object' &&
          typeof (item as LedgerEntry).mediaId === 'string' &&
          typeof (item as LedgerEntry).outputPath === 'string'
        )
      })
    }
  } catch {
    // Graceful fallback on corrupt ledger
  }
  return []
}

/**
 * Persists ledger entries to disk.
 */
function saveLedger(entries: LedgerEntry[]): void {
  const filePath = getLedgerPath()
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, `${JSON.stringify(entries.slice(0, LEDGER_LIMIT), null, 2)}\n`, 'utf8')
  } catch {
    // Ledger is resilient and should never break download execution
  }
}

/**
 * Records or updates a downloaded media item in the ledger.
 */
export function recordDownload(entry: Omit<LedgerEntry, 'completedAt'> & { completedAt?: string }): LedgerEntry {
  const fullEntry: LedgerEntry = {
    ...entry,
    completedAt: entry.completedAt || new Date().toISOString(),
  }

  const current = loadLedger()
  // Filter out existing matching entry by mediaId or url
  const filtered = current.filter(item => {
    if (entry.mediaId && item.mediaId === entry.mediaId) return false
    if (entry.url && item.url === entry.url) return false
    return true
  })

  const updated = [fullEntry, ...filtered].slice(0, LEDGER_LIMIT)
  saveLedger(updated)
  return fullEntry
}

/**
 * Searches the ledger by platform media ID or source URL.
 */
export function findInLedger(query: { url?: string; mediaId?: string }): LedgerEntry | undefined {
  if (!query.url && !query.mediaId) return undefined
  const list = loadLedger()
  return list.find(item => {
    if (query.mediaId && item.mediaId === query.mediaId) return true
    if (query.url && item.url === query.url) return true
    return false
  })
}

/**
 * Checks if the media file recorded in a ledger entry physically exists on the disk.
 */
export function isCompletedOnDisk(entry?: LedgerEntry): boolean {
  if (!entry || !entry.outputPath) return false
  try {
    return fs.existsSync(entry.outputPath)
  } catch {
    return false
  }
}

/**
 * Searches the ledger and returns the entry only if the media file physically exists on disk.
 */
export function getCompletedDownload(query: { url?: string; mediaId?: string }): LedgerEntry | undefined {
  const entry = findInLedger(query)
  return isCompletedOnDisk(entry) ? entry : undefined
}

/**
 * Convenience helper to probe file size via fs.promises.stat before recording to the ledger.
 */
export async function recordDownloadWithStat(
  entry: Omit<LedgerEntry, 'completedAt' | 'fileSizeBytes'> & { fileSizeBytes?: number; completedAt?: string },
): Promise<LedgerEntry> {
  let size = entry.fileSizeBytes
  if (size === undefined && entry.outputPath) {
    try {
      const stat = await fs.promises.stat(entry.outputPath)
      size = stat.size
    } catch {
      // If stat fails (e.g. race condition or external delete), proceed with recording metadata
    }
  }
  return recordDownload({ ...entry, fileSizeBytes: size })
}
