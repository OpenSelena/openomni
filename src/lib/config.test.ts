import assert from 'node:assert/strict'
import test from 'node:test'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'
import {
  resolveConfigPath,
  loadConfig,
  resolveEffectiveTheme,
  resolveEffectiveFormat,
  resolveEffectiveSubtitles,
  resolveEffectiveThumbnail,
  resolveRuntimeConfig,
  type UserConfig,
} from './config.js'
import {resolveOutputDir} from './args.js'

test('resolveConfigPath respects XDG_CONFIG_HOME when present', () => {
  const customXdg = path.join(os.tmpdir(), 'custom-xdg')
  const resolved = resolveConfigPath({XDG_CONFIG_HOME: customXdg})
  assert.equal(resolved, path.join(customXdg, 'open-omni', 'config.json'))
})

test('resolveConfigPath defaults to ~/.config/open-omni/config.json', () => {
  const resolved = resolveConfigPath({})
  assert.equal(resolved, path.join(os.homedir(), '.config', 'open-omni', 'config.json'))
})

test('loadConfig returns empty object when file does not exist', () => {
  const nonexistent = path.join(os.tmpdir(), 'open-omni-test-' + Date.now(), 'config.json')
  const config = loadConfig(nonexistent)
  assert.deepEqual(config, {})
})

test('loadConfig parses valid config json', () => {
  const tempDir = path.join(os.tmpdir(), 'open-omni-test-valid-' + Date.now())
  fs.mkdirSync(tempDir, {recursive: true})
  const configFile = path.join(tempDir, 'config.json')
  fs.writeFileSync(
    configFile,
    JSON.stringify({
      outputDir: '~/CustomVideos',
      theme: 'dark',
      format: 'best',
      subtitles: {enabled: true, languages: 'es,en', embed: true},
      thumbnail: {enabled: true, embed: false},
    }),
    'utf8'
  )

  const config = loadConfig(configFile)
  assert.equal(config.outputDir, '~/CustomVideos')
  assert.equal(config.theme, 'dark')
  assert.equal(config.format, 'best')
  assert.deepEqual(config.subtitles, {enabled: true, languages: 'es,en', embed: true})
  assert.deepEqual(config.thumbnail, {enabled: true, embed: false})

  fs.rmSync(tempDir, {recursive: true, force: true})
})

test('loadConfig accepts outDir alias for outputDir', () => {
  const tempDir = path.join(os.tmpdir(), 'open-omni-test-outdir-' + Date.now())
  fs.mkdirSync(tempDir, {recursive: true})
  const configFile = path.join(tempDir, 'config.json')
  fs.writeFileSync(
    configFile,
    JSON.stringify({
      outDir: '~/AliasVideos',
    }),
    'utf8'
  )

  const config = loadConfig(configFile)
  assert.equal(config.outputDir, '~/AliasVideos')

  fs.rmSync(tempDir, {recursive: true, force: true})
})

test('loadConfig handles invalid json with warning callback without throwing', () => {
  const tempDir = path.join(os.tmpdir(), 'open-omni-test-invalid-' + Date.now())
  fs.mkdirSync(tempDir, {recursive: true})
  const configFile = path.join(tempDir, 'config.json')
  fs.writeFileSync(configFile, '{ invalid json: , }', 'utf8')

  let warningMessage = ''
  const config = loadConfig(configFile, msg => {
    warningMessage = msg
  })

  assert.deepEqual(config, {})
  assert.ok(warningMessage.includes('warning:'))

  fs.rmSync(tempDir, {recursive: true, force: true})
})

test('resolveEffectiveTheme respects CLI over config over default', () => {
  assert.equal(resolveEffectiveTheme('light', 'dark'), 'light')
  assert.equal(resolveEffectiveTheme(undefined, 'dark'), 'dark')
  assert.equal(resolveEffectiveTheme(undefined, undefined), 'auto')
})

test('resolveEffectiveFormat respects CLI over config', () => {
  assert.equal(resolveEffectiveFormat('mp3', 'best'), 'mp3')
  assert.equal(resolveEffectiveFormat(undefined, 'best'), 'best')
  assert.equal(resolveEffectiveFormat(undefined, undefined), undefined)
})

test('resolveEffectiveSubtitles respects CLI over config and handles boolean/object shapes', () => {
  const cliSubs = {enabled: true, languages: 'fr', embed: false}
  assert.deepEqual(resolveEffectiveSubtitles(cliSubs, {enabled: true, languages: 'es'}), cliSubs)

  assert.deepEqual(resolveEffectiveSubtitles(undefined, true), {enabled: true})
  assert.deepEqual(resolveEffectiveSubtitles(undefined, false), undefined)
  assert.deepEqual(resolveEffectiveSubtitles(undefined, {enabled: true, languages: 'ja', embed: true}), {
    enabled: true,
    languages: 'ja',
    embed: true,
  })
  assert.deepEqual(resolveEffectiveSubtitles(undefined, {enabled: false}), undefined)
  assert.deepEqual(resolveEffectiveSubtitles(undefined, undefined), undefined)
})

test('resolveEffectiveThumbnail respects CLI over config and handles boolean/object shapes', () => {
  const cliThumb = {enabled: true, write: true, embed: true}
  assert.deepEqual(resolveEffectiveThumbnail(cliThumb, {enabled: true, embed: false}), cliThumb)

  assert.deepEqual(resolveEffectiveThumbnail(undefined, true), {enabled: true, write: true})
  assert.deepEqual(resolveEffectiveThumbnail(undefined, false), undefined)
  assert.deepEqual(resolveEffectiveThumbnail(undefined, {enabled: true, embed: true}), {
    enabled: true,
    write: true,
    embed: true,
  })
  assert.deepEqual(resolveEffectiveThumbnail(undefined, {enabled: false}), undefined)
  assert.deepEqual(resolveEffectiveThumbnail(undefined, undefined), undefined)
})

test('resolveOutputDir priority: CLI > OPEN_OMNI_DIR > config > Platform Known Folder', () => {
  const customKnownFolder = '/platform/downloads'
  assert.equal(resolveOutputDir('/cli', '/env', '/config', () => customKnownFolder), path.resolve('/cli'))
  assert.equal(resolveOutputDir(undefined, '/env', '/config', () => customKnownFolder), path.resolve('/env'))
  assert.equal(resolveOutputDir(undefined, '', '/config', () => customKnownFolder), path.resolve('/config'))
  assert.equal(resolveOutputDir(undefined, '', undefined, () => customKnownFolder), customKnownFolder)
})

test('loadConfig discards invalid theme and format with warnings', () => {
  const tempDir = path.join(os.tmpdir(), 'open-omni-test-schema-' + Date.now())
  fs.mkdirSync(tempDir, {recursive: true})
  const configFile = path.join(tempDir, 'config.json')
  fs.writeFileSync(
    configFile,
    JSON.stringify({
      theme: 'neon',
      format: 'wav',
      outputDir: 12345,
      subtitles: 'invalid',
      thumbnail: 'invalid',
    }),
    'utf8'
  )

  const warnings: string[] = []
  const config = loadConfig(configFile, msg => {
    warnings.push(msg)
  })

  assert.deepEqual(config, {})
  assert.equal(warnings.length, 5)
  assert.ok(warnings.some(w => w.includes('invalid theme')))
  assert.ok(warnings.some(w => w.includes('invalid format')))
  assert.ok(warnings.some(w => w.includes('invalid outputDir')))

  fs.rmSync(tempDir, {recursive: true, force: true})
})

test('resolveEffectiveSubtitles merges CLI embed with config languages', () => {
  const cliSubs = {enabled: true, embed: true}
  const configSubs = {enabled: true, languages: 'es,en'}
  const merged = resolveEffectiveSubtitles(cliSubs, configSubs)
  assert.deepEqual(merged, {
    enabled: true,
    languages: 'es,en',
    embed: true,
  })
})

test('resolveRuntimeConfig combines CLI, env, and config correctly', () => {
  const runtime = resolveRuntimeConfig(
    {
      help: false,
      version: false,
      outputDir: undefined,
      themeMode: undefined,
      format: undefined,
      subtitles: true,
      embedSubs: false,
    },
    {
      outputDir: '~/CustomVideos',
      theme: 'dark',
      format: 'best',
      subtitles: {languages: 'ja'},
    }
  )

  assert.equal(runtime.themeMode, 'dark')
  assert.equal(runtime.format, 'best')
  assert.equal(runtime.autoSelect, undefined) // Persistent format does not trigger autoSelect exit
  assert.deepEqual(runtime.subtitles, {
    enabled: true,
    languages: 'ja',
    embed: false,
  })
})

