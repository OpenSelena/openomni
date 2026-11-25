import path from 'node:path'

const PROXY_CREDENTIALS_PATTERN = /([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)([^/\s]+)@/g
const SENSITIVE_QUERY_PARAMS =
  /(?<=[?&](?:access_token|api_key|apikey|auth|client_secret|key|password|refresh_token|secret|session|sig|signature|token|x-amz-security-token|x-amz-signature)=)[^&\s]+/gi
const AUTH_HEADER_PATTERN = /((?:\bAuthorization|["']Authorization["']):\s*["']?(?:Bearer|Basic)\s+)[^\r\n\s"']+/gi
const COOKIE_HEADER_PATTERN = /((?:\b(?:Cookie|Set-Cookie)|["'](?:Cookie|Set-Cookie)["']):\s*["']?)[^\r\n"']+/gi
const EPHEMERAL_COOKIE_PATH_PATTERN = /(?:open-omni-cookies-[\w-]+\.txt)/gi

// Strips ANSI CSI/OSC/DCS/APC/PM/SOS and 2-byte escapes, plus remaining C0/C1 controls
// while optionally preserving '\n' when multi-line messages are expected.
const ANSI_ESCAPE_PATTERN =
  // eslint-disable-next-line no-control-regex
  /\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\|$)|(?:\u001b\[|\u009b)[0-9;?]*[ -/]*[@-~]|\u001b[PX^_][^\u001b]*(?:\u001b\\|$)|\u001b[@-_]/g

export function stripTerminalControls(text: string, allowNewlines = false): string {
  if (!text || typeof text !== 'string') return ''
  const withoutEscapes = text.replace(ANSI_ESCAPE_PATTERN, '')
  if (allowNewlines) {
    // eslint-disable-next-line no-control-regex
    return withoutEscapes.replace(/[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/g, '')
  }
  // eslint-disable-next-line no-control-regex
  return withoutEscapes.replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
}

export function assertContainedPath(baseDir: string, targetPath: string, allowBaseDir = false): string {
  const resolvedBase = path.resolve(baseDir)
  const resolvedTarget = path.resolve(targetPath)
  const rel = path.relative(resolvedBase, resolvedTarget)
  if (!allowBaseDir && rel === '') {
    throw new Error(`Refusing path equal to destination root: ${resolvedTarget}`)
  }
  if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    throw new Error(`Blocked path outside destination directory: ${resolvedTarget}`)
  }
  return resolvedTarget
}

/**
 * Strips proxy passwords, auth headers, access tokens, and cookies from error strings.
 */
export function sanitizeErrorMessage(text: string): string {
  if (!text || typeof text !== 'string') return ''
  const redacted = text
    .replace(PROXY_CREDENTIALS_PATTERN, (_match, proto, userInfo) =>
      userInfo.includes(':') ? `${proto}***:***@` : `${proto}***@`,
    )
    .replace(SENSITIVE_QUERY_PARAMS, '***REDACTED***')
    .replace(AUTH_HEADER_PATTERN, '$1***REDACTED***')
    .replace(COOKIE_HEADER_PATTERN, '$1***REDACTED***')
    .replace(EPHEMERAL_COOKIE_PATH_PATTERN, 'open-omni-cookies-[REDACTED].txt')
  return stripTerminalControls(redacted, true)
}

/**
 * Sanitizes any error instance, object, or string to guarantee zero credential leakage.
 * If an Error instance is provided, both its message and stack are sanitized in place.
 */
export function sanitizeError(err: unknown): string {
  if (!err) return ''
  if (err instanceof Error) {
    if (typeof err.message === 'string') {
      err.message = sanitizeErrorMessage(err.message)
    }
    if (typeof err.stack === 'string') {
      err.stack = sanitizeErrorMessage(err.stack)
    }
    return err.message || (err.stack ? sanitizeErrorMessage(err.stack) : 'Error')
  }
  return sanitizeErrorMessage(String(err))
}
