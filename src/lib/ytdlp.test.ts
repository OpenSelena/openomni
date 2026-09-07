import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parseProbeOutput,
  extractSingleVideoUrl,
  isYtDlpUpToDateMessage,
  isYtDlpPackageManaged,
  isExtractorError,
  getYtDlpVersion,
  buildSubtitleArgs,
  buildThumbnailArgs,
  type VideoInfo
} from './ytdlp.js'

test('extractSingleVideoUrl extracts video url from playlist url when video id exists', () => {
  assert.equal(
    extractSingleVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmErZgOdP_8GztsuKi9nrraNbKKp4'),
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  )

  assert.equal(
    extractSingleVideoUrl('https://www.youtube.com/watch?list=PLrAXtmErZgOdP_8GztsuKi9nrraNbKKp4&v=dQw4w9WgXcQ&index=3'),
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  )

  assert.equal(
    extractSingleVideoUrl('https://www.youtube.com/playlist?list=PLrAXtmErZgOdP_8GztsuKi9nrraNbKKp4'),
    undefined
  )

  assert.equal(
    extractSingleVideoUrl('https://x.com/user/status/123456789'),
    undefined
  )
})

test('parseProbeOutput distinguishes between single videos and playlists', () => {
  const singleVideoJson = JSON.stringify({
    _type: 'video',
    id: 'vid1',
    title: 'Never Gonna Give You Up',
    formats: [{ format_id: '18', height: 360 }]
  })

  const singleResult = parseProbeOutput(
    singleVideoJson,
    'https://www.youtube.com/watch?v=vid1',
    '/tmp/test.json'
  )
  assert.equal(singleResult.kind, 'single')
  if (singleResult.kind === 'single') {
    assert.equal(singleResult.info.title, 'Never Gonna Give You Up')
    assert.equal(singleResult.infoJsonPath, '/tmp/test.json')
  }

  const playlistJson = JSON.stringify({
    _type: 'playlist',
    id: 'PL999',
    title: 'Top Hits',
    entries: [
      { id: 'track1', title: 'Song 1', duration: 120 }
    ]
  })

  const playlistResult = parseProbeOutput(
    playlistJson,
    'https://www.youtube.com/watch?v=track1&list=PL999',
    '/tmp/test.json'
  )
  assert.equal(playlistResult.kind, 'playlist')
  if (playlistResult.kind === 'playlist') {
    assert.equal(playlistResult.playlist.title, 'Top Hits')
    assert.equal(playlistResult.playlist.validEntries.length, 1)
    assert.equal(playlistResult.singleVideoUrl, 'https://www.youtube.com/watch?v=track1')
  }
})

test('isYtDlpUpToDateMessage correctly identifies already updated outputs', () => {
  assert.equal(isYtDlpUpToDateMessage('yt-dlp is up to date (2026.08.19)'), true)
  assert.equal(isYtDlpUpToDateMessage('Latest version: 2026.08.19'), true)
  assert.equal(isYtDlpUpToDateMessage('Updating to version 2026.09.01...'), false)
})

test('isYtDlpPackageManaged detects package manager refusal messages', () => {
  assert.equal(
    isYtDlpPackageManaged('You installed yt-dlp with pip or using the wheel from PyPi; Use that to update'),
    true
  )
  assert.equal(
    isYtDlpPackageManaged('yt-dlp is managed by Homebrew; use brew upgrade yt-dlp'),
    true
  )
  assert.equal(
    isYtDlpPackageManaged('Updating to version 2026.09.01...'),
    false
  )
})

test('getYtDlpVersion reads version string from real executable', async () => {
  const version = await getYtDlpVersion('yt-dlp')
  assert.match(version ?? '', /^\d{4}\.\d{2}\.\d{2}/)
})

test('isExtractorError distinguishes extraction/cipher errors from general errors', () => {
  assert.equal(isExtractorError('ERROR: [youtube] dQw4w9WgXcQ: Unable to extract video data'), true)
  assert.equal(isExtractorError('Sign in to confirm you are not a bot'), true)
  assert.equal(isExtractorError('HTTP Error 403: Forbidden'), true)
  assert.equal(isExtractorError('ENOSPC: no space left on device'), false)
  assert.equal(isExtractorError('User aborted operation'), false)
})

test('buildSubtitleArgs generates correct yt-dlp subtitle arguments', () => {
  assert.deepEqual(buildSubtitleArgs(undefined), [])
  assert.deepEqual(buildSubtitleArgs({enabled: false}), [])
  assert.deepEqual(buildSubtitleArgs({enabled: true}), [
    '--write-subs',
    '--write-auto-subs',
    '--sub-langs',
    'en.*,en',
    '--convert-subs',
    'srt',
  ])
  assert.deepEqual(buildSubtitleArgs({enabled: true, languages: 'es,ja'}), [
    '--write-subs',
    '--write-auto-subs',
    '--sub-langs',
    'es,ja',
    '--convert-subs',
    'srt',
  ])
  assert.deepEqual(buildSubtitleArgs({enabled: true, embed: true}), [
    '--write-subs',
    '--write-auto-subs',
    '--sub-langs',
    'en.*,en',
    '--convert-subs',
    'srt',
    '--embed-subs',
  ])
})

test('buildThumbnailArgs generates correct yt-dlp thumbnail arguments', () => {
  assert.deepEqual(buildThumbnailArgs(undefined), [])
  assert.deepEqual(buildThumbnailArgs({enabled: false}), [])
  assert.deepEqual(buildThumbnailArgs({enabled: true}, true), [
    '--write-thumbnail',
    '--convert-thumbnails',
    'jpg',
  ])
  assert.deepEqual(buildThumbnailArgs({enabled: true}, false), [
    '--write-thumbnail',
  ])
  assert.deepEqual(buildThumbnailArgs({enabled: true, embed: true}, true), [
    '--write-thumbnail',
    '--convert-thumbnails',
    'jpg',
    '--embed-thumbnail',
  ])
  assert.deepEqual(buildThumbnailArgs({enabled: true, embed: true}, false), [
    '--write-thumbnail',
    '--embed-thumbnail',
  ])
})

