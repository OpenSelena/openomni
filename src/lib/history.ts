import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const LIMIT = 50
const LEGACY_HISTORY_FILE = path.join(os.homedir(), '.config', 'yoinks', 'history.json')

export function getHistoryPath(env: NodeJS.ProcessEnv = process.env): string {
  if (env.OPEN_OMNI_HISTORY_FILE) {
    return env.OPEN_OMNI_HISTORY_FILE
  }
  const xdg = env.XDG_CONFIG_HOME
  const base = xdg ? path.join(xdg, 'open-omni') : path.join(os.homedir(), '.config', 'open-omni')
  return path.join(base, 'history.json')
}

export function loadHistory(): string[] {
  const historyFile = getHistoryPath()
  const candidateFiles = process.env.OPEN_OMNI_HISTORY_FILE ? [historyFile] : [historyFile, LEGACY_HISTORY_FILE]
  for (const file of candidateFiles) {
    try {
      if (!fs.existsSync(file)) continue
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
  const historyFile = getHistoryPath()
  try {
    fs.mkdirSync(path.dirname(historyFile), {recursive: true})
    fs.writeFileSync(historyFile, `${JSON.stringify(next, null, 2)}\n`)
  } catch {
    // history is a nicety — never let it break a download
  }
  return next
}
