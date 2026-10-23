import assert from 'node:assert/strict'
import test from 'node:test'
import {extractUrlFromText, startClipboardWatcher} from './watcher.js'

test('extractUrlFromText extracts direct and embedded URLs', () => {
  assert.equal(
    extractUrlFromText('https://youtu.be/dQw4w9WgXcQ'),
    'https://youtu.be/dQw4w9WgXcQ',
  )
  assert.equal(
    extractUrlFromText('Check out this clip: https://instagram.com/reel/C123456/ from Insta!'),
    'https://instagram.com/reel/C123456/',
  )
  assert.equal(
    extractUrlFromText('  https://x.com/OpenSelena/status/123456789  '),
    'https://x.com/OpenSelena/status/123456789',
  )
  assert.equal(extractUrlFromText('just some random clipboard text'), null)
  assert.equal(extractUrlFromText(''), null)
})

test('startClipboardWatcher detects and downloads newly copied URL', async () => {
  let clipboardContent = 'https://initial.com/ignore-on-startup'
  const detected: string[] = []
  const completed: Array<{url: string; path: string}> = []

  const mockDownloadFn = async (url: string) => {
    return `/downloads/${encodeURIComponent(url)}.mp4`
  }

  const watcher = startClipboardWatcher({
    outDir: '/test/downloads',
    pollIntervalMs: 50,
    clipboardReader: async () => clipboardContent,
    downloadFn: mockDownloadFn,
    onUrlDetected: url => detected.push(url),
    onDownloadComplete: (url, filepath) => completed.push({url, path: filepath}),
  })

  // Allow initial seed poll to finish
  await new Promise(r => setTimeout(r, 60))

  // Simulate user copying a new URL
  clipboardContent = 'https://youtu.be/dQw4w9WgXcQ'
  await new Promise(r => setTimeout(r, 120))

  watcher.stop()

  assert.deepEqual(detected, ['https://youtu.be/dQw4w9WgXcQ'])
  assert.equal(completed.length, 1)
  assert.equal(completed[0]?.url, 'https://youtu.be/dQw4w9WgXcQ')
  assert.equal(watcher.isWatching(), false)
})

test('startClipboardWatcher deduplicates and does not re-download unchanged clipboard', async () => {
  let downloadCount = 0
  const mockDownloadFn = async () => {
    downloadCount++
    return '/downloads/file.mp4'
  }

  let clipboardContent = 'startup'
  const watcher = startClipboardWatcher({
    outDir: '/test/downloads',
    pollIntervalMs: 40,
    clipboardReader: async () => clipboardContent,
    downloadFn: mockDownloadFn,
  })

  await new Promise(r => setTimeout(r, 50))

  // User copies URL
  clipboardContent = 'https://youtu.be/unique123'
  await new Promise(r => setTimeout(r, 150))

  watcher.stop()

  assert.equal(downloadCount, 1)
})

test('startClipboardWatcher handles download errors gracefully without crashing', async () => {
  const errors: string[] = []
  const mockFailingDownload = async () => {
    throw new Error('network timeout during stream')
  }

  let clipboard = 'init'
  const watcher = startClipboardWatcher({
    outDir: '/test/downloads',
    pollIntervalMs: 40,
    clipboardReader: async () => clipboard,
    downloadFn: mockFailingDownload,
    onDownloadError: (_url, err) => errors.push(err),
  })

  await new Promise(r => setTimeout(r, 50))

  clipboard = 'https://youtu.be/failing123'
  await new Promise(r => setTimeout(r, 120))

  watcher.stop()

  assert.equal(errors.length, 1)
  assert.match(errors[0]!, /network timeout/)
})

test('startClipboardWatcher stops immediately on AbortSignal', async () => {
  const controller = new AbortController()
  const watcher = startClipboardWatcher({
    outDir: '/test/downloads',
    pollIntervalMs: 50,
    clipboardReader: async () => 'https://youtu.be/test',
    signal: controller.signal,
  })

  assert.equal(watcher.isWatching(), true)
  controller.abort()
  assert.equal(watcher.isWatching(), false)
})
