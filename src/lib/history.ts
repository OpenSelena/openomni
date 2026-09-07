import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const HISTORY_FILE = path.join(os.homedir(), '.config', 'open-omni', 'history.json')
const LEGACY_HISTORY_FILE = path.join(os.homedir(), '.config', 'yoinks', 'history.json')
const LIMIT = 50

export function loadHistory(): string[] {
  for (const file of [HISTORY_FILE, LEGACY_HISTORY_FILE]) {
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf8'))
      if (Array.isArray(parsed)) {
        return parsed.filter((entry): entry is string => typeof entry === 'string')
      }
    } catch {
      // try next
    }
  }
  return []
}

/** Prepend a url (deduped, capped) and persist. Returns the new list. */
export function addToHistory(url: string): string[] {
  const next = [url, ...loadHistory().filter(entry => entry !== url)].slice(0, LIMIT)
  try {
    fs.mkdirSync(path.dirname(HISTORY_FILE), {recursive: true})
    fs.writeFileSync(HISTORY_FILE, `${JSON.stringify(next, null, 2)}\n`)
  } catch {
    // history is a nicety — never let it break a download
  }
  return next
}
