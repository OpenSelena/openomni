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

export function resolveCookieJar(
  options: CookieOptions,
  deps?: {
    runner?: CookieRunner
    ytdlpPath?: string
  }
): CookieJar {
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
    const randomSuffix = Math.random().toString(36).slice(2, 8)
    const tempPath = path.join(
      os.tmpdir(),
      `open-omni-cookies-${Date.now()}-${randomSuffix}.txt`
    )

    const runner = deps?.runner ?? defaultRunner(deps?.ytdlpPath)
    // Query a dummy target to trigger cookie extraction into --cookies file
    const result = runner([
      '--cookies-from-browser',
      options.browser,
      '--cookies',
      tempPath,
      '--skip-download',
      'https://www.instagram.com/',
    ])

    if (result.status !== 0 && !fs.existsSync(tempPath)) {
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
