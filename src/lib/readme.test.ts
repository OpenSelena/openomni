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
    ['https://youtu.be/dQw4w9WgXcQ', '--skip-existing'],
    ['https://youtu.be/dQw4w9WgXcQ', '--time', '01:00-02:30'],
    ['https://youtu.be/dQw4w9WgXcQ', '--section', '01:00-02:30'],
    ['https://instagram.com/p/abc123xyz', '--cookies', '/path/to/cookies.txt'],
    ['https://instagram.com/p/abc123xyz', '--cookies-from-browser', 'firefox'],
    ['https://instagram.com/p/abc123xyz', '--cookies-from-browser', 'zen'],
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

  // Ensure How It Compares is concise developer matrix without marketing slop
  assert.match(readme, /\|\s*\*\*Interface\*\*\s*\|/i, 'Comparison table should include Interface row')
  assert.match(readme, /\|\s*\*\*Engines\*\*\s*\|/i, 'Comparison table should include Engines row')
  assert.match(readme, /\|\s*\*\*Media\*\*\s*\|/i, 'Comparison table should include Media row')
  assert.match(readme, /\|\s*\*\*Selection\*\*\s*\|/i, 'Comparison table should include Selection row')
  assert.match(readme, /\|\s*\*\*Workflow\*\*\s*\|/i, 'Comparison table should include Workflow row')
  assert.match(readme, /\|\s*\*\*Local-first\*\*\s*\|/i, 'Comparison table should include Local-first row')

  assert.doesNotMatch(
    readme,
    /Telemetry & Privacy/i,
    'Comparison table should not contain corporate buzzwords'
  )
  assert.doesNotMatch(
    readme,
    /Clickjacking/i,
    'Comparison table should not contain filler scare copy'
  )

  // Fair Use Notice and License contact requirements
  assert.match(readme, /igect@vk\.com/, 'README should provide contact email igect@vk.com')
  assert.match(readme, /Fair Use Notice/i, 'README should have Fair Use Notice section')
  assert.match(readme, /does not grant/i, 'Fair Use Notice must clarify tool does not grant copyright ownership or permission')
  assert.match(readme, /responsible/i, 'Fair Use Notice must clarify users are responsible for compliance')

  // LICENSE file contact/inquiry section
  const licensePath = path.resolve('LICENSE')
  assert.ok(fs.existsSync(licensePath), 'LICENSE exists')
  const license = fs.readFileSync(licensePath, 'utf8')
  assert.match(license, /Permission is hereby granted, free of charge/i, 'LICENSE preserves standard MIT license terms')
  assert.match(license, /igect@vk\.com/, 'LICENSE includes contact email igect@vk.com')
})
