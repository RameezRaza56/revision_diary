import { useRegisterSW } from 'virtual:pwa-register/react'

/** How often an already-open app should look for a new version. An installed
 *  PWA can stay open for days, and would otherwise only check on a cold start. */
const CHECK_EVERY = 60 * 60 * 1000

/**
 * A deployed update can't take effect in a page that's already running — the
 * new code is downloaded and waiting, but the old bundle stays in memory until
 * the page reloads. Rather than leaving her on a stale version until she
 * happens to close the window, we say so and offer the reload.
 *
 * It asks instead of reloading by itself because she could be mid-sentence in
 * a topic, and a surprise reload would throw away what she was typing.
 */
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => void registration.update(), CHECK_EVERY)
    },
  })

  if (!needRefresh) return null

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
        onClick={() => updateServiceWorker(true)}
        className="btn-ink btn-ink-solid text-base"
      >
        Reload
      </button>
      <button
        type="button"
        onClick={() => setNeedRefresh(false)}
        className="text-sm text-ink-soft transition hover:text-accent"
      >
        Later
      </button>
    </div>
  )
}
