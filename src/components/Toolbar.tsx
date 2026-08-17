import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, Flourish, Gear, Moon, Search, Sun } from './Icons'

interface Props {
  cursor: Date
  onShiftMonth: (delta: number) => void
  onToday: () => void
  onOpenSettings: () => void
  onOpenSearch: () => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  scheduleSummary: string
}

export default function Toolbar({
  cursor,
  onShiftMonth,
  onToday,
  onOpenSettings,
  onOpenSearch,
  theme,
  onToggleTheme,
  scheduleSummary,
}: Props) {
  return (
    <header className="relative flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <p className="font-display text-xl text-ink-faint">my revision diary</p>

        <div className="flex items-baseline gap-2">
          <PenButton label="Previous month" onClick={() => onShiftMonth(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </PenButton>

          <h1 className="font-display text-4xl leading-none text-ink sm:text-5xl">
            {format(cursor, 'MMMM')}{' '}
            <span className="text-ink-faint">{format(cursor, 'yyyy')}</span>
          </h1>

          <PenButton label="Next month" onClick={() => onShiftMonth(1)}>
            <ChevronRight className="h-5 w-5" />
          </PenButton>
        </div>

        <Flourish className="mt-0.5 h-3 w-56 text-ink-faint sm:w-72" />

        {/* Plain note, not a control — the gear opens the pattern. */}
        <p className="mt-1 text-sm text-ink-soft">{scheduleSummary}</p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={onToday} className="btn-ink text-base">
          Today
        </button>
        <PenButton label="Search everything I've written" onClick={onOpenSearch}>
          <Search className="h-[1.15rem] w-[1.15rem]" />
        </PenButton>
        <PenButton
          label={theme === 'dark' ? 'Read by daylight' : 'Read by lamplight'}
          onClick={onToggleTheme}
        >
          {theme === 'dark' ? (
            <Sun className="h-[1.15rem] w-[1.15rem]" />
          ) : (
            <Moon className="h-[1.15rem] w-[1.15rem]" />
          )}
        </PenButton>
        <PenButton label="Revision pattern" onClick={onOpenSettings}>
          <Gear className="h-[1.15rem] w-[1.15rem]" />
        </PenButton>
      </div>
    </header>
  )
}

/** An icon inked straight onto the page — circled only when you reach for it. */
function PenButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-transparent text-ink-soft transition hover:-rotate-3 hover:border-accent/50 hover:bg-accent-soft/50 hover:text-accent"
    >
      {children}
    </button>
  )
}
