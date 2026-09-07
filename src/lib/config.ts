import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {isThemeMode, type ThemeMode} from '../theme.js'
import {
  resolveOutputDir,
  toSubtitleOptions,
  toThumbnailOptions,
  type CliArgs,
  type FormatMode,
} from './args.js'
import type {SubtitleOptions, ThumbnailOptions} from './ytdlp.js'

export type SubtitleConfig = {
  enabled?: boolean
  languages?: string
  embed?: boolean
}

export type ThumbnailConfig = {
  enabled?: boolean
  write?: boolean
  embed?: boolean
}

export type UserConfig = {
  outputDir?: string
  theme?: ThemeMode
  format?: FormatMode
  subtitles?: boolean | SubtitleConfig
  thumbnail?: boolean | ThumbnailConfig
}

export type RuntimeConfig = {
  outDir: string
  themeMode: ThemeMode
  format?: FormatMode
  autoSelect?: FormatMode
  subtitles?: SubtitleOptions
  thumbnail?: ThumbnailOptions
}

export function resolveConfigPath(env: NodeJS.ProcessEnv = process.env): string {
  if (env.XDG_CONFIG_HOME) {
    return path.join(env.XDG_CONFIG_HOME, 'open-omni', 'config.json')
  }
  const standardPath = path.join(os.homedir(), '.config', 'open-omni', 'config.json')
  if (process.platform === 'win32' && env.APPDATA) {
    const winAppDataPath = path.join(env.APPDATA, 'open-omni', 'config.json')
    if (fs.existsSync(winAppDataPath) && !fs.existsSync(standardPath)) {
      return winAppDataPath
    }
  }
  return standardPath
}

export function loadConfig(
  configPath: string = resolveConfigPath(),
  onWarning?: (msg: string) => void,
): UserConfig {
  try {
    if (!fs.existsSync(configPath)) {
      return {}
    }
    const raw = fs.readFileSync(configPath, 'utf8')
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      onWarning?.(`[open-omni] warning: config at ${configPath} must be a JSON object`)
      return {}
    }

    const result: UserConfig = {}

    if (parsed.outputDir !== undefined) {
      if (typeof parsed.outputDir === 'string' && parsed.outputDir.trim()) {
        result.outputDir = parsed.outputDir.trim()
      } else {
        onWarning?.(`[open-omni] warning: invalid outputDir in ${configPath} (expected string)`)
      }
    }

    if (parsed.theme !== undefined) {
      if (isThemeMode(parsed.theme)) {
        result.theme = parsed.theme
      } else {
        onWarning?.(`[open-omni] warning: invalid theme “${parsed.theme}” in ${configPath} (expected auto, light, or dark)`)
      }
    }

    if (parsed.format !== undefined) {
      if (parsed.format === 'best' || parsed.format === 'mp3') {
        result.format = parsed.format
      } else {
        onWarning?.(`[open-omni] warning: invalid format “${parsed.format}” in ${configPath} (expected best or mp3)`)
      }
    }

    if (parsed.subtitles !== undefined) {
      if (typeof parsed.subtitles === 'boolean' || (typeof parsed.subtitles === 'object' && parsed.subtitles !== null)) {
        result.subtitles = parsed.subtitles
      } else {
        onWarning?.(`[open-omni] warning: invalid subtitles setting in ${configPath}`)
      }
    }

    if (parsed.thumbnail !== undefined) {
      if (typeof parsed.thumbnail === 'boolean' || (typeof parsed.thumbnail === 'object' && parsed.thumbnail !== null)) {
        result.thumbnail = parsed.thumbnail
      } else {
        onWarning?.(`[open-omni] warning: invalid thumbnail setting in ${configPath}`)
      }
    }

    return result
  } catch (error) {
    onWarning?.(`[open-omni] warning: failed to parse config at ${configPath}: ${error instanceof Error ? error.message : String(error)}`)
    return {}
  }
}

export function resolveEffectiveTheme(
  cliTheme?: ThemeMode,
  configTheme?: ThemeMode,
): ThemeMode {
  return cliTheme ?? configTheme ?? 'auto'
}

export function resolveEffectiveFormat(
  cliFormat?: FormatMode,
  configFormat?: FormatMode,
): FormatMode | undefined {
  return cliFormat ?? configFormat
}

export function resolveEffectiveSubtitles(
  cliSubs?: SubtitleOptions,
  configSubs?: boolean | SubtitleConfig,
): SubtitleOptions | undefined {
  const normConfig =
    typeof configSubs === 'boolean'
      ? {enabled: configSubs}
      : configSubs

  if (cliSubs) {
    const result: SubtitleOptions = {enabled: cliSubs.enabled}
    const languages = cliSubs.languages ?? normConfig?.languages
    const embed = cliSubs.embed ?? normConfig?.embed
    if (languages !== undefined) result.languages = languages
    if (embed !== undefined) result.embed = embed
    return result
  }

  if (normConfig?.enabled) {
    const result: SubtitleOptions = {enabled: true}
    if (normConfig.languages !== undefined) result.languages = normConfig.languages
    if (normConfig.embed !== undefined) result.embed = normConfig.embed
    return result
  }

  return undefined
}

export function resolveEffectiveThumbnail(
  cliThumb?: ThumbnailOptions,
  configThumb?: boolean | ThumbnailConfig,
): ThumbnailOptions | undefined {
  const normConfig =
    typeof configThumb === 'boolean'
      ? {enabled: configThumb, write: configThumb}
      : configThumb

  if (cliThumb) {
    const result: ThumbnailOptions = {
      enabled: cliThumb.enabled,
      write: cliThumb.write ?? (normConfig?.write !== false),
    }
    const embed = cliThumb.embed ?? normConfig?.embed
    if (embed !== undefined) result.embed = embed
    return result
  }

  if (normConfig?.enabled) {
    const result: ThumbnailOptions = {
      enabled: true,
      write: normConfig.write ?? true,
    }
    if (normConfig.embed !== undefined) result.embed = normConfig.embed
    return result
  }

  return undefined
}

export function resolveRuntimeConfig(
  args: CliArgs,
  userConfig: UserConfig = {},
): RuntimeConfig {
  const cliSubs = toSubtitleOptions(args)
  const cliThumb = toThumbnailOptions(args)

  return {
    outDir: resolveOutputDir(args.outputDir, process.env.OPEN_OMNI_DIR, userConfig.outputDir),
    themeMode: resolveEffectiveTheme(args.themeMode, userConfig.theme),
    format: resolveEffectiveFormat(args.format, userConfig.format),
    autoSelect: args.format,
    subtitles: resolveEffectiveSubtitles(cliSubs, userConfig.subtitles),
    thumbnail: resolveEffectiveThumbnail(cliThumb, userConfig.thumbnail),
  }
}
