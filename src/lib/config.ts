import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type {ThemeMode} from '../theme.js'
import type {FormatMode} from './args.js'
import type {SubtitleOptions, ThumbnailOptions} from './ytdlp.js'

export type SubtitleConfig = {
  enabled?: boolean
  languages?: string
  embed?: boolean
}

export type ThumbnailConfig = {
  enabled?: boolean
  embed?: boolean
}

export type UserConfig = {
  outputDir?: string
  theme?: ThemeMode
  format?: FormatMode
  subtitles?: boolean | SubtitleConfig
  thumbnail?: boolean | ThumbnailConfig
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
    return parsed as UserConfig
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
  if (cliSubs !== undefined) return cliSubs
  if (configSubs === undefined) return undefined
  if (typeof configSubs === 'boolean') {
    return configSubs ? {enabled: true} : undefined
  }
  if (configSubs.enabled) {
    return {
      enabled: true,
      languages: configSubs.languages,
      embed: configSubs.embed,
    }
  }
  return undefined
}

export function resolveEffectiveThumbnail(
  cliThumb?: ThumbnailOptions,
  configThumb?: boolean | ThumbnailConfig,
): ThumbnailOptions | undefined {
  if (cliThumb !== undefined) return cliThumb
  if (configThumb === undefined) return undefined
  if (typeof configThumb === 'boolean') {
    return configThumb ? {enabled: true, write: true} : undefined
  }
  if (configThumb.enabled) {
    return {
      enabled: true,
      write: true,
      embed: configThumb.embed,
    }
  }
  return undefined
}
