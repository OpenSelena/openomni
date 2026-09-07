import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isMixedOrPhotoPlatform,
  filterMediaItems,
  normalizeGalleryDlToUnified,
  normalizeYtDlpToUnified,
  postToPlaylistMetadata,
  probeUnified,
  downloadUnifiedItem,
  type UnifiedMediaItem,
} from './dispatcher.js'
import type {GalleryDlItem} from './gallerydl.js'
import type {VideoInfo} from './ytdlp.js'
import type {PlaylistEntry, PlaylistMetadata} from './playlist.js'

test('isMixedOrPhotoPlatform recognizes social photo/mixed platforms', () => {
  assert.equal(isMixedOrPhotoPlatform('https://x.com/user/status/123'), true)
  assert.equal(isMixedOrPhotoPlatform('https://twitter.com/user/status/123'), true)
  assert.equal(isMixedOrPhotoPlatform('https://www.instagram.com/p/CXYZ/'), true)
  assert.equal(isMixedOrPhotoPlatform('https://www.reddit.com/r/pics/comments/xyz/'), true)
  assert.equal(isMixedOrPhotoPlatform('https://bsky.app/profile/user/post/123'), true)
  assert.equal(isMixedOrPhotoPlatform('https://www.threads.net/@user/post/xyz'), true)

  assert.equal(isMixedOrPhotoPlatform('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), false)
  assert.equal(isMixedOrPhotoPlatform('https://youtu.be/dQw4w9WgXcQ'), false)
  assert.equal(isMixedOrPhotoPlatform('https://vimeo.com/12345'), false)
  assert.equal(isMixedOrPhotoPlatform('https://www.twitch.tv/videos/12345'), false)
})

test('filterMediaItems filters by photos-only or videos-only', () => {
  const items: UnifiedMediaItem[] = [
    {
      id: '1',
      index: 1,
      title: 'Interview',
      kind: 'video',
      engine: 'ytdlp',
      url: 'https://example.com/video.mp4',
      ext: 'mp4',
    },
    {
      id: '2',
      index: 2,
      title: 'Photo 1',
      kind: 'photo',
      engine: 'gallerydl',
      url: 'https://example.com/photo1.jpg',
      ext: 'jpg',
    },
    {
      id: '3',
      index: 3,
      title: 'Photo 2',
      kind: 'photo',
      engine: 'gallerydl',
      url: 'https://example.com/photo2.jpg',
      ext: 'jpg',
    },
  ]

  assert.equal(filterMediaItems(items, 'all').length, 3)

  const photos = filterMediaItems(items, 'photos')
  assert.equal(photos.length, 2)
  assert.equal(photos[0].id, '2')
  assert.equal(photos[1].id, '3')

  const videos = filterMediaItems(items, 'videos')
  assert.equal(videos.length, 1)
  assert.equal(videos[0].id, '1')
})

test('normalizeGalleryDlToUnified handles single photo post', () => {
  const galleryItems: GalleryDlItem[] = [
    {
      url: 'https://pbs.twimg.com/media/XYZ.jpg:orig',
      filename: 'XYZ.jpg',
      ext: 'jpg',
      kind: 'photo',
      title: 'City skyline',
      uploader: 'photographer',
      width: 4096,
      height: 2730,
      index: 1,
    },
  ]

  const post = normalizeGalleryDlToUnified(galleryItems, 'https://x.com/photographer/status/123')
  assert.equal(post.isSingle, true)
  assert.equal(post.title, 'City skyline')
  assert.equal(post.uploader, 'photographer')
  assert.equal(post.items.length, 1)
  assert.equal(post.items[0].kind, 'photo')
  assert.equal(post.items[0].engine, 'gallerydl')
  assert.equal(post.items[0].ext, 'jpg')
})

test('normalizeGalleryDlToUnified handles mixed post (video + photos)', () => {
  const galleryItems: GalleryDlItem[] = [
    {
      url: 'https://video.twimg.com/clip.mp4',
      filename: 'clip.mp4',
      ext: 'mp4',
      kind: 'video',
      title: 'Launch event',
      uploader: 'tech_news',
      index: 1,
    },
    {
      url: 'https://pbs.twimg.com/still.jpg:orig',
      filename: 'still.jpg',
      ext: 'jpg',
      kind: 'photo',
      title: 'Launch event',
      uploader: 'tech_news',
      width: 1920,
      height: 1080,
      index: 2,
    },
  ]

  const post = normalizeGalleryDlToUnified(galleryItems, 'https://x.com/tech_news/status/456')
  assert.equal(post.isSingle, false)
  assert.equal(post.title, 'Launch event')
  assert.equal(post.items.length, 2)
  assert.equal(post.items[0].kind, 'video')
  assert.equal(post.items[0].engine, 'ytdlp')
  assert.equal(post.items[1].kind, 'photo')
  assert.equal(post.items[1].engine, 'gallerydl')
})

test('normalizeYtDlpToUnified converts single video and playlists', () => {
  const videoInfo: VideoInfo = {
    title: 'Never Gonna Give You Up',
    uploader: 'RickAstleyVEVO',
    duration: 213,
    webpage_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  }

  const singlePost = normalizeYtDlpToUnified({kind: 'single', info: videoInfo, infoJsonPath: ''}, 'https://youtu.be/dQw4w9WgXcQ')
  assert.equal(singlePost.isSingle, true)
  assert.equal(singlePost.title, 'Never Gonna Give You Up')
  assert.equal(singlePost.items.length, 1)
  assert.equal(singlePost.items[0].kind, 'video')
  assert.equal(singlePost.items[0].engine, 'ytdlp')

  const playlistMeta: PlaylistMetadata = {
    id: 'PL123',
    title: 'Top Hits',
    uploader: 'Music Channel',
    entries: [],
    validEntries: [
      {id: '1', title: 'Track 1', url: 'https://example.com/1', duration: 180, index: 1},
      {id: '2', title: 'Track 2', url: 'https://example.com/2', duration: 200, index: 2},
    ],
  }

  const playlistPost = normalizeYtDlpToUnified({kind: 'playlist', playlist: playlistMeta}, 'https://example.com/playlist')
  assert.equal(playlistPost.isSingle, false)
  assert.equal(playlistPost.title, 'Top Hits')
  assert.equal(playlistPost.items.length, 2)
  assert.equal(playlistPost.items[0].title, 'Track 1')
  assert.equal(playlistPost.items[1].title, 'Track 2')
})

test('postToPlaylistMetadata converts UnifiedPostResult to PlaylistMetadata with preserved kinds', () => {
  const post = {
    id: 'post123',
    title: 'Photo Gallery',
    uploader: 'photog',
    webpageUrl: 'https://x.com/post123',
    isSingle: false,
    items: [
      {
        id: '1',
        index: 1,
        title: 'Sunset',
        kind: 'photo' as const,
        engine: 'gallerydl' as const,
        url: 'https://example.com/sunset.jpg',
        ext: 'jpg',
      },
      {
        id: '2',
        index: 2,
        title: 'Timelapse',
        kind: 'video' as const,
        engine: 'ytdlp' as const,
        url: 'https://example.com/timelapse.mp4',
        ext: 'mp4',
      },
    ],
  }

  const playlist = postToPlaylistMetadata(post)
  assert.equal(playlist.id, 'post123')
  assert.equal(playlist.title, 'Photo Gallery')
  assert.equal(playlist.validEntries.length, 2)
  assert.equal(playlist.validEntries[0].kind, 'photo')
  assert.equal(playlist.validEntries[0].ext, 'jpg')
  assert.equal(playlist.validEntries[1].kind, 'video')
  assert.equal(playlist.validEntries[1].ext, 'mp4')
})

test('probeUnified detects single photo on social platform', async () => {
  const result = await probeUnified({
    url: 'https://x.com/user/status/1',
    ytdlp: 'yt-dlp',
    probeGalleryDlFn: async () => [
      {
        url: 'https://pbs.twimg.com/media/pic.jpg:orig',
        filename: 'pic.jpg',
        ext: 'jpg',
        kind: 'photo',
        title: 'Sunset view',
        uploader: 'user',
        index: 1,
      },
    ],
  })

  assert.equal(result.kind, 'single_photo')
  if (result.kind === 'single_photo') {
    assert.equal(result.postTitle, 'Sunset view')
    assert.equal(result.item.kind, 'photo')
    assert.equal(result.item.url, 'https://pbs.twimg.com/media/pic.jpg:orig')
  }
})

test('probeUnified detects mixed/carousel post and creates adapted playlist', async () => {
  const result = await probeUnified({
    url: 'https://x.com/user/status/2',
    ytdlp: 'yt-dlp',
    probeGalleryDlFn: async () => [
      {
        url: 'https://pbs.twimg.com/media/pic1.jpg:orig',
        filename: 'pic1.jpg',
        ext: 'jpg',
        kind: 'photo',
        title: 'Post Title',
        index: 1,
      },
      {
        url: 'https://video.twimg.com/vid.mp4',
        filename: 'vid.mp4',
        ext: 'mp4',
        kind: 'video',
        title: 'Post Title',
        index: 2,
      },
    ],
  })

  assert.equal(result.kind, 'mixed_post')
  if (result.kind === 'mixed_post') {
    assert.equal(result.post.items.length, 2)
    assert.equal(result.playlist.validEntries.length, 2)
    assert.equal(result.playlist.validEntries[0].kind, 'photo')
    assert.equal(result.playlist.validEntries[1].kind, 'video')
  }
})

test('probeUnified applies --photos-only and --videos-only filter', async () => {
  const mockItems: GalleryDlItem[] = [
    {
      url: 'https://example.com/pic1.jpg',
      filename: 'pic1.jpg',
      ext: 'jpg',
      kind: 'photo',
      index: 1,
    },
    {
      url: 'https://example.com/vid1.mp4',
      filename: 'vid1.mp4',
      ext: 'mp4',
      kind: 'video',
      index: 2,
    },
  ]

  const photosResult = await probeUnified({
    url: 'https://x.com/user/status/3',
    ytdlp: 'yt-dlp',
    mediaFilter: 'photos',
    probeGalleryDlFn: async () => mockItems,
  })

  assert.equal(photosResult.kind, 'single_photo')

  const videosResult = await probeUnified({
    url: 'https://x.com/user/status/3',
    ytdlp: 'yt-dlp',
    mediaFilter: 'videos',
    probeGalleryDlFn: async () => mockItems,
    probeYtDlpFn: async () => ({
      kind: 'single',
      info: {title: 'vid1', webpage_url: 'https://x.com/user/status/3'},
      infoJsonPath: '/tmp/vid1.json',
    }),
  })

  assert.equal(videosResult.kind, 'single_video')
})

test('downloadUnifiedItem delegates photos to photo downloader and videos to ytdlp', async () => {
  let photoDownloaded = false
  let videoDownloaded = false

  const photoEntry: PlaylistEntry = {
    id: '1',
    title: 'Photo 1',
    url: 'https://example.com/photo.jpg',
    index: 1,
    kind: 'photo',
  }

  await downloadUnifiedItem({
    item: photoEntry,
    destDir: '/tmp/downloads',
    filename: '01 - Photo 1.jpg',
    ytdlp: 'yt-dlp',
    choice: {label: 'best', kind: 'video', args: []},
    downloadPhotoFn: async opts => {
      photoDownloaded = true
      return `${opts.destDir}/${opts.filename}`
    },
  })

  assert.equal(photoDownloaded, true)

  const videoEntry: PlaylistEntry = {
    id: '2',
    title: 'Video 1',
    url: 'https://example.com/video.mp4',
    index: 2,
    kind: 'video',
  }

  await downloadUnifiedItem({
    item: videoEntry,
    destDir: '/tmp/downloads',
    filename: '02 - Video 1.mp4',
    ytdlp: 'yt-dlp',
    choice: {label: 'best', kind: 'video', args: []},
    downloadVideoFn: async () => {
      videoDownloaded = true
      return '/tmp/downloads/02 - Video 1.mp4'
    },
  })

  assert.equal(videoDownloaded, true)
})

test('downloadUnifiedItem auto-formats track filename when filename is omitted', async () => {
  let capturedFilename = ''

  const photoEntry: PlaylistEntry = {
    id: '3',
    title: 'Great Wall',
    url: 'https://example.com/wall.png',
    index: 3,
    kind: 'photo',
    ext: 'png',
  }

  await downloadUnifiedItem({
    item: photoEntry,
    destDir: '/tmp/downloads',
    totalCount: 12,
    ytdlp: 'yt-dlp',
    gallerydl: 'gallery-dl',
    choice: {label: 'original photo', kind: 'photo', args: []},
    downloadPhotoFn: async opts => {
      capturedFilename = opts.filename
      return `${opts.destDir}/${opts.filename}`
    },
  })

  assert.equal(capturedFilename, '03 - Great Wall.png')
})

test('probeUnified falls back to gallery-dl when yt-dlp fails on non-whitelisted domain', async () => {
  const result = await probeUnified({
    url: 'https://art-site-not-in-list.com/view/42',
    ytdlp: 'yt-dlp',
    gallerydl: 'gallery-dl',
    probeYtDlpFn: async () => {
      throw new Error('ERROR: Unsupported URL: https://art-site-not-in-list.com/view/42')
    },
    probeGalleryDlFn: async () => [
      {
        url: 'https://art-site-not-in-list.com/img/42.jpg',
        filename: '42.jpg',
        ext: 'jpg',
        kind: 'photo',
        title: 'Art Title 42',
        index: 1,
      },
    ],
  })

  assert.equal(result.kind, 'single_photo')
  if (result.kind === 'single_photo') {
    assert.equal(result.postTitle, 'Art Title 42')
    assert.equal(result.item.url, 'https://art-site-not-in-list.com/img/42.jpg')
  }
})

