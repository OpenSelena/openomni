const PROXY_CREDENTIALS_PATTERN = /([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)([^/\s]+)@/g
const SENSITIVE_QUERY_PARAMS = /(?<=[?&](?:access_token|api_key|apikey|auth|key|secret|session|sig|signature|token)=)[^&\s]+/gi
const AUTH_HEADER_PATTERN = /(?<=\bAuthorization:\s+(?:Bearer|Basic)\s+)[^\r\n\s]+/gi
const COOKIE_HEADER_PATTERN = /(?<=\b(?:Cookie|Set-Cookie):\s+)[^\r\n]+/gi
const EPHEMERAL_COOKIE_PATH_PATTERN = /(?:open-omni-cookies-[\w-]+\.txt)/gi

/**
 * Strips proxy passwords, auth headers, access tokens, and cookies from error strings.
 */
export function sanitizeErrorMessage(text: string): string {
  if (!text || typeof text !== 'string') return ''
  return text
    .replace(PROXY_CREDENTIALS_PATTERN, (_match, proto, userInfo) =>
      userInfo.includes(':') ? `${proto}***:***@` : `${proto}***@`,
    )
    .replace(SENSITIVE_QUERY_PARAMS, '***REDACTED***')
    .replace(AUTH_HEADER_PATTERN, '***REDACTED***')
    .replace(COOKIE_HEADER_PATTERN, '***REDACTED***')
    .replace(EPHEMERAL_COOKIE_PATH_PATTERN, 'open-omni-cookies-[REDACTED].txt')
}

/**
 * Sanitizes any error instance, object, or string to guarantee zero credential leakage.
 */
export function sanitizeError(err: unknown): string {
  if (!err) return ''
  if (err instanceof Error) {
    return sanitizeErrorMessage(err.message)
  }
  return sanitizeErrorMessage(String(err))
}
