import React from 'react'
import {Box, Text} from 'ink'
import {FramedInput} from '../framed-input.js'
import {TextInput} from '../text-input.js'
import {isProbablyUrl} from '../../lib/platforms.js'
import {terminalLink} from '../../lib/format.js'
import {BRAND_COLOR, type Theme} from '../../theme.js'

export type InputViewProps = {
  urlInput: string
  setUrlInput: (val: string) => void
  onSubmit: (val: string) => void
  boxWidth: number
  history: string[]
  clipboardOffered: boolean
  clipboardAccepted: boolean
  clipboardUrl?: string
  warning?: string
  version?: string
  releaseUrl: string
  theme: Theme
  buttonText: string
  gapComponent: React.ComponentType<{lines?: number}>
}

export function InputView({
  urlInput,
  setUrlInput,
  onSubmit,
  boxWidth,
  history,
  clipboardOffered,
  clipboardAccepted,
  clipboardUrl,
  warning,
  version,
  releaseUrl,
  theme,
  buttonText,
  gapComponent: Gap,
}: InputViewProps) {
  return (
    <Box flexDirection="column" alignItems="center">
      <FramedInput title="Paste a link" width={boxWidth} button={buttonText}>
        <TextInput
          value={urlInput}
          onChange={setUrlInput}
          onSubmit={onSubmit}
          placeholder="https://youtube.com/watch?v=…"
          width={boxWidth - 6}
          history={history}
          submitOnPaste={isProbablyUrl}
          onTab={() => {
            if (clipboardOffered && clipboardUrl) setUrlInput(clipboardUrl)
          }}
        />
      </FramedInput>
      {warning ? (
        <Text color={theme.gray} dimColor={theme.dimSecondary}>✗ {warning}</Text>
      ) : clipboardOffered ? (
        <Text color={theme.gray} dimColor={theme.dimSecondary}>link in your clipboard — Tab to paste it</Text>
      ) : clipboardAccepted ? (
        <Text color={theme.gray} dimColor={theme.dimSecondary}>from your clipboard — ↵ to download it</Text>
      ) : null}
      <Gap />
      <Text color={theme.gray} dimColor={theme.dimSecondary}>
        <Text color={BRAND_COLOR} underline>
          {terminalLink(`v${version}`, releaseUrl)}
        </Text>
        {' · by '}
        <Text color={BRAND_COLOR} underline>
          {terminalLink('Igect', 'https://igect.link/')}
        </Text>
      </Text>
    </Box>
  )
}
