const THEME_KEY = 'loadlink_theme'

export type Theme = 'light' | 'dark' | 'system'

// Returns the currently stored color pref and it defaults to system
export function getStoredTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'dark' || stored === 'light' || stored === 'system') {
    return stored
  }

  return 'system'
}

function getSystemIsDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

// Apply theme to the document and save the pref
export function applyTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme)
  if (theme === 'system') {
    document.documentElement.classList.toggle('dark', getSystemIsDark())
  } else {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }
}

// Call on boot to apply the saved theme and also listens to system theme
export function initTheme(): void {
  const theme = getStoredTheme()
  applyTheme(theme)

  // Keep system mode in sync when it changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getStoredTheme() === 'system') {
      document.documentElement.classList.toggle('dark', getSystemIsDark())
    }
  })
}
