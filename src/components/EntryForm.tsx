import { useEffect, useMemo, useRef, useState } from 'react'
import type { Entry, Settings } from '../db/schema'
import { addEntry, updateEntry, type EntryDraft } from '../db/storage'
import { planRevisions } from '../lib/schedule'
import { shortDate } from '../lib/dates'

interface Props {
  dateKey: string
  settings: Settings
  subjects: string[]
  editing: Entry | null
  onDone: () => void
}

const blank = { subject: '', topic: '', notes: '', tags: '' }

export default function EntryForm({ dateKey, settings, subjects, editing, onDone }: Props) {
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const topicRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setForm(
      editing
        ? {
            subject: editing.subject,
            topic: editing.topic,
            notes: editing.notes,
            tags: editing.tags.join(', '),
          }
        : blank,
    )
    setError('')
    topicRef.current?.focus()
  }, [editing, dateKey])

  // Show her exactly when this topic will come back before she commits to it.
  const preview = useMemo(
    () => planRevisions(dateKey, settings.schedule, settings.anchor, settings.skipWeekends),
    [dateKey, settings],
  )

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.topic.trim()) {
      setError('Give the topic a name.')
      return
    }
    setBusy(true)
    try {
      const draft: EntryDraft = {
        studyDate: dateKey,
        subject: form.subject.trim(),
        topic: form.topic.trim(),
        notes: form.notes.trim(),
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      }
      if (editing) await updateEntry(editing.id, draft)
      else await addEntry(draft)
      setForm(blank)
      onDone()
      topicRef.current?.focus()
    } catch {
      setError('Could not save that. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-line-soft bg-surface-2/60 p-3 shadow-card"
    >
      <div className="grid gap-2.5">
        <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <label className="grid gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
              Subject
            </span>
            <input
              list="subject-options"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Physics"
              className="rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-ink placeholder:text-ink-faint"
            />
            <datalist id="subject-options">
              {subjects.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>

          <label className="grid gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
              Topic
            </span>
            <input
              ref={topicRef}
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
              placeholder="Rotational motion — torque"
              className="rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-ink placeholder:text-ink-faint"
            />
          </label>
        </div>

        <label className="grid gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
            Notes
          </span>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            placeholder="Pages 112–128, solved examples 4.1–4.6"
            className="resize-y rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-ink placeholder:text-ink-faint"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
            Tags <span className="font-medium normal-case tracking-normal">(comma separated)</span>
          </span>
          <input
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="mechanics, formulas"
            className="rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-ink placeholder:text-ink-faint"
          />
        </label>

        {!editing && (
          <p className="text-xs leading-relaxed text-ink-soft">
            <span className="font-semibold text-ink">Revisions will land on</span>{' '}
            {preview.length === 0 ? (
              <span className="text-ink-faint">nothing — the schedule is empty.</span>
            ) : (
              preview.map((p, i) => (
                <span key={p.index}>
                  {i > 0 && ' · '}
                  <span className="rounded bg-accent-soft px-1.5 py-0.5 font-medium text-accent-ink">
                    {shortDate(p.dueDate)}
                  </span>
                </span>
              ))
            )}
          </p>
        )}

        {error && <p className="text-xs font-medium text-danger">{error}</p>}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white shadow-card transition hover:brightness-110 disabled:opacity-50"
          >
            {editing ? 'Save changes' : 'Add topic'}
          </button>
          {editing && (
            <button
              type="button"
              onClick={onDone}
              className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink-soft hover:bg-surface-2"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </form>
  )
}
