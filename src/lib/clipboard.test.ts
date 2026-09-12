import assert from 'node:assert/strict'
import test from 'node:test'
import { readClipboard } from './clipboard.js'

test('readClipboard returns clipboard string when command succeeds', () => {
  const mockExec = () => 'https://youtu.be/dQw4w9WgXcQ'
  const text = readClipboard(mockExec as never)
  assert.equal(text, 'https://youtu.be/dQw4w9WgXcQ')
})

test('readClipboard falls back and returns empty string on all errors', () => {
  const mockExec = () => { throw new Error('command failed') }
  const text = readClipboard(mockExec as never)
  assert.equal(text, '')
})
