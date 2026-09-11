/**
 * Native Instagram Embed Resolver
 *
 * Extracts public Instagram post media (photos, reels, carousels) by scraping
 * the unauthenticated /embed/captioned/ endpoint, bypassing standard login redirects.
 */

const INSTAGRAM_HOSTS = new Set([
  'instagram.com',
  'www.instagram.com',
  'instagr.am',
  'www.instagr.am',
  'ddinstagram.com',
  'www.ddinstagram.com',
]);

/**
 * Checks if a given URL belongs to Instagram.
 */
export function isInstagramUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    return INSTAGRAM_HOSTS.has(host) || host.endsWith('.instagram.com');
  } catch {
    return false;
  }
}

/**
 * Checks if a URL points directly to an Instagram / Meta CDN asset.
 */
export function isInstagramCdnUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    return (
      host.includes('cdninstagram.com') ||
      host.includes('fbcdn.net') ||
      host.includes('instagram.f')
    );
  } catch {
    return false;
  }
}

/**
 * Extracts the post shortcode / ID from an Instagram URL.
 * Supports /p/, /reel/, /reels/, /tv/, and /share/ paths.
 * Returns null for stories, user profiles, or non-post URLs.
 */
export function extractInstagramPostId(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    if (!INSTAGRAM_HOSTS.has(host) && !host.endsWith('.instagram.com')) {
      return null;
    }

    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;

    const first = segments[0]?.toLowerCase();
    if (first === 'stories' || first === 'explore') {
      return null;
    }

    if (first === 'p' || first === 'reel' || first === 'reels' || first === 'tv') {
      return segments[1] || null;
    }

    if (first === 'share') {
      // Handles /share/p/ID/ or /share/ID/
      if (segments[1]?.toLowerCase() === 'p' && segments[2]) {
        return segments[2];
      }
      return segments[1] || null;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Constructs the unauthenticated embed endpoint URL for a given post ID.
 */
export function buildInstagramEmbedUrl(postId: string): string {
  return `https://www.instagram.com/p/${postId}/embed/captioned/`;
}

export interface InstagramMediaItem {
  url: string;
  kind: 'video' | 'photo';
  width?: number;
  height?: number;
}

export interface InstagramMediaResult {
  postId: string;
  title: string;
  caption?: string;
  author?: string;
  items: InstagramMediaItem[];
}

/**
 * Parses the raw HTML from an Instagram embed/captioned page into media items.
 */
export function parseInstagramEmbed(
  html: string,
  postId: string,
): InstagramMediaResult {
  const lowerHtml = html.toLowerCase();
  if (
    lowerHtml.includes('/accounts/login') ||
    lowerHtml.includes('"loginpage"') ||
    (lowerHtml.includes('"require_login"') && lowerHtml.includes('true'))
  ) {
    throw new Error('Instagram login required or post is private');
  }

  let rawData: any = null;

  // Pattern 1: ["init",[],[{"contextJSON":"..."}],...]
  const initMatch = html.match(/"init",\s*\[\],\s*\[(.*?)\]\s*,/s);
  if (initMatch && initMatch[1]) {
    try {
      const parsedWrapper = JSON.parse(initMatch[1]);
      if (parsedWrapper?.contextJSON) {
        rawData =
          typeof parsedWrapper.contextJSON === 'string'
            ? JSON.parse(parsedWrapper.contextJSON)
            : parsedWrapper.contextJSON;
      }
    } catch {
      // Continue to next fallback
    }
  }

  // Pattern 2: window.__additionalDataLoaded('extra', {...})
  if (!rawData) {
    const extraMatch = html.match(
      /window\.__additionalDataLoaded\('extra',\s*(\{.*?\})\s*\)/s,
    );
    if (extraMatch && extraMatch[1]) {
      try {
        rawData = JSON.parse(extraMatch[1]);
      } catch {
        // Continue
      }
    }
  }

  if (!rawData) {
    throw new Error('No media entries found in Instagram embed');
  }

  const mediaNode =
    rawData?.gql_data?.shortcode_media ||
    rawData?.gql_data?.xdt_shortcode_media ||
    rawData?.shortcode_media ||
    rawData?.xdt_shortcode_media ||
    rawData;

  const author =
    mediaNode?.owner?.username || rawData?.owner?.username || undefined;
  const caption =
    mediaNode?.edge_media_to_caption?.edges?.[0]?.node?.text || undefined;

  const items: InstagramMediaItem[] = [];

  // Check for carousel: edge_sidecar_to_children
  const sidecarEdges = mediaNode?.edge_sidecar_to_children?.edges;
  if (Array.isArray(sidecarEdges) && sidecarEdges.length > 0) {
    for (const edge of sidecarEdges) {
      const node = edge?.node;
      if (!node) continue;
      if (node.is_video && node.video_url) {
        items.push({
          url: node.video_url,
          kind: 'video',
          width: node.dimensions?.width,
          height: node.dimensions?.height,
        });
      } else if (node.display_url) {
        items.push({
          url: node.display_url,
          kind: 'photo',
          width: node.dimensions?.width,
          height: node.dimensions?.height,
        });
      }
    }
  }

  // If not a carousel or carousel had no items, check single video/photo
  if (items.length === 0) {
    if (mediaNode?.video_url) {
      items.push({
        url: mediaNode.video_url,
        kind: 'video',
        width: mediaNode.dimensions?.width,
        height: mediaNode.dimensions?.height,
      });
    } else if (mediaNode?.display_url || mediaNode?.media?.display_url) {
      items.push({
        url: mediaNode.display_url || mediaNode.media.display_url,
        kind: 'photo',
        width: mediaNode.dimensions?.width,
        height: mediaNode.dimensions?.height,
      });
    }
  }

  if (items.length === 0) {
    throw new Error('No media entries found in Instagram embed');
  }

  return {
    postId,
    title: author ? `${author}_${postId}` : `instagram_${postId}`,
    caption,
    author,
    items,
  };
}

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/**
 * Resolves Instagram media using the unauthenticated /embed/captioned/ iframe endpoint.
 */
export async function resolveInstagramMedia(
  url: string,
  fetchImpl: typeof fetch = fetch,
  cookieHeader?: string,
): Promise<InstagramMediaResult> {
  const postId = extractInstagramPostId(url);
  if (!postId) {
    throw new Error(`Could not extract Instagram post ID from URL: ${url}`);
  }

  const embedUrl = buildInstagramEmbedUrl(postId);
  const headers: Record<string, string> = {
    'User-Agent': DEFAULT_USER_AGENT,
    'Accept':
      'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-GB,en;q=0.9',
    'Sec-Fetch-Dest': 'iframe',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'cross-site',
    'Referer': 'https://www.instagram.com/',
  };

  if (cookieHeader) {
    headers['Cookie'] = cookieHeader;
  }

  const response = await fetchImpl(embedUrl, {headers});

  if (!response.ok) {
    throw new Error(
      `Instagram embed request failed: HTTP ${response.status} ${response.statusText || ''}`.trim(),
    );
  }

  const html = await response.text();
  return parseInstagramEmbed(html, postId);
}

/**
 * Downloads a single media item directly from the Instagram CDN.
 */
export async function downloadInstagramItem(
  item: InstagramMediaItem,
  outputPath: string,
  onProgress?: (receivedBytes: number, totalBytes?: number) => void,
  fetchImpl: typeof fetch = fetch,
  cookieHeader?: string,
): Promise<void> {
  const { createWriteStream } = await import('node:fs');
  const { pipeline } = await import('node:stream/promises');
  const { Readable } = await import('node:stream');

  const headers: Record<string, string> = {
    'User-Agent': DEFAULT_USER_AGENT,
    'Referer': 'https://www.instagram.com/',
    'Sec-Fetch-Dest': item.kind === 'video' ? 'video' : 'image',
  };

  if (cookieHeader) {
    headers['Cookie'] = cookieHeader;
  }

  const response = await fetchImpl(item.url, {headers});

  if (!response.ok || !response.body) {
    throw new Error(
      `Failed to download media from Instagram CDN: HTTP ${response.status}`,
    );
  }

  const contentLengthHeader = response.headers.get('content-length');
  const totalBytes = contentLengthHeader
    ? parseInt(contentLengthHeader, 10)
    : undefined;
  let receivedBytes = 0;

  const nodeStream = Readable.fromWeb(response.body as any);
  nodeStream.on('data', (chunk: Buffer) => {
    receivedBytes += chunk.length;
    if (onProgress) {
      onProgress(receivedBytes, totalBytes);
    }
  });

  const fileStream = createWriteStream(outputPath);
  await pipeline(nodeStream, fileStream);
}

