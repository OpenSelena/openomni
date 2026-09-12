import assert from 'node:assert/strict'
import test from 'node:test'
import {
  formatBytes,
  formatDuration,
  formatEta,
  formatSpeed,
  shortenPath,
  terminalLink,
  truncate,
  wrapText,
} from './format.js'

test('formatBytes formats byte counts with correct units', () => {
  assert.equal(formatBytes(0), '')
  assert.equal(formatBytes(-10), '')
  assert.equal(formatBytes(NaN), '')
  assert.equal(formatBytes(500), '500 B')
  assert.equal(formatBytes(1024), '1.0 KB')
  assert.equal(formatBytes(1536), '1.5 KB')
  assert.equal(formatBytes(10 * 1024), '10 KB')
  assert.equal(formatBytes(1024 * 1024), '1.0 MB')
  assert.equal(formatBytes(1024 * 1024 * 1024), '1.0 GB')
})

test('formatDuration formats seconds to MM:SS and HH:MM:SS', () => {
  assert.equal(formatDuration(0), '')
  assert.equal(formatDuration(-5), '')
  assert.equal(formatDuration(NaN), '')
  assert.equal(formatDuration(5), '0:05')
  assert.equal(formatDuration(65), '1:05')
  assert.equal(formatDuration(600), '10:00')
  assert.equal(formatDuration(3665), '1:01:05')
  assert.equal(formatDuration(7200), '2:00:00')
})

test('truncate trims strings and appends ellipsis', () => {
  assert.equal(truncate('hello', 10), 'hello')
  assert.equal(truncate('hello world', 5), 'hell…')
})

test('shortenPath collapses homedir and preserves extension', () => {
  const home = 'C:/Users/mint'
  assert.equal(shortenPath('C:/Users/mint/Downloads/video.mp4', home, 60), '~/Downloads/video.mp4')
  assert.equal(shortenPath('/some/other/path/file.txt', home, 60), '/some/other/path/file.txt')
})

test('wrapText breaks long text into lines', () => {
  const text = 'the quick brown fox jumps over the lazy dog'
  const wrapped = wrapText(text, 15)
  assert.ok(wrapped.length > 1)
  assert.ok(wrapped.every(line => line.length <= 15))
})

test('formatSpeed and formatEta format download progress helpers', () => {
  assert.equal(formatSpeed(1024 * 1024 * 5), '5.0 MB/s')
  assert.equal(formatSpeed(0), '')
  assert.equal(formatEta(90), '1:30')
  assert.equal(formatEta(0), '')
})

test('terminalLink emits ANSI escape sequence', () => {
  const link = terminalLink('Click Here', 'https://example.com')
  assert.ok(link.includes('https://example.com'))
  assert.ok(link.includes('Click Here'))
})
