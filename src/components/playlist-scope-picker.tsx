import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import { useTheme } from '../theme.js'
import { Panel } from './panel.js'

export type PlaylistScopeChoice = 'full' | 'select' | 'single'

export type PlaylistScopePickerProps = {
  playlistTitle: string
  totalCount: number
  hasSingleVideo: boolean
  onSelect: (choice: PlaylistScopeChoice) => void
  onBack: () => void
  width?: number
}

export function PlaylistScopePicker({
  playlistTitle,
  totalCount,
  hasSingleVideo,
  onSelect,
  onBack,
  width = 54,
}: PlaylistScopePickerProps) {
  const theme = useTheme()
  const [cursor, setCursor] = useState(0)

  const items = [
    {
      label: `▶ Download full playlist (${totalCount} videos)`,
      value: 'full' as PlaylistScopeChoice,
    },
    {
      label: '✓ Select specific items',
      value: 'select' as PlaylistScopeChoice,
    },
  ]

  if (hasSingleVideo) {
    items.push({
      label: '• Download this video only',
      value: 'single' as PlaylistScopeChoice,
    })
  }

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setCursor(prev => Math.max(0, prev - 1))
    } else if (key.downArrow || input === 'j') {
      setCursor(prev => Math.min(items.length - 1, prev + 1))
    } else if (key.return) {
      const selected = items[cursor]
      if (selected) onSelect(selected.value)
    } else if (key.escape) {
      onBack()
    }
  })

  return (
    <Panel title="Playlist Detected" width={width}>
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color={theme.primary} bold>
            {playlistTitle.length > 46 ? `${playlistTitle.slice(0, 43)}...` : playlistTitle}
          </Text>
        </Box>
        {items.map((item, idx) => {
          const isSelected = idx === cursor
          return (
            <Box key={item.value}>
              <Box marginRight={1}>
                <Text color={theme.primary}>{isSelected ? '❯' : ' '}</Text>
              </Box>
              <Text color={theme.primary} bold={isSelected}>
                {item.label}
              </Text>
            </Box>
          )
        })}
      </Box>
    </Panel>
  )
}
