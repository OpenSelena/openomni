import assert from 'node:assert/strict'
import test from 'node:test'
import { detectPlatform, isProbablyUrl } from './platforms.js'

test('detectPlatform correctly detects supported media platforms', () => {
  assert.equal(detectPlatform('https://www.youtube.com/watch?v=123').key, 'youtube')
  assert.equal(detectPlatform('https://youtu.be/123').key, 'youtube')
  assert.equal(detectPlatform('https://music.youtube.com/watch?v=123').key, 'youtube')

  assert.equal(detectPlatform('https://x.com/user/status/123').key, 'x')
  assert.equal(detectPlatform('https://twitter.com/user/status/123').key, 'x')

  assert.equal(detectPlatform('https://www.instagram.com/p/123/').key, 'instagram')
  assert.equal(detectPlatform('https://www.threads.net/@user/post/123').key, 'threads')
  assert.equal(detectPlatform('https://www.tiktok.com/@user/video/123').key, 'tiktok')
  assert.equal(detectPlatform('https://vimeo.com/123').key, 'vimeo')
  assert.equal(detectPlatform('https://www.twitch.tv/videos/123').key, 'twitch')
  assert.equal(detectPlatform('https://www.reddit.com/r/videos/comments/123').key, 'reddit')
  assert.equal(detectPlatform('https://fb.watch/123/').key, 'facebook')
})

test('detectPlatform falls back to generic hostname or unknown', () => {
  assert.equal(detectPlatform('https://example.com/video.mp4').key, 'generic')
  assert.equal(detectPlatform('https://example.com/video.mp4').label, 'example.com')
  assert.equal(detectPlatform('not-a-url').key, 'unknown')
})

test('isProbablyUrl validates URLs with http or https protocol', () => {
  assert.equal(isProbablyUrl('https://example.com'), true)
  assert.equal(isProbablyUrl('http://example.com'), true)
  assert.equal(isProbablyUrl('ftp://example.com'), false)
  assert.equal(isProbablyUrl('file:///path/to/file'), false)
  assert.equal(isProbablyUrl('not-a-url'), false)
  assert.equal(isProbablyUrl(''), false)
})
