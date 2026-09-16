import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import {renderToString} from 'ink'
import {ProgressBar} from './progress-bar.js'
import {PlaylistProgress} from './playlist-progress.js'
import {ThemeProvider} from '../theme.js'

test('ProgressBar renders proportional fill for both 0..1 and 0..100 scales', () => {
  const renderedFraction = renderToString(
    React.createElement(ThemeProvider, {
      mode: 'auto',
      children: React.createElement(ProgressBar, {percent: 0.1, width: 20, showPercent: false}),
    }),
  )
  // 10% of 20 chars = 2 filled blocks '██'
  assert.ok(renderedFraction.includes('██'))
  assert.ok(!renderedFraction.includes('████████████████████'))

  const renderedWholePct = renderToString(
    React.createElement(ThemeProvider, {
      mode: 'auto',
      children: React.createElement(ProgressBar, {percent: 10, width: 20, showPercent: false}),
    }),
  )
  // 10% on 0..100 scale must also render 2 filled blocks, NOT 100% filled!
  assert.ok(renderedWholePct.includes('██'))
  assert.ok(!renderedWholePct.includes('████████████████████'))
})

test('ProgressBar showPercent: false omits percentage text', () => {
  const rendered = renderToString(
    React.createElement(ThemeProvider, {
      mode: 'auto',
      children: React.createElement(ProgressBar, {percent: 0.5, width: 20, showPercent: false}),
    }),
  )
  assert.doesNotMatch(rendered, /50%/)
})

test('PlaylistProgress calculates overall batch progress synced with current item stream', () => {
  const rendered = renderToString(
    React.createElement(ThemeProvider, {
      mode: 'auto',
      children: React.createElement(PlaylistProgress, {
        playlistTitle: 'Test Playlist',
        currentTitle: 'Song 5',
        currentIndex: 4,
        totalCount: 89,
        progress: {
          downloadedBytes: 50,
          totalBytes: 100,
          part: 1,
          totalParts: 1,
        },
        processing: false,
        skippedCount: 0,
        width: 64,
      }),
    }),
  )

  // Header must show 4/89 items done (with in-flight fraction ~5%)
  assert.match(rendered, /5%\s*\(4\/89\)/)
  // Current item must show 50%
  assert.match(rendered, /50%/)
  // Must NOT contain an orphaned 100% under a 5% batch bar
  assert.doesNotMatch(rendered, /Overall Batch:[^]*?100%\s*\[5\/89\]/)
})

test('PlaylistProgress treats processing item as 100% complete for batch progress', () => {
  const rendered = renderToString(
    React.createElement(ThemeProvider, {
      mode: 'auto',
      children: React.createElement(PlaylistProgress, {
        playlistTitle: 'Test Playlist',
        currentTitle: 'Song 5',
        currentIndex: 4,
        totalCount: 89,
        processing: true,
        skippedCount: 0,
        width: 64,
      }),
    }),
  )

  // (4 + 1) / 89 = 5/89 = 5.6% -> 6%
  assert.match(rendered, /6%\s*\(4\/89\)/)
  assert.match(rendered, /100%/)
  assert.match(rendered, /processing…/)
})

test('PlaylistProgress handles totalCount === 0 without division by zero', () => {
  const rendered = renderToString(
    React.createElement(ThemeProvider, {
      mode: 'auto',
      children: React.createElement(PlaylistProgress, {
        playlistTitle: 'Empty Playlist',
        currentTitle: '',
        currentIndex: 0,
        totalCount: 0,
        processing: false,
        skippedCount: 0,
        width: 64,
      }),
    }),
  )

  assert.match(rendered, /0%\s*\(0\/0\)/)
})
