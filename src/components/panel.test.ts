import assert from 'node:assert/strict'
import test from 'node:test'

test('forced themes paint native border cells with the theme background', async () => {
  const previousForceColor = process.env.FORCE_COLOR
  const previousNoColor = process.env.NO_COLOR
  process.env.FORCE_COLOR = '3'
  delete process.env.NO_COLOR

  try {
    // Import after forcing truecolor so Chalk's color support is deterministic.
    const [{default: React}, {renderToString, Text}, {Panel}, {ThemeProvider}] = await Promise.all([
      import('react'),
      import('ink'),
      import('./panel.js'),
      import('../theme.js'),
    ])

    const renderPanel = (mode: 'auto' | 'light' | 'dark') =>
      renderToString(
        React.createElement(
          ThemeProvider,
          {
            mode,
            children: React.createElement(Panel, {
              title: 'Download',
              width: 20,
              children: React.createElement(Text, null, 'item'),
            }),
          },
        ),
      )

    assert.match(renderPanel('light'), /\x1b\[48;2;255;255;255m/)
    assert.match(renderPanel('dark'), /\x1b\[48;2;24;24;27m/)
    assert.doesNotMatch(renderPanel('auto'), /\x1b\[48;2;/)
  } finally {
    if (previousForceColor === undefined) delete process.env.FORCE_COLOR
    else process.env.FORCE_COLOR = previousForceColor
    if (previousNoColor === undefined) delete process.env.NO_COLOR
    else process.env.NO_COLOR = previousNoColor
  }
})

test('Logo renders Open Omni ASCII block art with brand color', async () => {
  const previousForceColor = process.env.FORCE_COLOR
  process.env.FORCE_COLOR = '3'
  try {
    const [{default: React}, {renderToString}, {Logo}, {ThemeProvider}] = await Promise.all([
      import('react'),
      import('ink'),
      import('./logo.js'),
      import('../theme.js'),
    ])

    const rendered = renderToString(
      React.createElement(ThemeProvider, {mode: 'auto', children: React.createElement(Logo)}),
    )
    assert.ok(rendered.includes('█▀█'))
    assert.ok(rendered.includes('█▀▄█'))
    assert.ok(rendered.includes('▀█▀'))
    assert.match(rendered, /\x1b\[38;2;193;95;60m/)
  } finally {
    if (previousForceColor === undefined) delete process.env.FORCE_COLOR
    else process.env.FORCE_COLOR = previousForceColor
  }
})

test('App renders version and developer credit with hyperlink on home screen', async () => {
  const previousForceColor = process.env.FORCE_COLOR
  process.env.FORCE_COLOR = '3'
  try {
    const [{default: React}, {renderToString}, {App}] = await Promise.all([
      import('react'),
      import('ink'),
      import('../app.js'),
    ])

    const rendered = renderToString(
      React.createElement(App, {
        version: '1.0.0',
        onOutcome: () => {},
      }),
    )

    assert.ok(rendered.includes('v1.0.0'))
    assert.ok(rendered.includes('by'))
    assert.ok(rendered.includes('Igect'))
    assert.ok(rendered.includes('https://igect.link/'))
    assert.ok(rendered.includes('https://github.com/OpenSelena/openomni/releases/tag/v1.0.0'))
    assert.match(rendered, /\x1b\[38;2;193;95;60m.*v1\.0\.0/)
    assert.match(rendered, /\x1b\[38;2;193;95;60m.*Igect/)
  } finally {
    if (previousForceColor === undefined) delete process.env.FORCE_COLOR
    else process.env.FORCE_COLOR = previousForceColor
  }
})

test('App accepts initialSubtitles prop without regression', async () => {
  const [{default: React}, {renderToString}, {App}] = await Promise.all([
    import('react'),
    import('ink'),
    import('../app.js'),
  ])

  const rendered = renderToString(
    React.createElement(App, {
      initialSubtitles: {enabled: true, languages: 'es,en'},
      onOutcome: () => {},
    }),
  )
  assert.ok(rendered.includes('v1.3.0'))
})

test('App accepts initialThumbnail prop without regression', async () => {
  const [{default: React}, {renderToString}, {App}] = await Promise.all([
    import('react'),
    import('ink'),
    import('../app.js'),
  ])

  const rendered = renderToString(
    React.createElement(App, {
      initialThumbnail: {enabled: true, embed: true},
      onOutcome: () => {},
    }),
  )
  assert.ok(rendered.includes('v1.3.0'))
})

test('SingleDoneView and PlaylistDoneView render reveal in folder shortcut', async () => {
  const [{default: React}, {renderToString}, {SingleDoneView, PlaylistDoneView, REVEAL_LABEL, DONE_LABEL}] = await Promise.all([
    import('react'),
    import('ink'),
    import('./views/completion-view.js'),
  ])

  assert.equal(REVEAL_LABEL, '[o] reveal in folder')
  assert.equal(DONE_LABEL, '↵ download another')

  const dummyTheme = {
    primary: 'cyan',
    secondary: 'gray',
    dimSecondary: true,
    background: undefined,
    gray: 'gray',
    error: 'red',
    warning: 'yellow',
  } as any

  const DummyGap = () => React.createElement('div', null)

  const singleRendered = renderToString(
    React.createElement(SingleDoneView, {
      filepath: '/path/to/downloaded/video.mp4',
      theme: dummyTheme,
      gapComponent: DummyGap,
    }),
  )
  assert.ok(singleRendered.includes('[o]'))
  assert.ok(singleRendered.includes('reveal in folder'))
  assert.ok(singleRendered.includes(DONE_LABEL))

  const playlistRendered = renderToString(
    React.createElement(PlaylistDoneView, {
      playlistTitle: 'Test Playlist',
      downloadCount: 3,
      skippedCount: 1,
      targetDir: '/path/to/downloaded/folder',
      theme: dummyTheme,
      gapComponent: DummyGap,
    }),
  )
  assert.ok(playlistRendered.includes('[o]'))
  assert.ok(playlistRendered.includes('reveal in folder'))
  assert.ok(playlistRendered.includes(DONE_LABEL))
})


