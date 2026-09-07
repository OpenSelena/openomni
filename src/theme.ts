import React, {createContext, type ReactNode, useContext} from 'react'

export const THEME_MODES = ['auto', 'light', 'dark'] as const
export type ThemeMode = (typeof THEME_MODES)[number]

export type Theme = {
  mode: ThemeMode
  /** Primary Claude terracotta accent. */
  primary?: string
  /** Main foreground text (undefined in auto delegates to terminal ANSI). */
  text?: string
  /** Warm secondary gray for subtitles, borders, and hints. */
  gray?: string
  /** High-contrast text on primary buttons. */
  dark?: string
  /** Surface background. */
  background?: string
  dimSecondary: boolean
  inverseButton: boolean
}

const themes: Record<ThemeMode, Theme> = {
  auto: {
    mode: 'auto',
    primary: '#C15F3C',
    text: undefined,
    gray: undefined,
    dark: '#ffffff',
    background: undefined,
    dimSecondary: true,
    inverseButton: false,
  },
  light: {
    mode: 'light',
    primary: '#C15F3C',
    text: '#1F1E1D',
    gray: '#73726C',
    dark: '#ffffff',
    background: '#FAF9F5',
    dimSecondary: false,
    inverseButton: false,
  },
  dark: {
    mode: 'dark',
    primary: '#C15F3C',
    text: '#FAF9F5',
    gray: '#8C8A85',
    dark: '#ffffff',
    background: '#1F1E1D',
    dimSecondary: false,
    inverseButton: false,
  },
}

const ThemeContext = createContext<Theme>(themes.auto)

export function themeFor(mode: ThemeMode): Theme {
  return themes[mode]
}

export function ThemeProvider({mode, children}: {mode: ThemeMode; children: ReactNode}) {
  return React.createElement(ThemeContext.Provider, {value: themeFor(mode)}, children)
}

export function useTheme(): Theme {
  return useContext(ThemeContext)
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && (THEME_MODES as readonly string[]).includes(value)
}

export function nextThemeMode(mode: ThemeMode): ThemeMode {
  return THEME_MODES[(THEME_MODES.indexOf(mode) + 1) % THEME_MODES.length]!
}
