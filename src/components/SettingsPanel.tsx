import { useEffect, useState } from 'react'
import type { Anchor } from '../db/schema'
import { useDiary } from '../db/DiaryContext'
import { saveSettings } from '../db/storage'
import { describeInterval, shortDate, todayKey } from '../lib/dates'
import { planRevisions } from '../lib/schedule'
import { Close, Flourish, Plus, Trash } from './Icons'

interface Props {
  onClose: () => void
}

const UNITS = { days: 1, weeks: 7, months: 30, years: 365 } as const
type Unit = keyof typeof UNITS

const PRESETS: { name: string; blurb: string; schedule: number[] }[] = [
  { name: 'Steady', blurb: '1 week · 1 month · 2 months · 4 months', schedule: [7, 30, 60, 120] },
  { name: 'Intensive', blurb: '1 day · 3 days · 1 week · 3 weeks · 2 months', schedule: [1, 3, 7, 21, 60] },
  { name: 'Gentle', blurb: '1 week · 1 month', schedule: [7, 30] },
  { name: 'Exam sprint', blurb: '2 days · 5 days · 10 days · 3 weeks', schedule: [2, 5, 10, 21] },
]

/** Pick the friendliest unit that divides evenly, so 30 shows as "1 month". */
function splitInterval(days: number): { value: number; unit: Unit } {
  if (days % 365 === 0) return { value: days / 365, unit: 'years' }
  if (days % 30 === 0) return { value: days / 30, unit: 'months' }
  if (days % 7 === 0) return { value: days / 7, unit: 'weeks' }
  return { value: days, unit: 'days' }
}

export default function SettingsPanel({ onClose }: Props) {
  const { settings, entries, revisions } = useDiary()
  const [schedule, setSchedule] = useState<number[]>(settings.schedule)
  const [anchor, setAnchor] = useState<Anchor>(settings.anchor)
  const [skipWeekends, setSkipWeekends] = useState(settings.skipWeekends)
  const [applyToExisting, setApplyToExisting] = useState(true)
  const [saving, setSaving] = useState(false)

  // The footer promises Esc closes any page — this one included.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const preview = planRevisions(todayKey(), schedule, anchor, skipWeekends)

  function setInterval(i: number, value: number, unit: Unit) {
    const days = Math.max(1, Math.round(value)) * UNITS[unit]
    setSchedule(schedule.map((d, idx) => (idx === i ? days : d)))
  }

  async function save() {
    setSaving(true)
    await saveSettings(
      { ...settings, schedule, anchor, skipWeekends },
      applyToExisting,
      entries,
      revisions,
    )
    setSaving(false)
    onClose()
  }

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-start justify-center bg-bg-deep/75 p-3 backdrop-blur-sm sm:p-8"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Revision pattern"
        className="paper animate-pop-in flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[4px_22px_22px_4px] border border-line shadow-float"
      >
        <header className="flex items-start justify-between gap-3 border-b border-line-soft px-6 py-4">
          <div>
            <h2 className="font-display text-3xl text-ink">How often things come back</h2>
            <Flourish className="mt-0.5 h-2.5 w-48 text-ink-faint" />
            <p className="mt-1 text-base text-ink-soft">
              Write it once, and let the diary remember when to bring it up again.
            </p>
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

        <div className="ruled grid min-h-0 flex-1 gap-6 overflow-y-auto px-6 py-5">
          {/* presets */}
          <section className="grid gap-2">
            <SectionTitle>Start from a familiar rhythm</SectionTitle>
            <div className="grid gap-2 sm:grid-cols-2">
              {PRESETS.map((p) => {
                const active = p.schedule.join() === schedule.join()
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setSchedule(p.schedule)}
                    className={[
                      'hand-edge border px-3 py-2 text-left transition hover:-rotate-[0.4deg]',
                      active
                        ? 'border-accent bg-accent-soft/60'
                        : 'border-line-soft bg-surface-2/40 hover:border-accent',
                    ].join(' ')}
                  >
                    <p className="font-display text-xl text-ink">{p.name}</p>
                    <p className="text-sm text-ink-soft">{p.blurb}</p>
                  </button>
                )
              })}
            </div>
          </section>

          {/* interval editor */}
          <section className="grid gap-2">
            <SectionTitle>Each topic comes back {schedule.length} times</SectionTitle>
            <div className="grid gap-2">
              {schedule.map((days, i) => {
                const { value, unit } = splitInterval(days)
                return (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-xl text-accent">{i + 1}.</span>
                    <span className="text-base text-ink-soft">after</span>
                    <input
                      type="number"
                      min={1}
                      value={value}
                      onChange={(e) => setInterval(i, Number(e.target.value), unit)}
                      className="ink-field w-16 text-center"
                    />
                    <select
                      value={unit}
                      onChange={(e) => setInterval(i, value, e.target.value as Unit)}
                      className="ink-field w-auto cursor-pointer"
                    >
                      {Object.keys(UNITS).map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                    <span className="hidden text-sm text-ink-faint sm:inline">
                      ({days} day{days === 1 ? '' : 's'})
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove revision ${i + 1}`}
                      onClick={() => setSchedule(schedule.filter((_, idx) => idx !== i))}
                      className="ml-auto grid h-8 w-8 place-items-center rounded-full text-ink-faint transition hover:-rotate-6 hover:text-danger"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() =>
                setSchedule([...schedule, (schedule[schedule.length - 1] ?? 7) * 2 || 7])
              }
              className="btn-ink mt-1 justify-self-start border-dashed text-base"
            >
              <Plus className="h-4 w-4" /> one more time
            </button>
          </section>

          {/* anchor + weekends */}
          <section className="grid gap-2">
            <SectionTitle>Count the gaps from</SectionTitle>
            <div className="grid gap-2 sm:grid-cols-2">
              <RadioCard
                checked={anchor === 'studyDate'}
                onChange={() => setAnchor('studyDate')}
                title="the day I studied it"
                blurb="7 · 30 · 60 means day 7, day 30, day 60."
              />
              <RadioCard
                checked={anchor === 'previousRevision'}
                onChange={() => setAnchor('previousRevision')}
                title="the revision before"
                blurb="7 · 30 · 60 means day 7, day 37, day 97."
              />
            </div>
            <label className="mt-1 flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={skipWeekends}
                onChange={(e) => setSkipWeekends(e.target.checked)}
                className="mt-1.5 h-4 w-4 accent-[var(--accent)]"
              />
              <span className="text-base text-ink">
                Nudge weekend revisions to Monday
                <span className="block text-sm text-ink-soft">
                  Keeps Saturdays and Sundays clear.
                </span>
              </span>
            </label>
          </section>

          {/* preview */}
          <section className="hand-edge border border-accent/30 bg-accent-soft/40 px-4 py-3">
            <p className="font-display text-xl text-ink">
              Something studied today would come back on
            </p>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-base">
              {preview.length === 0 ? (
                <span className="text-ink-faint">
                  nothing yet — add at least one interval above.
                </span>
              ) : (
                preview.map((p) => (
                  <span key={p.index} className="text-ink">
                    {shortDate(p.dueDate)}{' '}
                    <span className="text-sm text-ink-faint">
                      ({describeInterval(p.offsetDays)})
                    </span>
                  </span>
                ))
              )}
            </div>
          </section>
        </div>

        <footer className="grid gap-3 border-t border-line-soft px-6 py-4">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={applyToExisting}
              onChange={(e) => setApplyToExisting(e.target.checked)}
              className="mt-1.5 h-4 w-4 accent-[var(--accent)]"
            />
            <span className="text-base text-ink">
              Redo the dates for topics I've already written
              <span className="block text-sm text-ink-soft">
                Only revisions still waiting are moved — anything already ticked off stays put.
              </span>
            </span>
          </label>
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="text-base text-ink-soft hover:text-ink"
            >
              never mind
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="btn-ink btn-ink-solid text-base"
            >
              {saving ? 'Saving…' : 'Keep this rhythm'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base text-ink-faint">{children}</h3>
}

function RadioCard({
  checked,
  onChange,
  title,
  blurb,
}: {
  checked: boolean
  onChange: () => void
  title: string
  blurb: string
}) {
  return (
    <label
      className={[
        'hand-edge-alt flex cursor-pointer items-start gap-2.5 border px-3 py-2 transition',
        checked ? 'border-accent bg-accent-soft/60' : 'border-line-soft hover:border-accent',
      ].join(' ')}
    >
      <input
        type="radio"
        name="anchor"
        checked={checked}
        onChange={onChange}
        className="mt-1.5 h-4 w-4 accent-[var(--accent)]"
      />
      <span className="text-base text-ink">
        {title}
        <span className="block text-sm text-ink-soft">{blurb}</span>
      </span>
    </label>
  )
}
