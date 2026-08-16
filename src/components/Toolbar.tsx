import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, Download, Gear, Moon, Search, Sun, Upload } from './Icons'

interface Props {
  cursor: Date
  onShiftMonth: (delta: number) => void
  onToday: () => void
  onOpenSettings: () => void
  onOpenSearch: () => void
  onExport: () => void
  onImport: () => void
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
  onExport,
  onImport,
  theme,
  onToggleTheme,
  scheduleSummary,
}: Props) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <NavButton label="Previous month" onClick={() => onShiftMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </NavButton>
          <NavButton label="Next month" onClick={() => onShiftMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </NavButton>
        </div>
        <div>
          <h1 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            {format(cursor, 'MMMM')}{' '}
            <span className="text-ink-faint">{format(cursor, 'yyyy')}</span>
          </h1>
          <button
            type="button"
            onClick={onOpenSettings}
            className="text-[11px] font-medium text-ink-soft underline decoration-dotted underline-offset-4 transition hover:text-accent"
            title="Change the revision pattern"
          >
            {scheduleSummary}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={onToday}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink shadow-card transition hover:border-accent"
        >
          Today
        </button>
        <NavButton label="Search topics" onClick={onOpenSearch}>
          <Search className="h-4 w-4" />
        </NavButton>
        <NavButton label="Export backup" onClick={onExport}>
          <Download className="h-4 w-4" />
        </NavButton>
        <NavButton label="Import backup" onClick={onImport}>
          <Upload className="h-4 w-4" />
        </NavButton>
        <NavButton
          label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={onToggleTheme}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </NavButton>
        <NavButton label="Revision pattern settings" onClick={onOpenSettings} accent>
          <Gear className="h-4 w-4" />
        </NavButton>
      </div>
    </header>
  )
}

function NavButton({
  label,
  onClick,
  accent,
  children,
}: {
  label: string
  onClick: () => void
  accent?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={[
        'rounded-lg border p-2.5 shadow-card transition',
        accent
          ? 'border-accent bg-accent text-white hover:brightness-110'
          : 'border-line bg-surface text-ink-soft hover:border-accent hover:text-ink',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
