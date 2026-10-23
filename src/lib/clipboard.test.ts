import assert from 'node:assert/strict'
import test from 'node:test'
import { readClipboard, readClipboardAsync } from './clipboard.js'

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

test('readClipboardAsync returns clipboard string when async command succeeds', async () => {
  const mockAsyncExec = async () => ({ stdout: 'https://youtu.be/dQw4w9WgXcQ\n' })
  const text = await readClipboardAsync(mockAsyncExec as never)
  assert.equal(text, 'https://youtu.be/dQw4w9WgXcQ\n')
})

test('readClipboardAsync falls back and returns empty string on all errors', async () => {
  const mockAsyncExec = async () => { throw new Error('async command failed') }
  const text = await readClipboardAsync(mockAsyncExec as never)
  assert.equal(text, '')
})
