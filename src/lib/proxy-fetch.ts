import http from 'node:http'
import https from 'node:https'
import {isPrivateOrLoopbackHost} from './platforms.js'
import {Readable} from 'node:stream'
import tls from 'node:tls'

const MAX_REDIRECTS = 5
const DEFAULT_TIMEOUT_MS = 30_000

export function isSupportedNativeProxy(proxyUrl: string): boolean {
  try {
    const parsed = new URL(proxyUrl)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function validateRemoteHttpUrl(
  rawUrl: string,
  options?: {requireHttps?: boolean; allowPrivate?: boolean},
): URL {
  const trimmed = rawUrl.trim()
  if (/[\u0000-\u0020\u007f-\u009f]/.test(trimmed)) {
    throw new Error('Invalid URL: contains whitespace or control characters')
  }
  const parsed = new URL(trimmed)
  if (options?.requireHttps) {
    if (parsed.protocol !== 'https:') {
      throw new Error(`Insecure URL protocol blocked (https required): ${parsed.protocol}`)
    }
  } else if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Unsupported URL protocol blocked: ${parsed.protocol}`)
  }
  if (options?.allowPrivate === false && isPrivateOrLoopbackHost(parsed.hostname)) {
    throw new Error(`Blocked request to private or loopback host: ${parsed.hostname}`)
  }
  return parsed
}

function buildProxyAuthHeader(proxyParsed: URL): string | undefined {
  if (!proxyParsed.username && !proxyParsed.password) return undefined
  const user = decodeURIComponent(proxyParsed.username)
  const pass = decodeURIComponent(proxyParsed.password)
  return `Basic ${Buffer.from(`${user}:${pass}`, 'utf8').toString('base64')}`
}

async function openProxyConnectTunnel(
  proxyParsed: URL,
  targetHost: string,
  targetPort: number,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const isHttpsProxy = proxyParsed.protocol === 'https:'
    const client = isHttpsProxy ? https : http
    const headers: Record<string, string> = {
      Host: `${targetHost}:${targetPort}`,
    }
    const proxyAuth = buildProxyAuthHeader(proxyParsed)
    if (proxyAuth) {
      headers['Proxy-Authorization'] = proxyAuth
    }

    const req = client.request({
      host: proxyParsed.hostname,
      port: proxyParsed.port ? Number(proxyParsed.port) : isHttpsProxy ? 443 : 80,
      method: 'CONNECT',
      path: `${targetHost}:${targetPort}`,
      headers,
      timeout: timeoutMs,
      signal,
    })

    req.on('connect', (res, socket) => {
      if (res.statusCode !== 200) {
        socket.destroy()
        reject(new Error(`Proxy CONNECT failed with HTTP ${res.statusCode}`))
        return
      }
      const tlsSocket = tls.connect({
        socket,
        servername: targetHost,
      })
      tlsSocket.once('error', err => reject(err))
      tlsSocket.once('secureConnect', () => resolve(tlsSocket))
    })

    req.on('error', err => reject(err))
    req.on('timeout', () => {
      req.destroy(new Error('Proxy CONNECT timed out'))
    })
    req.end()
  })
}

async function singleHopNodeRequest(
  target: URL,
  init: RequestInit | undefined,
  proxyUrl: string | undefined,
  timeoutMs: number,
): Promise<Response> {
  const method = (init?.method || 'GET').toUpperCase()
  const headers: Record<string, string> = {}
  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => {
      headers[key] = value
    })
  }
  const signal = init?.signal ?? undefined

  if (proxyUrl) {
    if (!isSupportedNativeProxy(proxyUrl)) {
      throw new Error(`Unsupported proxy protocol for native fetch: ${proxyUrl.split(':')[0]}`)
    }
    const proxyParsed = new URL(proxyUrl)
    const isHttpsProxy = proxyParsed.protocol === 'https:'

    if (target.protocol === 'https:') {
      const targetPort = target.port ? Number(target.port) : 443
      const tlsSocket = await openProxyConnectTunnel(proxyParsed, target.hostname, targetPort, timeoutMs, signal)
      return new Promise((resolve, reject) => {
        const req = https.request(
          {
            host: target.hostname,
            port: targetPort,
            path: `${target.pathname}${target.search}`,
            method,
            headers,
            createConnection: () => tlsSocket,
            timeout: timeoutMs,
            signal,
          },
          res => {
            const responseHeaders = new Headers()
            for (const [k, v] of Object.entries(res.headers)) {
              if (Array.isArray(v)) v.forEach(item => responseHeaders.append(k, item))
              else if (v !== undefined) responseHeaders.set(k, v)
            }
            const body = Readable.toWeb(res) as ReadableStream
            resolve(
              new Response(body, {
                status: res.statusCode || 502,
                statusText: res.statusMessage || '',
                headers: responseHeaders,
              }),
            )
          },
        )
        req.on('error', reject)
        req.on('timeout', () => req.destroy(new Error('Proxied HTTPS request timed out')))
        if (init?.body && typeof init.body === 'string') req.write(init.body)
        req.end()
      })
    }

    const proxyAuth = buildProxyAuthHeader(proxyParsed)
    const proxyHeaders: Record<string, string> = {
      ...headers,
      Host: target.host,
    }
    if (proxyAuth) {
      proxyHeaders['Proxy-Authorization'] = proxyAuth
    }
    const client = isHttpsProxy ? https : http
    return new Promise((resolve, reject) => {
      const req = client.request(
        {
          host: proxyParsed.hostname,
          port: proxyParsed.port ? Number(proxyParsed.port) : isHttpsProxy ? 443 : 80,
          method,
          path: target.toString(),
          headers: proxyHeaders,
          timeout: timeoutMs,
          signal,
        },
        res => {
          const responseHeaders = new Headers()
          for (const [k, v] of Object.entries(res.headers)) {
            if (Array.isArray(v)) v.forEach(item => responseHeaders.append(k, item))
            else if (v !== undefined) responseHeaders.set(k, v)
          }
          const body = Readable.toWeb(res) as ReadableStream
          resolve(
            new Response(body, {
              status: res.statusCode || 502,
              statusText: res.statusMessage || '',
              headers: responseHeaders,
            }),
          )
        },
      )
      req.on('error', reject)
      req.on('timeout', () => req.destroy(new Error('Proxied HTTP request timed out')))
      if (init?.body && typeof init.body === 'string') req.write(init.body)
      req.end()
    })
  }

  return fetch(target.toString(), {
    ...init,
    redirect: 'manual',
    signal: init?.signal ?? AbortSignal.timeout(timeoutMs),
  })
}

export async function fetchWithProxy(
  rawUrl: string,
  init?: RequestInit,
  options?: {
    proxy?: string
    requireHttps?: boolean
    allowPrivate?: boolean
    timeoutMs?: number
    fetchImpl?: typeof fetch
  },
): Promise<Response> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  if (options?.fetchImpl && options.fetchImpl !== fetch && !options.proxy) {
    return options.fetchImpl(rawUrl, init)
  }

  let currentUrl = validateRemoteHttpUrl(rawUrl, {
    requireHttps: options?.requireHttps,
    allowPrivate: options?.allowPrivate,
  })
  const currentHeaders = new Headers(init?.headers)

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    const response = await singleHopNodeRequest(
      currentUrl,
      {...init, headers: currentHeaders},
      options?.proxy,
      timeoutMs,
    )

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) return response
      await response.body?.cancel().catch(() => {})
      const nextUrl = new URL(location, currentUrl)
      validateRemoteHttpUrl(nextUrl.toString(), {
        requireHttps: options?.requireHttps,
        allowPrivate: options?.allowPrivate,
      })
      if (nextUrl.origin !== currentUrl.origin) {
        currentHeaders.delete('cookie')
        currentHeaders.delete('authorization')
      }
      currentUrl = nextUrl
      continue
    }

    return response
  }

  throw new Error('Too many HTTP redirects')
}
