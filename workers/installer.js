/**
 * Open Omni Installer Edge Worker
 *
 * Serves `install.sh` when users run:
 *   curl -fsSL https://open-omni.sh | sh
 *   or: curl https://open-omni.sh | sh
 *
 * Deployable on Cloudflare Workers, Fastly Compute, or any V8 Edge runtime.
 */

const UPSTREAM_INSTALLER_URL = 'https://raw.githubusercontent.com/OpenSelena/open-omni/main/install.sh'
const GITHUB_REPO_URL = 'https://github.com/OpenSelena/open-omni'

export default {
  async fetch(request) {
    const url = new URL(request.url)
    if (url.protocol === 'http:') {
      url.protocol = 'https:'
      return Response.redirect(url.toString(), 301)
    }

    const userAgent = request.headers.get('user-agent') || ''
    const isTerminalClient = userAgent.includes('curl') || userAgent.includes('Wget') || userAgent.includes('HTTPie')

    // Terminal client or explicit script request: stream raw install.sh
    if (isTerminalClient || url.pathname === '/' || url.pathname === '/install.sh' || url.pathname === '/sh') {
      try {
        const response = await fetch(UPSTREAM_INSTALLER_URL, {
          cf: {cacheTtl: 300, cacheEverything: true},
          headers: {'User-Agent': 'OpenOmni-Edge-Worker'},
        })

        if (!response.ok) {
          // Fallback to 302 redirect if upstream is unreachable
          return Response.redirect(UPSTREAM_INSTALLER_URL, 302)
        }

        const scriptBody = await response.text()
        return new Response(scriptBody, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=300, s-maxage=300',
            'Vary': 'User-Agent',
            'X-Content-Type-Options': 'nosniff',
          },
        })
      } catch {
        return Response.redirect(UPSTREAM_INSTALLER_URL, 302)
      }
    }

    // Interactive browser navigation: redirect to GitHub repository
    return new Response(null, {
      status: 302,
      headers: {
        Location: GITHUB_REPO_URL,
        Vary: 'User-Agent',
      },
    })
  },
}
