import assert from 'node:assert/strict'
import test from 'node:test'
import path from 'node:path'
import {
  expandWindowsEnv,
  parseWindowsRegistryOutput,
  parseLinuxUserDirsOutput,
  isPathDriveAccessible,
  resolveWindowsDownloadsDir,
  resolveLinuxDownloadsDir,
  resolvePlatformDownloadsDir,
  KNOWN_FOLDER_DOWNLOADS_GUID,
  USER_SHELL_FOLDERS_REG_KEY,
} from './known-folders.js'

test('expandWindowsEnv expands case-insensitive windows environment variables', () => {
  const env = {
    USERPROFILE: 'C:\\Users\\Alice',
    SYSTEMDRIVE: 'C:',
    EMPTY_VAR: '',
  }
  assert.equal(
    expandWindowsEnv('%USERPROFILE%\\Downloads', env),
    'C:\\Users\\Alice\\Downloads'
  )
  assert.equal(
    expandWindowsEnv('%userprofile%\\Downloads', env),
    'C:\\Users\\Alice\\Downloads'
  )
  assert.equal(
    expandWindowsEnv('%SystemDrive%\\SharedDownloads', env),
    'C:\\SharedDownloads'
  )
  // Honors explicit homeDir override even if USERPROFILE env is present
  assert.equal(
    expandWindowsEnv('%USERPROFILE%\\Downloads', env, 'D:\\CustomHome'),
    'D:\\CustomHome\\Downloads'
  )
  // Handles empty string env vars cleanly
  assert.equal(
    expandWindowsEnv('prefix%EMPTY_VAR%suffix', env),
    'prefixsuffix'
  )
  // Unmatched variable left untouched
  assert.equal(
    expandWindowsEnv('%NONEXISTENT%\\Downloads', env),
    '%NONEXISTENT%\\Downloads'
  )
})

test('parseWindowsRegistryOutput extracts relocated path from reg query output', () => {
  const sample = `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders
    {374DE290-123F-4565-9164-39C4925E467B}    REG_EXPAND_SZ    X:\\Downloads
`
  assert.equal(
    parseWindowsRegistryOutput(sample, KNOWN_FOLDER_DOWNLOADS_GUID),
    'X:\\Downloads'
  )
})

test('parseWindowsRegistryOutput does not cross-match other keys', () => {
  const sample = `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders
    Downloads    REG_SZ    D:\\LegacyDownloads
`
  // Searching for GUID in output that only contains Downloads should return undefined
  assert.equal(
    parseWindowsRegistryOutput(sample, KNOWN_FOLDER_DOWNLOADS_GUID),
    undefined
  )
})

test('parseWindowsRegistryOutput extracts legacy Downloads key', () => {
  const sample = `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders
    Downloads    REG_SZ    D:\\CustomDownloads
`
  assert.equal(
    parseWindowsRegistryOutput(sample, 'Downloads'),
    'D:\\CustomDownloads'
  )
})

test('parseWindowsRegistryOutput returns undefined on empty or mismatching output', () => {
  assert.equal(parseWindowsRegistryOutput('', KNOWN_FOLDER_DOWNLOADS_GUID), undefined)
  assert.equal(
    parseWindowsRegistryOutput('ERROR: The system was unable to find the specified registry key or value.', KNOWN_FOLDER_DOWNLOADS_GUID),
    undefined
  )
})

test('parseLinuxUserDirsOutput parses XDG_DOWNLOAD_DIR', () => {
  const sample = `
# This file is written by xdg-user-dirs-update
XDG_DESKTOP_DIR="$HOME/Desktop"
XDG_DOWNLOAD_DIR="$HOME/Downloads"
XDG_TEMPLATES_DIR="$HOME/Templates"
`
  assert.equal(parseLinuxUserDirsOutput(sample), '$HOME/Downloads')

  const customSample = `
XDG_DOWNLOAD_DIR="/mnt/data/my-downloads"
`
  assert.equal(parseLinuxUserDirsOutput(customSample), '/mnt/data/my-downloads')
})

test('resolveWindowsDownloadsDir resolves relocated drive when accessible', () => {
  const result = resolveWindowsDownloadsDir({
    homeDir: 'C:\\Users\\Alice',
    env: {USERPROFILE: 'C:\\Users\\Alice'},
    regQueryFn: () => `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders
    {374DE290-123F-4565-9164-39C4925E467B}    REG_EXPAND_SZ    X:\\Downloads
`,
    driveAccessibleFn: p => p.startsWith('X:'),
  })

  assert.equal(result, 'X:\\Downloads')
})

test('resolveWindowsDownloadsDir expands %USERPROFILE% and returns resolved path', () => {
  const result = resolveWindowsDownloadsDir({
    homeDir: 'C:\\Users\\Alice',
    env: {USERPROFILE: 'C:\\Users\\Alice'},
    regQueryFn: () => `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders
    {374DE290-123F-4565-9164-39C4925E467B}    REG_EXPAND_SZ    %USERPROFILE%\\Downloads
`,
    driveAccessibleFn: () => true,
  })

  assert.equal(result, path.resolve('C:\\Users\\Alice\\Downloads'))
})

test('resolveWindowsDownloadsDir returns undefined if relocated drive is inaccessible', () => {
  const result = resolveWindowsDownloadsDir({
    homeDir: 'C:\\Users\\Alice',
    env: {USERPROFILE: 'C:\\Users\\Alice'},
    regQueryFn: () => `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders
    {374DE290-123F-4565-9164-39C4925E467B}    REG_EXPAND_SZ    Z:\\OfflineDrive\\Downloads
`,
    driveAccessibleFn: () => false, // e.g. unplugged external USB
  })

  assert.equal(result, undefined)
})

test('resolveLinuxDownloadsDir resolves custom download directory with $HOME expansion', () => {
  const result = resolveLinuxDownloadsDir({
    homeDir: '/home/alice',
    readFileFn: () => 'XDG_DOWNLOAD_DIR="$HOME/Incoming"\n',
    driveAccessibleFn: () => true,
  })

  assert.equal(result, path.resolve('/home/alice/Incoming'))
})

test('resolvePlatformDownloadsDir falls back to ~/Downloads when platform query returns undefined', () => {
  const winFallback = resolvePlatformDownloadsDir({
    platform: 'win32',
    homeDir: 'C:\\Users\\Alice',
    regQueryFn: () => '', // failed query
  })
  assert.equal(winFallback, path.join('C:\\Users\\Alice', 'Downloads'))

  const linuxFallback = resolvePlatformDownloadsDir({
    platform: 'linux',
    homeDir: '/home/alice',
    readFileFn: () => '', // no user-dirs.dirs
  })
  assert.equal(linuxFallback, path.join('/home/alice', 'Downloads'))

  const darwinDefault = resolvePlatformDownloadsDir({
    platform: 'darwin',
    homeDir: '/Users/alice',
  })
  assert.equal(darwinDefault, path.join('/Users/alice', 'Downloads'))
})

test('isPathDriveAccessible checks drive root on Windows and mount points on POSIX', () => {
  // Direct file exists
  assert.equal(isPathDriveAccessible('/existing/path', () => true), true)

  // Windows drive root check
  assert.equal(
    isPathDriveAccessible('D:\\Downloads\\Stuff', p => p.toLowerCase() === 'd:\\', 'win32'),
    true
  )
  assert.equal(
    isPathDriveAccessible('Z:\\Downloads\\Stuff', p => p.toLowerCase() === 'd:\\', 'win32'),
    false
  )

  // POSIX /media/usb mount check
  assert.equal(
    isPathDriveAccessible('/media/user/usb-drive/Downloads', p => p === '/media/user/usb-drive', 'linux'),
    true
  )
  assert.equal(
    isPathDriveAccessible('/media/user/unmounted-usb/Downloads', p => p === '/media/user/other', 'linux'),
    false
  )
})

test('resolvePlatformDownloadsDir uses live windows registry on current machine if win32', () => {
  if (process.platform === 'win32') {
    const live = resolvePlatformDownloadsDir()
    assert.ok(typeof live === 'string' && live.length > 0)
    assert.ok(path.isAbsolute(live))
    assert.ok(live.toLowerCase().endsWith('downloads'))
  }
})
