import assert from 'node:assert/strict'
import {EventEmitter} from 'node:events'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {downloadBlueskyItem, isBlueskyCdnUrl, parseBlueskyThread} from './bluesky.js'
import {saveConfig} from './config.js'
import {
  cleanupCookieJar,
  parseNetscapeCookieContent,
  parseNetscapeCookieFile,
  resolveCookieJar,
} from './cookies.js'
import {downloadUnifiedItem, probeUnified} from './dispatcher.js'
import {terminalLink, truncate, shortenPath, wrapText} from './format.js'
import {
  buildGalleryDlDownloadArgs,
  downloadPhotoItem,
  getGalleryDlDownloadUrls,
  parseGalleryDlOutput,
  resolveGalleryDlPath,
} from './gallerydl.js'
import {
  downloadInstagramItem,
  isInstagramCdnUrl,
  isOfficialInstagramHttpsUrl,
  parseInstagramEmbed,
} from './instagram.js'
import {getOpenBrowserCommand, isPrivateOrLoopbackHost, isProbablyUrl} from './platforms.js'
import {formatTrackFilename, sanitizeExtension, sanitizeFilename} from './playlist.js'
import {assertContainedPath, sanitizeErrorMessage, stripTerminalControls} from './sanitizer.js'
import {renderOutputTemplate, sanitizeTemplateTokens} from './template.js'
import {extractUrlFromText, defaultWatchDownload} from './watcher.js'
import {buildProxyArgs, buildProxyEnv, cleanupInfoJson, probe} from './ytdlp.js'
import {generateWingetManifests, validateWingetManifests} from '../distribution.js'

test('cookies: requires non-empty targetDomain and enforces path/secure/expiry', () => {
  const futureExp = Math.floor(Date.now() / 1000) + 86400
  const pastExp = Math.floor(Date.now() / 1000) - 60
  const jar = [
    `.google.com\tTRUE\t/\tTRUE\t${futureExp}\tSID\tgoogle_secret`,
    `.instagram.com\tTRUE\t/\tTRUE\t${futureExp}\tsessionid\tig_secret`,
    `.instagram.com\tTRUE\t/accounts/\tTRUE\t${futureExp}\tlogin_only\trestricted`,
    `.instagram.com\tTRUE\t/\tTRUE\t${pastExp}\tstale\told_val`,
  ].join('\n')

  assert.equal(parseNetscapeCookieContent(jar), '')
  assert.equal(parseNetscapeCookieContent(jar, ''), '')
  assert.equal(
    parseNetscapeCookieContent(jar, 'instagram.com', {path: '/p/123/', isHttps: true}),
    'sessionid=ig_secret',
  )
  assert.equal(parseNetscapeCookieContent(jar, 'instagram.com', {path: '/', isHttps: false}), '')
})

test('cookies: resolveCookieJar isolates temp jar in 0o700 dir without contacting Instagram', () => {
  const capturedArgs: string[] = []
  const jar = resolveCookieJar(
    {browser: 'firefox'},
    {
      runner: args => {
        capturedArgs.push(...args)
        const idx = args.indexOf('--cookies')
        const target = args[idx + 1]!
        assert.equal(path.basename(target), 'cookies.txt')
        if (process.platform !== 'win32') {
          const dirMode = fs.statSync(path.dirname(target)).mode & 0o777
          const fileMode = fs.statSync(target).mode & 0o777
          assert.equal(dirMode, 0o700)
          assert.equal(fileMode, 0o600)
        }
        fs.writeFileSync(target, '.instagram.com\tTRUE\t/\tTRUE\t0\tsessionid\tabc')
        return {status: 0, stderr: ''}
      },
    },
  )

  assert.ok(jar)
  assert.ok(!capturedArgs.includes('https://www.instagram.com/'))
  assert.ok(capturedArgs.includes('--ignore-config'))
  const tempDir = path.dirname(jar.filePath)
  cleanupCookieJar(jar)
  assert.equal(fs.existsSync(tempDir), false)
})

test('instagram: positive origin check blocks cookie leaks to non-CDN, http, or lookalike hosts', async () => {
  assert.equal(isInstagramCdnUrl('https://cdninstagram.com.attacker.invalid/a.jpg'), false)
  assert.equal(isInstagramCdnUrl('https://scontent.cdninstagram.com/a.jpg'), true)
  assert.equal(isOfficialInstagramHttpsUrl('https://www.instagram.com/p/abc'), true)
  assert.equal(isOfficialInstagramHttpsUrl('http://www.instagram.com/p/abc'), false)
  assert.equal(isOfficialInstagramHttpsUrl('https://ddinstagram.com/p/abc'), false)
  assert.equal(isOfficialInstagramHttpsUrl('https://attacker.example/x.mp4'), false)

  const evilHtml = `<script>window.__additionalDataLoaded('x', {"shortcode_media":{"shortcode":"X","is_video":true,"video_url":"https://attacker.example/exfil.mp4"}});</script>`
  assert.throws(() => parseInstagramEmbed(evilHtml, 'X'), /No media entries/)

  let seenCookie: string | undefined
  const tmpOut = path.join(os.tmpdir(), `ig-sec-${Date.now()}.mp4`)
  const mockFetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    const h = (init?.headers || {}) as Record<string, string>
    seenCookie = h.Cookie
    return new Response(Buffer.from('ok'), {status: 200, headers: {'content-length': '2'}})
  }) as unknown as typeof fetch

  try {
    await downloadInstagramItem(
      {url: 'https://attacker.example/exfil.mp4', kind: 'video'},
      tmpOut,
      undefined,
      mockFetch,
      'sessionid=secret',
    )
    assert.equal(seenCookie, undefined)
  } finally {
    fs.rmSync(tmpOut, {force: true})
  }
})

test('bluesky: strict CDN suffix matching, embed validation, and fail-closed HLS proxy', async () => {
  assert.equal(isBlueskyCdnUrl('https://bsky.app.evil.com/img.jpg'), false)
  assert.equal(isBlueskyCdnUrl('file://bsky.app/secret'), false)
  assert.equal(isBlueskyCdnUrl('https://cdn.bsky.app/img.jpg'), true)

  assert.throws(
    () =>
      parseBlueskyThread(
        {
          thread: {
            post: {
              author: {handle: 'a.bsky.social'},
              record: {text: 'Hi'},
              embed: {
                $type: 'app.bsky.embed.images#view',
                images: [{fullsize: 'file:///etc/passwd'}],
              },
            },
          },
        },
        'rkey1',
      ),
    /No downloadable media/,
  )

  const outPath = path.join(os.tmpdir(), `bsky-sec-${Date.now()}.mp4`)
  let capturedArgs: string[] = []
  const mockSpawn = ((_cmd: string, args: string[]) => {
    capturedArgs = args
    const emitter = new EventEmitter()
    process.nextTick(() => emitter.emit('close', 0))
    return emitter
  }) as unknown as typeof import('node:child_process').spawn

  try {
    await downloadBlueskyItem(
      {url: 'https://video.bsky.app/watch/did:plc:1/k/playlist.m3u8', kind: 'video', ext: 'mp4'},
      outPath,
      undefined,
      fetch,
      'ffmpeg',
      mockSpawn,
    )
    assert.ok(capturedArgs.includes('-protocol_whitelist'))

    await assert.rejects(
      () =>
        downloadBlueskyItem(
          {url: 'https://video.bsky.app/watch/did:plc:1/k/playlist.m3u8', kind: 'video', ext: 'mp4'},
          outPath,
          undefined,
          fetch,
          'ffmpeg',
          mockSpawn,
          'socks5://127.0.0.1:1080',
        ),
      /not supported directly by ffmpeg/,
    )
  } finally {
    fs.rmSync(outPath, {force: true})
  }
})

test('gallerydl and dispatcher: block extension traversal, brace injection, OPEN_OMNI_DIR lookup, and template %% injection', async () => {
  const fromMedia = resolveGalleryDlPath({OPEN_OMNI_DIR: '/tmp/shared-media'})
  assert.ok(!fromMedia.startsWith('/tmp/shared-media'))

  const rawJson = JSON.stringify([
    [
      2,
      'https://example.com/a.png',
      {extension: 'png/../../../escape.txt', filename: 'a.png', title: '{_env[SECRET]}\u001b[31m'},
    ],
  ])
  const parsed = parseGalleryDlOutput(rawJson)
  assert.equal(parsed[0]?.ext, 'png')
  assert.equal(parsed[0]?.title, '{_env[SECRET]}')

  assert.throws(
    () => parseGalleryDlOutput(JSON.stringify([{url: 'file:///etc/passwd', extension: 'txt'}])),
    /no media entries/,
  )

  const gdlArgs = buildGalleryDlDownloadArgs({
    url: 'https://example.com/a.png',
    destDir: '/tmp/out',
    filename: '01 - {_env[HOME]}.png',
    proxy: 'http://user:pass@127.0.0.1:8080',
  })
  assert.ok(!gdlArgs.includes('--proxy'))
  assert.ok(gdlArgs.includes('01 - {{_env[HOME]}}.png'))

  await assert.rejects(
    () =>
      downloadPhotoItem({
        gallerydl: 'gallery-dl',
        url: 'https://example.com/a.png',
        destDir: '/tmp/out',
        filename: '../../escape.png',
      }),
    /Blocked path outside destination directory/,
  )

  assert.equal(sanitizeExtension('jpg/../../../evil', 'jpg'), 'jpg')
  assert.equal(formatTrackFilename(1, 1, 'Track\u001b]0;PWN\u0007', '%(ext)s'), '01 - Track.%(ext)s')
  assert.equal(formatTrackFilename(1, 1, 'Track', 'jpg/../../../evil'), '01 - Track.mp4')

  const badUrls = await getGalleryDlDownloadUrls('gallery-dl.bin', (async () =>
    new Response(
      JSON.stringify({
        tag_name: '../../evil',
        assets: [{name: 'gallery-dl.bin', browser_download_url: 'http://evil.invalid/bin'}],
      }),
      {status: 200},
    )) as unknown as typeof fetch)
  assert.deepEqual(badUrls, [])

  let receivedTemplate = ''
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'disp-sec-'))
  try {
    await downloadUnifiedItem({
      item: {
        id: '1',
        index: 1,
        title: '%(cookies)s %(broken',
        kind: 'video',
        engine: 'ytdlp',
        url: 'https://example.com/v',
        ext: 'mp4',
      },
      destDir: tmpDir,
      ytdlp: 'yt-dlp',
      choice: {label: 'best', kind: 'video', args: []},
      downloadVideoFn: async opts => {
        receivedTemplate = opts.outputTemplate || ''
        return path.join(tmpDir, 'out.mp4')
      },
    })
    assert.ok(receivedTemplate.includes('%%(cookies)s %%(broken'))

    const cookiePath = path.join(tmpDir, 'jar.txt')
    fs.writeFileSync(
      cookiePath,
      `.google.com\tTRUE\t/\tTRUE\t0\tSID\tgoogle_only\n.instagram.com\tTRUE\t/\tTRUE\t0\tig\tok\n`,
    )
    let seenIgCookie: string | undefined
    let seenProxy: string | undefined
    await probeUnified({
      url: 'https://www.instagram.com/p/CXYZ123/',
      ytdlp: 'yt-dlp',
      proxy: 'http://user:pass@127.0.0.1:8080',
      cookieFile: cookiePath,
      cookieHeader: parseNetscapeCookieFile(cookiePath, 'google.com'),
      resolveInstagramFn: async (_url, _fetchImpl, cookie, proxy) => {
        seenIgCookie = cookie
        seenProxy = proxy
        return {postId: 'CXYZ123', title: 'OK', items: [{url: 'https://scontent.cdninstagram.com/a.jpg', kind: 'photo'}]}
      },
    })
    assert.equal(seenIgCookie, 'ig=ok')
    assert.equal(seenProxy, 'http://user:pass@127.0.0.1:8080')
  } finally {
    fs.rmSync(tmpDir, {recursive: true, force: true})
  }
})

test('ytdlp: passes proxy via child env only and isolates info.json in 0o700 dir with 0o600 mode', async () => {
  const env = buildProxyEnv({}, 'http://user:pass@127.0.0.1:8080')
  assert.equal(env.HTTPS_PROXY, 'http://user:pass@127.0.0.1:8080')
  assert.deepEqual(buildProxyArgs({proxy: 'http://user:pass@127.0.0.1:8080', geoBypass: true}), ['--geo-bypass'])

  if (process.platform === 'win32') return

  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yt-stub-'))
  const fakeYt = path.join(binDir, 'yt-dlp')
  fs.writeFileSync(
    fakeYt,
    `#!/bin/sh\necho '{"id":"1","title":"Demo\\u001b[31m","extractor":"generic","formats":[]}'\n`,
    {mode: 0o755},
  )
  let infoJsonPath: string | undefined
  try {
    const res = await probe(fakeYt, 'https://example.com/v')
    assert.equal(res.kind, 'single')
    if (res.kind === 'single') {
      infoJsonPath = res.infoJsonPath
      assert.equal(res.info.title, 'Demo')
      const dirMode = fs.statSync(path.dirname(infoJsonPath)).mode & 0o777
      const fileMode = fs.statSync(infoJsonPath).mode & 0o777
      assert.equal(dirMode, 0o700)
      assert.equal(fileMode, 0o600)
      await cleanupInfoJson(infoJsonPath)
      assert.equal(fs.existsSync(path.dirname(infoJsonPath)), false)
    }
  } finally {
    if (infoJsonPath) await cleanupInfoJson(infoJsonPath)
    fs.rmSync(binDir, {recursive: true, force: true})
  }
})

test('watcher, platforms, sanitizer, format, config, and distribution enforce security boundaries', async () => {
  assert.equal(isProbablyUrl('https://example.com/v?a=\u001b]0;PWN\u0007'), false)
  assert.equal(isProbablyUrl('https://example.com/\nhttps://evil.com'), false)
  assert.equal(isPrivateOrLoopbackHost('169.254.169.254'), true)
  assert.equal(isPrivateOrLoopbackHost('[::ffff:127.0.0.1]'), true)
  assert.throws(() => getOpenBrowserCommand('file:///etc/passwd'), /Unsupported browser URL protocol/)

  assert.equal(extractUrlFromText('copy log: curl http://127.0.0.1:8080/admin\nline2'), null)
  assert.equal(extractUrlFromText('http://169.254.169.254/latest/meta-data'), null)
  await assert.rejects(
    () => defaultWatchDownload('https://evil.example/payload.bin', {outDir: os.tmpdir()}),
    /Skipped unrecognized non-platform URL/,
  )

  const sanitized = sanitizeErrorMessage(
    '{"Authorization": "Bearer TOPSECRET", "Cookie": "sid=SECRET"} https://x.com/v?password=PW_VAL&refresh_token=RT_VAL \u001b]52;c;YQ==\u0007',
  )
  assert.ok(!sanitized.includes('TOPSECRET'))
  assert.ok(!sanitized.includes('sid=SECRET'))
  assert.ok(!sanitized.includes('PW_VAL'))
  assert.ok(!sanitized.includes('RT_VAL'))
  assert.ok(!sanitized.includes('\u001b'))
  assert.equal(stripTerminalControls('hello\u009b31m world\u0007'), 'hello world')

  assert.equal(truncate('ok\u001b]8;;https://evil\u0007', 20), 'ok')
  assert.equal(shortenPath('/home/u/dir\u001b[2J/file.mp4', '/home/u'), '~/dir/file.mp4')
  assert.deepEqual(wrapText('a\u001b[31m b', 10), ['a b'])
  assert.equal(terminalLink('Click\u0007', 'https://example.com/\u001b[2J'), '\u001B]8;;https://example.com/\u0007Click\u001B]8;;\u0007')
  assert.equal(sanitizeFilename('Bad\u001b]0;Title\u0007Text'), 'BadText')
  assert.equal(sanitizeTemplateTokens('Bad\u001b[31m'), 'Bad')
  const tplOut = renderOutputTemplate('../../secret\u001b[31m', {})
  assert.ok(!tplOut.includes('..') && !tplOut.includes('\u001b'))
  assert.throws(() => assertContainedPath('/tmp/base', '/tmp/base/../outside'), /Blocked path/)

  assert.throws(
    () =>
      generateWingetManifests({
        packageIdentifier: 'OpenSelena.OpenOmni',
        packageVersion: '1.5.1\nInstallerUrl: https://evil.example/a.zip',
        publisher: 'OpenSelena',
        publisherUrl: 'https://github.com/OpenSelena',
        packageUrl: 'https://github.com/OpenSelena/open-omni',
        license: 'MIT',
        licenseUrl: 'https://github.com/OpenSelena/open-omni/blob/main/LICENSE',
        shortDescription: 'Desc',
        installerUrl: 'https://github.com/OpenSelena/open-omni/releases/download/v1.5.1/open-omni-windows-x64.zip',
        installerSha256: 'a'.repeat(64),
        commands: ['open-omni'],
        tags: ['cli'],
      }),
    /newline or control/,
  )

  const badYamlValidation = validateWingetManifests({
    versionManifest: 'PackageIdentifier: OpenSelena.OpenOmni\nPackageVersion: 1.5.1\nManifestType: version',
    installerManifest:
      'PackageIdentifier: OpenSelena.OpenOmni\nPackageVersion: 1.5.1\nInstallerType: zip\nNestedInstallerType: portable\nNestedInstallerFiles:\n# InstallerUrl: https://github.com/OpenSelena/open-omni/releases/v1.5.1/x.zip\nInstallerUrl: https://evil.example/evil.zip\nInstallerSha256: ' +
      'a'.repeat(64),
    localeManifest: 'PackageIdentifier: OpenSelena.OpenOmni\nPackageVersion: 1.5.1',
  })
  assert.equal(badYamlValidation.valid, false)

  if (process.platform !== 'win32') {
    const cfgDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfg-sec-'))
    const cfgPath = path.join(cfgDir, 'nested', 'config.json')
    try {
      saveConfig({proxy: 'http://u:p@127.0.0.1:8080'}, cfgPath)
      assert.equal(fs.statSync(path.dirname(cfgPath)).mode & 0o777, 0o700)
      assert.equal(fs.statSync(cfgPath).mode & 0o777, 0o600)
    } finally {
      fs.rmSync(cfgDir, {recursive: true, force: true})
    }
  }
})

test('proxy-fetch: real loopback proxy routes traffic and strips Cookie across origins on redirect', async () => {
  let targetHit = 0
  let seenCookie: string | undefined
  const targetServer = http.createServer((req, res) => {
    targetHit++
    if (req.url === '/start') {
      res.writeHead(302, {Location: `http://127.0.0.1:${(targetServer2.address() as any).port}/dest`})
      res.end()
      return
    }
    res.writeHead(200)
    res.end('ok')
  })
  const targetServer2 = http.createServer((req, res) => {
    seenCookie = req.headers.cookie
    res.writeHead(200)
    res.end('dest')
  })
  let proxyHits = 0
  const proxyServer = http.createServer((req, res) => {
    proxyHits++
    const upstream = http.request(req.url!, {headers: req.headers}, upRes => {
      res.writeHead(upRes.statusCode || 200, upRes.headers)
      upRes.pipe(res)
    })
    upstream.end()
  })

  await new Promise<void>(r => targetServer.listen(0, '127.0.0.1', r))
  await new Promise<void>(r => targetServer2.listen(0, '127.0.0.1', r))
  await new Promise<void>(r => proxyServer.listen(0, '127.0.0.1', r))

  try {
    const {fetchWithProxy} = await import('./proxy-fetch.js')
    const port1 = (targetServer.address() as any).port
    const proxyPort = (proxyServer.address() as any).port
    const resp = await fetchWithProxy(
      `http://127.0.0.1:${port1}/start`,
      {headers: {Cookie: 'session=secret'}},
      {proxy: `http://127.0.0.1:${proxyPort}`},
    )
    assert.equal(await resp.text(), 'dest')
    assert.equal(proxyHits, 2)
    assert.equal(targetHit, 1)
    assert.equal(seenCookie, undefined)
  } finally {
    targetServer.close()
    targetServer2.close()
    proxyServer.close()
  }
})
