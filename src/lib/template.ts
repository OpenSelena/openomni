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
  const uploader = sanitizeTemplateTokens(vars.uploader ?? vars.artist ?? '')
  const title = sanitizeTemplateTokens(vars.title ?? 'Untitled')
  const id = sanitizeTemplateTokens(vars.id ?? '')
  const ext = sanitizeTemplateTokens((vars.ext ?? '').replace(/^\./, ''))
  const uploadDate = sanitizeTemplateTokens(vars.upload_date ?? vars.date ?? '')
  const idx = vars.index ?? vars.playlist_index ?? 1
  const paddedIndex = String(idx).padStart(2, '0')
  const indexStr = String(idx)

  const tokenMap: Record<string, string> = {
    uploader,
    artist: uploader,
    title,
    id,
    ext,
    upload_date: uploadDate,
    date: uploadDate,
    index: paddedIndex,
    playlist_index: paddedIndex,
  }

  // Handle %(title).<len>s precision slicing
  let result = template.replace(/%\(title\)\.(\d+)s/g, (_, len) => {
    return title.slice(0, parseInt(len, 10))
  })

  // Handle yt-dlp style tokens:
  result = result.replace(/%\((playlist_index|index)\)02d/g, paddedIndex)
  result = result.replace(/%\((playlist_index|index)\)s/g, indexStr)
  result = result.replace(/%\((\w+)\)s/g, (_, key) => tokenMap[key] ?? '')

  // Handle brace style tokens:
  result = result.replace(/\{(\w+)\}/g, (_, key) => tokenMap[key] ?? '')

  // Prevent directory traversal upwards out of the destination root
  return result.replace(/\.\./g, '_')
}
