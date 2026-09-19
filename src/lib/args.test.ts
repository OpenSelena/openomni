import assert from 'node:assert/strict'
import test from 'node:test'
import path from 'node:path'
import os from 'node:os'
import {parseArgs, resolveOutputDir, toSubtitleOptions, toThumbnailOptions, toMetadataOptions} from './args.js'
import {terminalLink} from './format.js'
import {isThemeMode, nextThemeMode, themeFor} from '../theme.js'

test('parses a url and a spaced theme option without confusing the value for the url', () => {
  assert.deepEqual(parseArgs(['--theme', 'light', 'https://example.com/video']), {
    help: false,
    version: false,
    themeMode: 'light',
    initialUrl: 'https://example.com/video',
  })
})

test('parses an equals-style theme option after the url', () => {
  assert.deepEqual(parseArgs(['https://example.com/video', '--theme=dark']), {
    help: false,
    version: false,
    themeMode: 'dark',
    initialUrl: 'https://example.com/video',
  })
})

test('rejects missing, invalid, and unknown options', () => {
  assert.match(parseArgs(['--theme']).error ?? '', /needs a value/)
  assert.match(parseArgs(['--theme', 'sepia']).error ?? '', /unknown theme/)
  assert.match(parseArgs(['--wat']).error ?? '', /unknown option/)
  assert.match(parseArgs(['one', 'two']).error ?? '', /single url/)
  assert.match(parseArgs(['--best', '--mp3', 'https://example.com']).error ?? '', /cannot use both/)
  assert.match(parseArgs(['--best']).error ?? '', /requires a url/)
  assert.match(parseArgs(['--mp3']).error ?? '', /requires a url/)
  assert.match(parseArgs(['-o']).error ?? '', /needs a directory path/)
  assert.match(parseArgs(['--output']).error ?? '', /needs a directory path/)
})

test('parses scriptable format flags (--best, --mp3) and output directory (-o, --output)', () => {
  assert.deepEqual(parseArgs(['--best', 'https://example.com/video']), {
    help: false,
    version: false,
    format: 'best',
    initialUrl: 'https://example.com/video',
  })

  assert.deepEqual(parseArgs(['https://example.com/video', '--mp3']), {
    help: false,
    version: false,
    format: 'mp3',
    initialUrl: 'https://example.com/video',
  })

  assert.deepEqual(parseArgs(['-o', './out', 'https://example.com/video']), {
    help: false,
    version: false,
    outputDir: './out',
    initialUrl: 'https://example.com/video',
  })

  assert.deepEqual(parseArgs(['--output=/custom/dir', 'https://example.com/video']), {
    help: false,
    version: false,
    outputDir: '/custom/dir',
    initialUrl: 'https://example.com/video',
  })
})

test('parses subtitle flags (--subs, --subs=lang, --embed-subs)', () => {
  assert.deepEqual(parseArgs(['--subs', 'https://example.com/video']), {
    help: false,
    version: false,
    subtitles: true,
    initialUrl: 'https://example.com/video',
  })

  assert.deepEqual(parseArgs(['--subs=es,en', 'https://example.com/video']), {
    help: false,
    version: false,
    subtitles: 'es,en',
    initialUrl: 'https://example.com/video',
  })

  assert.deepEqual(parseArgs(['--subs', 'es,en', 'https://example.com/video']), {
    help: false,
    version: false,
    subtitles: 'es,en',
    initialUrl: 'https://example.com/video',
  })

  assert.deepEqual(parseArgs(['--embed-subs', 'https://example.com/video']), {
    help: false,
    version: false,
    embedSubs: true,
    initialUrl: 'https://example.com/video',
  })

  // Schemeless URL should not be consumed as a language string
  assert.deepEqual(parseArgs(['--subs', 'youtu.be/dQw4w9WgXcQ']), {
    help: false,
    version: false,
    subtitles: true,
    initialUrl: 'youtu.be/dQw4w9WgXcQ',
  })
})

test('toSubtitleOptions converts CliArgs to SubtitleOptions', () => {
  assert.equal(toSubtitleOptions({help: false, version: false}), undefined)
  assert.deepEqual(toSubtitleOptions({help: false, version: false, subtitles: true}), {
    enabled: true,
    languages: undefined,
    embed: false,
  })
  assert.deepEqual(toSubtitleOptions({help: false, version: false, subtitles: 'es,ja'}), {
    enabled: true,
    languages: 'es,ja',
    embed: false,
  })
  assert.deepEqual(toSubtitleOptions({help: false, version: false, embedSubs: true}), {
    enabled: true,
    languages: undefined,
    embed: true,
  })
  assert.deepEqual(toSubtitleOptions({help: false, version: false, subtitles: 'fr', embedSubs: true}), {
    enabled: true,
    languages: 'fr',
    embed: true,
  })
})

test('parses thumbnail flags (--thumb, --embed-thumb)', () => {
  assert.deepEqual(parseArgs(['--thumb', 'https://example.com/video']), {
    help: false,
    version: false,
    thumb: true,
    initialUrl: 'https://example.com/video',
  })

  assert.deepEqual(parseArgs(['--embed-thumb', 'https://example.com/video']), {
    help: false,
    version: false,
    embedThumb: true,
    initialUrl: 'https://example.com/video',
  })
})

test('toThumbnailOptions converts CliArgs to ThumbnailOptions', () => {
  assert.equal(toThumbnailOptions({help: false, version: false}), undefined)
  assert.deepEqual(toThumbnailOptions({help: false, version: false, thumb: true}), {
    enabled: true,
    write: true,
    embed: false,
  })
  assert.deepEqual(toThumbnailOptions({help: false, version: false, embedThumb: true}), {
    enabled: true,
    write: false,
    embed: true,
  })
  assert.deepEqual(toThumbnailOptions({help: false, version: false, thumb: true, embedThumb: true}), {
    enabled: true,
    write: true,
    embed: true,
  })
})

test('parses download engine update flags (-U, --update, --update-ytdlp, --update-gallerydl, --force)', () => {
  assert.deepEqual(parseArgs(['-U']), {
    help: false,
    version: false,
    updateYtDlp: true,
    updateGalleryDl: true,
  })

  assert.deepEqual(parseArgs(['--update']), {
    help: false,
    version: false,
    updateYtDlp: true,
    updateGalleryDl: true,
  })

  assert.deepEqual(parseArgs(['--update-ytdlp']), {
    help: false,
    version: false,
    updateYtDlp: true,
  })

  assert.deepEqual(parseArgs(['--update-gallerydl']), {
    help: false,
    version: false,
    updateGalleryDl: true,
  })

  assert.deepEqual(parseArgs(['-U', '--force']), {
    help: false,
    version: false,
    updateYtDlp: true,
    updateGalleryDl: true,
    force: true,
  })

  assert.deepEqual(parseArgs(['--update-gallerydl', '--force']), {
    help: false,
    version: false,
    updateGalleryDl: true,
    force: true,
  })
})

test('parses shell autocompletion flags (--completion <shell>)', () => {
  assert.deepEqual(parseArgs(['--completion', 'bash']), {
    help: false,
    version: false,
    completion: 'bash',
  })

  assert.deepEqual(parseArgs(['--completion=zsh']), {
    help: false,
    version: false,
    completion: 'zsh',
  })

  assert.deepEqual(parseArgs(['--completion', 'pwsh']), {
    help: false,
    version: false,
    completion: 'powershell',
  })

  assert.match(parseArgs(['--completion']).error ?? '', /needs a shell/)
  assert.match(parseArgs(['--completion=']).error ?? '', /needs a shell/)
  assert.match(parseArgs(['--completion', 'cmd']).error ?? '', /unknown shell/)
})

test('parses media filter flags (--photos-only, --videos-only)', () => {
  assert.deepEqual(parseArgs(['--photos-only', 'https://example.com/post']), {
    help: false,
    version: false,
    photosOnly: true,
    initialUrl: 'https://example.com/post',
  })

  assert.deepEqual(parseArgs(['--videos-only', 'https://example.com/post']), {
    help: false,
    version: false,
    videosOnly: true,
    initialUrl: 'https://example.com/post',
  })

  assert.match(
    parseArgs(['--photos-only', '--videos-only', 'https://example.com']).error ?? '',
    /cannot use both --photos-only and --videos-only/
  )
})

test('resolves output directory following priority: CLI > OPEN_OMNI_DIR > Platform Known Folder > ~/Downloads', () => {
  const custom = './my-folder'
  assert.equal(resolveOutputDir(custom), path.resolve(custom))
  assert.equal(resolveOutputDir(undefined, './env-folder'), path.resolve('./env-folder'))
  assert.equal(
    resolveOutputDir(undefined, undefined, undefined, () => 'C:\\Custom\\KnownFolder'),
    'C:\\Custom\\KnownFolder'
  )
})

test('recognizes only supported modes and cycles through all of them', () => {
  assert.equal(isThemeMode('auto'), true)
  assert.equal(isThemeMode('light'), true)
  assert.equal(isThemeMode('dark'), true)
  assert.equal(isThemeMode('sepia'), false)
  assert.equal(nextThemeMode('auto'), 'light')
  assert.equal(nextThemeMode('light'), 'dark')
  assert.equal(nextThemeMode('dark'), 'auto')
})

test('auto delegates to terminal colors while forced modes own the full surface', () => {
  assert.deepEqual(themeFor('auto'), {
    mode: 'auto',
    primary: undefined,
    gray: undefined,
    dark: undefined,
    background: undefined,
    dimSecondary: true,
    inverseButton: true,
  })

  assert.equal(themeFor('light').background, '#ffffff')
  assert.equal(themeFor('light').primary, '#18181b')
  assert.equal(themeFor('dark').background, '#18181b')
  assert.equal(themeFor('dark').primary, '#ffffff')
})

test('terminalLink produces valid OSC 8 hyperlink escape sequence', () => {
  const link = terminalLink('Igect', 'https://igect.link/')
  assert.equal(link, '\u001B]8;;https://igect.link/\u0007Igect\u001B]8;;\u0007')
})

test('parses cookie flags (--cookies, --cookies-from-browser)', () => {
  assert.deepEqual(parseArgs(['--cookies', './cookies.txt', 'https://example.com']), {
    help: false,
    version: false,
    cookies: './cookies.txt',
    initialUrl: 'https://example.com',
  })

  assert.deepEqual(parseArgs(['--cookies=./my-cookies.txt', 'https://example.com']), {
    help: false,
    version: false,
    cookies: './my-cookies.txt',
    initialUrl: 'https://example.com',
  })

  assert.deepEqual(parseArgs(['--cookies-from-browser', 'zen', 'https://example.com']), {
    help: false,
    version: false,
    cookiesFromBrowser: 'zen',
    initialUrl: 'https://example.com',
  })

  assert.deepEqual(parseArgs(['--cookies-from-browser=firefox:+/path/to/profile', 'https://example.com']), {
    help: false,
    version: false,
    cookiesFromBrowser: 'firefox:+/path/to/profile',
    initialUrl: 'https://example.com',
  })

  assert.match(parseArgs(['--cookies']).error ?? '', /--cookies needs a file path/)
  assert.match(parseArgs(['--cookies-from-browser']).error ?? '', /--cookies-from-browser needs a browser name/)
})

test('parses --skip-existing flag', () => {
  assert.deepEqual(parseArgs(['--skip-existing', 'https://example.com/video']), {
    help: false,
    version: false,
    skipExisting: true,
    initialUrl: 'https://example.com/video',
  })
})

test('parses section slicing flags (--time, --section)', () => {
  assert.deepEqual(parseArgs(['--time', '01:30-03:45', 'https://example.com/video']), {
    help: false,
    version: false,
    time: '01:30-03:45',
    initialUrl: 'https://example.com/video',
  })

  assert.deepEqual(parseArgs(['--section=90-180', 'https://example.com/video']), {
    help: false,
    version: false,
    time: '90-180',
    initialUrl: 'https://example.com/video',
  })

  assert.match(parseArgs(['--time', 'bad-format', 'https://example.com/video']).error ?? '', /invalid time range/)
  assert.match(parseArgs(['--time']).error ?? '', /needs a time range/)
})

test('allows --force alone for interactive session or with a url', () => {
  assert.deepEqual(parseArgs(['--force']), {
    help: false,
    version: false,
    force: true,
  })

  assert.deepEqual(parseArgs(['--force', 'https://example.com/video']), {
    help: false,
    version: false,
    force: true,
    initialUrl: 'https://example.com/video',
  })
})

test('parses metadata flags (--metadata, --add-metadata, --embed-chapters)', () => {
  assert.deepEqual(parseArgs(['--metadata', 'https://example.com/video']), {
    help: false,
    version: false,
    metadata: true,
    initialUrl: 'https://example.com/video',
  })

  assert.deepEqual(parseArgs(['--add-metadata', 'https://example.com/video']), {
    help: false,
    version: false,
    metadata: true,
    initialUrl: 'https://example.com/video',
  })

  assert.deepEqual(parseArgs(['--embed-chapters', 'https://example.com/video']), {
    help: false,
    version: false,
    embedChapters: true,
    initialUrl: 'https://example.com/video',
  })

  assert.deepEqual(toMetadataOptions({help: false, version: false}), undefined)
  assert.deepEqual(toMetadataOptions({help: false, version: false, metadata: true}), {
    enabled: true,
    embedChapters: undefined,
  })
  assert.deepEqual(toMetadataOptions({help: false, version: false, metadata: true, embedChapters: true}), {
    enabled: true,
    embedChapters: true,
  })
  assert.deepEqual(toMetadataOptions({help: false, version: false, embedChapters: true}), {
    enabled: undefined,
    embedChapters: true,
  })
})

test('parses --audio-format option for official yt-dlp audio formats', () => {
  assert.deepEqual(parseArgs(['--audio-format', 'flac', 'https://example.com/video']), {
    help: false,
    version: false,
    audioFormat: 'flac',
    initialUrl: 'https://example.com/video',
  })

  assert.deepEqual(parseArgs(['--audio-format=opus', 'https://example.com/video']), {
    help: false,
    version: false,
    audioFormat: 'opus',
    initialUrl: 'https://example.com/video',
  })

  assert.match(
    parseArgs(['--audio-format', 'xyz', 'https://example.com/video']).error ?? '',
    /unknown audio format/
  )
  assert.match(
    parseArgs(['--audio-format']).error ?? '',
    /needs a format/
  )
  assert.match(
    parseArgs(['--best', '--audio-format', 'flac']).error ?? '',
    /cannot use both --best and --audio-format/
  )
  assert.match(
    parseArgs(['--audio-format', 'flac', '--best']).error ?? '',
    /cannot use both --best and --audio-format/
  )
})

test('parses --video-format option for container formats (mp4, mkv, webm)', () => {
  assert.deepEqual(parseArgs(['--video-format', 'mkv', 'https://example.com/video']), {
    help: false,
    version: false,
    videoFormat: 'mkv',
    initialUrl: 'https://example.com/video',
  })

  assert.deepEqual(parseArgs(['--video-format=webm', 'https://example.com/video']), {
    help: false,
    version: false,
    videoFormat: 'webm',
    initialUrl: 'https://example.com/video',
  })

  assert.match(
    parseArgs(['--video-format', 'avi', 'https://example.com/video']).error ?? '',
    /unknown video format/
  )
  assert.match(
    parseArgs(['--video-format']).error ?? '',
    /needs a format/
  )
})

test('parses --proxy flag with http/socks URLs and rejects missing value', () => {
  assert.deepEqual(parseArgs(['--proxy', 'http://127.0.0.1:8080', 'https://example.com/video']), {
    help: false,
    version: false,
    proxy: 'http://127.0.0.1:8080',
    initialUrl: 'https://example.com/video',
  })

  assert.deepEqual(parseArgs(['--proxy=socks5://user:pass@10.0.0.1:1080', 'https://example.com/video']), {
    help: false,
    version: false,
    proxy: 'socks5://user:pass@10.0.0.1:1080',
    initialUrl: 'https://example.com/video',
  })

  assert.match(parseArgs(['--proxy']).error ?? '', /needs a proxy URL/)
  assert.match(parseArgs(['--proxy=']).error ?? '', /needs a proxy URL/)
})

test('parses --geo-bypass and --geo-country flags and validates country codes', () => {
  assert.deepEqual(parseArgs(['--geo-bypass', 'https://example.com/video']), {
    help: false,
    version: false,
    geoBypass: true,
    initialUrl: 'https://example.com/video',
  })

  assert.deepEqual(parseArgs(['--geo-country', 'us', 'https://example.com/video']), {
    help: false,
    version: false,
    geoCountry: 'US',
    initialUrl: 'https://example.com/video',
  })

  assert.deepEqual(parseArgs(['--geo-bypass-country=de', 'https://example.com/video']), {
    help: false,
    version: false,
    geoCountry: 'DE',
    initialUrl: 'https://example.com/video',
  })

  assert.match(parseArgs(['--geo-country']).error ?? '', /needs a 2-letter country code/)
  assert.match(parseArgs(['--geo-country', 'USA']).error ?? '', /needs a 2-letter country code/)
  assert.match(parseArgs(['--geo-country=12']).error ?? '', /needs a 2-letter country code/)
})

test('parses --limit-rate and validates bandwidth strings', () => {
  assert.deepEqual(parseArgs(['--limit-rate', '50K', 'https://example.com/video']), {
    help: false,
    version: false,
    limitRate: '50K',
    initialUrl: 'https://example.com/video',
  })

  assert.deepEqual(parseArgs(['--limit-rate=1.5M', 'https://example.com/video']), {
    help: false,
    version: false,
    limitRate: '1.5M',
    initialUrl: 'https://example.com/video',
  })

  assert.deepEqual(parseArgs(['--rate-limit', '2G', 'https://example.com/video']), {
    help: false,
    version: false,
    limitRate: '2G',
    initialUrl: 'https://example.com/video',
  })

  assert.deepEqual(parseArgs(['--limit-rate', '100000', 'https://example.com/video']), {
    help: false,
    version: false,
    limitRate: '100000',
    initialUrl: 'https://example.com/video',
  })

  assert.match(parseArgs(['--limit-rate']).error ?? '', /needs a rate limit/)
  assert.match(parseArgs(['--limit-rate=']).error ?? '', /needs a rate limit/)
  assert.match(parseArgs(['--limit-rate', 'invalid']).error ?? '', /invalid rate limit/)
  assert.match(parseArgs(['--limit-rate', '-50K']).error ?? '', /unknown option|invalid rate limit/)
  assert.match(parseArgs(['--limit-rate', '50MBps']).error ?? '', /invalid rate limit/)
})

test('parses --sponsorblock and --sponsorblock-remove flags', () => {
  assert.deepEqual(parseArgs(['--sponsorblock', 'https://example.com/video']), {
    help: false,
    version: false,
    sponsorblock: true,
    initialUrl: 'https://example.com/video',
  })

  assert.deepEqual(parseArgs(['--sponsorblock-remove', 'sponsor,intro', 'https://example.com/video']), {
    help: false,
    version: false,
    sponsorblock: true,
    sponsorblockRemove: 'sponsor,intro',
    initialUrl: 'https://example.com/video',
  })

  assert.deepEqual(parseArgs(['--sponsorblock-remove=all', 'https://example.com/video']), {
    help: false,
    version: false,
    sponsorblock: true,
    sponsorblockRemove: 'all',
    initialUrl: 'https://example.com/video',
  })

  assert.match(parseArgs(['--sponsorblock-remove']).error ?? '', /needs category names/)
  assert.match(parseArgs(['--sponsorblock-remove=']).error ?? '', /needs category names/)
})

test('parses combination of network proxy, geo-bypass, limit-rate, and sponsorblock flags', () => {
  const parsed = parseArgs([
    '--proxy',
    'socks5://127.0.0.1:9050',
    '--geo-bypass',
    '--geo-country',
    'jp',
    '--limit-rate',
    '2.5M',
    '--sponsorblock',
    '--sponsorblock-remove',
    'sponsor,outro',
    'https://example.com/video',
  ])

  assert.deepEqual(parsed, {
    help: false,
    version: false,
    proxy: 'socks5://127.0.0.1:9050',
    geoBypass: true,
    geoCountry: 'JP',
    limitRate: '2.5M',
    sponsorblock: true,
    sponsorblockRemove: 'sponsor,outro',
    initialUrl: 'https://example.com/video',
  })
})

test('rejects options when followed immediately by another flag without argument value', () => {
  assert.match(
    parseArgs(['--proxy', '--best', 'https://example.com']).error ?? '',
    /--proxy needs a proxy URL/
  )
  assert.match(
    parseArgs(['--sponsorblock-remove', '--best', 'https://example.com']).error ?? '',
    /--sponsorblock-remove needs category names/
  )
  assert.match(
    parseArgs(['--geo-country', '--best', 'https://example.com']).error ?? '',
    /needs a 2-letter country code/
  )
  assert.match(
    parseArgs(['--limit-rate', '--best', 'https://example.com']).error ?? '',
    /invalid rate limit/
  )
})






