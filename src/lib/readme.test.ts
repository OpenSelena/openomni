import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from './args.js'

test('README documentation parity with CLI options', () => {
  const readmePath = path.resolve('README.md')
  assert.ok(fs.existsSync(readmePath), 'README.md exists')
  const readme = fs.readFileSync(readmePath, 'utf8')

  // Documented CLI flags that must parse cleanly
  const documentedFlags = [
    ['https://youtu.be/dQw4w9WgXcQ', '--best'],
    ['https://youtu.be/dQw4w9WgXcQ', '--mp3'],
    ['https://youtu.be/dQw4w9WgXcQ', '--subs'],
    ['https://youtu.be/dQw4w9WgXcQ', '--subs=en,es'],
    ['https://youtu.be/dQw4w9WgXcQ', '--embed-subs'],
    ['https://youtu.be/dQw4w9WgXcQ', '--thumb'],
    ['https://youtu.be/dQw4w9WgXcQ', '--embed-thumb'],
    ['https://instagram.com/p/abc123xyz', '--photos-only'],
    ['https://instagram.com/p/abc123xyz', '--videos-only'],
    ['https://youtu.be/dQw4w9WgXcQ', '-o', '~/Videos'],
    ['https://youtu.be/dQw4w9WgXcQ', '--output', '~/Videos'],
    ['-U'],
    ['--update'],
    ['--update-ytdlp'],
    ['--update-gallerydl'],
    ['-U', '--force'],
    ['--theme', 'dark'],
    ['--completion', 'bash'],
    ['--completion', 'zsh'],
    ['--completion', 'fish'],
    ['--completion', 'powershell'],
    ['-h'],
    ['--help'],
    ['-v'],
    ['--version'],
  ]

  for (const flagSet of documentedFlags) {
    const result = parseArgs(flagSet)
    assert.equal(
      result.error,
      undefined,
      `Flag set [${flagSet.join(' ')}] in README must parse without error, got: ${result.error}`
    )
  }

  // Ensure README specifies Node 20+ requirement and NOT outdated Node 18
  assert.match(
    readme,
    /Node\s+20\+/i,
    'README should document requirement as Node 20+'
  )
  assert.doesNotMatch(
    readme,
    /Requires\s+Node\s+18\+/i,
    'README should not contain outdated Node 18 requirement'
  )

  // Ensure README covers dual engines: yt-dlp and gallery-dl
  assert.match(readme, /yt-dlp/i, 'README should mention yt-dlp')
  assert.match(readme, /gallery-dl/i, 'README should mention gallery-dl')

  // Ensure README includes one-line installer domain mint.dev.cv
  assert.match(readme, /mint\.dev\.cv/, 'README should link to mint.dev.cv installer')
})
