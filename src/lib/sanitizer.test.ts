import assert from 'node:assert/strict'
import test from 'node:test'
import { sanitizeErrorMessage, sanitizeError } from './sanitizer.js'

test('sanitizeErrorMessage masks proxy credentials in URLs', () => {
  const input = 'Failed to connect to http://admin:supersecret@proxy.corp.internal:8080: 407 Proxy Auth'
  const expected = 'Failed to connect to http://***:***@proxy.corp.internal:8080: 407 Proxy Auth'
  assert.equal(sanitizeErrorMessage(input), expected)

  const socksInput = 'ERROR: socks5://myuser:mypassword@127.0.0.1:1080: Connection refused'
  const socksExpected = 'ERROR: socks5://***:***@127.0.0.1:1080: Connection refused'
  assert.equal(sanitizeErrorMessage(socksInput), socksExpected)

  const tokenUrl = 'Failed to clone https://ghp_abc123secret@github.com/repo.git'
  const tokenExpected = 'Failed to clone https://***@github.com/repo.git'
  assert.equal(sanitizeErrorMessage(tokenUrl), tokenExpected)
})

test('sanitizeErrorMessage masks sensitive query parameters', () => {
  const urlWithToken = 'Error fetching https://api.site.com/v1/feed?access_token=secret_token_12345&limit=10'
  const expected = 'Error fetching https://api.site.com/v1/feed?access_token=***REDACTED***&limit=10'
  assert.equal(sanitizeErrorMessage(urlWithToken), expected)

  const multiParam = 'Request failed: https://cdn.site.com/video.mp4?sig=abcde12345&token=xyz789&quality=1080'
  const multiExpected = 'Request failed: https://cdn.site.com/video.mp4?sig=***REDACTED***&token=***REDACTED***&quality=1080'
  assert.equal(sanitizeErrorMessage(multiParam), multiExpected)
})

test('sanitizeErrorMessage masks authorization and cookie headers', () => {
  const authHeader = 'Request failed with headers: Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz'
  assert.equal(
    sanitizeErrorMessage(authHeader),
    'Request failed with headers: Authorization: Bearer ***REDACTED***'
  )

  const cookieHeader = 'HTTP 403 Forbidden: Cookie: sessionid=12345abcde; csrftoken=98765'
  assert.equal(
    sanitizeErrorMessage(cookieHeader),
    'HTTP 403 Forbidden: Cookie: ***REDACTED***'
  )
})

test('sanitizeErrorMessage masks ephemeral cookie file paths', () => {
  const log = 'Wrote session cookies to C:\\Users\\user\\AppData\\Local\\Temp\\open-omni-cookies-a1b2c3d4-e5f6.txt'
  assert.match(sanitizeErrorMessage(log), /open-omni-cookies-\[REDACTED\]\.txt/)
})

test('sanitizeError handles Error instances and arbitrary objects', () => {
  const err = new Error('Connection failed to http://user:pass@127.0.0.1:8080')
  assert.equal(sanitizeError(err), 'Connection failed to http://***:***@127.0.0.1:8080')

  assert.equal(sanitizeError('plain string with http://u:p@proxy'), 'plain string with http://***:***@proxy')
  assert.equal(sanitizeError(null), '')
  assert.equal(sanitizeError(undefined), '')
})
