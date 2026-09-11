import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  parseNetscapeCookieContent,
  resolveCookieJar,
  cleanupCookieJar,
  type CookieJar,
} from './cookies.js'

test('parseNetscapeCookieContent parses Netscape format into HTTP cookie header string', () => {
  const content = `
# Netscape HTTP Cookie File
# http://curl.haxx.se/rfc/cookie_spec.html

.instagram.com\tTRUE\t/\tTRUE\t1822962023\tdatr\tZ9mYagbpfR8oMkiWo
#HttpOnly_.instagram.com\tTRUE\t/\tTRUE\t1820649634\tsessionid\t12345%3Aabc
.instagram.com\tTRUE\t/\tTRUE\t1796889684\tds_user_id\t12345
.youtube.com\tTRUE\t/\tTRUE\t1820649634\tLOGIN_INFO\txyz
`

  const igCookies = parseNetscapeCookieContent(content, 'instagram.com')
  assert.equal(igCookies, 'datr=Z9mYagbpfR8oMkiWo; sessionid=12345%3Aabc; ds_user_id=12345')

  const ytCookies = parseNetscapeCookieContent(content, 'youtube.com')
  assert.equal(ytCookies, 'LOGIN_INFO=xyz')

  const noCookies = parseNetscapeCookieContent(content, 'tiktok.com')
  assert.equal(noCookies, '')
})

test('resolveCookieJar returns user file as non-ephemeral', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cookie-test-'))
  const filePath = path.join(tempDir, 'user_cookies.txt')
  fs.writeFileSync(filePath, '# Netscape file')

  const jar = resolveCookieJar({file: filePath})
  assert.equal(jar.filePath, filePath)
  assert.equal(jar.isEphemeral, false)

  cleanupCookieJar(jar)
  assert.ok(fs.existsSync(filePath), 'User file must not be deleted on cleanup')

  fs.rmSync(tempDir, {recursive: true, force: true})
})

test('resolveCookieJar throws if specified cookie file does not exist', () => {
  assert.throws(
    () => resolveCookieJar({file: '/non/existent/cookies.txt'}),
    /cookie file.*does not exist/i
  )
})

test('resolveCookieJar extracts ephemeral jar via runner when browser is specified', () => {
  let executedArgs: string[] = []
  const mockRunner = (args: string[]) => {
    executedArgs = args
    // Simulate yt-dlp writing the cookie file
    const cookieArgIdx = args.indexOf('--cookies')
    if (cookieArgIdx !== -1 && args[cookieArgIdx + 1]) {
      fs.writeFileSync(args[cookieArgIdx + 1]!, '# Netscape extracted cookies\n.instagram.com\tTRUE\t/\tTRUE\t0\tsessionid\tabc')
    }
    return {status: 0, stderr: ''}
  }

  const jar = resolveCookieJar({browser: 'zen'}, {runner: mockRunner})
  assert.equal(jar.isEphemeral, true)
  assert.ok(fs.existsSync(jar.filePath))
  assert.ok(executedArgs.includes('--cookies-from-browser'))
  assert.ok(executedArgs.includes('zen'))

  cleanupCookieJar(jar)
  assert.ok(!fs.existsSync(jar.filePath), 'Ephemeral cookie file must be deleted on cleanup')
})

test('resolveCookieJar surfaces clean error if browser extraction fails', () => {
  const failingRunner = () => {
    return {
      status: 1,
      stderr: 'ERROR: could not find browser cookies database or App-Bound Encryption locked',
    }
  }

  assert.throws(
    () => resolveCookieJar({browser: 'chrome'}, {runner: failingRunner}),
    /could not extract cookies from browser \u201cchrome\u201d/i
  )
})
