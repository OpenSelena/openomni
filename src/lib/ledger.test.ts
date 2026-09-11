import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  loadLedger,
  recordDownload,
  findInLedger,
  isCompletedOnDisk,
  getCompletedDownload,
  recordDownloadWithStat,
  LEDGER_LIMIT,
  type LedgerEntry,
} from './ledger.js'

describe('Download Ledger', () => {
  const tmpDir = path.join(os.tmpdir(), `open-omni-ledger-test-${Date.now()}`)
  const testLedgerFile = path.join(tmpDir, 'ledger.json')
  const dummyMediaFile = path.join(tmpDir, 'test-video.mp4')

  beforeEach(() => {
    fs.mkdirSync(tmpDir, { recursive: true })
    fs.writeFileSync(dummyMediaFile, 'dummy media content')
    process.env.OPEN_OMNI_LEDGER_FILE = testLedgerFile
  })

  afterEach(() => {
    delete process.env.OPEN_OMNI_LEDGER_FILE
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch {}
  })

  it('loads empty ledger when file does not exist', () => {
    assert.deepEqual(loadLedger(), [])
  })

  it('records download and retrieves from ledger', () => {
    const entry: Omit<LedgerEntry, 'completedAt'> = {
      mediaId: 'dQw4w9WgXcQ',
      platform: 'youtube',
      url: 'https://youtu.be/dQw4w9WgXcQ',
      title: 'Rick Astley',
      outputPath: dummyMediaFile,
      fileSizeBytes: 1024,
      format: 'best',
    }

    const recorded = recordDownload(entry)
    assert.equal(recorded.mediaId, 'dQw4w9WgXcQ')
    assert.ok(recorded.completedAt)

    const list = loadLedger()
    assert.equal(list.length, 1)
    assert.equal(list[0].mediaId, 'dQw4w9WgXcQ')
  })

  it('finds entry by url or mediaId', () => {
    recordDownload({
      mediaId: 'vid123',
      platform: 'youtube',
      url: 'https://youtu.be/vid123',
      title: 'Test 123',
      outputPath: dummyMediaFile,
      fileSizeBytes: 500,
      format: 'mp3',
    })

    const byUrl = findInLedger({ url: 'https://youtu.be/vid123' })
    assert.ok(byUrl)
    assert.equal(byUrl.mediaId, 'vid123')

    const byId = findInLedger({ mediaId: 'vid123' })
    assert.ok(byId)
    assert.equal(byId.title, 'Test 123')

    const missing = findInLedger({ mediaId: 'unknown' })
    assert.equal(missing, undefined)
  })

  it('updates existing entry when same mediaId or url is re-downloaded', () => {
    recordDownload({
      mediaId: 'vid1',
      platform: 'youtube',
      url: 'https://youtu.be/vid1',
      title: 'Title v1',
      outputPath: dummyMediaFile,
      fileSizeBytes: 100,
      format: 'mp3',
    })

    recordDownload({
      mediaId: 'vid1',
      platform: 'youtube',
      url: 'https://youtu.be/vid1',
      title: 'Title v2',
      outputPath: dummyMediaFile,
      fileSizeBytes: 200,
      format: 'best',
    })

    const list = loadLedger()
    assert.equal(list.length, 1)
    assert.equal(list[0].title, 'Title v2')
    assert.equal(list[0].format, 'best')
  })

  it('verifies disk existence via isCompletedOnDisk', () => {
    const entry = recordDownload({
      mediaId: 'disktest',
      platform: 'youtube',
      url: 'https://youtu.be/disktest',
      title: 'Disk Test',
      outputPath: dummyMediaFile,
      fileSizeBytes: 100,
      format: 'best',
    })

    assert.equal(isCompletedOnDisk(entry), true)

    // Remove dummy file
    fs.unlinkSync(dummyMediaFile)
    assert.equal(isCompletedOnDisk(entry), false)
  })

  it('enforces FIFO limit on ledger entries', () => {
    // Fill up to LEDGER_LIMIT + 5
    for (let i = 0; i < LEDGER_LIMIT + 5; i++) {
      recordDownload({
        mediaId: `id-${i}`,
        platform: 'youtube',
        url: `https://youtu.be/id-${i}`,
        title: `Title ${i}`,
        outputPath: dummyMediaFile,
        fileSizeBytes: 100,
        format: 'best',
      })
    }

    const list = loadLedger()
    assert.equal(list.length, LEDGER_LIMIT)
    // Most recent should be at the front
    assert.equal(list[0].mediaId, `id-${LEDGER_LIMIT + 4}`)
    // Oldest items (0-4) should have been evicted
    assert.equal(findInLedger({ mediaId: 'id-0' }), undefined)
    assert.equal(findInLedger({ mediaId: 'id-4' }), undefined)
    assert.ok(findInLedger({ mediaId: 'id-5' }))
  })

  it('getCompletedDownload only returns entry if file exists on disk', () => {
    recordDownload({
      mediaId: 'video-exists',
      platform: 'youtube',
      url: 'https://youtu.be/video-exists',
      title: 'Existing Video',
      outputPath: dummyMediaFile,
    })

    recordDownload({
      mediaId: 'video-missing',
      platform: 'youtube',
      url: 'https://youtu.be/video-missing',
      title: 'Missing Video',
      outputPath: path.join(tmpDir, 'nonexistent.mp4'),
    })

    assert.ok(getCompletedDownload({ mediaId: 'video-exists' }))
    assert.equal(getCompletedDownload({ mediaId: 'video-missing' }), undefined)
  })

  it('recordDownloadWithStat automatically probes file size from disk', async () => {
    const recorded = await recordDownloadWithStat({
      mediaId: 'stat-test',
      platform: 'youtube',
      url: 'https://youtu.be/stat-test',
      title: 'Stat Test',
      outputPath: dummyMediaFile,
    })

    assert.equal(recorded.fileSizeBytes, 'dummy media content'.length)
    const fetched = findInLedger({ mediaId: 'stat-test' })
    assert.equal(fetched?.fileSizeBytes, 'dummy media content'.length)
  })
})

