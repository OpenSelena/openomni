import React from 'react'
import { Box, Text } from 'ink'
import SelectInput from 'ink-select-input'
import { useTheme } from '../theme.js'
import { Panel } from './panel.js'
import type { QualityTier } from '../lib/playlist.js'

export type PlaylistQualityPickerProps = {
  itemCount: number
  onSelect: (tier: QualityTier) => void
  onBack: () => void
  width?: number
}

export function PlaylistQualityPicker({
  itemCount,
  onSelect,
  onBack,
  width = 54,
}: PlaylistQualityPickerProps) {
  const theme = useTheme()

  const items = [
    { label: '▶ Best video (MP4)', value: 'best' as QualityTier },
    { label: '▶ 1080p (or best available)', value: '1080p' as QualityTier },
    { label: '▶ 720p (or best available)', value: '720p' as QualityTier },
    { label: '♪ Audio only (MP3)', value: 'mp3' as QualityTier },
  ]

  return (
    <Panel title={`Select Quality (${itemCount} videos)`} width={width}>
      <Box flexDirection="column" paddingY={1}>
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
