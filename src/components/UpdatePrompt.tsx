import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/** How often an already-open app should look for a new version. An installed
 *  PWA can stay open for days, and would otherwise only check on a cold start. */
const CHECK_EVERY = 60 * 60 * 1000

/**
 * Deployed code can't take effect in a page that's already running: the new
 * bundle is on disk, but the old one stays in memory until the page reloads.
 *
 * The worker is registered in `autoUpdate` mode deliberately. In `prompt` mode
 * a new worker sits in "waiting" until every tab of the app is closed, so a
 * plain refresh keeps serving the old cached files and looks broken. Here the
 * new worker takes over as soon as it installs — a refresh always gets the new
 * version — and we simply say so rather than reloading underneath her, which
 * would discard whatever she was part-way through typing.
 */
export default function UpdatePrompt() {
  const [ready, setReady] = useState(false)

  useRegisterSW({
    // In autoUpdate mode this is the hook that fires; `onNeedRefresh` never
    // does, and `updateServiceWorker()` is a no-op, so we reload by hand.
    onNeedReload() {
      setReady(true)
    },
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => void registration.update(), CHECK_EVERY)
    },
  })

  if (!ready) return null

  return (
    <div
      role="status"
      className="animate-pop-in paper hand-edge fixed inset-x-3 bottom-4 z-[60] mx-auto flex max-w-md flex-wrap items-center gap-x-3 gap-y-2 border border-line px-4 py-3 shadow-float sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
    >
      <p className="flex-1 text-base text-ink">
        <span className="font-display text-xl">A newer diary is ready.</span>
        <span className="block text-sm text-ink-faint">
          Reload to pick up the latest version.
        </span>
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="btn-ink btn-ink-solid text-base"
      >
        Reload
      </button>
      <button
        type="button"
        onClick={() => setReady(false)}
        className="text-sm text-ink-soft transition hover:text-accent"
      >
        Later
      </button>
    </div>
  )
}
