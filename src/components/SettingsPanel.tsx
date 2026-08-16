import { useState } from 'react'
import type { Anchor, Settings } from '../db/schema'
import { saveSettings } from '../db/storage'
import { describeInterval, shortDate, todayKey } from '../lib/dates'
import { planRevisions } from '../lib/schedule'
import { Close, Plus, Trash } from './Icons'

interface Props {
  settings: Settings
  onClose: () => void
}

const UNITS = { days: 1, weeks: 7, months: 30, years: 365 } as const
type Unit = keyof typeof UNITS

const PRESETS: { name: string; blurb: string; schedule: number[] }[] = [
  { name: 'Standard', blurb: '1 week · 1 month · 2 months · 4 months', schedule: [7, 30, 60, 120] },
  { name: 'Intensive', blurb: '1 day · 3 days · 1 week · 3 weeks · 2 months', schedule: [1, 3, 7, 21, 60] },
  { name: 'Light', blurb: '1 week · 1 month', schedule: [7, 30] },
  { name: 'Exam sprint', blurb: '2 days · 5 days · 10 days · 3 weeks', schedule: [2, 5, 10, 21] },
]

/** Pick the friendliest unit that divides evenly, so 30 shows as "1 month". */
function splitInterval(days: number): { value: number; unit: Unit } {
  if (days % 365 === 0) return { value: days / 365, unit: 'years' }
  if (days % 30 === 0) return { value: days / 30, unit: 'months' }
  if (days % 7 === 0) return { value: days / 7, unit: 'weeks' }
  return { value: days, unit: 'days' }
}

export default function SettingsPanel({ settings, onClose }: Props) {
  const [schedule, setSchedule] = useState<number[]>(settings.schedule)
  const [anchor, setAnchor] = useState<Anchor>(settings.anchor)
  const [skipWeekends, setSkipWeekends] = useState(settings.skipWeekends)
  const [applyToExisting, setApplyToExisting] = useState(true)
  const [saving, setSaving] = useState(false)

  const preview = planRevisions(todayKey(), schedule, anchor, skipWeekends)

  function setInterval(i: number, value: number, unit: Unit) {
    const days = Math.max(1, Math.round(value)) * UNITS[unit]
    setSchedule(schedule.map((d, idx) => (idx === i ? days : d)))
  }

  async function save() {
    setSaving(true)
    await saveSettings({ ...settings, schedule, anchor, skipWeekends }, applyToExisting)
    setSaving(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-bg-deep/70 p-3 backdrop-blur-sm sm:p-8"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Revision pattern"
        className="animate-pop-in flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-float"
      >
        <header className="flex items-center justify-between border-b border-line-soft bg-surface-2/70 px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">Revision pattern</h2>
            <p className="text-xs text-ink-soft">
              How many times each topic comes back, and how far apart.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg border border-line p-2 text-ink-soft hover:bg-surface hover:text-ink"
          >
            <Close className="h-4 w-4" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-5">
          {/* presets */}
          <section className="grid gap-2">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">
              Start from a preset
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {PRESETS.map((p) => {
                const active = p.schedule.join() === schedule.join()
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setSchedule(p.schedule)}
                    className={[
                      'rounded-xl border p-2.5 text-left transition',
                      active
                        ? 'border-accent bg-accent-soft'
                        : 'border-line-soft bg-surface hover:border-accent',
                    ].join(' ')}
                  >
                    <p className="text-sm font-semibold text-ink">{p.name}</p>
                    <p className="text-[11px] text-ink-soft">{p.blurb}</p>
                  </button>
                )
              })}
            </div>
          </section>

          {/* interval editor */}
          <section className="grid gap-2">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">
              Revisions ({schedule.length})
            </h3>
            <div className="grid gap-2">
              {schedule.map((days, i) => {
                const { value, unit } = splitInterval(days)
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-xl border border-line-soft bg-surface-2/50 p-2"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent-ink">
                      {i + 1}
                    </span>
                    <span className="text-sm text-ink-soft">after</span>
                    <input
                      type="number"
                      min={1}
                      value={value}
                      onChange={(e) => setInterval(i, Number(e.target.value), unit)}
                      className="w-20 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink"
                    />
                    <select
                      value={unit}
                      onChange={(e) => setInterval(i, value, e.target.value as Unit)}
                      className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink"
                    >
                      {Object.keys(UNITS).map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                    <span className="ml-auto hidden text-[11px] text-ink-faint sm:inline">
                      = {days} day{days === 1 ? '' : 's'}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove revision ${i + 1}`}
                      onClick={() => setSchedule(schedule.filter((_, idx) => idx !== i))}
                      className="rounded-md border border-line p-1.5 text-ink-faint transition hover:border-danger hover:text-danger"
                    >
                      <Trash className="h-3.5 w-3.5" />
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
              className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2 text-sm font-medium text-ink-soft transition hover:border-accent hover:text-ink"
            >
              <Plus className="h-4 w-4" /> Add another revision
            </button>
          </section>

          {/* anchor + weekends */}
          <section className="grid gap-2">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">
              Count intervals from
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <RadioCard
                checked={anchor === 'studyDate'}
                onChange={() => setAnchor('studyDate')}
                title="The day I studied it"
                blurb="7 · 30 · 60 means day 7, day 30, day 60."
              />
              <RadioCard
                checked={anchor === 'previousRevision'}
                onChange={() => setAnchor('previousRevision')}
                title="The previous revision"
                blurb="7 · 30 · 60 means day 7, day 37, day 97."
              />
            </div>
            <label className="mt-1 flex cursor-pointer items-center gap-2.5 rounded-xl border border-line-soft bg-surface-2/50 p-3">
              <input
                type="checkbox"
                checked={skipWeekends}
                onChange={(e) => setSkipWeekends(e.target.checked)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              <span className="text-sm text-ink">
                Move weekend revisions to Monday
                <span className="block text-[11px] text-ink-soft">
                  Keeps Saturdays and Sundays clear.
                </span>
              </span>
            </label>
          </section>

          {/* preview */}
          <section className="rounded-2xl border border-line-soft bg-accent-soft/40 p-3">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">
              A topic studied today would come back on
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {preview.length === 0 ? (
                <span className="text-xs text-ink-faint">
                  No revisions — add at least one interval above.
                </span>
              ) : (
                preview.map((p) => (
                  <span
                    key={p.index}
                    className="rounded-lg bg-surface px-2 py-1 text-xs font-medium text-ink"
                  >
                    {shortDate(p.dueDate)}
                    <span className="ml-1 text-ink-faint">({describeInterval(p.offsetDays)})</span>
                  </span>
                ))
              )}
            </div>
          </section>
        </div>

        <footer className="grid gap-3 border-t border-line-soft bg-surface-2/70 px-5 py-4">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={applyToExisting}
              onChange={(e) => setApplyToExisting(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
            />
            <span className="text-sm text-ink">
              Apply to topics I've already added
              <span className="block text-[11px] text-ink-soft">
                Only revisions still pending are moved. Anything already ticked off stays put.
              </span>
            </span>
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-ink-soft hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:brightness-110 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save pattern'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
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
        'flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition',
        checked ? 'border-accent bg-accent-soft' : 'border-line-soft bg-surface hover:border-accent',
      ].join(' ')}
    >
      <input
        type="radio"
        name="anchor"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
      />
      <span className="text-sm font-medium text-ink">
        {title}
        <span className="block text-[11px] font-normal text-ink-soft">{blurb}</span>
      </span>
    </label>
  )
}
