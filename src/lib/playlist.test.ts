import assert from 'node:assert/strict'
import test from 'node:test'
import path from 'node:path'
import {
  formatTrackFilename,
  resolvePlaylistDir,
  buildQualityTierArgs,
  getQualityTierExt,
  parsePlaylistOutput,
  type PlaylistMetadata
} from './playlist.js'

test('formatTrackFilename pads track numbers correctly and sanitizes illegal characters', () => {
  // Total 15: padded to 2 digits
  assert.equal(
    formatTrackFilename(1, 15, 'Song: The Beginning / Act 1?', 'mp4'),
    '01 - Song The Beginning Act 1.mp4'
  )
  assert.equal(
    formatTrackFilename(10, 15, 'Song *Special* & "Rare"', 'mp3'),
    '10 - Song Special & Rare.mp3'
  )

  // Total 150: padded to 3 digits
  assert.equal(
    formatTrackFilename(5, 150, 'Episode <5> | Final', 'mp4'),
    '005 - Episode 5 Final.mp4'
  )
})

test('resolvePlaylistDir sanitizes folder name and appends to base directory', () => {
  const base = 'C:/Users/Downloads'
  const resolved = resolvePlaylistDir(base, 'My Favorite / Best Songs: 2026!')
  assert.equal(resolved, path.join(base, 'My Favorite Best Songs 2026!'))
})

test('getQualityTierExt returns correct extension for tier', () => {
  assert.equal(getQualityTierExt('best'), 'mp4')
  assert.equal(getQualityTierExt('1080p'), 'mp4')
  assert.equal(getQualityTierExt('720p'), 'mp4')
  assert.equal(getQualityTierExt('mp3'), 'mp3')
})

test('buildQualityTierArgs produces correct yt-dlp format arguments', () => {
  assert.deepEqual(buildQualityTierArgs('best'), [
    '-f',
    'bv*+ba/b',
    '--merge-output-format',
    'mp4'
  ])

  assert.deepEqual(buildQualityTierArgs('1080p'), [
    '-f',
    'bv*[height<=1080]+ba/b[height<=1080]/best[height<=1080]',
    '--merge-output-format',
    'mp4'
  ])

  assert.deepEqual(buildQualityTierArgs('720p'), [
    '-f',
    'bv*[height<=720]+ba/b[height<=720]/best[height<=720]',
    '--merge-output-format',
    'mp4'
  ])

  assert.deepEqual(buildQualityTierArgs('mp3'), [
    '-f',
    'ba/b',
    '-x',
    '--audio-format',
    'mp3'
  ])
})

test('parsePlaylistOutput correctly parses yt-dlp flat-playlist json output', () => {
  const rawSample = JSON.stringify({
    _type: 'playlist',
    id: 'PL12345',
    title: 'Test Album / Course',
    uploader: 'Cool Artist',
    webpage_url: 'https://youtube.com/playlist?list=PL12345',
    entries: [
      {
        id: 'vid1',
        title: 'First Video',
        url: 'https://www.youtube.com/watch?v=vid1',
        duration: 180,
      },
      {
        id: 'vid2',
        title: '[Deleted video]',
        url: 'https://www.youtube.com/watch?v=vid2',
        duration: null,
      },
      {
        id: 'vid3',
        title: 'Third Video',
        url: 'https://www.youtube.com/watch?v=vid3',
        duration: 240,
      }
    ]
  })

  const parsed = parsePlaylistOutput(rawSample)
  assert.equal(parsed.id, 'PL12345')
  assert.equal(parsed.title, 'Test Album / Course')
  assert.equal(parsed.uploader, 'Cool Artist')
  assert.equal(parsed.webpageUrl, 'https://youtube.com/playlist?list=PL12345')
  assert.equal(parsed.entries.length, 3)
  assert.equal(parsed.validEntries.length, 2)
  assert.equal(parsed.validEntries[0].title, 'First Video')
  assert.equal(parsed.validEntries[0].index, 1)
  assert.equal(parsed.validEntries[1].title, 'Third Video')
  assert.equal(parsed.validEntries[1].index, 2)
})

test('parsePlaylistOutput handles multi-video post entries without titles or youtube URLs', () => {
  const rawSocial = JSON.stringify({
    _type: 'playlist',
    id: 'post_12345',
    title: 'Thread with videos',
    webpage_url: 'https://x.com/user/status/12345',
    entries: [
      {
        id: 'media_1',
        url: 'https://video.twimg.com/ext_tw_video/1.mp4',
        duration: 30,
      },
      {
        id: 'media_2',
        title: '',
        url: 'https://video.twimg.com/ext_tw_video/2.mp4',
      }
    ]
  })
  const parsed = parsePlaylistOutput(rawSocial)
  assert.equal(parsed.validEntries.length, 2)
  assert.equal(parsed.validEntries[0].title, 'Item media_1')
  assert.equal(parsed.validEntries[0].url, 'https://video.twimg.com/ext_tw_video/1.mp4')
  assert.equal(parsed.validEntries[1].title, 'Item media_2')
})
