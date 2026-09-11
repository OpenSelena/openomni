import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {spawnSync} from 'node:child_process'
import type {CookieOptions} from './config.js'

export type CookieJar = {
  filePath: string
  isEphemeral: boolean
}

export type CookieRunner = (args: string[]) => {
  status: number | null
  stderr: string
}

function defaultRunner(ytdlpPath?: string): CookieRunner {
  const exe = ytdlpPath ?? 'yt-dlp'
  return (args: string[]) => {
    const result = spawnSync(exe, args, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']})
    return {
      status: result.status,
      stderr: result.stderr || '',
    }
  }
}

function cookieDomainMatches(
  requestDomain: string,
  cookieDomain: string,
  includeSubdomains: boolean
): boolean {
  const req = requestDomain.replace(/^\./, '').toLowerCase()
  const cookie = cookieDomain.replace(/^\./, '').toLowerCase()
  if (includeSubdomains) {
    return req === cookie || req.endsWith(`.${cookie}`)
  }
  return req === cookie
}

export function parseNetscapeCookieContent(content: string, targetDomain?: string): string {
  const cookies: string[] = []
  const reqDomain = targetDomain?.replace(/^\./, '').toLowerCase()

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    const isHttpOnly = line.startsWith('#HttpOnly_')
    const effectiveLine = isHttpOnly ? line.slice('#HttpOnly_'.length) : line

    if (effectiveLine.startsWith('#')) continue

    const parts = effectiveLine.split('\t')
    if (parts.length < 7) continue

    const rawDomain = parts[0]!
    const includeSubdomains = parts[1]?.toUpperCase() === 'TRUE'
    const name = parts[5]!
    const value = parts[6]!

    if (reqDomain && !cookieDomainMatches(reqDomain, rawDomain, includeSubdomains)) {
      continue
    }

    cookies.push(`${name}=${value}`)
  }

  return cookies.join('; ')
}

export function parseNetscapeCookieFile(filePath: string, targetDomain?: string): string {
  if (!fs.existsSync(filePath)) return ''
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    return parseNetscapeCookieContent(content, targetDomain)
  } catch {
    return ''
  }
}

export type BrowserDetectorDeps = {
  platform?: NodeJS.Platform
  env?: NodeJS.ProcessEnv
  homedir?: string
  existsSync?: (path: string) => boolean
  readdirSync?: (path: string) => string[]
  statMtimeMs?: (path: string) => number
}

function getFsDeps(deps?: BrowserDetectorDeps) {
  return {
    platform: deps?.platform ?? process.platform,
    env: deps?.env ?? process.env,
    homedir: deps?.homedir ?? os.homedir(),
    existsSync: deps?.existsSync ?? fs.existsSync,
    readdirSync: deps?.readdirSync ?? ((dir: string) => {
      try {
        return fs.readdirSync(dir)
      } catch {
        return []
      }
    }),
    statMtimeMs: deps?.statMtimeMs ?? ((file: string) => {
      try {
        return fs.statSync(file).mtimeMs
      } catch {
        return 0
      }
    }),
  }
}

export function findGeckoProfilePath(browserDirName: string, deps?: BrowserDetectorDeps): string | undefined {
  const {platform, env, homedir, existsSync, readdirSync, statMtimeMs} = getFsDeps(deps)
  let baseDir = ''

  if (platform === 'win32') {
    const appData = env.APPDATA || path.join(homedir, 'AppData', 'Roaming')
    baseDir = path.join(appData, browserDirName, 'Profiles')
  } else if (platform === 'darwin') {
    baseDir = path.join(homedir, 'Library', 'Application Support', browserDirName, 'Profiles')
  } else {
    baseDir = browserDirName.startsWith('.')
      ? path.join(homedir, browserDirName)
      : path.join(homedir, `.${browserDirName.toLowerCase()}`)
  }

  try {
    const entries = readdirSync(baseDir)
    if (!entries || entries.length === 0) return undefined
    const candidates = entries
      .map(name => path.join(baseDir, name))
      .filter(dir => existsSync(path.join(dir, 'cookies.sqlite')))

    if (candidates.length === 0) return undefined

    candidates.sort((a, b) => {
      const timeA = statMtimeMs(path.join(a, 'cookies.sqlite'))
      const timeB = statMtimeMs(path.join(b, 'cookies.sqlite'))
      return timeB - timeA
    })

    return candidates[0]
  } catch {
    return undefined
  }
}

export function detectInstalledBrowserSpec(deps?: BrowserDetectorDeps): string | undefined {
  const {platform, env, homedir, existsSync} = getFsDeps(deps)

  // 1. Gecko-based browsers (Firefox, Zen, Floorp, Waterfox)
  const zenProfile = findGeckoProfilePath('zen', deps)
  if (zenProfile) return `firefox:${zenProfile}`

  const ffProfile = findGeckoProfilePath('Mozilla/Firefox', deps) || findGeckoProfilePath('firefox', deps)
  if (ffProfile) return `firefox:${ffProfile}`

  const floorpProfile = findGeckoProfilePath('floorp', deps)
  if (floorpProfile) return `firefox:${floorpProfile}`

  const waterfoxProfile = findGeckoProfilePath('Waterfox', deps) || findGeckoProfilePath('waterfox', deps)
  if (waterfoxProfile) return `firefox:${waterfoxProfile}`

  // 2. Chromium-based browsers (Brave, Chrome, Edge, Helium, Chromium)
  if (platform === 'win32') {
    const localAppData = env.LOCALAPPDATA || path.join(homedir, 'AppData', 'Local')
    if (existsSync(path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'User Data'))) return 'brave'
    if (existsSync(path.join(localAppData, 'Google', 'Chrome', 'User Data'))) return 'chrome'
    if (existsSync(path.join(localAppData, 'Microsoft', 'Edge', 'User Data'))) return 'edge'
    if (existsSync(path.join(localAppData, 'Helium', 'User Data'))) return 'chromium'
  } else if (platform === 'darwin') {
    const appSupport = path.join(homedir, 'Library', 'Application Support')
    if (existsSync(path.join(appSupport, 'BraveSoftware', 'Brave-Browser'))) return 'brave'
    if (existsSync(path.join(appSupport, 'Google', 'Chrome'))) return 'chrome'
    if (existsSync(path.join(appSupport, 'Microsoft Edge'))) return 'edge'
    if (existsSync(path.join(homedir, 'Library', 'Cookies'))) return 'safari'
  } else {
    const configHome = env.XDG_CONFIG_HOME || path.join(homedir, '.config')
    if (existsSync(path.join(configHome, 'BraveSoftware', 'Brave-Browser'))) return 'brave'
    if (existsSync(path.join(configHome, 'google-chrome'))) return 'chrome'
    if (existsSync(path.join(configHome, 'chromium'))) return 'chromium'
    if (existsSync(path.join(configHome, 'microsoft-edge'))) return 'edge'
  }

  return undefined
}

export function normalizeBrowserSpec(spec: string, deps?: BrowserDetectorDeps): string | undefined {
  const lower = spec.trim().toLowerCase()

  if (lower === 'auto') {
    return detectInstalledBrowserSpec(deps)
  }

  if (lower === 'zen') {
    const zen = findGeckoProfilePath('zen', deps)
    if (zen) return `firefox:${zen}`
    return spec
  }

  if (lower === 'floorp') {
    const floorp = findGeckoProfilePath('floorp', deps)
    if (floorp) return `firefox:${floorp}`
    return spec
  }

  if (lower === 'waterfox') {
    const waterfox = findGeckoProfilePath('Waterfox', deps) || findGeckoProfilePath('waterfox', deps)
    if (waterfox) return `firefox:${waterfox}`
    return spec
  }

  return spec
}

export function resolveCookieJar(
  options: CookieOptions,
  deps?: {
    runner?: CookieRunner
    ytdlpPath?: string
    detectorDeps?: BrowserDetectorDeps
  }
): CookieJar | undefined {
  if (options.file) {
    const resolvedPath = path.resolve(options.file)
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`cookie file “${options.file}” does not exist`)
    }
    return {
      filePath: resolvedPath,
      isEphemeral: false,
    }
  }

  if (options.browser) {
    const isAuto = options.browser.trim().toLowerCase() === 'auto'
    const normalizedSpec = normalizeBrowserSpec(options.browser, deps?.detectorDeps)

    if (!normalizedSpec) {
      if (isAuto) {
        return undefined
      }
      throw new Error(`could not locate browser profile for “${options.browser}”`)
    }

    const randomSuffix = Math.random().toString(36).slice(2, 8)
    const tempPath = path.join(
      os.tmpdir(),
      `open-omni-cookies-${Date.now()}-${randomSuffix}.txt`
    )

    const runner = deps?.runner ?? defaultRunner(deps?.ytdlpPath)
    // Query a dummy target to trigger cookie extraction into --cookies file
    const result = runner([
      '--cookies-from-browser',
      normalizedSpec,
      '--cookies',
      tempPath,
      '--skip-download',
      'https://www.instagram.com/',
    ])

    if (result.status !== 0 && !fs.existsSync(tempPath)) {
      if (isAuto) {
        return undefined
      }
      throw new Error(
        `could not extract cookies from browser “${options.browser}”: ${result.stderr.trim() || 'process failed'}`
      )
    }

    const jar: CookieJar = {
      filePath: tempPath,
      isEphemeral: true,
    }

    // Register process exit cleanup hook
    process.once('exit', () => {
      cleanupCookieJar(jar)
    })

    return jar
  }

  throw new Error('No cookie file or browser specified in options')
}

export function cleanupCookieJar(jar?: CookieJar): void {
  if (!jar || !jar.isEphemeral) return
  try {
    if (fs.existsSync(jar.filePath)) {
      fs.unlinkSync(jar.filePath)
    }
  } catch {
    // Ignore cleanup errors on exit
  }
}
