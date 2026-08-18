import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import App from './App'
import { DiaryProvider } from './db/DiaryContext'
import { applyTheme, bootTheme } from './lib/theme'
import './index.css'

// Before the first paint, so a cold launch doesn't flash the wrong theme.
applyTheme(bootTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DiaryProvider>
      <App />
    </DiaryProvider>
    {/* Visitor counts only, and only on Vercel — a no-op in development.
        It records no diary content and sets no cookies. */}
    <Analytics />
  </StrictMode>,
)
