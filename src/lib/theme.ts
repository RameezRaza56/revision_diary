export type Theme = 'light' | 'dark'

const KEY = 'diary-theme'

/** The sign-in page is always dark, so that is also the safe starting point. */
export const SIGNED_OUT_THEME: Theme = 'dark'

/**
 * What to paint before we know anything: the last theme this device settled on
 * while signed in, or dark. Without it, a light-theme user would get a dark
 * flash on every cold launch while her settings load.
 */
export function bootTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'dark' || saved === 'light') return saved
  } catch {
    // private browsing with storage blocked — dark is a fine default
  }
  return SIGNED_OUT_THEME
}

export function rememberTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // not being able to remember it is not worth breaking anything over
  }
}

/** On sign-out, so the next launch lands on the dark sign-in page cleanly. */
export function forgetTheme(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // nothing to do
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}
