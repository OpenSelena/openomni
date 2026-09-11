import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseTimeRange, normalizeToYtdlpSection } from './time.js'

describe('parseTimeRange', () => {
  it('parses MM:SS-MM:SS format', () => {
    const res = parseTimeRange('01:30-03:45')
    assert.deepEqual(res, {
      startSeconds: 90,
      endSeconds: 225,
      startFormatted: '00:01:30',
      endFormatted: '00:03:45',
    })
  })

  it('parses HH:MM:SS-HH:MM:SS format', () => {
    const res = parseTimeRange('01:15:30-02:00:00')
    assert.deepEqual(res, {
      startSeconds: 4530,
      endSeconds: 7200,
      startFormatted: '01:15:30',
      endFormatted: '02:00:00',
    })
  })

  it('parses raw seconds range', () => {
    const res = parseTimeRange('90-180')
    assert.deepEqual(res, {
      startSeconds: 90,
      endSeconds: 180,
      startFormatted: '00:01:30',
      endFormatted: '00:03:00',
    })
  })

  it('handles single-digit minutes and seconds', () => {
    const res = parseTimeRange('1:5-2:10')
    assert.deepEqual(res, {
      startSeconds: 65,
      endSeconds: 130,
      startFormatted: '00:01:05',
      endFormatted: '00:02:10',
    })
  })

  it('returns null for inverted or invalid ranges', () => {
    assert.equal(parseTimeRange('03:00-01:00'), null)
    assert.equal(parseTimeRange('invalid-range'), null)
    assert.equal(parseTimeRange(''), null)
    assert.equal(parseTimeRange('10:00'), null)
  })
})

describe('normalizeToYtdlpSection', () => {
  it('formats section string for yt-dlp', () => {
    assert.equal(normalizeToYtdlpSection('01:30-03:45'), '*00:01:30-00:03:45')
    assert.equal(normalizeToYtdlpSection('90-180'), '*00:01:30-00:03:00')
  })

  it('returns null for invalid input', () => {
    assert.equal(normalizeToYtdlpSection('bad'), null)
  })
})
