import React from 'react'
import {Text} from 'ink'
import {useTheme} from '../theme.js'

export function ProgressBar({
  percent,
  width = 30,
  showPercent = true,
}: {
  percent: number
  width?: number
  showPercent?: boolean
}) {
  const theme = useTheme()
  const normalized = percent > 1 ? percent / 100 : Math.max(0, percent)
  const clamped = Math.min(1, normalized)
  const percentLabel = showPercent ? ` ${`${Math.round(clamped * 100)}%`.padStart(4)}` : ''
  const barWidth = Math.max(1, showPercent ? width - percentLabel.length : width)
  const filled = Math.round(clamped * barWidth)
  return (
    <Text>
      <Text color={theme.primary}>{'█'.repeat(filled)}</Text>
      <Text color={theme.gray} dimColor={theme.dimSecondary}>{'░'.repeat(barWidth - filled)}</Text>
      {percentLabel ? <Text color={theme.primary}>{percentLabel}</Text> : null}
    </Text>
  )
}
