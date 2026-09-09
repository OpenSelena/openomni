import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import { useTheme } from '../theme.js'
import type { PlaylistEntry } from '../lib/playlist.js'
import { Panel } from './panel.js'

export function toggleItem(selected: Set<string>, id: string): Set<string> {
  const next = new Set(selected)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  return next
}

export function toggleAll(selected: Set<string>, allIds: string[]): Set<string> {
  if (selected.size === allIds.length) {
    return new Set()
  }
  return new Set(allIds)
}

export function getPageSlice<T>(
  items: T[],
  page: number,
  pageSize: number
): { items: T[]; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.max(0, Math.min(page, totalPages - 1))
  const start = safePage * pageSize
  return {
    items: items.slice(start, start + pageSize),
    totalPages,
  }
}

export type PlaylistItemPickerProps = {
  entries: PlaylistEntry[]
  onConfirm: (selected: PlaylistEntry[]) => void
  onBack: () => void
  width?: number
}

const PAGE_SIZE = 8

export function PlaylistItemPicker({
  entries,
  onConfirm,
  onBack,
  width = 64,
}: PlaylistItemPickerProps) {
  const theme = useTheme()
  const allIds = entries.map(e => e.id)
  const [selected, setSelected] = useState<Set<string>>(() => new Set(allIds))
  const [cursor, setCursor] = useState(0)

  const activePage = Math.floor(cursor / PAGE_SIZE)
  const { items: pageEntries, totalPages } = getPageSlice(entries, activePage, PAGE_SIZE)

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setCursor(prev => Math.max(0, prev - 1))
    } else if (key.downArrow || input === 'j') {
      setCursor(prev => Math.min(entries.length - 1, prev + 1))
    } else if (input === ' ') {
      const current = entries[cursor]
      if (current) {
        setSelected(prev => toggleItem(prev, current.id))
      }
    } else if (input === 'a' || input === 'A') {
      setSelected(prev => toggleAll(prev, allIds))
    } else if (key.return) {
      const chosen = entries.filter(e => selected.has(e.id))
      if (chosen.length > 0) {
        onConfirm(chosen)
      }
    } else if (key.escape) {
      onBack()
    }
  })

  const hasPhotos = entries.some(e => e.kind === 'photo')
  const titleText = hasPhotos
    ? `Select Media (${selected.size}/${entries.length})`
    : `Select Videos (${selected.size}/${entries.length})`

  return (
    <Panel title={titleText} width={width}>
      <Box flexDirection="column" paddingY={1}>
        {pageEntries.map((entry, idx) => {
          const globalIdx = activePage * PAGE_SIZE + idx
          const isCursor = globalIdx === cursor
          const isChecked = selected.has(entry.id)
          const maxTitleLen = entry.kind ? 36 : 44
          const title = entry.title.length > maxTitleLen ? `${entry.title.slice(0, maxTitleLen - 3)}...` : entry.title

          return (
            <Box key={entry.id}>
              <Text color={theme.primary}>{isCursor ? '❯ ' : '  '}</Text>
              <Text color={isChecked ? theme.primary : theme.gray}>
                {isChecked ? '[✓] ' : '[ ] '}
              </Text>
              <Text color={theme.gray} dimColor={theme.dimSecondary}>
                {`${String(entry.index).padStart(2, '0')}. `}
              </Text>
              {entry.kind === 'photo' ? (
                <Text color="magenta" bold>
                  {'[PHOTO] '}
                </Text>
              ) : entry.kind === 'video' ? (
                <Text color="cyan" bold>
                  {'[VIDEO] '}
                </Text>
              ) : null}
              <Text color={isCursor ? theme.primary : theme.primary} bold={isCursor}>
                {title}
              </Text>
            </Box>
          )
        })}

        {totalPages > 1 && (
          <Box marginTop={1} justifyContent="center">
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              {`── page ${activePage + 1} of ${totalPages} (↑↓ to scroll) ──`}
            </Text>
          </Box>
        )}
      </Box>
    </Panel>
  )
}
