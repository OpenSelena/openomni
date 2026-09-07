import React from 'react'
import {Text} from 'ink'
import {useTheme} from '../theme.js'

export function ProgressBar({percent, width = 30}: {percent: number; width?: number}) {
  const theme = useTheme()
  const clamped = Math.max(0, Math.min(1, percent))
  const filled = Math.round(clamped * width)
  return (
    <Text>
      <Text color={theme.primary}>{'█'.repeat(filled)}</Text>
      <Text color={theme.gray} dimColor={theme.dimSecondary}>{'░'.repeat(width - filled)}</Text>
      {/* fixed-width percent — "5%" vs "100%" must not change the line width */}
      <Text color={theme.primary}> {`${Math.round(clamped * 100)}%`.padStart(4)}</Text>
    </Text>
  )
}
