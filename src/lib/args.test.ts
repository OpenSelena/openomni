import assert from 'node:assert/strict'
import test from 'node:test'
import path from 'node:path'
import os from 'node:os'
import {parseArgs, resolveOutputDir, toSubtitleOptions, toThumbnailOptions} from './args.js'
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

