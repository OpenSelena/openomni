import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {isThemeMode, type ThemeMode} from '../theme.js'
import {
  resolveOutputDir,
  toSubtitleOptions,
  toThumbnailOptions,
  toMetadataOptions,
  type CliArgs,
  type FormatMode,
  type AudioFormat,
  type VideoFormat,
  SUPPORTED_AUDIO_FORMATS,
  SUPPORTED_VIDEO_FORMATS,
} from './args.js'
import type {SubtitleOptions, ThumbnailOptions, MetadataOptions} from './ytdlp.js'

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

export type MetadataConfig = {
  enabled?: boolean
  embedChapters?: boolean
}

export type UserConfig = {
  outputDir?: string
  theme?: ThemeMode
  format?: FormatMode
  audioFormat?: AudioFormat
  videoFormat?: VideoFormat
  subtitles?: boolean | SubtitleConfig
  thumbnail?: boolean | ThumbnailConfig
  metadata?: boolean | MetadataConfig
  cookies?: string
  cookiesFromBrowser?: string
  proxy?: string
  geoBypass?: boolean
  geoCountry?: string
  limitRate?: string
  sponsorblock?: boolean
  sponsorblockRemove?: string
}

export type CookieOptions = {
  file?: string
  browser?: string
}

export type RuntimeConfig = {
  outDir: string
  themeMode: ThemeMode
  format?: FormatMode
  audioFormat?: AudioFormat
  videoFormat?: VideoFormat
  autoSelect?: FormatMode
  subtitles?: SubtitleOptions
  thumbnail?: ThumbnailOptions
  metadata?: MetadataOptions
  cookies?: CookieOptions
  proxy?: string
  geoBypass?: boolean
  geoCountry?: string
  limitRate?: string
  sponsorblock?: boolean
  sponsorblockRemove?: string
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

    const outDirVal = parsed.outputDir ?? parsed.outDir
    if (outDirVal !== undefined) {
      if (typeof outDirVal === 'string' && outDirVal.trim()) {
        result.outputDir = outDirVal.trim()
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

    if (parsed.audioFormat !== undefined) {
      if (typeof parsed.audioFormat === 'string' && (SUPPORTED_AUDIO_FORMATS as readonly string[]).includes(parsed.audioFormat.toLowerCase().trim())) {
        result.audioFormat = parsed.audioFormat.toLowerCase().trim() as AudioFormat
      } else {
        onWarning?.(`[open-omni] warning: invalid audioFormat “${parsed.audioFormat}” in ${configPath}`)
      }
    }

    if (parsed.videoFormat !== undefined) {
      if (typeof parsed.videoFormat === 'string' && (SUPPORTED_VIDEO_FORMATS as readonly string[]).includes(parsed.videoFormat.toLowerCase().trim())) {
        result.videoFormat = parsed.videoFormat.toLowerCase().trim() as VideoFormat
      } else {
        onWarning?.(`[open-omni] warning: invalid videoFormat “${parsed.videoFormat}” in ${configPath}`)
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

    if (parsed.metadata !== undefined) {
      if (typeof parsed.metadata === 'boolean' || (typeof parsed.metadata === 'object' && parsed.metadata !== null)) {
        result.metadata = parsed.metadata
      } else {
        onWarning?.(`[open-omni] warning: invalid metadata setting in ${configPath}`)
      }
    }

    if (parsed.cookies !== undefined) {
      if (typeof parsed.cookies === 'string' && parsed.cookies.trim()) {
        result.cookies = parsed.cookies.trim()
      } else {
        onWarning?.(`[open-omni] warning: invalid cookies setting in ${configPath} (expected string path)`)
      }
    }

    if (parsed.cookiesFromBrowser !== undefined) {
      if (typeof parsed.cookiesFromBrowser === 'string' && parsed.cookiesFromBrowser.trim()) {
        result.cookiesFromBrowser = parsed.cookiesFromBrowser.trim()
      } else {
        onWarning?.(`[open-omni] warning: invalid cookiesFromBrowser setting in ${configPath} (expected string)`)
      }
    }

    if (parsed.proxy !== undefined) {
      if (typeof parsed.proxy === 'string' && parsed.proxy.trim()) {
        result.proxy = parsed.proxy.trim()
      } else {
        onWarning?.(`[open-omni] warning: invalid proxy in ${configPath} (expected string URL)`)
      }
    }

    if (parsed.geoBypass !== undefined) {
      if (typeof parsed.geoBypass === 'boolean') {
        result.geoBypass = parsed.geoBypass
      } else {
        onWarning?.(`[open-omni] warning: invalid geoBypass setting in ${configPath} (expected boolean)`)
      }
    }

    if (parsed.geoCountry !== undefined) {
      if (typeof parsed.geoCountry === 'string' && /^[a-zA-Z]{2}$/.test(parsed.geoCountry.trim())) {
        result.geoCountry = parsed.geoCountry.trim().toUpperCase()
      } else {
        onWarning?.(`[open-omni] warning: invalid geoCountry in ${configPath} (expected 2-letter country code)`)
      }
    }

    if (parsed.limitRate !== undefined) {
      if (typeof parsed.limitRate === 'string' && /^\d+(\.\d+)?[kKmMgGbB]?$/.test(parsed.limitRate.trim())) {
        result.limitRate = parsed.limitRate.trim()
      } else {
        onWarning?.(`[open-omni] warning: invalid limitRate in ${configPath} (expected format like 50K, 1.5M, 2G)`)
      }
    }

    if (parsed.sponsorblock !== undefined) {
      if (typeof parsed.sponsorblock === 'boolean') {
        result.sponsorblock = parsed.sponsorblock
      } else {
        onWarning?.(`[open-omni] warning: invalid sponsorblock setting in ${configPath} (expected boolean)`)
      }
    }

    if (parsed.sponsorblockRemove !== undefined) {
      if (typeof parsed.sponsorblockRemove === 'string' && parsed.sponsorblockRemove.trim()) {
        result.sponsorblockRemove = parsed.sponsorblockRemove.trim()
      } else {
        onWarning?.(`[open-omni] warning: invalid sponsorblockRemove setting in ${configPath} (expected string)`)
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

export function resolveEffectiveMetadata(
  cliMetadata?: MetadataOptions,
  configMetadata?: boolean | MetadataConfig,
): MetadataOptions | undefined {
  const normConfig =
    typeof configMetadata === 'boolean'
      ? {enabled: configMetadata}
      : configMetadata

  if (cliMetadata) {
    const enabled = cliMetadata.enabled ?? normConfig?.enabled
    const embedChapters = cliMetadata.embedChapters ?? normConfig?.embedChapters
    if (enabled || embedChapters) {
      return {
        enabled: Boolean(enabled),
        embedChapters: Boolean(embedChapters),
      }
    }
    return undefined
  }

  if (normConfig?.enabled || normConfig?.embedChapters) {
    return {
      enabled: Boolean(normConfig.enabled),
      embedChapters: Boolean(normConfig.embedChapters),
    }
  }

  return undefined
}

export function resolveEffectiveAudioFormat(
  cliFormat?: AudioFormat,
  configFormat?: AudioFormat,
): AudioFormat | undefined {
  return cliFormat ?? configFormat
}

export function resolveEffectiveVideoFormat(
  cliFormat?: VideoFormat,
  configFormat?: VideoFormat,
): VideoFormat | undefined {
  return cliFormat ?? configFormat
}

export function resolveEffectiveCookies(
  cliArgs: CliArgs,
  userConfig: UserConfig = {},
): CookieOptions | undefined {
  const file = cliArgs.cookies ?? userConfig.cookies
  const browser = cliArgs.cookiesFromBrowser ?? userConfig.cookiesFromBrowser
  if (!file && !browser) return undefined
  return {file, browser}
}

export function resolveEffectiveProxy(
  cliProxy?: string,
  env: NodeJS.ProcessEnv = process.env,
  configProxy?: string,
): string | undefined {
  if (cliProxy && cliProxy.trim()) return cliProxy.trim()
  const envCandidates = [
    env.ALL_PROXY,
    env.all_proxy,
    env.HTTPS_PROXY,
    env.https_proxy,
    env.HTTP_PROXY,
    env.http_proxy,
  ]
  for (const candidate of envCandidates) {
    if (candidate && candidate.trim()) return candidate.trim()
  }
  if (configProxy && configProxy.trim()) return configProxy.trim()
  return undefined
}

export function resolveRuntimeConfig(
  args: CliArgs,
  userConfig: UserConfig = {},
): RuntimeConfig {
  const cliSubs = toSubtitleOptions(args)
  const cliThumb = toThumbnailOptions(args)
  const cliMetadata = toMetadataOptions(args)

  return {
    outDir: resolveOutputDir(args.outputDir, process.env.OPEN_OMNI_DIR, userConfig.outputDir),
    themeMode: resolveEffectiveTheme(args.themeMode, userConfig.theme),
    format: resolveEffectiveFormat(args.format, userConfig.format),
    audioFormat: resolveEffectiveAudioFormat(args.audioFormat, userConfig.audioFormat),
    videoFormat: resolveEffectiveVideoFormat(args.videoFormat, userConfig.videoFormat),
    autoSelect: args.format ?? (args.audioFormat ? 'mp3' : undefined),
    subtitles: resolveEffectiveSubtitles(cliSubs, userConfig.subtitles),
    thumbnail: resolveEffectiveThumbnail(cliThumb, userConfig.thumbnail),
    metadata: resolveEffectiveMetadata(cliMetadata, userConfig.metadata),
    cookies: resolveEffectiveCookies(args, userConfig),
    proxy: resolveEffectiveProxy(args.proxy, process.env, userConfig.proxy),
    geoBypass: args.geoBypass ?? userConfig.geoBypass,
    geoCountry: args.geoCountry ?? userConfig.geoCountry,
    limitRate: args.limitRate ?? userConfig.limitRate,
    sponsorblock: args.sponsorblock ?? userConfig.sponsorblock ?? (Boolean(userConfig.sponsorblockRemove) ? true : undefined),
    sponsorblockRemove: args.sponsorblockRemove ?? userConfig.sponsorblockRemove,
  }
}
