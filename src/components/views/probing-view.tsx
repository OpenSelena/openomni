import React from 'react'
import {Box, Text} from 'ink'
import {FramedInput} from '../framed-input.js'
import type {Platform} from '../../lib/platforms.js'
import type {Theme} from '../../theme.js'

export type ProbingViewProps = {
  platform?: Platform
  url: string
  boxWidth: number
  theme: Theme
  buttonText: string
}

export function ProbingView({
  platform,
  url,
  boxWidth,
  theme,
  buttonText,
}: ProbingViewProps) {
  const displayUrl = url.length > boxWidth - 8 ? `${url.slice(0, boxWidth - 9)}…` : url

  return (
    <Box flexDirection="column" alignItems="center">
      <FramedInput title={platform ? platform.label : 'Paste a link'} width={boxWidth} button={buttonText} buttonDim>
        <Text color={theme.gray} dimColor={theme.dimSecondary}>
          {displayUrl}
        </Text>
      </FramedInput>
    </Box>
  )
}
