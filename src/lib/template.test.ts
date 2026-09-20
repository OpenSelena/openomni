import assert from 'node:assert/strict'
import test from 'node:test'
import {renderOutputTemplate, sanitizeTemplateTokens} from './template.js'

test('renderOutputTemplate substitutes standard yt-dlp format tokens', () => {
  const tpl = '%(uploader)s - %(title)s [%(id)s].%(ext)s'
  const vars = {
    uploader: 'Artist & Co',
    title: 'Great Track / Song: Remix?',
    id: 'dQw4w9WgXcQ',
    ext: 'mp4',
  }
  const result = renderOutputTemplate(tpl, vars)
  assert.equal(result, 'Artist & Co - Great Track _ Song_ Remix_ [dQw4w9WgXcQ].mp4')
})

test('renderOutputTemplate substitutes bracket style tokens', () => {
  const tpl = '{uploader} - {title}.{ext}'
  const vars = {
    uploader: 'Creator',
    title: 'My Video',
    ext: 'mkv',
  }
  const result = renderOutputTemplate(tpl, vars)
  assert.equal(result, 'Creator - My Video.mkv')
})

test('renderOutputTemplate handles playlist_index and index padding', () => {
  const tpl1 = '%(playlist_index)02d - %(title)s.%(ext)s'
  const tpl2 = '{index} - {title}.{ext}'
  const vars = {
    title: 'Track One',
    index: 5,
    playlist_index: 5,
    ext: 'mp3',
  }
  assert.equal(renderOutputTemplate(tpl1, vars), '05 - Track One.mp3')
  assert.equal(renderOutputTemplate(tpl2, vars), '05 - Track One.mp3')
})

test('renderOutputTemplate handles upload date tokens', () => {
  const tpl = '%(upload_date)s_%(title)s.%(ext)s'
  const vars = {
    title: 'Stream',
    upload_date: '20260920',
    ext: 'mp4',
  }
  assert.equal(renderOutputTemplate(tpl, vars), '20260920_Stream.mp4')
})

test('renderOutputTemplate sanitizes dangerous path traversal sequences in variable values', () => {
  const tpl = '%(uploader)s/%(title)s.%(ext)s'
  const vars = {
    uploader: '../../etc',
    title: 'passwd',
    ext: 'txt',
  }
  const result = renderOutputTemplate(tpl, vars)
  // Variable values must not introduce path traversal
  assert.ok(!result.includes('..'))
})

test('renderOutputTemplate sanitizes dangerous path traversal sequences in the template string itself', () => {
  const tpl = '../../etc/%(title)s.%(ext)s'
  const vars = {
    title: 'test',
    ext: 'mp4',
  }
  const result = renderOutputTemplate(tpl, vars)
  assert.ok(!result.includes('..'))
})

