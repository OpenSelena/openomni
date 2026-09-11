import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isInstagramUrl,
  extractInstagramPostId,
  buildInstagramEmbedUrl,
  parseInstagramEmbed,
  resolveInstagramMedia,
} from './instagram.js';

describe('instagram url normalization', () => {
  it('identifies instagram URLs correctly', () => {
    assert.equal(isInstagramUrl('https://www.instagram.com/p/DFxyz123/'), true);
    assert.equal(isInstagramUrl('https://instagr.am/reel/DFxyz123/'), true);
    assert.equal(isInstagramUrl('https://instagram.com/reels/DFxyz123'), true);
    assert.equal(isInstagramUrl('https://ddinstagram.com/p/DFxyz123/'), true);
    assert.equal(isInstagramUrl('https://youtube.com/watch?v=123'), false);
    assert.equal(isInstagramUrl('not-a-url'), false);
  });

  it('extracts post ID from various Instagram URL formats', () => {
    assert.equal(
      extractInstagramPostId('https://www.instagram.com/p/DFxyz123/'),
      'DFxyz123',
    );
    assert.equal(
      extractInstagramPostId(
        'https://www.instagram.com/reel/C8abc456/?utm_source=ig_web_copy_link',
      ),
      'C8abc456',
    );
    assert.equal(
      extractInstagramPostId('https://instagram.com/reels/C8abc456/'),
      'C8abc456',
    );
    assert.equal(
      extractInstagramPostId('https://www.instagram.com/tv/C8abc456/'),
      'C8abc456',
    );
    assert.equal(
      extractInstagramPostId('https://www.instagram.com/share/p/DFxyz123/'),
      'DFxyz123',
    );
    assert.equal(
      extractInstagramPostId('https://www.instagram.com/share/C8abc456/'),
      'C8abc456',
    );
  });

  it('rejects stories and unsupported paths', () => {
    assert.equal(
      extractInstagramPostId('https://www.instagram.com/stories/user/12345/'),
      null,
    );
    assert.equal(
      extractInstagramPostId('https://www.instagram.com/explore/'),
      null,
    );
    assert.equal(extractInstagramPostId('https://youtube.com/watch?v=123'), null);
  });

  it('builds embed URL from post ID', () => {
    assert.equal(
      buildInstagramEmbedUrl('DFxyz123'),
      'https://www.instagram.com/p/DFxyz123/embed/captioned/',
    );
  });
});

describe('instagram embed parser', () => {
  it('parses single video embed correctly', () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <script>
        ["init",[],[{"contextJSON":"{\\"gql_data\\":{\\"shortcode_media\\":{\\"shortcode\\":\\"DFvideo123\\",\\"is_video\\":true,\\"video_url\\":\\"https://scontent.cdninstagram.com/v/video.mp4\\",\\"display_url\\":\\"https://scontent.cdninstagram.com/v/thumb.jpg\\",\\"owner\\":{\\"username\\":\\"testcreator\\"}}}}"}],123]
      </script>
      </html>
    `;
    const result = parseInstagramEmbed(html, 'DFvideo123');
    assert.equal(result.postId, 'DFvideo123');
    assert.equal(result.author, 'testcreator');
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0]?.kind, 'video');
    assert.equal(result.items[0]?.url, 'https://scontent.cdninstagram.com/v/video.mp4');
  });

  it('parses single photo embed correctly', () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <script>
        window.__additionalDataLoaded('extra', {
          "shortcode_media": {
            "shortcode": "DFphoto123",
            "is_video": false,
            "display_url": "https://scontent.cdninstagram.com/v/photo.jpg",
            "owner": { "username": "photographer" }
          }
        });
      </script>
      </html>
    `;
    const result = parseInstagramEmbed(html, 'DFphoto123');
    assert.equal(result.postId, 'DFphoto123');
    assert.equal(result.author, 'photographer');
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0]?.kind, 'photo');
    assert.equal(result.items[0]?.url, 'https://scontent.cdninstagram.com/v/photo.jpg');
  });

  it('parses multi-item carousel embed with mixed media', () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <script>
        ["init",[],[{"contextJSON":"{\\"gql_data\\":{\\"shortcode_media\\":{\\"shortcode\\":\\"DFcarousel123\\",\\"edge_sidecar_to_children\\":{\\"edges\\":[{\\"node\\":{\\"is_video\\":false,\\"display_url\\":\\"https://scontent.cdninstagram.com/v/slide1.jpg\\"}},{\\"node\\":{\\"is_video\\":true,\\"video_url\\":\\"https://scontent.cdninstagram.com/v/slide2.mp4\\",\\"display_url\\":\\"https://scontent.cdninstagram.com/v/slide2_thumb.jpg\\"}}]}}}}"}],456]
      </script>
      </html>
    `;
    const result = parseInstagramEmbed(html, 'DFcarousel123');
    assert.equal(result.postId, 'DFcarousel123');
    assert.equal(result.items.length, 2);
    assert.equal(result.items[0]?.kind, 'photo');
    assert.equal(result.items[0]?.url, 'https://scontent.cdninstagram.com/v/slide1.jpg');
    assert.equal(result.items[1]?.kind, 'video');
    assert.equal(result.items[1]?.url, 'https://scontent.cdninstagram.com/v/slide2.mp4');
  });

  it('throws descriptive error on login redirect or unavailable post', () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <body>Redirecting to /accounts/login/</body>
      </html>
    `;
    assert.throws(
      () => parseInstagramEmbed(html, 'private123'),
      /login required or post is private/i,
    );
  });
});

describe('instagram resolver', () => {
  it('resolves media using mock fetch with correct iframe headers', async () => {
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};

    const mockFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedHeaders = (init?.headers as Record<string, string>) || {};
      return {
        ok: true,
        status: 200,
        text: async () => `
          <!DOCTYPE html>
          <html>
          <script>
            window.__additionalDataLoaded('extra', {
              "shortcode_media": {
                "shortcode": "testPost",
                "is_video": true,
                "video_url": "https://scontent.cdninstagram.com/reel.mp4"
              }
            });
          </script>
          </html>
        `,
      } as Response;
    }) as unknown as typeof fetch;

    const result = await resolveInstagramMedia(
      'https://www.instagram.com/reel/testPost/',
      mockFetch,
    );

    assert.equal(capturedUrl, 'https://www.instagram.com/p/testPost/embed/captioned/');
    assert.equal(capturedHeaders['Sec-Fetch-Dest'], 'iframe');
    assert.equal(capturedHeaders['Referer'], 'https://www.instagram.com/');
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0]?.kind, 'video');
    assert.equal(result.items[0]?.url, 'https://scontent.cdninstagram.com/reel.mp4');
  });

  it('rejects on HTTP error', async () => {
    const mockFetch = (async () => ({
      ok: false,
      status: 404,
      text: async () => 'Not Found',
    })) as unknown as typeof fetch;

    await assert.rejects(
      () => resolveInstagramMedia('https://www.instagram.com/p/missing123/', mockFetch),
      /HTTP 404/i,
    );
  });
});

