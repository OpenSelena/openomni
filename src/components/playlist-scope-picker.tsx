import React from 'react'
import { Box, Text } from 'ink'
import SelectInput from 'ink-select-input'
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

  return (
    <Panel title="Playlist Detected" width={width}>
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color={theme.primary} bold>
            {playlistTitle.length > 46 ? `${playlistTitle.slice(0, 43)}...` : playlistTitle}
          </Text>
        </Box>
        <SelectInput
          items={items}
          onSelect={item => onSelect(item.value)}
          indicatorComponent={({ isSelected }) => (
            <Box marginRight={1}>
              <Text color={theme.primary}>{isSelected ? '❯' : ' '}</Text>
            </Box>
          )}
          itemComponent={({ isSelected, label }) => (
            <Text color={theme.primary} bold={isSelected}>
              {label}
            </Text>
          )}
        />
      </Box>
    </Panel>
  )
}
