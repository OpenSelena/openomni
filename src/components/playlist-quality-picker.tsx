import React from 'react'
import { Box, Text } from 'ink'
import SelectInput from 'ink-select-input'
import { useTheme } from '../theme.js'
import { Panel } from './panel.js'
import type { QualityTier } from '../lib/playlist.js'

export type PlaylistQualityPickerProps = {
  itemCount: number
  hasPhotos?: boolean
  audioFormat?: string
  videoFormat?: string
  onSelect: (tier: QualityTier) => void
  onBack: () => void
  width?: number
}

export function PlaylistQualityPicker({
  itemCount,
  hasPhotos = false,
  audioFormat,
  videoFormat,
  onSelect,
  onBack,
  width = 54,
}: PlaylistQualityPickerProps) {
  const theme = useTheme()
  const vFmt = (videoFormat || 'mp4').toUpperCase()
  const aFmt = (audioFormat || 'mp3').toUpperCase()

  const items = [
    { label: `▶ Best video (${vFmt})`, value: 'best' as QualityTier },
    { label: `▶ 1080p (${vFmt})`, value: '1080p' as QualityTier },
    { label: `▶ 720p (${vFmt})`, value: '720p' as QualityTier },
    { label: `♪ Audio only (${aFmt})`, value: 'mp3' as QualityTier },
  ]

  const title = hasPhotos
    ? `Select Video Quality (${itemCount} items)`
    : `Select Quality (${itemCount} videos)`

  return (
    <Panel title={title} width={width}>
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
