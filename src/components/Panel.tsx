import { useEffect } from 'react'
import { Close, Flourish } from './Icons'

export interface PanelTab {
  id: string
  label: string
}

/**
 * The shell both Settings and Profile sit in: a diary page with a row of
 * sections down the side. Adding a new section is one entry in `tabs` and one
 * branch in the body, which is the point — there will be more of them.
 */
export default function Panel({
  label,
  title,
  subtitle,
  tabs,
  active,
  onTab,
  onClose,
  children,
}: {
  label: string
  title: string
  subtitle?: string
  tabs: PanelTab[]
  active: string
  onTab: (id: string) => void
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-start justify-center bg-bg-deep/75 p-3 backdrop-blur-sm sm:p-8"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="paper animate-pop-in flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[4px_22px_22px_4px] border border-line shadow-float"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line-soft px-6 pb-3 pt-4">
          <div className="min-w-0">
            <h2 className="font-display text-3xl text-ink">{title}</h2>
            <Flourish className="mt-0.5 h-2.5 w-40 text-ink-faint" />
            {subtitle && <p className="mt-1 truncate text-sm text-ink-faint">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-soft transition hover:rotate-90 hover:text-danger"
          >
            <Close className="h-5 w-5" />
          </button>
        </header>

        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-line-soft px-4 py-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              aria-current={active === t.id}
              className={[
                'hand-pill shrink-0 whitespace-nowrap border px-3.5 py-1.5 text-base leading-none transition',
                active === t.id
                  ? 'border-accent/60 bg-accent-soft/70 text-accent-ink'
                  : 'border-transparent text-ink-soft hover:text-ink',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

export function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="grid gap-2">
      <div>
        <h3 className="font-display text-xl text-ink">{title}</h3>
        {hint && <p className="text-sm text-ink-faint">{hint}</p>}
      </div>
      {children}
    </section>
  )
}
