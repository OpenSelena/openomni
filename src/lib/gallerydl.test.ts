import assert from 'node:assert/strict'
import test from 'node:test'
import {
  galleryDlAssetName,
  isPhotoExtension,
  isVideoExtension,
  parseGalleryDlOutput,
  resolveGalleryDlPath,
  isGalleryDlUpToDateMessage,
  isGalleryDlPackageManaged,
  getGalleryDlDownloadUrls,
  CODEBERG_MASTER_ARCHIVE,
  detectMacPackageManager,
  installGalleryDlMacOs,
  ensureGalleryDl,
  updateGalleryDl,
} from './gallerydl.js'

test('isPhotoExtension correctly classifies image extensions', () => {
  assert.equal(isPhotoExtension('jpg'), true)
  assert.equal(isPhotoExtension('.jpeg'), true)
  assert.equal(isPhotoExtension('PNG'), true)
  assert.equal(isPhotoExtension('.webp'), true)
  assert.equal(isPhotoExtension('gif'), true)
  assert.equal(isPhotoExtension('avif'), true)
  assert.equal(isPhotoExtension('mp4'), false)
  assert.equal(isPhotoExtension('mp3'), false)
})

test('isVideoExtension correctly classifies video extensions', () => {
  assert.equal(isVideoExtension('mp4'), true)
  assert.equal(isVideoExtension('.webm'), true)
  assert.equal(isVideoExtension('MOV'), true)
  assert.equal(isVideoExtension('mkv'), true)
  assert.equal(isVideoExtension('jpg'), false)
})

test('galleryDlAssetName returns correct binary for platform', () => {
  const asset = galleryDlAssetName()
  if (process.platform === 'win32') {
    assert.equal(asset, 'gallery-dl.exe')
  } else {
    assert.equal(asset, 'gallery-dl.bin')
  }
})

test('resolveGalleryDlPath defaults to ~/.open-omni/bin', () => {
  const custom = resolveGalleryDlPath({OPEN_OMNI_DIR: '/custom/bin'})
  if (process.platform === 'win32') {
    assert.ok(custom.endsWith('\\gallery-dl.exe') || custom.endsWith('/gallery-dl.exe'))
  } else {
    assert.ok(custom.endsWith('/gallery-dl'))
  }
})

test('parseGalleryDlOutput parses standard gallery-dl tuple array', () => {
  const raw = JSON.stringify([
    [
      2,
      'https://example.com/photo1.jpg',
      {
        filename: 'photo1.jpg',
        extension: 'jpg',
        title: 'Sunset over sea',
        uploader: 'photog123',
      },
    ],
    [
      2,
      'https://example.com/photo2.png',
      {
        filename: 'photo2.png',
        extension: 'png',
        title: 'Sunset over sea',
        uploader: 'photog123',
      },
    ],
  ])

  const items = parseGalleryDlOutput(raw)
  assert.equal(items.length, 2)
  assert.equal(items[0].url, 'https://example.com/photo1.jpg')
  assert.equal(items[0].filename, 'photo1.jpg')
  assert.equal(items[0].ext, 'jpg')
  assert.equal(items[0].kind, 'photo')
  assert.equal(items[0].title, 'Sunset over sea')
  assert.equal(items[0].index, 1)

  assert.equal(items[1].url, 'https://example.com/photo2.png')
  assert.equal(items[1].filename, 'photo2.png')
  assert.equal(items[1].ext, 'png')
  assert.equal(items[1].kind, 'photo')
  assert.equal(items[1].index, 2)
})

test('parseGalleryDlOutput parses mixed media items (video + photo)', () => {
  const raw = JSON.stringify([
    [
      2,
      'https://video.twimg.com/ext_tw_video/123/pu/vid/720x1280/clip.mp4',
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

test('parseGalleryDlOutput surfaces AbortExtraction error message', () => {
  const raw = JSON.stringify([
    [
      -1,
      {
        error: 'AbortExtraction',
        message: 'HTTP redirect to login page (https://www.instagram.com/accounts/login/)',
      },
    ],
  ])

  assert.throws(
    () => parseGalleryDlOutput(raw),
    /gallery-dl extraction aborted: HTTP redirect to login page/i,
  )
})

test('CODEBERG_MASTER_ARCHIVE points to Codeberg master tarball', () => {
  assert.equal(
    CODEBERG_MASTER_ARCHIVE,
    'https://codeberg.org/mikf/gallery-dl/archive/master.tar.gz',
  )
})

test('isGalleryDlUpToDateMessage correctly identifies already updated outputs', () => {
  assert.equal(isGalleryDlUpToDateMessage('gallery-dl is up-to-date'), true)
  assert.equal(isGalleryDlUpToDateMessage('Already up to date'), true)
  assert.equal(isGalleryDlUpToDateMessage('Latest version is already installed'), true)
  assert.equal(isGalleryDlUpToDateMessage('Updating to version 1.28.0...'), false)
})

test('isGalleryDlPackageManaged detects package manager refusal messages', () => {
  assert.equal(
    isGalleryDlPackageManaged('installed with pip, use pip install --upgrade gallery-dl'),
    true,
  )
  assert.equal(
    isGalleryDlPackageManaged('Homebrew managed: use brew upgrade gallery-dl'),
    true,
  )
  assert.equal(
    isGalleryDlPackageManaged('Updating to version 1.28.0...'),
    false,
  )
})

test('getGalleryDlDownloadUrls returns Codeberg browser_download_url without GitHub fallback', async () => {
  const mockFetch: typeof fetch = async (input: RequestInfo | URL) => {
    const urlStr = String(input)
    if (urlStr.includes('codeberg.org/api')) {
      return new Response(
        JSON.stringify({
          tag_name: 'v1.32.11',
          assets: [
            {
              name: 'gallery-dl.exe',
              browser_download_url: 'https://codeberg.org/mikf/gallery-dl/releases/download/v1.32.11/gallery-dl.exe',
            },
            {
              name: 'gallery-dl.bin',
              browser_download_url: 'https://codeberg.org/mikf/gallery-dl/releases/download/v1.32.11/gallery-dl.bin',
            },
          ],
        }),
        {status: 200, headers: {'content-type': 'application/json'}},
      )
    }
    return new Response('not found', {status: 404})
  }

  const urls = await getGalleryDlDownloadUrls('gallery-dl.exe', mockFetch)
  assert.equal(urls.length, 1)
  assert.equal(urls[0], 'https://codeberg.org/mikf/gallery-dl/releases/download/v1.32.11/gallery-dl.exe')
  assert.ok(!urls.some(u => u.includes('github.com')), 'Should not contain any GitHub URLs')
})

test('getGalleryDlDownloadUrls constructs tag URL if browser_download_url is omitted', async () => {
  const mockFetch: typeof fetch = async (input: RequestInfo | URL) => {
    const urlStr = String(input)
    if (urlStr.includes('codeberg.org/api')) {
      return new Response(
        JSON.stringify({
          tag_name: 'v1.32.11',
          assets: [],
        }),
        {status: 200, headers: {'content-type': 'application/json'}},
      )
    }
    return new Response('not found', {status: 404})
  }

  const urls = await getGalleryDlDownloadUrls('gallery-dl.exe', mockFetch)
  assert.equal(urls.length, 1)
  assert.equal(urls[0], 'https://codeberg.org/mikf/gallery-dl/releases/download/v1.32.11/gallery-dl.exe')
})

test('getGalleryDlDownloadUrls returns empty array if Codeberg API is unreachable', async () => {
  const mockFetch: typeof fetch = async () => {
    throw new Error('network down')
  }

  const urls = await getGalleryDlDownloadUrls('gallery-dl.bin', mockFetch)
  assert.equal(urls.length, 0)
})

test('detectMacPackageManager prefers brew if available', async () => {
  const probe = async (cmd: string) => cmd === 'brew' || cmd === 'python3'
  const manager = await detectMacPackageManager(probe)
  assert.equal(manager, 'brew')
})

test('detectMacPackageManager falls back to pip if brew is missing', async () => {
  const probe = async (cmd: string) => cmd === 'python3'
  const manager = await detectMacPackageManager(probe)
  assert.equal(manager, 'pip')
})

test('detectMacPackageManager returns undefined if neither brew nor pip available', async () => {
  const probe = async () => false
  const manager = await detectMacPackageManager(probe)
  assert.equal(manager, undefined)
})

test('installGalleryDlMacOs throws when no package manager available', async () => {
  await assert.rejects(
    () => installGalleryDlMacOs({probeFn: async () => false}),
    /gallery-dl is required for photo downloads on macOS/i,
  )
})

test('installGalleryDlMacOs aborts when user declines prompt', async () => {
  await assert.rejects(
    () =>
      installGalleryDlMacOs({
        probeFn: async cmd => cmd === 'brew',
        promptConfirmFn: async () => false,
      }),
    /gallery-dl installation cancelled/i,
  )
})

test('installGalleryDlMacOs executes installation when confirmed', async () => {
  let installedManager: string | undefined
  const result = await installGalleryDlMacOs({
    probeFn: async (cmd, args) => {
      if (cmd === 'brew') return true
      if (cmd === 'gallery-dl' && args[0] === '--version') return installedManager !== undefined
      return false
    },
    promptConfirmFn: async () => true,
    installFn: async manager => {
      installedManager = manager
    },
  })
  assert.equal(installedManager, 'brew')
  assert.equal(result, 'gallery-dl')
})

test('ensureGalleryDl triggers macOS installation flow on darwin when missing', async () => {
  let installCalled = false
  const binary = await ensureGalleryDl(
    undefined,
    undefined,
    {
      platform: 'darwin',
      probeFn: async (cmd, args) => {
        if (cmd === 'brew') return true
        if (cmd === 'gallery-dl' && args[0] === '--version') return installCalled
        return false
      },
      promptConfirmFn: async () => true,
      installFn: async () => {
        installCalled = true
      },
    },
  )
  assert.equal(installCalled, true)
  assert.equal(binary, 'gallery-dl')
})

test('updateGalleryDl routes to package manager upgrade on darwin', async () => {
  let upgradedManager: string | undefined
  const res = await updateGalleryDl({
    platform: 'darwin',
    probeFn: async cmd => cmd === 'brew' || cmd === 'gallery-dl',
    getVersionFn: async () => (upgradedManager ? '1.32.12' : '1.32.11'),
    upgradeFn: async manager => {
      upgradedManager = manager
    },
  })
  assert.equal(upgradedManager, 'brew')
  assert.equal(res.previousVersion, '1.32.11')
  assert.equal(res.currentVersion, '1.32.12')
  assert.equal(res.updated, true)
})

test('updateGalleryDl installs if missing on darwin', async () => {
  let installedManager: string | undefined
  const res = await updateGalleryDl({
    platform: 'darwin',
    probeFn: async (cmd, args) => {
      if (cmd === 'brew') return true
      if (cmd === 'gallery-dl' && args[0] === '--version') return installedManager !== undefined
      return false
    },
    getVersionFn: async () => (installedManager ? '1.32.12' : undefined),
    installFn: async manager => {
      installedManager = manager
    },
  })
  assert.equal(installedManager, 'brew')
  assert.equal(res.currentVersion, '1.32.12')
  assert.equal(res.updated, true)
})

