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
): {command: string; args: string[]} {
  const resolved = path.resolve(targetPath)
  if (platform === 'darwin') {
    return {command: 'open', args: ['-R', resolved]}
  }
  if (platform === 'win32') {
    return {command: 'explorer.exe', args: [`/select,${resolved}`]}
  }
  return {command: 'xdg-open', args: [resolved]}
}

export const getRevealInFileManagerCommand = getRevealCommand

export function revealInFileManager(targetPath: string): void {
  try {
    const {command, args} = getRevealCommand(targetPath)
    const child = spawn(command, args, {detached: true, stdio: 'ignore'})
    child.on('error', () => {})
    child.unref()
  } catch {
    // Safe try/catch: ignore errors if file manager cannot be launched
  }
}

