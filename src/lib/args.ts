import path from 'node:path'
import os from 'node:os'
import {isThemeMode, type ThemeMode} from '../theme.js'
import type {SubtitleOptions, ThumbnailOptions} from './ytdlp.js'

export type FormatMode = 'best' | 'mp3'

export type CliArgs = {
  help: boolean
  version: boolean
  initialUrl?: string
  themeMode?: ThemeMode
  format?: FormatMode
  outputDir?: string
  updateYtDlp?: boolean
  force?: boolean
  subtitles?: boolean | string
  embedSubs?: boolean
  thumb?: boolean
  embedThumb?: boolean
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

export function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = {help: false, version: false}
  const positional: string[] = []

  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!
    if (arg === '-h' || arg === '--help') {
      result.help = true
    } else if (arg === '-v' || arg === '--version') {
      result.version = true
    } else if (arg === '-U' || arg === '--update' || arg === '--update-ytdlp') {
      result.updateYtDlp = true
    } else if (arg === '--force') {
      result.force = true
    } else if (arg === '--embed-subs') {
      result.embedSubs = true
    } else if (arg === '--thumb') {
      result.thumb = true
    } else if (arg === '--embed-thumb') {
      result.embedThumb = true
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
      result.format = 'best'
    } else if (arg === '--mp3') {
      if (result.format === 'best') return {...result, error: 'cannot use both --best and --mp3'}
      result.format = 'mp3'
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
      if (!isThemeMode(value)) return {...result, error: `unknown theme “${value}” — use auto, light, or dark`}
      result.themeMode = value
    } else if (arg.startsWith('--theme=')) {
      const value = arg.slice('--theme='.length)
      if (!isThemeMode(value)) return {...result, error: `unknown theme “${value}” — use auto, light, or dark`}
      result.themeMode = value
    } else if (arg.startsWith('-')) {
      return {...result, error: `unknown option “${arg}”`}
    } else {
      positional.push(arg)
    }
  }

  if (positional.length > 1) return {...result, error: 'expected a single url'}
  if (positional.length === 1) result.initialUrl = positional[0]

  if (result.force && !result.updateYtDlp) {
    return {...result, error: '--force can only be used with -U or --update-ytdlp'}
  }

  if (result.format && !result.initialUrl && !result.help && !result.version) {
    return {...result, error: `--${result.format} requires a url`}
  }

  return result
}

export function resolveOutputDir(cliOutputDir?: string, envDir = process.env.OPEN_OMNI_DIR): string {
  if (cliOutputDir) return path.resolve(cliOutputDir)
  if (envDir) return path.resolve(envDir)
  return path.join(os.homedir(), 'Downloads')
}
