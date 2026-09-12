import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  addToHistory,
  getHistoryPath,
  loadHistory,
} from './history.js'

test('getHistoryPath respects OPEN_OMNI_HISTORY_FILE override', () => {
  const custom = path.join(os.tmpdir(), 'custom-history.json')
  const resolved = getHistoryPath({ OPEN_OMNI_HISTORY_FILE: custom })
  assert.equal(resolved, custom)
})

test('getHistoryPath respects XDG_CONFIG_HOME', () => {
  const xdg = path.join(os.tmpdir(), 'xdg-test')
  const resolved = getHistoryPath({ XDG_CONFIG_HOME: xdg })
  assert.equal(resolved, path.join(xdg, 'open-omni', 'history.json'))
})

test('loadHistory returns empty array when file does not exist', () => {
  const tmp = path.join(os.tmpdir(), 'test-hist-nonexistent.json')
  process.env.OPEN_OMNI_HISTORY_FILE = tmp
  try {
    const list = loadHistory()
    assert.deepEqual(list, [])
  } finally {
    delete process.env.OPEN_OMNI_HISTORY_FILE
  }
})

test('addToHistory adds, deduplicates, and persists entries', () => {
  const tmp = path.join(os.tmpdir(), 'test-hist-persist.json')
  process.env.OPEN_OMNI_HISTORY_FILE = tmp
  try {
    const res1 = addToHistory('https://youtube.com/watch?v=abc')
    assert.deepEqual(res1, ['https://youtube.com/watch?v=abc'])

    const res2 = addToHistory('https://youtube.com/watch?v=def')
    assert.deepEqual(res2, ['https://youtube.com/watch?v=def', 'https://youtube.com/watch?v=abc'])

    // Duplicate should move to front
    const res3 = addToHistory('https://youtube.com/watch?v=abc')
    assert.deepEqual(res3, ['https://youtube.com/watch?v=abc', 'https://youtube.com/watch?v=def'])

    // Verify written to disk
    const content = JSON.parse(fs.readFileSync(tmp, 'utf8'))
    assert.deepEqual(content, ['https://youtube.com/watch?v=abc', 'https://youtube.com/watch?v=def'])
  } finally {
    delete process.env.OPEN_OMNI_HISTORY_FILE
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp)
  }
})
