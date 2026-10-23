import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isBlueskyUrl,
  isBlueskyCdnUrl,
  extractBlueskyPostInfo,
  buildBlueskyAtUri,
  buildBlueskyApiUrl,
  parseBlueskyThread,
  resolveBlueskyMedia,
} from './bluesky.js'

test('isBlueskyUrl validates Bluesky URLs and AT URIs', () => {
  assert.equal(isBlueskyUrl('https://bsky.app/profile/alice.bsky.social/post/3lbtgfe45sk2a'), true)
  assert.equal(isBlueskyUrl('https://main.bsky.app/profile/did:plc:12345/post/3lbtgfe45sk2a'), true)
  assert.equal(isBlueskyUrl('at://alice.bsky.social/app.bsky.feed.post/3lbtgfe45sk2a'), true)
  assert.equal(isBlueskyUrl('https://twitter.com/user/status/123'), false)
  assert.equal(isBlueskyUrl('https://instagram.com/p/abc123xyz'), false)
  assert.equal(isBlueskyUrl(''), false)
})

test('isBlueskyCdnUrl identifies Bluesky CDN media domains', () => {
  assert.equal(
    isBlueskyCdnUrl('https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:123/bafk@jpeg'),
    true,
  )
  assert.equal(
    isBlueskyCdnUrl('https://video.bsky.app/watch/did:plc:123/bafk/playlist.m3u8'),
    true,
  )
  assert.equal(isBlueskyCdnUrl('https://example.com/image.jpg'), false)
})

test('extractBlueskyPostInfo extracts handleOrDid and rkey', () => {
  assert.deepEqual(
    extractBlueskyPostInfo('https://bsky.app/profile/alice.bsky.social/post/3lbtgfe45sk2a'),
    {handleOrDid: 'alice.bsky.social', rkey: '3lbtgfe45sk2a'},
  )
  assert.deepEqual(
    extractBlueskyPostInfo('https://bsky.app/profile/did:plc:z72i7hdynmk6r22z27h6tvur/post/3lbtgfe45sk2a?ref=share'),
    {handleOrDid: 'did:plc:z72i7hdynmk6r22z27h6tvur', rkey: '3lbtgfe45sk2a'},
  )
  assert.deepEqual(
    extractBlueskyPostInfo('at://nytimes.com/app.bsky.feed.post/3k12345'),
    {handleOrDid: 'nytimes.com', rkey: '3k12345'},
  )
  assert.equal(extractBlueskyPostInfo('https://bsky.app/profile/alice.bsky.social'), null)
  assert.equal(extractBlueskyPostInfo('https://youtube.com/watch?v=123'), null)
})

test('buildBlueskyAtUri and buildBlueskyApiUrl construct valid queries', () => {
  assert.equal(
    buildBlueskyAtUri('alice.bsky.social', '3lbtgfe45sk2a'),
    'at://alice.bsky.social/app.bsky.feed.post/3lbtgfe45sk2a',
  )
  const apiUrl = buildBlueskyApiUrl('alice.bsky.social', '3lbtgfe45sk2a')
  assert.match(apiUrl, /^https:\/\/public\.api\.bsky\.app\/xrpc\/app\.bsky\.feed\.getPostThread\?/)
  assert.match(apiUrl, /uri=at%3A%2F%2Falice\.bsky\.social%2Fapp\.bsky\.feed\.post%2F3lbtgfe45sk2a/)
})

test('parseBlueskyThread parses multi-image posts', () => {
  const mockData = {
    thread: {
      $type: 'app.bsky.feed.defs#threadViewPost',
      post: {
        author: {
          handle: 'alice.bsky.social',
          displayName: 'Alice In Wonderland',
        },
        record: {
          text: 'Look at these scenic landscape views!',
        },
        embed: {
          $type: 'app.bsky.embed.images#view',
          images: [
            {
              fullsize: 'https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:1/baf1@jpeg',
              thumb: 'https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:1/baf1@jpeg',
              alt: 'Mountain sunset',
              aspectRatio: {width: 1920, height: 1080},
            },
            {
              fullsize: 'https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:1/baf2@png',
              alt: 'Forest stream',
              aspectRatio: {width: 1200, height: 800},
            },
          ],
        },
      },
    },
  }

  const result = parseBlueskyThread(mockData, '3lbtgfe45sk2a')
  assert.equal(result.rkey, '3lbtgfe45sk2a')
  assert.equal(result.author, 'Alice In Wonderland')
  assert.equal(result.handle, 'alice.bsky.social')
  assert.equal(result.title, 'Look at these scenic landscape views!')
  assert.equal(result.items.length, 2)
  assert.equal(result.items[0]?.kind, 'photo')
  assert.equal(result.items[0]?.ext, 'jpg')
  assert.equal(result.items[0]?.alt, 'Mountain sunset')
  assert.equal(result.items[1]?.ext, 'png')
})

test('parseBlueskyThread parses video posts', () => {
  const mockData = {
    thread: {
      $type: 'app.bsky.feed.defs#threadViewPost',
      post: {
        author: {
          handle: 'video.creator',
        },
        record: {
          text: 'Action clip demo video',
        },
        embed: {
          $type: 'app.bsky.embed.video#view',
          playlist: 'https://video.bsky.app/watch/did:plc:1/bafkv/playlist.m3u8',
          thumbnail: 'https://video.bsky.app/watch/did:plc:1/bafkv/thumbnail.jpg',
          aspectRatio: {width: 1080, height: 1920},
        },
      },
    },
  }

  const result = parseBlueskyThread(mockData, '3video123')
  assert.equal(result.items.length, 1)
  assert.equal(result.items[0]?.kind, 'video')
  assert.equal(result.items[0]?.ext, 'mp4')
  assert.equal(result.items[0]?.url, 'https://video.bsky.app/watch/did:plc:1/bafkv/playlist.m3u8')
})

test('parseBlueskyThread throws on deleted post or post with no media', () => {
  assert.throws(
    () => parseBlueskyThread({thread: {$type: 'app.bsky.feed.defs#notFoundPost'}}, '123'),
    /not found/,
  )

  const textOnlyPost = {
    thread: {
      post: {
        author: {handle: 'writer'},
        record: {text: 'Just words without attachments'},
      },
    },
  }
  assert.throws(
    () => parseBlueskyThread(textOnlyPost, '123'),
    /No downloadable media/,
  )
})

test('resolveBlueskyMedia fetches and parses post via public API', async () => {
  const mockFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      thread: {
        post: {
          author: {handle: 'bob.test', displayName: 'Bob'},
          record: {text: 'Demo photo'},
          embed: {
            $type: 'app.bsky.embed.images#view',
            images: [{fullsize: 'https://cdn.bsky.app/test@jpeg'}],
          },
        },
      },
    }),
  })

  const result = await resolveBlueskyMedia(
    'https://bsky.app/profile/bob.test/post/3abc123',
    mockFetch as never,
  )

  assert.equal(result.author, 'Bob')
  assert.equal(result.items.length, 1)
  assert.equal(result.items[0]?.url, 'https://cdn.bsky.app/test@jpeg')
})
