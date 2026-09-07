import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isSupportedShell,
  normalizeShell,
  generateCompletion,
  SUPPORTED_SHELLS,
} from './completion.js'

test('isSupportedShell correctly identifies valid and invalid shells', () => {
  assert.equal(isSupportedShell('bash'), true)
  assert.equal(isSupportedShell('zsh'), true)
  assert.equal(isSupportedShell('fish'), true)
  assert.equal(isSupportedShell('powershell'), true)
  assert.equal(isSupportedShell('pwsh'), true)
  assert.equal(isSupportedShell('cmd'), false)
  assert.equal(isSupportedShell('sh'), false)
  assert.equal(isSupportedShell('unknown'), false)
})

test('normalizeShell canonicalizes aliases', () => {
  assert.equal(normalizeShell('bash'), 'bash')
  assert.equal(normalizeShell('zsh'), 'zsh')
  assert.equal(normalizeShell('fish'), 'fish')
  assert.equal(normalizeShell('powershell'), 'powershell')
  assert.equal(normalizeShell('pwsh'), 'powershell')
  assert.equal(normalizeShell('BASH'), 'bash')
  assert.equal(normalizeShell('PWSH'), 'powershell')
  assert.equal(normalizeShell('invalid'), undefined)
})

test('generateCompletion throws on unsupported shell', () => {
  assert.throws(
    () => generateCompletion('invalid'),
    /unsupported shell: "invalid"/i
  )
})

test('generateCompletion for bash generates valid bash completion script', () => {
  const script = generateCompletion('bash')
  assert.ok(script.includes('_open_omni_completions'))
  assert.ok(script.includes('complete -F _open_omni_completions open-omni'))
  assert.ok(script.includes('--best'))
  assert.ok(script.includes('--mp3'))
  assert.ok(script.includes('--theme'))
  assert.ok(script.includes('auto light dark'))
  assert.ok(script.includes('--completion'))
  assert.ok(script.includes('bash zsh fish powershell'))
  assert.ok(script.includes('--output'))
  assert.ok(script.includes('--subs'))
  assert.ok(script.includes('--embed-subs'))
  assert.ok(script.includes('--thumb'))
  assert.ok(script.includes('--embed-thumb'))
  assert.ok(script.includes('--photos-only'))
  assert.ok(script.includes('--videos-only'))
  assert.ok(script.includes('--update'))
  assert.ok(script.includes('--force'))
})

test('generateCompletion for zsh generates valid zsh completion script', () => {
  const script = generateCompletion('zsh')
  assert.ok(script.includes('#compdef open-omni'))
  assert.ok(script.includes('_open_omni'))
  assert.ok(script.includes('--best'))
  assert.ok(script.includes('--mp3'))
  assert.ok(script.includes('--theme'))
  assert.ok(script.includes('auto light dark') || script.includes('(auto light dark)'))
  assert.ok(script.includes('--completion'))
  assert.ok(script.includes('--subs'))
  assert.ok(script.includes('--thumb'))
  assert.ok(script.includes('--embed-thumb'))
  assert.ok(script.includes('--photos-only'))
  assert.ok(script.includes('--videos-only'))
})

test('generateCompletion for fish generates valid fish completion script', () => {
  const script = generateCompletion('fish')
  assert.ok(script.includes('complete -c open-omni'))
  assert.ok(script.includes('-l best'))
  assert.ok(script.includes('-l mp3'))
  assert.ok(script.includes('-l theme'))
  assert.ok(script.includes('auto light dark'))
  assert.ok(script.includes('-l completion'))
  assert.ok(script.includes('-l subs'))
  assert.ok(script.includes('-l thumb'))
  assert.ok(script.includes('-l photos-only'))
  assert.ok(script.includes('-l videos-only'))
})

test('generateCompletion for powershell generates valid Register-ArgumentCompleter script', () => {
  const script = generateCompletion('powershell')
  assert.ok(script.includes('Register-ArgumentCompleter'))
  assert.ok(script.includes('-Native'))
  assert.ok(script.includes("-CommandName 'open-omni'"))
  assert.ok(script.includes('--best'))
  assert.ok(script.includes('--mp3'))
  assert.ok(script.includes('--theme'))
  assert.ok(script.includes('auto') && script.includes('light') && script.includes('dark'))
  assert.ok(script.includes('--completion'))
  assert.ok(script.includes('--subs'))
  assert.ok(script.includes('--thumb'))
  assert.ok(script.includes('--photos-only'))
  assert.ok(script.includes('--videos-only'))
  assert.ok(script.includes('Get-ChildItem -Directory'))
  assert.ok(script.includes('[string]::IsNullOrEmpty($wordToComplete)'))
})

test('bash completion has zero external dependencies on bash-completion package', () => {
  const script = generateCompletion('bash')
  assert.equal(script.includes('_init_completion'), false)
  assert.equal(script.includes('_filedir'), false)
  assert.ok(script.includes('compgen -d'))
})

test('zsh completion does not contain scope creep url completing', () => {
  const script = generateCompletion('zsh')
  assert.equal(script.includes('_urls'), false)
})

test('fish completion preserves both -s U -l update and -l update-ytdlp', () => {
  const script = generateCompletion('fish')
  assert.ok(script.includes('-s U -l update'))
  assert.ok(script.includes('-l update-ytdlp'))
})

