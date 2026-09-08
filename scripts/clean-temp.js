#!/usr/bin/env node

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

function cleanTemp() {
  const tmpDir = os.tmpdir()
  if (!fs.existsSync(tmpDir)) return

  let cleanedCount = 0
  let freedBytes = 0

  let entries = []
  try {
    entries = fs.readdirSync(tmpDir)
  } catch (err) {
    console.error(`Failed to read temp dir: ${err instanceof Error ? err.message : String(err)}`)
    return
  }

  for (const name of entries) {
    if (!name.startsWith('_MEI')) continue
    const fullPath = path.join(tmpDir, name)

    try {
      const stat = fs.statSync(fullPath)
      if (!stat.isDirectory()) continue

      let dirSize = 0
      try {
        const stack = [fullPath]
        while (stack.length > 0) {
          const curr = stack.pop()
          const children = fs.readdirSync(curr)
          for (const child of children) {
            const childPath = path.join(curr, child)
            const s = fs.statSync(childPath)
            if (s.isDirectory()) stack.push(childPath)
            else dirSize += s.size
          }
        }
      } catch {}

      fs.rmSync(fullPath, {recursive: true, force: true})
      cleanedCount++
      freedBytes += dirSize
      const mb = (dirSize / (1024 * 1024)).toFixed(1)
      console.log(`✓ Removed orphaned PyInstaller cache: ${name} (~${mb} MB)`)
    } catch {
      // In-use / locked by active session - safely skip
    }
  }

  if (cleanedCount > 0) {
    const gb = (freedBytes / (1024 * 1024 * 1024)).toFixed(2)
    console.log(`\nReclaimed ${gb} GB across ${cleanedCount} orphaned directory/directories.`)
  } else {
    console.log('Temp directory clean. No orphaned PyInstaller folders found.')
  }
}

cleanTemp()
