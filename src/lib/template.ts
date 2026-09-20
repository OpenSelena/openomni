import path from 'node:path'

export type TemplateVars = {
  title?: string
  id?: string
  uploader?: string
  artist?: string
  upload_date?: string
  date?: string
  playlist_index?: number
  index?: number
  ext?: string
  [key: string]: string | number | undefined
}

/**
 * Sanitizes a template token string value to prevent path traversal
 * and illegal filename characters.
 */
export function sanitizeTemplateTokens(val: string): string {
  return val
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\.\./g, '_')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Renders an output template string using provided metadata variables.
 * Supports both yt-dlp syntax (`%(token)s`, `%(playlist_index)02d`)
 * and brace syntax (`{token}`).
 */
export function renderOutputTemplate(template: string, vars: TemplateVars): string {
  let result = template

  const uploader = vars.uploader ?? vars.artist ?? ''
  const title = vars.title ?? 'Untitled'
  const id = vars.id ?? ''
  const ext = (vars.ext ?? '').replace(/^\./, '')
  const uploadDate = vars.upload_date ?? vars.date ?? ''
  const idx = vars.index ?? vars.playlist_index ?? 1
  const paddedIndex = String(idx).padStart(2, '0')

  // yt-dlp style tokens:
  result = result.replace(/%\(uploader\)s/g, sanitizeTemplateTokens(uploader))
  result = result.replace(/%\(artist\)s/g, sanitizeTemplateTokens(uploader))
  result = result.replace(/%\(id\)s/g, sanitizeTemplateTokens(id))
  result = result.replace(/%\(ext\)s/g, sanitizeTemplateTokens(ext))
  result = result.replace(/%\(upload_date\)s/g, sanitizeTemplateTokens(uploadDate))
  result = result.replace(/%\(date\)s/g, sanitizeTemplateTokens(uploadDate))
  result = result.replace(/%\(playlist_index\)02d/g, paddedIndex)
  result = result.replace(/%\(playlist_index\)s/g, String(idx))
  result = result.replace(/%\(index\)02d/g, paddedIndex)
  result = result.replace(/%\(index\)s/g, String(idx))

  // Precision slice for title if specified like %(title).60s
  result = result.replace(/%\(title\)\.(\d+)s/g, (_, len) => {
    const max = parseInt(len, 10)
    return sanitizeTemplateTokens(title).slice(0, max)
  })
  result = result.replace(/%\(title\)s/g, sanitizeTemplateTokens(title))

  // Friendly brace tokens:
  result = result.replace(/\{uploader\}/g, sanitizeTemplateTokens(uploader))
  result = result.replace(/\{artist\}/g, sanitizeTemplateTokens(uploader))
  result = result.replace(/\{title\}/g, sanitizeTemplateTokens(title))
  result = result.replace(/\{id\}/g, sanitizeTemplateTokens(id))
  result = result.replace(/\{ext\}/g, sanitizeTemplateTokens(ext))
  result = result.replace(/\{date\}/g, sanitizeTemplateTokens(uploadDate))
  result = result.replace(/\{upload_date\}/g, sanitizeTemplateTokens(uploadDate))
  result = result.replace(/\{index\}/g, paddedIndex)
  result = result.replace(/\{playlist_index\}/g, paddedIndex)

  return result
}
