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
  resolveEffectiveMetadata,
  resolveEffectiveProxy,
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

test('loadConfig and resolveRuntimeConfig handle cookies and cookiesFromBrowser', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-omni-cookies-config-test-'))
  const configPath = path.join(tempDir, 'config.json')

  fs.writeFileSync(
    configPath,
    JSON.stringify({
      cookies: '/path/to/cookies.txt',
      cookiesFromBrowser: 'firefox',
    })
  )

  const loaded = loadConfig(configPath)
  assert.equal(loaded.cookies, '/path/to/cookies.txt')
  assert.equal(loaded.cookiesFromBrowser, 'firefox')

  // CLI overrides config
  const runtime = resolveRuntimeConfig(
    {
      help: false,
      version: false,
      cookies: '/cli/cookies.txt',
      cookiesFromBrowser: undefined,
    },
    loaded
  )

  assert.deepEqual(runtime.cookies, {
    file: '/cli/cookies.txt',
    browser: 'firefox',
  })

  fs.rmSync(tempDir, {recursive: true, force: true})
})

test('loadConfig and resolveRuntimeConfig handle metadata configuration', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-omni-metadata-config-test-'))
  const configPath = path.join(tempDir, 'config.json')

  fs.writeFileSync(
    configPath,
    JSON.stringify({
      metadata: {enabled: true, embedChapters: true},
    })
  )

  const loaded = loadConfig(configPath)
  assert.deepEqual(loaded.metadata, {enabled: true, embedChapters: true})

  const runtimeFromConfig = resolveRuntimeConfig(
    {help: false, version: false},
    loaded
  )
  assert.deepEqual(runtimeFromConfig.metadata, {
    enabled: true,
    embedChapters: true,
  })

  // CLI enables metadata while inheriting embedChapters from config
  const runtimeCliInherit = resolveRuntimeConfig(
    {help: false, version: false, metadata: true},
    {metadata: {enabled: false, embedChapters: true}}
  )
  assert.deepEqual(runtimeCliInherit.metadata, {
    enabled: true,
    embedChapters: true,
  })

  // CLI specifies both flags explicitly
  const runtimeCliExplicit = resolveRuntimeConfig(
    {help: false, version: false, metadata: true, embedChapters: true},
    {metadata: {enabled: false, embedChapters: false}}
  )
  assert.deepEqual(runtimeCliExplicit.metadata, {
    enabled: true,
    embedChapters: true,
  })

  fs.rmSync(tempDir, {recursive: true, force: true})
})

test('resolveRuntimeConfig sets autoSelect when audioFormat CLI flag is passed', () => {
  const fromCli = resolveRuntimeConfig({help: false, version: false, audioFormat: 'flac'})
  assert.equal(fromCli.autoSelect, 'mp3')
  assert.equal(fromCli.audioFormat, 'flac')

  // audioFormat only in userConfig does NOT trigger autoSelect
  const fromConfig = resolveRuntimeConfig({help: false, version: false}, {audioFormat: 'flac'})
  assert.equal(fromConfig.autoSelect, undefined)
  assert.equal(fromConfig.audioFormat, 'flac')
})

test('loadConfig and resolveRuntimeConfig handle audioFormat configuration', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-omni-audio-format-test-'))
  const configPath = path.join(tempDir, 'config.json')

  fs.writeFileSync(
    configPath,
    JSON.stringify({
      audioFormat: 'flac',
    })
  )

  const loaded = loadConfig(configPath)
  assert.equal(loaded.audioFormat, 'flac')

  const runtime = resolveRuntimeConfig({help: false, version: false}, loaded)
  assert.equal(runtime.audioFormat, 'flac')

  const runtimeOverride = resolveRuntimeConfig(
    {help: false, version: false, audioFormat: 'opus'},
    loaded
  )
  assert.equal(runtimeOverride.audioFormat, 'opus')

  fs.rmSync(tempDir, {recursive: true, force: true})
})

test('loadConfig and resolveRuntimeConfig handle videoFormat configuration', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-omni-video-format-test-'))
  const configPath = path.join(tempDir, 'config.json')

  fs.writeFileSync(
    configPath,
    JSON.stringify({
      videoFormat: 'mkv',
    })
  )

  const loaded = loadConfig(configPath)
  assert.equal(loaded.videoFormat, 'mkv')

  const runtime = resolveRuntimeConfig({help: false, version: false}, loaded)
  assert.equal(runtime.videoFormat, 'mkv')

  const runtimeOverride = resolveRuntimeConfig(
    {help: false, version: false, videoFormat: 'webm'},
    loaded
  )
  assert.equal(runtimeOverride.videoFormat, 'webm')

  fs.rmSync(tempDir, {recursive: true, force: true})
})

test('loadConfig and resolveRuntimeConfig handle proxy configuration', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-omni-proxy-test-'))
  const configPath = path.join(tempDir, 'config.json')

  fs.writeFileSync(
    configPath,
    JSON.stringify({
      proxy: 'http://127.0.0.1:8080',
    })
  )

  const loaded = loadConfig(configPath)
  assert.equal(loaded.proxy, 'http://127.0.0.1:8080')

  fs.rmSync(tempDir, {recursive: true, force: true})
})

test('resolveEffectiveProxy enforces precedence CLI > ALL_PROXY/HTTPS_PROXY/HTTP_PROXY > UserConfig.proxy', () => {
  // 1. CLI wins over all
  assert.equal(
    resolveEffectiveProxy(
      'http://cli-proxy:8080',
      {ALL_PROXY: 'http://env-proxy:8080'},
      'http://cfg-proxy:8080'
    ),
    'http://cli-proxy:8080'
  )

  // 2. ALL_PROXY wins over config
  assert.equal(
    resolveEffectiveProxy(
      undefined,
      {ALL_PROXY: 'http://all-proxy:8080', HTTPS_PROXY: 'http://https-proxy:8080'},
      'http://cfg-proxy:8080'
    ),
    'http://all-proxy:8080'
  )

  // 3. HTTPS_PROXY wins over config when ALL_PROXY absent
  assert.equal(
    resolveEffectiveProxy(
      undefined,
      {HTTPS_PROXY: 'http://https-proxy:8080'},
      'http://cfg-proxy:8080'
    ),
    'http://https-proxy:8080'
  )

  // 4. HTTP_PROXY wins over config
  assert.equal(
    resolveEffectiveProxy(
      undefined,
      {HTTP_PROXY: 'http://http-proxy:8080'},
      'http://cfg-proxy:8080'
    ),
    'http://http-proxy:8080'
  )

  // 5. Config proxy used when CLI and env absent
  assert.equal(
    resolveEffectiveProxy(
      undefined,
      {},
      'http://cfg-proxy:8080'
    ),
    'http://cfg-proxy:8080'
  )

  // 6. Whitespace-only and empty env vars are ignored and fall through
  assert.equal(
    resolveEffectiveProxy(
      undefined,
      {ALL_PROXY: '   ', HTTPS_PROXY: 'http://fallback-proxy:8080'},
      'http://cfg-proxy:8080'
    ),
    'http://fallback-proxy:8080'
  )
  assert.equal(
    resolveEffectiveProxy(
      undefined,
      {ALL_PROXY: '', HTTPS_PROXY: '', HTTP_PROXY: 'http://http-fallback:8080'},
      'http://cfg-proxy:8080'
    ),
    'http://http-fallback:8080'
  )

  // 7. Undefined when nothing is set
  assert.equal(
    resolveEffectiveProxy(
      undefined,
      {},
      undefined
    ),
    undefined
  )
})

test('resolveRuntimeConfig correctly forwards proxy, geo, limitRate, and sponsorblock', () => {
  const runtime = resolveRuntimeConfig({
    help: false,
    version: false,
    proxy: 'http://proxy.local:8080',
    geoBypass: true,
    geoCountry: 'US',
    limitRate: '1.5M',
    sponsorblock: true,
    sponsorblockRemove: 'sponsor,intro',
  })

  assert.equal(runtime.proxy, 'http://proxy.local:8080')
  assert.equal(runtime.geoBypass, true)
  assert.equal(runtime.geoCountry, 'US')
  assert.equal(runtime.limitRate, '1.5M')
  assert.equal(runtime.sponsorblock, true)
  assert.equal(runtime.sponsorblockRemove, 'sponsor,intro')
})

test('loadConfig and resolveRuntimeConfig handle limitRate and sponsorblock in user config', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-omni-opts-test-'))
  const configPath = path.join(tempDir, 'config.json')

  fs.writeFileSync(
    configPath,
    JSON.stringify({
      limitRate: '2M',
      sponsorblock: true,
      sponsorblockRemove: 'all',
    })
  )

  const loaded = loadConfig(configPath)
  assert.equal(loaded.limitRate, '2M')
  assert.equal(loaded.sponsorblock, true)
  assert.equal(loaded.sponsorblockRemove, 'all')

  const runtime = resolveRuntimeConfig({help: false, version: false}, loaded)
  assert.equal(runtime.limitRate, '2M')
  assert.equal(runtime.sponsorblock, true)
  assert.equal(runtime.sponsorblockRemove, 'all')

  // CLI override wins
  const runtimeOverride = resolveRuntimeConfig(
    {help: false, version: false, limitRate: '500K', sponsorblockRemove: 'sponsor'},
    loaded
  )
  assert.equal(runtimeOverride.limitRate, '500K')
  assert.equal(runtimeOverride.sponsorblockRemove, 'sponsor')

  fs.rmSync(tempDir, {recursive: true, force: true})
})

test('loadConfig and resolveRuntimeConfig handle geoBypass and geoCountry in user config', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-omni-geo-test-'))
  const configPath = path.join(tempDir, 'config.json')

  fs.writeFileSync(
    configPath,
    JSON.stringify({
      geoBypass: true,
      geoCountry: 'jp',
    })
  )

  const warnings: string[] = []
  const loaded = loadConfig(configPath, msg => warnings.push(msg))
  assert.equal(loaded.geoBypass, true)
  assert.equal(loaded.geoCountry, 'JP')
  assert.equal(warnings.length, 0)

  // Fallback to userConfig when CLI flags are absent
  const runtime = resolveRuntimeConfig({help: false, version: false}, loaded)
  assert.equal(runtime.geoBypass, true)
  assert.equal(runtime.geoCountry, 'JP')

  // CLI override takes precedence over userConfig
  const runtimeOverride = resolveRuntimeConfig(
    {help: false, version: false, geoBypass: false, geoCountry: 'US'},
    loaded
  )
  assert.equal(runtimeOverride.geoCountry, 'US')

  fs.rmSync(tempDir, {recursive: true, force: true})
})

test('loadConfig discards invalid geoBypass and geoCountry with warnings', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-omni-geo-invalid-test-'))
  const configPath = path.join(tempDir, 'config.json')

  fs.writeFileSync(
    configPath,
    JSON.stringify({
      geoBypass: 'not-a-boolean',
      geoCountry: 'INVALID',
    })
  )

  const warnings: string[] = []
  const loaded = loadConfig(configPath, msg => warnings.push(msg))
  assert.equal(loaded.geoBypass, undefined)
  assert.equal(loaded.geoCountry, undefined)
  assert.equal(warnings.length, 2)
  assert.ok(warnings.some(w => w.includes('invalid geoBypass')))
  assert.ok(warnings.some(w => w.includes('invalid geoCountry')))

  fs.rmSync(tempDir, {recursive: true, force: true})
})






