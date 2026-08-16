import { useEffect, useRef, useState } from 'react'
import type { Entry } from '../db/schema'
import { searchEntries } from '../db/storage'
import { subjectColor } from '../lib/colors'
import { shortDate } from '../lib/dates'
import { Close, Search } from './Icons'

interface Props {
  onPick: (dateKey: string) => void
  onClose: () => void
}

export default function SearchOverlay({ onPick, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<Entry[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    let live = true
    const t = setTimeout(() => {
      searchEntries(query).then((r) => live && setHits(r))
    }, 120)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [query])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-bg-deep/70 p-4 pt-[10vh] backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search topics"
        className="animate-pop-in flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-float"
      >
        <div className="flex items-center gap-2 border-b border-line-soft px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-ink-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics, subjects, notes, tags…"
            className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-ink-faint hover:text-ink"
          >
            <Close className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {query && hits.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-ink-faint">No matches.</p>
          )}
          {!query && (
            <p className="px-3 py-8 text-center text-sm text-ink-faint">
              Type to find anything you've logged.
            </p>
          )}
          <ul className="grid gap-1">
            {hits.map((e) => {
              const c = subjectColor(e.subject)
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(e.studyDate)
                      onClose()
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition hover:bg-surface-2"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: c.dot }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{e.topic}</span>
                      <span className="block truncate text-[11px] text-ink-faint">
                        {e.subject || 'No subject'} · {shortDate(e.studyDate)}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
