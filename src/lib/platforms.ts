import fs from 'node:fs'
import {spawn} from 'node:child_process'
import path from 'node:path'

export type Platform = {
  key: string
  label: string
}

const PLATFORMS: Array<{hosts: string[]; platform: Platform}> = [
  {hosts: ['youtube.com', 'youtu.be', 'music.youtube.com'], platform: {key: 'youtube', label: 'YouTube'}},
  {hosts: ['x.com', 'twitter.com'], platform: {key: 'x', label: 'X / Twitter'}},
  {hosts: ['instagram.com'], platform: {key: 'instagram', label: 'Instagram'}},
  {hosts: ['threads.net', 'threads.com'], platform: {key: 'threads', label: 'Threads'}},
  {hosts: ['tiktok.com'], platform: {key: 'tiktok', label: 'TikTok'}},
  {hosts: ['vimeo.com'], platform: {key: 'vimeo', label: 'Vimeo'}},
  {hosts: ['twitch.tv'], platform: {key: 'twitch', label: 'Twitch'}},
  {hosts: ['reddit.com'], platform: {key: 'reddit', label: 'Reddit'}},
  {hosts: ['facebook.com', 'fb.watch'], platform: {key: 'facebook', label: 'Facebook'}},
  {hosts: ['bsky.app'], platform: {key: 'bluesky', label: 'Bluesky'}},
]

export function detectPlatform(url: string): Platform {
  let hostname: string
  try {
    hostname = new URL(url).hostname.toLowerCase()
  } catch {
    return {key: 'unknown', label: 'Unknown site'}
  }

  for (const {hosts, platform} of PLATFORMS) {
    if (hosts.some(h => hostname === h || hostname.endsWith(`.${h}`))) {
      return platform
    }
  }

  return {key: 'generic', label: hostname}
}

export function netmaskMatches(ip: string): boolean {
  return isPrivateOrLoopbackHost(ip)
}

function isIpv4PrivateOrSpecial(ip: string): boolean {
  const parts = ip.split('.').map(n => Number(n))
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false
  const [a, b] = parts as [number, number, number, number]
  if (a === 0 || a === 10 || a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  return false
}

export function isPrivateOrLoopbackHost(hostname: string): boolean {
  const bare = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '').split('%')[0] ?? ''
  if (!bare) return true
  if (bare === 'localhost' || bare.endsWith('.localhost') || bare.endsWith('.local') || bare.endsWith('.internal')) {
    return true
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(bare)) {
    return isIpv4PrivateOrSpecial(bare)
  }
  if (bare === '::' || bare === '::1' || bare === '0:0:0:0:0:0:0:1') return true
  if (bare.startsWith('::ffff:')) {
    const mapped = bare.slice('::ffff:'.length)
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(mapped)) return isIpv4PrivateOrSpecial(mapped)
  }
  const firstHextet = bare.split(':')[0] ?? ''
  if (/^[0-9a-f]{1,4}$/.test(firstHextet)) {
    const val = parseInt(firstHextet, 16)
    if ((val & 0xfe00) === 0xfc00) return true
    if ((val & 0xffc0) === 0xfe80) return true
  }
  return false
}

export function isProbablyUrl(input: string): boolean {
  if (!input || typeof input !== 'string') return false
  const trimmed = input.trim()
  // Reject internal whitespace and C0/C1 control chars so new URL() cannot silently strip them.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0020\u007f-\u009f]/.test(trimmed)) return false
  try {
    const u = new URL(trimmed)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export function getOpenBrowserCommand(
  url: string,
  platform: NodeJS.Platform = process.platform,
): {command: string; args: string[]} {
  let parsed: URL
  try {
    parsed = new URL(url.trim())
  } catch {
    throw new Error('Invalid URL')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Unsupported browser URL protocol: ${parsed.protocol}`)
  }
  const safeUrl = parsed.toString()
  if (platform === 'darwin') {
    return {command: 'open', args: [safeUrl]}
  }
  if (platform === 'win32') {
    return {command: 'rundll32.exe', args: ['url.dll,FileProtocolHandler', safeUrl]}
  }
  return {command: 'xdg-open', args: [safeUrl]}
}

export function openBrowser(url: string): void {
  try {
    const {command, args} = getOpenBrowserCommand(url)
    spawn(command, args, {detached: true, stdio: 'ignore'}).unref()
  } catch {
    // ignore if browser cannot open
  }
}

export function getRevealCommand(
  targetPath: string,
  platform: NodeJS.Platform = process.platform,
  isDirectory?: boolean,
): {command: string; args: string[]} {
  const resolved = path.resolve(targetPath)
  const isDir =
    isDirectory !== undefined
      ? isDirectory
      : (() => {
          try {
            if (fs.existsSync(resolved)) {
              return fs.statSync(resolved).isDirectory()
            }
          } catch {
            // ignore
          }
          return !path.extname(resolved)
        })()

  if (platform === 'darwin') {
    return isDir
      ? {command: 'open', args: [resolved]}
      : {command: 'open', args: ['-R', resolved]}
  }
  if (platform === 'win32') {
    if (isDir) {
      return {command: 'explorer.exe', args: [resolved]}
    }
    return {command: 'explorer.exe', args: [`/select,"${resolved}"`]}
  }
  return isDir
    ? {command: 'xdg-open', args: [resolved]}
    : {command: 'xdg-open', args: [path.dirname(resolved)]}
}

export const getRevealInFileManagerCommand = getRevealCommand

export function revealInFileManager(targetPath: string): void {
  try {
    if (!targetPath || typeof targetPath !== 'string') {
      return
    }
    const resolved = path.resolve(targetPath)
    let pathToReveal = resolved
    try {
      if (!fs.existsSync(resolved)) {
        const dir = path.dirname(resolved)
        if (fs.existsSync(dir)) {
          pathToReveal = dir
        } else {
          return
        }
      }
    } catch {
      return
    }

    if (process.env.NODE_ENV === 'test' || process.env.OPEN_OMNI_TEST === '1') {
      return
    }

    const {command, args} = getRevealCommand(pathToReveal)
    const useVerbatim = process.platform === 'win32' && args.some(a => a.startsWith('/select,'))
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
      windowsVerbatimArguments: useVerbatim,
    })
    child.on('error', () => {})
    child.unref()
  } catch {
    // Safe try/catch: ignore errors if file manager cannot be launched
  }
}

