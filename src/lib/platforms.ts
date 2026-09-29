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

export function isProbablyUrl(input: string): boolean {
  try {
    const u = new URL(input.trim())
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export function getOpenBrowserCommand(
  url: string,
  platform: NodeJS.Platform = process.platform,
): {command: string; args: string[]} {
  if (platform === 'darwin') {
    return {command: 'open', args: [url]}
  }
  if (platform === 'win32') {
    return {command: 'rundll32.exe', args: ['url.dll,FileProtocolHandler', url]}
  }
  return {command: 'xdg-open', args: [url]}
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

