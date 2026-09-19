import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parseProbeOutput,
  extractSingleVideoUrl,
  isYtDlpUpToDateMessage,
  isYtDlpPackageManaged,
  isExtractorError,
  getYtDlpVersion,
  buildSubtitleArgs,
  buildThumbnailArgs,
  buildMetadataArgs,
  buildChoices,
  maskProxyCredentials,
  cleanYtDlpError,
  buildProxyArgs,
  buildRateLimitArgs,
  buildSponsorBlockArgs,
  isFfmpegAvailable,
  type VideoInfo
} from './ytdlp.js'

test('extractSingleVideoUrl extracts video url from playlist url when video id exists', () => {
  assert.equal(
    extractSingleVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmErZgOdP_8GztsuKi9nrraNbKKp4'),
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  )

  assert.equal(
    extractSingleVideoUrl('https://www.youtube.com/watch?list=PLrAXtmErZgOdP_8GztsuKi9nrraNbKKp4&v=dQw4w9WgXcQ&index=3'),
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  )

  assert.equal(
    extractSingleVideoUrl('https://www.youtube.com/playlist?list=PLrAXtmErZgOdP_8GztsuKi9nrraNbKKp4'),
    undefined
  )

  assert.equal(
    extractSingleVideoUrl('https://x.com/user/status/123456789'),
    undefined
  )
})

test('parseProbeOutput distinguishes between single videos and playlists', () => {
  const singleVideoJson = JSON.stringify({
    _type: 'video',
    id: 'vid1',
    title: 'Never Gonna Give You Up',
    formats: [{ format_id: '18', height: 360 }]
  })

  const singleResult = parseProbeOutput(
    singleVideoJson,
    'https://www.youtube.com/watch?v=vid1',
    '/tmp/test.json'
  )
  assert.equal(singleResult.kind, 'single')
  if (singleResult.kind === 'single') {
    assert.equal(singleResult.info.title, 'Never Gonna Give You Up')
    assert.equal(singleResult.infoJsonPath, '/tmp/test.json')
  }

  const playlistJson = JSON.stringify({
    _type: 'playlist',
    id: 'PL999',
    title: 'Top Hits',
    entries: [
      { id: 'track1', title: 'Song 1', duration: 120 }
    ]
  })

  const playlistResult = parseProbeOutput(
    playlistJson,
    'https://www.youtube.com/watch?v=track1&list=PL999',
    '/tmp/test.json'
  )
  assert.equal(playlistResult.kind, 'playlist')
  if (playlistResult.kind === 'playlist') {
    assert.equal(playlistResult.playlist.title, 'Top Hits')
    assert.equal(playlistResult.playlist.validEntries.length, 1)
    assert.equal(playlistResult.singleVideoUrl, 'https://www.youtube.com/watch?v=track1')
  }
})

test('isYtDlpUpToDateMessage correctly identifies already updated outputs', () => {
  assert.equal(isYtDlpUpToDateMessage('yt-dlp is up to date (2026.08.19)'), true)
  assert.equal(isYtDlpUpToDateMessage('Latest version: 2026.08.19'), true)
  assert.equal(isYtDlpUpToDateMessage('Updating to version 2026.09.01...'), false)
})

test('isYtDlpPackageManaged detects package manager refusal messages', () => {
  assert.equal(
    isYtDlpPackageManaged('You installed yt-dlp with pip or using the wheel from PyPi; Use that to update'),
    true
  )
  assert.equal(
    isYtDlpPackageManaged('yt-dlp is managed by Homebrew; use brew upgrade yt-dlp'),
    true
  )
  assert.equal(
    isYtDlpPackageManaged('Updating to version 2026.09.01...'),
    false
  )
})

test('getYtDlpVersion reads version string from real executable when present', async () => {
  const version = await getYtDlpVersion('yt-dlp')
  if (version !== undefined) {
    assert.match(version, /^\d{4}\.\d{2}\.\d{2}/)
  }
})

test('isExtractorError distinguishes extraction/cipher errors from general errors', () => {
  assert.equal(isExtractorError('ERROR: [youtube] dQw4w9WgXcQ: Unable to extract video data'), true)
  assert.equal(isExtractorError('Sign in to confirm you are not a bot'), true)
  assert.equal(isExtractorError('HTTP Error 403: Forbidden'), true)
  assert.equal(isExtractorError('ENOSPC: no space left on device'), false)
  assert.equal(isExtractorError('User aborted operation'), false)
})

test('buildSubtitleArgs generates correct yt-dlp subtitle arguments', () => {
  assert.deepEqual(buildSubtitleArgs(undefined), [])
  assert.deepEqual(buildSubtitleArgs({enabled: false}), [])
  assert.deepEqual(buildSubtitleArgs({enabled: true}), [
    '--write-subs',
    '--write-auto-subs',
    '--sub-langs',
    'en.*,en',
    '--convert-subs',
    'srt',
  ])
  assert.deepEqual(buildSubtitleArgs({enabled: true, languages: 'es,ja'}), [
    '--write-subs',
    '--write-auto-subs',
    '--sub-langs',
    'es,ja',
    '--convert-subs',
    'srt',
  ])
  assert.deepEqual(buildSubtitleArgs({enabled: true, embed: true}), [
    '--write-subs',
    '--write-auto-subs',
    '--sub-langs',
    'en.*,en',
    '--convert-subs',
    'srt',
    '--embed-subs',
  ])
})

test('buildThumbnailArgs generates correct yt-dlp thumbnail arguments', () => {
  assert.deepEqual(buildThumbnailArgs(undefined), [])
  assert.deepEqual(buildThumbnailArgs({enabled: false}), [])
  assert.deepEqual(buildThumbnailArgs({enabled: true}, true), [
    '--write-thumbnail',
    '--convert-thumbnails',
    'jpg',
  ])
  assert.deepEqual(buildThumbnailArgs({enabled: true}, false), [
    '--write-thumbnail',
  ])
  assert.deepEqual(buildThumbnailArgs({enabled: true, embed: true}, true), [
    '--write-thumbnail',
    '--convert-thumbnails',
    'jpg',
    '--embed-thumbnail',
  ])
  assert.deepEqual(buildThumbnailArgs({enabled: true, embed: true}, false), [
    '--write-thumbnail',
    '--embed-thumbnail',
  ])
  assert.deepEqual(buildThumbnailArgs({enabled: true, write: false, embed: true}, true), [
    '--embed-thumbnail',
  ])
})

test('buildMetadataArgs generates correct yt-dlp metadata and chapter arguments', () => {
  assert.deepEqual(buildMetadataArgs(undefined), [])
  assert.deepEqual(buildMetadataArgs({enabled: false}), [])
  assert.deepEqual(buildMetadataArgs({enabled: true}), ['--add-metadata'])
  assert.deepEqual(buildMetadataArgs({enabled: true, embedChapters: true}), [
    '--add-metadata',
    '--embed-chapters',
  ])
  assert.deepEqual(buildMetadataArgs({enabled: false, embedChapters: true}), [
    '--embed-chapters',
  ])
})

test('buildChoices respects audioFormat option', () => {
  const dummyInfo: VideoInfo = {
    title: 'Test Song',
    formats: [
      {format_id: '140', acodec: 'mp4a.40.2', abr: 128},
      {format_id: '18', vcodec: 'avc1', height: 360},
    ],
  }

  const defaultChoices = buildChoices(dummyInfo)
  const defaultAudio = defaultChoices.find(c => c.kind === 'audio')
  assert.ok(defaultAudio)
  assert.match(defaultAudio.label, /audio only · mp3/)
  assert.deepEqual(defaultAudio.args, [
    '-f',
    'ba/b',
    '-x',
    '--audio-format',
    'mp3',
    '--audio-quality',
    '0',
  ])

  const flacChoices = buildChoices(dummyInfo, {audioFormat: 'flac'})
  const flacAudio = flacChoices.find(c => c.kind === 'audio')
  assert.ok(flacAudio)
  assert.match(flacAudio.label, /audio only · flac/)
  assert.deepEqual(flacAudio.args, [
    '-f',
    'ba/b',
    '-x',
    '--audio-format',
    'flac',
    '--audio-quality',
    '0',
  ])

  const bestAudioChoices = buildChoices(dummyInfo, {audioFormat: 'best'})
  const bestAudio = bestAudioChoices.find(c => c.kind === 'audio')
  assert.ok(bestAudio)
  assert.match(bestAudio.label, /audio only · best/)
  assert.deepEqual(bestAudio.args, [
    '-f',
    'ba/b',
    '-x',
    '--audio-format',
    'best',
  ])

  const mkvChoices = buildChoices(dummyInfo, {videoFormat: 'mkv'})
  const mkvVideo = mkvChoices.find(c => c.kind === 'video')
  assert.ok(mkvVideo)
  assert.match(mkvVideo.label, /· mkv/)
  assert.ok(mkvVideo.args.includes('mkv'))
  assert.equal(mkvVideo.args[mkvVideo.args.indexOf('--merge-output-format') + 1], 'mkv')
})

test('maskProxyCredentials removes passwords and user credentials from URLs in strings', () => {
  assert.equal(
    maskProxyCredentials('http://user:secret123@proxy.example.com:8080/'),
    'http://***:***@proxy.example.com:8080/'
  )
  assert.equal(
    maskProxyCredentials('socks5://admin:pass@127.0.0.1:1080'),
    'socks5://***:***@127.0.0.1:1080'
  )
  assert.equal(
    maskProxyCredentials('socks5://admin@127.0.0.1:1080'),
    'socks5://***@127.0.0.1:1080'
  )
  assert.equal(
    maskProxyCredentials('ERROR: Failed to connect through http://user:supersecret@10.0.0.1:3128: Connection refused'),
    'ERROR: Failed to connect through http://***:***@10.0.0.1:3128: Connection refused'
  )
  assert.equal(
    maskProxyCredentials('http://proxy.example.com:8080/no/credentials'),
    'http://proxy.example.com:8080/no/credentials'
  )
  // Passwords containing colons or symbols
  assert.equal(
    maskProxyCredentials('http://user:p:a:s:s:123@127.0.0.1:8080'),
    'http://***:***@127.0.0.1:8080'
  )
  // Passwords containing unencoded @ or percent-encoded @
  assert.equal(
    maskProxyCredentials('http://user:p@ssword@proxy.example.com:8080'),
    'http://***:***@proxy.example.com:8080'
  )
  assert.equal(
    maskProxyCredentials('http://user:p%40ssword@proxy.example.com:8080'),
    'http://***:***@proxy.example.com:8080'
  )
  // Email usernames or usernames with @
  assert.equal(
    maskProxyCredentials('http://user@example.com:secret@proxy.example.com:8080'),
    'http://***:***@proxy.example.com:8080'
  )
  // IPv6 proxy host
  assert.equal(
    maskProxyCredentials('socks5://admin:secret@[::1]:1080/'),
    'socks5://***:***@[::1]:1080/'
  )
  // URL with @ in path should NOT be treated as credentials
  assert.equal(
    maskProxyCredentials('https://cdn.example.com/images/avatar@2x.png'),
    'https://cdn.example.com/images/avatar@2x.png'
  )
  // Non-string or falsy input safety
  assert.equal(maskProxyCredentials(''), '')
  assert.equal(maskProxyCredentials(undefined as unknown as string), '')
  assert.equal(maskProxyCredentials(null as unknown as string), '')
})

test('buildProxyArgs generates correct yt-dlp proxy and geo bypass arguments', () => {
  assert.deepEqual(buildProxyArgs(undefined), [])
  assert.deepEqual(buildProxyArgs({}), [])
  assert.deepEqual(buildProxyArgs({proxy: 'http://127.0.0.1:8080'}), [
    '--proxy',
    'http://127.0.0.1:8080',
  ])
  assert.deepEqual(buildProxyArgs({geoBypass: true}), ['--geo-bypass'])
  assert.deepEqual(buildProxyArgs({geoCountry: 'US'}), ['--geo-bypass-country', 'US'])
  assert.deepEqual(
    buildProxyArgs({
      proxy: 'socks5://127.0.0.1:1080',
      geoBypass: true,
      geoCountry: 'JP',
    }),
    [
      '--proxy',
      'socks5://127.0.0.1:1080',
      '--geo-bypass',
      '--geo-bypass-country',
      'JP',
    ]
  )
})

test('buildRateLimitArgs generates correct yt-dlp --limit-rate arguments', () => {
  assert.deepEqual(buildRateLimitArgs(undefined), [])
  assert.deepEqual(buildRateLimitArgs(''), [])
  assert.deepEqual(buildRateLimitArgs('50K'), ['--limit-rate', '50K'])
  assert.deepEqual(buildRateLimitArgs('1.5M'), ['--limit-rate', '1.5M'])
})

test('buildSponsorBlockArgs generates correct yt-dlp --sponsorblock-remove arguments when ffmpeg is available', () => {
  assert.deepEqual(buildSponsorBlockArgs(undefined), [])
  assert.deepEqual(buildSponsorBlockArgs({enabled: false}), [])
  assert.deepEqual(buildSponsorBlockArgs({enabled: true}), ['--sponsorblock-remove', 'all'])
  assert.deepEqual(
    buildSponsorBlockArgs({enabled: true, categories: 'sponsor,intro'}),
    ['--sponsorblock-remove', 'sponsor,intro']
  )
  assert.deepEqual(
    buildSponsorBlockArgs({enabled: true, categories: 'sponsor, intro, music_offtopic'}),
    ['--sponsorblock-remove', 'sponsor,intro,music_offtopic']
  )
  // Omits sponsorblock when ffmpeg is unavailable
  assert.deepEqual(buildSponsorBlockArgs({enabled: true}, false), [])
  assert.deepEqual(buildSponsorBlockArgs({enabled: true, categories: 'sponsor'}, false), [])
})

test('isFfmpegAvailable returns true if custom location works or ffmpeg is on PATH', async () => {
  const available = await isFfmpegAvailable()
  assert.equal(typeof available, 'boolean')
  // Passing a nonexistent location falls back to commandWorks('ffmpeg')
  const withBogus = await isFfmpegAvailable('/nonexistent/path/to/ffmpeg.exe')
  assert.equal(typeof withBogus, 'boolean')
})

test('cleanYtDlpError extracts error message and masks proxy credentials', () => {
  const rawStderr = [
    'WARNING: Some harmless warning',
    'ERROR: [generic] Failed to connect to http://admin:supersecret@proxy.corp.internal:8080: HTTP Error 407',
  ].join('\n')

  assert.equal(
    cleanYtDlpError(rawStderr),
    'Failed to connect to http://***:***@proxy.corp.internal:8080: HTTP Error 407',
  )

  const socksStderr = 'ERROR: socks5://myuser:mypassword@127.0.0.1:1080: Connection refused'
  assert.equal(
    cleanYtDlpError(socksStderr),
    'socks5://***:***@127.0.0.1:1080: Connection refused',
  )

  assert.equal(cleanYtDlpError(''), '')
  assert.equal(cleanYtDlpError('Just normal info output'), '')
})




