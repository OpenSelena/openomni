import assert from 'node:assert/strict'
import test from 'node:test'
import {
  captureFrames,
  clickTargetAt,
  findFrameRow,
  frameRowSpan,
} from './click-map.js'

test('captureFrames captures written frame without ANSI codes', () => {
  let output = ''
  const mockStream = {
    write(chunk: unknown) {
      output += String(chunk)
      return true
    },
  } as unknown as NodeJS.WriteStream

  const proxied = captureFrames(mockStream)
  proxied.write('\u001b[31mHello World\u001b[0m\nSecond Line\n')

  assert.equal(findFrameRow('Hello World'), 0)
  assert.equal(findFrameRow('Second Line'), 1)
  assert.equal(findFrameRow('Nonexistent'), -1)
})

test('frameRowSpan returns [first, last] 1-based columns of visible text', () => {
  const span = frameRowSpan(0)
  assert.deepEqual(span, [1, 11]) // 'Hello World' is 11 chars starting at col 1

  assert.equal(frameRowSpan(99), undefined)
})

test('clickTargetAt hit-tests against active frame lines', () => {
  let clicked = false
  const target = {
    match: 'Hello',
    action: () => { clicked = true },
    padX: 1,
    padY: 0,
  }

  // x=1, y=1 should hit 'Hello' on row 0
  const hit = clickTargetAt(1, 1, [target])
  assert.ok(hit)
  hit.action()
  assert.equal(clicked, true)

  // x=20 on row 1 should miss
  const miss = clickTargetAt(20, 1, [target])
  assert.equal(miss, undefined)
})
