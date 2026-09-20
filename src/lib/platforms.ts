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

export function isProbablyUrl(input: string): boolean {
  try {
    const u = new URL(input.trim())
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export function openBrowser(url: string): void {
  try {
    if (process.platform === 'darwin') {
      spawn('open', [url], {detached: true, stdio: 'ignore'}).unref()
    } else if (process.platform === 'win32') {
      spawn('cmd.exe', ['/c', 'start', '', url], {detached: true, stdio: 'ignore'}).unref()
    } else {
      spawn('xdg-open', [url], {detached: true, stdio: 'ignore'}).unref()
    }
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
    const resolved = path.resolve(targetPath)
    let pathToReveal = resolved
    if (process.platform === 'win32') {
      try {
        if (!fs.existsSync(resolved)) {
          const dir = path.dirname(resolved)
          if (fs.existsSync(dir)) {
            pathToReveal = dir
          }
        }
      } catch {
        // ignore
      }
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

