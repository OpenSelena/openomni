import path from 'node:path'
import os from 'node:os'
import {isThemeMode, type ThemeMode} from '../theme.js'
import type {SubtitleOptions, ThumbnailOptions, MetadataOptions} from './ytdlp.js'
import {normalizeShell, type CompletionTarget} from './completion.js'
import {resolvePlatformDownloadsDir} from './known-folders.js'
import {parseTimeRange} from './time.js'

export const SUPPORTED_AUDIO_FORMATS = [
  'best',
  'aac',
  'flac',
  'mp3',
  'm4a',
  'opus',
  'vorbis',
  'wav',
  'alac',
] as const

export type AudioFormat = (typeof SUPPORTED_AUDIO_FORMATS)[number]

export const SUPPORTED_VIDEO_FORMATS = ['mp4', 'mkv', 'webm'] as const

export type VideoFormat = (typeof SUPPORTED_VIDEO_FORMATS)[number]

export type FormatMode = 'best' | 'mp3'

export type CliArgs = {
  help: boolean
  version: boolean
  initialUrl?: string
  themeMode?: ThemeMode
  format?: FormatMode
  audioFormat?: AudioFormat
  videoFormat?: VideoFormat
  outputDir?: string
  updateYtDlp?: boolean
  updateGalleryDl?: boolean
  force?: boolean
  subtitles?: boolean | string
  embedSubs?: boolean
  thumb?: boolean
  embedThumb?: boolean
  metadata?: boolean
  embedChapters?: boolean
  photosOnly?: boolean
  videosOnly?: boolean
  cookies?: string
  cookiesFromBrowser?: string
  completion?: CompletionTarget
  skipExisting?: boolean
  time?: string
  error?: string
}

export function toSubtitleOptions(args: CliArgs): SubtitleOptions | undefined {
  if (!args.subtitles && !args.embedSubs) return undefined
  return {
    enabled: true,
    languages: typeof args.subtitles === 'string' ? args.subtitles : undefined,
    embed: Boolean(args.embedSubs),
  }
}

export function toThumbnailOptions(args: CliArgs): ThumbnailOptions | undefined {
  if (!args.thumb && !args.embedThumb) return undefined
  return {
    enabled: true,
    write: Boolean(args.thumb),
    embed: Boolean(args.embedThumb),
  }
}

export function toMetadataOptions(args: CliArgs): MetadataOptions | undefined {
  if (!args.metadata && !args.embedChapters) return undefined
  return {
    enabled: args.metadata ? true : undefined,
    embedChapters: args.embedChapters ? true : undefined,
  }
}

export function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = {help: false, version: false}
  const positional: string[] = []

  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!
    if (arg === '-h' || arg === '--help') {
      result.help = true
    } else if (arg === '-v' || arg === '--version') {
      result.version = true
    } else if (arg === '-U' || arg === '--update') {
      result.updateYtDlp = true
      result.updateGalleryDl = true
    } else if (arg === '--update-ytdlp') {
      result.updateYtDlp = true
    } else if (arg === '--update-gallerydl') {
      result.updateGalleryDl = true
    } else if (arg === '--force') {
      result.force = true
    } else if (arg === '--embed-subs') {
      result.embedSubs = true
    } else if (arg === '--thumb') {
      result.thumb = true
    } else if (arg === '--embed-thumb') {
      result.embedThumb = true
    } else if (arg === '--metadata' || arg === '--add-metadata') {
      result.metadata = true
    } else if (arg === '--embed-chapters') {
      result.embedChapters = true
    } else if (arg.startsWith('--subs=')) {
      const value = arg.slice('--subs='.length)
      result.subtitles = value || true
    } else if (arg === '--subs') {
      const next = args[index + 1]
      if (next && !next.startsWith('-') && !next.includes('/') && !next.includes('.')) {
        result.subtitles = next
        index++
      } else {
        result.subtitles = true
      }
    } else if (arg === '--best') {
      if (result.format === 'mp3') return {...result, error: 'cannot use both --best and --mp3'}
      if (result.audioFormat) return {...result, error: 'cannot use both --best and --audio-format'}
      result.format = 'best'
    } else if (arg === '--mp3') {
      if (result.format === 'best') return {...result, error: 'cannot use both --best and --mp3'}
      result.format = 'mp3'
    } else if (arg === '--audio-format' || arg.startsWith('--audio-format=')) {
      if (result.format === 'best') return {...result, error: 'cannot use both --best and --audio-format'}
      const value = arg === '--audio-format' ? args[++index] : arg.slice('--audio-format='.length)
      if (!value) return {...result, error: '--audio-format needs a format: best, aac, flac, mp3, m4a, opus, vorbis, wav, or alac'}
      const normalized = value.toLowerCase().trim() as AudioFormat
      if (!SUPPORTED_AUDIO_FORMATS.includes(normalized)) {
        return {...result, error: `unknown audio format \u201c${value}\u201d \u2014 use best, aac, flac, mp3, m4a, opus, vorbis, wav, or alac`}
      }
      result.audioFormat = normalized
    } else if (arg === '--video-format' || arg.startsWith('--video-format=')) {
      const value = arg === '--video-format' ? args[++index] : arg.slice('--video-format='.length)
      if (!value) return {...result, error: '--video-format needs a format: mp4, mkv, or webm'}
      const normalized = value.toLowerCase().trim() as VideoFormat
      if (!SUPPORTED_VIDEO_FORMATS.includes(normalized)) {
        return {...result, error: `unknown video format \u201c${value}\u201d \u2014 use mp4, mkv, or webm`}
      }
      result.videoFormat = normalized
    } else if (arg === '-o' || arg === '--output') {
      const value = args[++index]
      if (!value) return {...result, error: `${arg} needs a directory path`}
      result.outputDir = value
    } else if (arg.startsWith('--output=')) {
      const value = arg.slice('--output='.length)
      if (!value) return {...result, error: '--output needs a directory path'}
      result.outputDir = value
    } else if (arg === '--theme') {
      const value = args[++index]
      if (!value) return {...result, error: '--theme needs a value: auto, light, or dark'}
      if (!isThemeMode(value)) return {...result, error: `unknown theme \u201c${value}\u201d \u2014 use auto, light, or dark`}
      result.themeMode = value
    } else if (arg.startsWith('--theme=')) {
      const value = arg.slice('--theme='.length)
      if (!isThemeMode(value)) return {...result, error: `unknown theme \u201c${value}\u201d \u2014 use auto, light, or dark`}
      result.themeMode = value
    } else if (arg === '--photos-only') {
      result.photosOnly = true
    } else if (arg === '--videos-only') {
      result.videosOnly = true
    } else if (arg === '--cookies') {
      const value = args[++index]
      if (!value) return {...result, error: '--cookies needs a file path'}
      result.cookies = value
    } else if (arg.startsWith('--cookies=')) {
      const value = arg.slice('--cookies='.length)
      if (!value) return {...result, error: '--cookies needs a file path'}
      result.cookies = value
    } else if (arg === '--cookies-from-browser') {
      const value = args[++index]
      if (!value) return {...result, error: '--cookies-from-browser needs a browser name or spec'}
      result.cookiesFromBrowser = value
    } else if (arg.startsWith('--cookies-from-browser=')) {
      const value = arg.slice('--cookies-from-browser='.length)
      if (!value) return {...result, error: '--cookies-from-browser needs a browser name or spec'}
      result.cookiesFromBrowser = value
    } else if (arg === '--completion' || arg.startsWith('--completion=')) {
      const value = arg === '--completion' ? args[++index] : arg.slice('--completion='.length)
      if (!value) return {...result, error: '--completion needs a shell: bash, zsh, fish, or powershell'}
      const target = normalizeShell(value)
      if (!target) return {...result, error: `unknown shell \u201c${value}\u201d \u2014 use bash, zsh, fish, or powershell`}
      result.completion = target
    } else if (arg === '--skip-existing') {
      result.skipExisting = true
    } else if (arg === '--time' || arg === '--section') {
      const value = args[++index]
      if (!value) return {...result, error: `${arg} needs a time range (e.g. 01:30-03:45 or 90-180)`}
      if (!parseTimeRange(value)) return {...result, error: `invalid time range "${value}" — use MM:SS-MM:SS, HH:MM:SS-HH:MM:SS, or start-end seconds`}
      result.time = value
    } else if (arg.startsWith('--time=') || arg.startsWith('--section=')) {
      const prefix = arg.startsWith('--time=') ? '--time=' : '--section='
      const value = arg.slice(prefix.length)
      if (!value) return {...result, error: `${prefix.slice(0, -1)} needs a time range (e.g. 01:30-03:45 or 90-180)`}
      if (!parseTimeRange(value)) return {...result, error: `invalid time range "${value}" — use MM:SS-MM:SS, HH:MM:SS-HH:MM:SS, or start-end seconds`}
      result.time = value
    } else if (arg.startsWith('-')) {
      return {...result, error: `unknown option \u201c${arg}\u201d`}
    } else {
      positional.push(arg)
    }
  }

  if (positional.length > 1) return {...result, error: 'expected a single url'}
  if (positional.length === 1) result.initialUrl = positional[0]

  if (result.photosOnly && result.videosOnly) {
    return {...result, error: 'cannot use both --photos-only and --videos-only'}
  }

  if (result.format && !result.initialUrl && !result.help && !result.version && !result.completion) {
    return {...result, error: `--${result.format} requires a url`}
  }

  return result
}

function expandPath(dir: string): string {
  if (dir.startsWith('~/') || dir.startsWith('~\\') || dir === '~') {
    return path.join(os.homedir(), dir.slice(1))
  }
  return dir
}

export function resolveOutputDir(
  cliOutputDir?: string,
  envDir = process.env.OPEN_OMNI_DIR,
  configDir?: string,
  platformResolver: () => string = resolvePlatformDownloadsDir,
): string {
  if (cliOutputDir) return path.resolve(expandPath(cliOutputDir))
  if (envDir) return path.resolve(expandPath(envDir))
  if (configDir) return path.resolve(expandPath(configDir))
  return platformResolver()
}
