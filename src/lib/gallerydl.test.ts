import assert from 'node:assert/strict'
import test from 'node:test'
import path from 'node:path'
import os from 'node:os'
import {
  isPhotoExtension,
  isVideoExtension,
  parseGalleryDlOutput,
  galleryDlAssetName,
  resolveGalleryDlPath,
} from './gallerydl.js'

test('isPhotoExtension correctly classifies image extensions', () => {
  assert.equal(isPhotoExtension('jpg'), true)
  assert.equal(isPhotoExtension('jpeg'), true)
  assert.equal(isPhotoExtension('PNG'), true)
  assert.equal(isPhotoExtension('.webp'), true)
  assert.equal(isPhotoExtension('gif'), true)
  assert.equal(isPhotoExtension('mp4'), false)
  assert.equal(isPhotoExtension('mp3'), false)
})

test('isVideoExtension correctly classifies video extensions', () => {
  assert.equal(isVideoExtension('mp4'), true)
  assert.equal(isVideoExtension('webm'), true)
  assert.equal(isVideoExtension('.mov'), true)
  assert.equal(isVideoExtension('jpg'), false)
  assert.equal(isVideoExtension('png'), false)
})

test('galleryDlAssetName returns correct binary for platform', () => {
  const name = galleryDlAssetName()
  if (process.platform === 'win32') {
    assert.equal(name, 'gallery-dl.exe')
  } else {
    assert.equal(name, 'gallery-dl.bin')
  }
})

test('resolveGalleryDlPath defaults to ~/.open-omni/bin', () => {
  const resolved = resolveGalleryDlPath()
  const expectedName = process.platform === 'win32' ? 'gallery-dl.exe' : 'gallery-dl'
  assert.equal(resolved, path.join(os.homedir(), '.open-omni', 'bin', expectedName))
})

test('parseGalleryDlOutput parses standard gallery-dl tuple array', () => {
  const raw = JSON.stringify([
    [
      2,
      'https://pbs.twimg.com/media/photo1.jpg:orig',
      {
        filename: 'photo1.jpg',
        extension: 'jpg',
        content: 'Beautiful scenery in Kyoto',
        author: {name: 'Traveler', nick: 'traveler'},
        width: 4096,
        height: 2730,
        num: 1,
      },
    ],
    [
      2,
      'https://pbs.twimg.com/media/photo2.png:orig',
      {
        filename: 'photo2.png',
        extension: 'png',
        content: 'Beautiful scenery in Kyoto',
        author: {name: 'Traveler', nick: 'traveler'},
        width: 3840,
        height: 2160,
        num: 2,
      },
    ],
  ])

  const items = parseGalleryDlOutput(raw)
  assert.equal(items.length, 2)
  assert.equal(items[0].kind, 'photo')
  assert.equal(items[0].url, 'https://pbs.twimg.com/media/photo1.jpg:orig')
  assert.equal(items[0].filename, 'photo1.jpg')
  assert.equal(items[0].ext, 'jpg')
  assert.equal(items[0].width, 4096)
  assert.equal(items[0].height, 2730)
  assert.equal(items[0].uploader, 'Traveler')
  assert.equal(items[0].index, 1)

  assert.equal(items[1].kind, 'photo')
  assert.equal(items[1].ext, 'png')
  assert.equal(items[1].index, 2)
})

test('parseGalleryDlOutput parses mixed media items (video + photo)', () => {
  const raw = JSON.stringify([
    [
      2,
      'https://video.twimg.com/ext_tw_video/123/pu/vid/1080x1920/clip.mp4',
      {
        filename: 'clip.mp4',
        extension: 'mp4',
        content: 'Event highlights',
        author: {nick: 'reporter'},
      },
    ],
    [
      2,
      'https://pbs.twimg.com/media/still.jpg:orig',
      {
        filename: 'still.jpg',
        extension: 'jpg',
        content: 'Event highlights',
        author: {nick: 'reporter'},
      },
    ],
  ])

  const items = parseGalleryDlOutput(raw)
  assert.equal(items.length, 2)
  assert.equal(items[0].kind, 'video')
  assert.equal(items[0].ext, 'mp4')
  assert.equal(items[1].kind, 'photo')
  assert.equal(items[1].ext, 'jpg')
})

test('parseGalleryDlOutput handles plain object array format', () => {
  const raw = JSON.stringify([
    {
      url: 'https://example.com/image.webp',
      filename: 'image.webp',
      extension: 'webp',
      title: 'A sample image',
      uploader: 'art_hub',
    },
  ])

  const items = parseGalleryDlOutput(raw)
  assert.equal(items.length, 1)
  assert.equal(items[0].kind, 'photo')
  assert.equal(items[0].url, 'https://example.com/image.webp')
  assert.equal(items[0].ext, 'webp')
})

test('parseGalleryDlOutput throws on empty or invalid json', () => {
  assert.throws(() => parseGalleryDlOutput('invalid json'), /failed to parse gallery-dl json/i)
  assert.throws(() => parseGalleryDlOutput('[]'), /no media entries found in gallery-dl output/i)
})
