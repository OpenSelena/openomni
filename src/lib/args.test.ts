import assert from 'node:assert/strict'
import test from 'node:test'
import path from 'node:path'
import os from 'node:os'
import {parseArgs, resolveOutputDir} from './args.js'
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

test('resolves output directory following priority: CLI > OPEN_OMNI_DIR > ~/Downloads', () => {
  const custom = './my-folder'
  assert.equal(resolveOutputDir(custom), path.resolve(custom))
  assert.equal(resolveOutputDir(undefined, './env-folder'), path.resolve('./env-folder'))
  assert.equal(resolveOutputDir(undefined, undefined), path.join(os.homedir(), 'Downloads'))
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
