import { useState } from 'react'
import type { Anchor } from '../db/schema'
import { useDiary } from '../db/DiaryContext'
import { saveAppearance, saveSettings } from '../db/storage'
import { describeInterval, shortDate, todayKey } from '../lib/dates'
import { planRevisions } from '../lib/schedule'
import { FONTS, TEXT_SIZES, fontById } from '../lib/fonts'
import { Check, Plus, Trash } from './Icons'
import Panel, { Section } from './Panel'

type Tab = 'rhythm' | 'appearance'

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

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('rhythm')
  const { settings } = useDiary()

  return (
    <Panel
      label="Settings"
      title="Settings"
      subtitle={`${settings.schedule.length} revisions · ${fontById(settings.font).label}`}
      tabs={[
        { id: 'rhythm', label: 'Rhythm' },
        { id: 'appearance', label: 'Fonts' },
      ]}
      active={tab}
      onTab={(t) => setTab(t as Tab)}
      onClose={onClose}
    >
      {tab === 'rhythm' ? <RhythmTab onClose={onClose} /> : <AppearanceTab />}
    </Panel>
  )
}

/* ------------------------------------------------------------------- rhythm */

function RhythmTab({ onClose }: { onClose: () => void }) {
  const { settings, entries, revisions } = useDiary()
  const [schedule, setSchedule] = useState<number[]>(settings.schedule)
  const [anchor, setAnchor] = useState<Anchor>(settings.anchor)
  const [skipWeekends, setSkipWeekends] = useState(settings.skipWeekends)
  const [applyToExisting, setApplyToExisting] = useState(true)
  const [saving, setSaving] = useState(false)
  // What she is part-way through typing. The schedule itself only ever holds
  // valid numbers, so an emptied box needs somewhere else to live.
  const [draft, setDraft] = useState<{ index: number; text: string } | null>(null)

  const preview = planRevisions(todayKey(), schedule, anchor, skipWeekends)

  function writeDays(i: number, days: number) {
    setSchedule(schedule.map((d, idx) => (idx === i ? days : d)))
  }

  function typeAmount(i: number, text: string, unit: Unit) {
    setDraft({ index: i, text })
    const n = Number(text)
    if (text.trim() !== '' && Number.isFinite(n) && n >= 1) writeDays(i, Math.round(n) * UNITS[unit])
  }

  function setUnit(i: number, value: number, unit: Unit) {
    setDraft(null)
    writeDays(i, Math.max(1, Math.round(value)) * UNITS[unit])
  }

  async function save() {
    setSaving(true)
    await saveSettings({ ...settings, schedule, anchor, skipWeekends }, applyToExisting, entries, revisions)
    setSaving(false)
    onClose()
  }

  return (
    <>
      <Section title="Start from a familiar rhythm">
        <div className="grid gap-2 sm:grid-cols-2">
          {PRESETS.map((p) => {
            const active = p.schedule.join() === schedule.join()
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => {
                  setDraft(null)
                  setSchedule(p.schedule)
                }}
                className={[
                  'hand-edge border px-3 py-2 text-left transition hover:-rotate-[0.4deg]',
                  active ? 'border-accent bg-accent-soft/60' : 'border-line-soft bg-surface-2/40 hover:border-accent',
                ].join(' ')}
              >
                <p className="font-display text-xl text-ink">{p.name}</p>
                <p className="text-sm text-ink-soft">{p.blurb}</p>
              </button>
            )
          })}
        </div>
      </Section>

      <Section title={`Each topic comes back ${schedule.length} times`}>
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
                  value={draft?.index === i ? draft.text : value}
                  onChange={(e) => typeAmount(i, e.target.value, unit)}
                  onBlur={() => setDraft(null)}
                  className="ink-field w-16 text-center"
                />
                <select
                  value={unit}
                  onChange={(e) => setUnit(i, value, e.target.value as Unit)}
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
                  onClick={() => {
                    setDraft(null)
                    setSchedule(schedule.filter((_, idx) => idx !== i))
                  }}
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
          onClick={() => {
            setDraft(null)
            setSchedule([...schedule, (schedule[schedule.length - 1] ?? 7) * 2 || 7])
          }}
          className="btn-ink mt-1 justify-self-start border-dashed text-base"
        >
          <Plus className="h-4 w-4" /> one more time
        </button>
      </Section>

      <Section title="Count the gaps from">
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
            <span className="block text-sm text-ink-soft">Keeps Saturdays and Sundays clear.</span>
          </span>
        </label>
      </Section>

      <Section title="Something studied today would come back on">
        <div className="hand-edge border border-accent/30 bg-accent-soft/40 px-4 py-3">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-base">
            {preview.length === 0 ? (
              <span className="text-ink-faint">nothing yet — add at least one interval above.</span>
            ) : (
              preview.map((p) => (
                <span key={p.index} className="text-ink">
                  {shortDate(p.dueDate)}{' '}
                  <span className="text-sm text-ink-faint">({describeInterval(p.offsetDays)})</span>
                </span>
              ))
            )}
          </div>
        </div>
      </Section>

      <div className="grid gap-3 border-t border-line-soft pt-4">
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
              Only revisions still waiting move — anything ticked off stays put.
            </span>
          </span>
        </label>
        <div className="flex items-center justify-end gap-4">
          <button type="button" onClick={onClose} className="text-base text-ink-soft transition hover:text-accent">
            Never mind
          </button>
          <button type="button" onClick={save} disabled={saving} className="btn-ink btn-ink-solid text-base">
            {saving ? 'Saving…' : 'Keep this rhythm'}
          </button>
        </div>
      </div>
    </>
  )
}

/* --------------------------------------------------------------- appearance */

function AppearanceTab() {
  const { settings } = useDiary()

  return (
    <>
      <Section title="Font" hint="Changes everywhere, on every device. Saved as you pick.">
        <div className="grid gap-2 sm:grid-cols-2">
          {FONTS.map((f) => {
            const active = settings.font === f.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => saveAppearance(settings, { font: f.id })}
                className={[
                  'hand-edge flex items-start gap-2 border px-3 py-2 text-left transition hover:-rotate-[0.3deg]',
                  active ? 'border-accent bg-accent-soft/60' : 'border-line-soft bg-surface-2/40 hover:border-accent',
                ].join(' ')}
              >
                <span className="min-w-0 flex-1">
                  {/* previewed in its own face, which is the only honest way */}
                  <span
                    className="block text-xl text-ink"
                    style={{ fontFamily: f.family, fontSize: `${1.25 * f.scale}rem` }}
                  >
                    {f.label}
                  </span>
                  <span className="mt-0.5 block text-sm text-ink-soft">{f.blurb}</span>
                </span>
                {active && <Check className="mt-1 h-4 w-4 shrink-0 text-accent" />}
              </button>
            )
          })}
        </div>
      </Section>

      <Section title="Text size" hint="Everything scales together, including the calendar.">
        <div className="flex flex-wrap gap-2">
          {TEXT_SIZES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => saveAppearance(settings, { textSize: t.id })}
              className={[
                'hand-pill border px-4 py-1.5 text-base transition',
                settings.textSize === t.id
                  ? 'border-accent bg-accent-soft/60 text-accent-ink'
                  : 'border-line-soft text-ink-soft hover:border-accent',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="How it reads">
        <div className="hand-edge border border-line-soft bg-surface-2/40 px-4 py-3">
          <p className="font-display text-2xl text-ink">Rotational motion — torque</p>
          <p className="mt-1 text-base text-ink-soft">
            Pages 112–128, solved examples 4.1–4.6. Coming back on 25 Aug, 17 Sep, 17 Oct.
          </p>
          <p className="mt-1 text-sm text-ink-faint">revision 1 of 4 · studied 18 Aug 2026</p>
        </div>
      </Section>
    </>
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
        'hand-edge-alt flex cursor-pointer items-start gap-2.5 border px-3 py-2 transition',
        checked ? 'border-accent bg-accent-soft/60' : 'border-line-soft hover:border-accent',
      ].join(' ')}
    >
      <input type="radio" name="anchor" checked={checked} onChange={onChange} className="mt-1.5 h-4 w-4 accent-[var(--accent)]" />
      <span className="text-base text-ink">
        {title}
        <span className="block text-sm text-ink-soft">{blurb}</span>
      </span>
    </label>
  )
}
