import path from 'node:path'
import os from 'node:os'
import {isThemeMode, type ThemeMode} from '../theme.js'

export type FormatMode = 'best' | 'mp3'

export type CliArgs = {
  help: boolean
  version: boolean
  initialUrl?: string
  themeMode?: ThemeMode
  format?: FormatMode
  outputDir?: string
  error?: string
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
  result.initialUrl = positional[0]

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
