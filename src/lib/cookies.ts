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
    env: deps?.env ?? (deps?.homedir ? {} : process.env),
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

function getGeckoBaseDirs(browserDirName: string, deps?: BrowserDetectorDeps): string[] {
  const {platform, env, homedir} = getFsDeps(deps)
  const norm = browserDirName.toLowerCase()

  if (platform === 'win32') {
    const appData = env.APPDATA || path.join(homedir, 'AppData', 'Roaming')
    return [
      path.join(appData, browserDirName, 'Profiles'),
      path.join(appData, browserDirName),
    ]
  }

  if (platform === 'darwin') {
    const appSupport = path.join(homedir, 'Library', 'Application Support')
    return [
      path.join(appSupport, browserDirName, 'Profiles'),
      path.join(appSupport, browserDirName),
    ]
  }

  const configHome = env.XDG_CONFIG_HOME || path.join(homedir, '.config')
  const defaultConfigHome = path.join(homedir, '.config')
  const varApp = path.join(homedir, '.var', 'app')
  const snap = path.join(homedir, 'snap')
  const dirs: string[] = []

  if (norm.includes('firefox')) {
    dirs.push(
      path.join(configHome, 'mozilla', 'firefox'),
      path.join(defaultConfigHome, 'mozilla', 'firefox'),
      path.join(homedir, '.mozilla', 'firefox'),
      path.join(varApp, 'org.mozilla.firefox', '.mozilla', 'firefox'),
      path.join(varApp, 'org.mozilla.firefox', '.config', 'mozilla', 'firefox'),
      path.join(snap, 'firefox', 'common', '.mozilla', 'firefox'),
    )
  } else if (norm.includes('zen')) {
    dirs.push(
      path.join(varApp, 'app.zen_browser.zen', '.zen'),
      path.join(varApp, 'app.zen_browser.zen', '.config', 'zen'),
      path.join(homedir, '.zen'),
      path.join(configHome, 'zen'),
      path.join(defaultConfigHome, 'zen'),
    )
  } else if (norm.includes('floorp')) {
    dirs.push(
      path.join(varApp, 'one.ablaze.floorp', '.floorp'),
      path.join(homedir, '.floorp'),
      path.join(configHome, 'floorp'),
      path.join(defaultConfigHome, 'floorp'),
    )
  } else if (norm.includes('waterfox')) {
    dirs.push(
      path.join(varApp, 'net.waterfox.waterfox', '.waterfox'),
      path.join(homedir, '.waterfox'),
      path.join(configHome, 'waterfox'),
      path.join(defaultConfigHome, 'waterfox'),
    )
  } else if (norm.includes('librewolf')) {
    dirs.push(
      path.join(varApp, 'io.gitlab.librewolf-community', '.librewolf'),
      path.join(homedir, '.librewolf'),
      path.join(configHome, 'librewolf'),
      path.join(defaultConfigHome, 'librewolf'),
    )
  }

  if (browserDirName.startsWith('.')) {
    dirs.push(path.join(homedir, browserDirName))
  } else {
    dirs.push(path.join(homedir, `.${browserDirName.toLowerCase()}`))
  }

  return dirs
}

export function findGeckoProfilePath(browserDirName: string, deps?: BrowserDetectorDeps): string | undefined {
  const {existsSync, readdirSync, statMtimeMs} = getFsDeps(deps)
  const baseDirs = getGeckoBaseDirs(browserDirName, deps)

  const candidates: {path: string; mtime: number}[] = []

  for (const baseDir of baseDirs) {
    const directDb = path.join(baseDir, 'cookies.sqlite')
    if (existsSync(directDb)) {
      candidates.push({path: baseDir, mtime: statMtimeMs(directDb)})
    }

    try {
      const entries = readdirSync(baseDir)
      for (const entry of entries) {
        const profileDir = path.join(baseDir, entry)
        const dbPath = path.join(profileDir, 'cookies.sqlite')
        if (existsSync(dbPath)) {
          candidates.push({path: profileDir, mtime: statMtimeMs(dbPath)})
        }
      }
    } catch {}
  }

  if (candidates.length === 0) return undefined
  candidates.sort((a, b) => b.mtime - a.mtime)
  return candidates[0]?.path
}

export function detectInstalledBrowserSpec(deps?: BrowserDetectorDeps): string | undefined {
  const {platform, env, homedir, existsSync, statMtimeMs} = getFsDeps(deps)
  const candidates: {spec: string; mtime: number}[] = []

  const checkGecko = (name: string) => {
    const profile = findGeckoProfilePath(name, deps)
    if (profile) {
      const dbPath = path.join(profile, 'cookies.sqlite')
      const mtime = existsSync(dbPath) ? statMtimeMs(dbPath) : 0
      candidates.push({spec: `firefox:${profile}`, mtime})
    }
  }

  // 1. Gecko browsers
  checkGecko('zen')
  checkGecko('Mozilla/Firefox')
  checkGecko('floorp')
  checkGecko('waterfox')
  checkGecko('librewolf')

  // 2. Chromium browsers
  const checkChromium = (spec: string, dataDirs: string[]) => {
    for (const dir of dataDirs) {
      if (existsSync(dir)) {
        const cookieFile = path.join(dir, 'Default', 'Network', 'Cookies')
        const legacyCookieFile = path.join(dir, 'Default', 'Cookies')
        let mtime = 0
        if (existsSync(cookieFile)) mtime = statMtimeMs(cookieFile)
        else if (existsSync(legacyCookieFile)) mtime = statMtimeMs(legacyCookieFile)
        else mtime = statMtimeMs(dir)
        candidates.push({spec, mtime})
        break
      }
    }
  }

  if (platform === 'win32') {
    const localAppData = env.LOCALAPPDATA || path.join(homedir, 'AppData', 'Local')
    checkChromium('brave', [path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'User Data')])
    checkChromium('chrome', [path.join(localAppData, 'Google', 'Chrome', 'User Data')])
    checkChromium('edge', [path.join(localAppData, 'Microsoft', 'Edge', 'User Data')])
    checkChromium('chromium', [path.join(localAppData, 'Helium', 'User Data')])
  } else if (platform === 'darwin') {
    const appSupport = path.join(homedir, 'Library', 'Application Support')
    checkChromium('brave', [path.join(appSupport, 'BraveSoftware', 'Brave-Browser')])
    checkChromium('chrome', [path.join(appSupport, 'Google', 'Chrome')])
    checkChromium('edge', [path.join(appSupport, 'Microsoft Edge')])
    if (existsSync(path.join(homedir, 'Library', 'Cookies'))) {
      candidates.push({spec: 'safari', mtime: statMtimeMs(path.join(homedir, 'Library', 'Cookies'))})
    }
  } else {
    const configHome = env.XDG_CONFIG_HOME || path.join(homedir, '.config')
    const defaultConfigHome = path.join(homedir, '.config')
    const varApp = path.join(homedir, '.var', 'app')
    const snap = path.join(homedir, 'snap')

    checkChromium('brave', [
      path.join(configHome, 'BraveSoftware', 'Brave-Browser'),
      path.join(defaultConfigHome, 'BraveSoftware', 'Brave-Browser'),
      path.join(varApp, 'com.brave.Browser', 'config', 'BraveSoftware', 'Brave-Browser'),
      path.join(snap, 'brave', 'current', '.config', 'BraveSoftware', 'Brave-Browser'),
    ])
    checkChromium('chrome', [
      path.join(configHome, 'google-chrome'),
      path.join(defaultConfigHome, 'google-chrome'),
      path.join(varApp, 'com.google.Chrome', 'config', 'google-chrome'),
    ])
    checkChromium('chromium', [
      path.join(configHome, 'chromium'),
      path.join(defaultConfigHome, 'chromium'),
      path.join(varApp, 'org.chromium.Chromium', 'config', 'chromium'),
      path.join(snap, 'chromium', 'current', '.config', 'chromium'),
    ])
    checkChromium('edge', [
      path.join(configHome, 'microsoft-edge'),
      path.join(defaultConfigHome, 'microsoft-edge'),
      path.join(varApp, 'com.microsoft.Edge', 'config', 'microsoft-edge'),
    ])
  }

  if (candidates.length === 0) return undefined
  candidates.sort((a, b) => b.mtime - a.mtime)
  return candidates[0]?.spec
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

    if (fs.existsSync(tempPath)) {
      try {
        fs.chmodSync(tempPath, 0o600)
      } catch {
        // Ignore permissions errors on platforms without POSIX permissions
      }
    }

    if (result.status !== 0 && (!fs.existsSync(tempPath) || fs.statSync(tempPath).size === 0)) {
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath)
        }
      } catch {}
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
