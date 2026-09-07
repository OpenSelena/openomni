import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
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
  const [cursor, setCursor] = useState(0)

  const items = [
    { label: '▶ Best video (MP4)', value: 'best' as QualityTier },
    { label: '▶ 1080p (or best available)', value: '1080p' as QualityTier },
    { label: '▶ 720p (or best available)', value: '720p' as QualityTier },
    { label: '♪ Audio only (MP3)', value: 'mp3' as QualityTier },
  ]

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
    <Panel title={`Select Quality (${itemCount} videos)`} width={width}>
      <Box flexDirection="column" paddingY={1}>
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
