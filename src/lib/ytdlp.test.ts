import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parseProbeOutput,
  extractSingleVideoUrl,
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
