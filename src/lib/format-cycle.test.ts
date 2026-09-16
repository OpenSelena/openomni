import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getNextAudioFormat,
  getNextVideoFormat,
  AUDIO_CYCLE_ORDER,
  VIDEO_CYCLE_ORDER,
} from './format-cycle.js'

test('audio format cycling advances to next supported format and wraps', () => {
  assert.equal(getNextAudioFormat('mp3'), 'flac')
  assert.equal(getNextAudioFormat('flac'), 'opus')
  assert.equal(getNextAudioFormat('opus'), 'best')
  assert.equal(getNextAudioFormat('best'), 'm4a')
  assert.equal(getNextAudioFormat('m4a'), 'aac')
  assert.equal(getNextAudioFormat('aac'), 'wav')
  assert.equal(getNextAudioFormat('wav'), 'alac')
  assert.equal(getNextAudioFormat('alac'), 'vorbis')
  assert.equal(getNextAudioFormat('vorbis'), 'mp3')

  // Unknown format resets to first format (mp3)
  assert.equal(getNextAudioFormat('unknown' as any), 'mp3')
})

test('video format cycling advances through mp4 -> mkv -> webm and wraps', () => {
  assert.equal(getNextVideoFormat('mp4'), 'mkv')
  assert.equal(getNextVideoFormat('mkv'), 'webm')
  assert.equal(getNextVideoFormat('webm'), 'mp4')

  // Unknown format resets to mp4
  assert.equal(getNextVideoFormat('unknown' as any), 'mp4')
})

test('cycle orders cover all supported formats', () => {
  assert.equal(AUDIO_CYCLE_ORDER.length, 9)
  assert.ok(AUDIO_CYCLE_ORDER.includes('mp3'))
  assert.ok(AUDIO_CYCLE_ORDER.includes('flac'))
  assert.ok(AUDIO_CYCLE_ORDER.includes('opus'))
  assert.ok(AUDIO_CYCLE_ORDER.includes('best'))

  assert.equal(VIDEO_CYCLE_ORDER.length, 3)
  assert.ok(VIDEO_CYCLE_ORDER.includes('mp4'))
  assert.ok(VIDEO_CYCLE_ORDER.includes('mkv'))
  assert.ok(VIDEO_CYCLE_ORDER.includes('webm'))
})
