import { describe, expect, it } from 'vitest'
import type { Entry, Revision } from '../db/schema'
import {
  allSubjects,
  entriesBetween,
  entriesByIds,
  entriesOn,
  overdueRevisions,
  revisionsBetween,
  revisionsForEntries,
  revisionsOn,
  searchEntries,
} from './select'
import { todayKey, addDaysKey } from './dates'

/* These used to be Dexie index range queries. They are hand-written filters
   now, so the boundaries are worth pinning down. */

const entry = (over: Partial<Entry> & { id: string; studyDate: string }): Entry => ({
  subject: '',
  topic: 'Something',
  notes: '',
  createdAt: 0,
  updatedAt: 0,
  ...over,
})

const revision = (over: Partial<Revision> & { id: string; dueDate: string }): Revision => ({
  entryId: 'e1',
  index: 1,
  offsetDays: 7,
  status: 'pending',
  completedDate: null,
  confidence: null,
  ...over,
})

describe('date ranges', () => {
  const entries = [
    entry({ id: 'a', studyDate: '2026-07-31' }),
    entry({ id: 'b', studyDate: '2026-08-01' }),
    entry({ id: 'c', studyDate: '2026-08-15' }),
    entry({ id: 'd', studyDate: '2026-08-31' }),
    entry({ id: 'e', studyDate: '2026-09-01' }),
  ]

  it('includes both endpoints of the range', () => {
    const ids = entriesBetween(entries, '2026-08-01', '2026-08-31').map((e) => e.id)
    expect(ids).toEqual(['b', 'c', 'd'])
  })

  it('excludes the days either side', () => {
    const ids = entriesBetween(entries, '2026-08-01', '2026-08-31').map((e) => e.id)
    expect(ids).not.toContain('a')
    expect(ids).not.toContain('e')
  })

  it('matches a single day exactly', () => {
    expect(entriesOn(entries, '2026-08-15').map((e) => e.id)).toEqual(['c'])
    expect(entriesOn(entries, '2026-08-16')).toEqual([])
  })

  it('ranges revisions by due date', () => {
    const revisions = [
      revision({ id: 'r1', dueDate: '2026-08-01' }),
      revision({ id: 'r2', dueDate: '2026-08-20' }),
      revision({ id: 'r3', dueDate: '2026-09-02' }),
    ]
    expect(revisionsBetween(revisions, '2026-08-01', '2026-08-31').map((r) => r.id)).toEqual([
      'r1',
      'r2',
    ])
    expect(revisionsOn(revisions, '2026-08-20').map((r) => r.id)).toEqual(['r2'])
  })
})

describe('overdue', () => {
  const today = todayKey()

  it('is strictly before today, and pending only', () => {
    const revisions = [
      revision({ id: 'yesterday', dueDate: addDaysKey(today, -1) }),
      revision({ id: 'today', dueDate: today }),
      revision({ id: 'tomorrow', dueDate: addDaysKey(today, 1) }),
      revision({ id: 'done', dueDate: addDaysKey(today, -5), status: 'done' }),
      revision({ id: 'skipped', dueDate: addDaysKey(today, -5), status: 'skipped' }),
    ]
    expect(overdueRevisions(revisions).map((r) => r.id)).toEqual(['yesterday'])
  })

  it("does not count today's work as late", () => {
    expect(overdueRevisions([revision({ id: 'r', dueDate: today })])).toEqual([])
  })
})

describe('lookups', () => {
  const entries = [
    entry({ id: 'a', studyDate: '2026-08-01', subject: 'Physics', topic: 'Torque' }),
    entry({ id: 'b', studyDate: '2026-08-02', subject: 'Maths', topic: 'Integrals' }),
    entry({ id: 'c', studyDate: '2026-08-03', subject: 'Physics', topic: 'Momentum' }),
  ]

  it('maps only the ids asked for', () => {
    const map = entriesByIds(entries, ['a', 'c', 'missing'])
    expect([...map.keys()].sort()).toEqual(['a', 'c'])
    expect(map.get('a')?.topic).toBe('Torque')
  })

  it('groups revisions per entry, ordered by index', () => {
    const revisions = [
      revision({ id: 'r3', dueDate: '2026-10-01', entryId: 'a', index: 3 }),
      revision({ id: 'r1', dueDate: '2026-08-08', entryId: 'a', index: 1 }),
      revision({ id: 'r2', dueDate: '2026-09-01', entryId: 'a', index: 2 }),
      revision({ id: 'other', dueDate: '2026-08-09', entryId: 'b', index: 1 }),
    ]
    const grouped = revisionsForEntries(revisions, ['a'])
    expect(grouped.get('a')?.map((r) => r.index)).toEqual([1, 2, 3])
    expect(grouped.has('b')).toBe(false)
  })

  it('lists subjects once, sorted, skipping blanks', () => {
    expect(allSubjects([...entries, entry({ id: 'd', studyDate: '2026-08-04' })])).toEqual([
      'Maths',
      'Physics',
    ])
  })
})

describe('search', () => {
  const entries = [
    entry({
      id: 'a',
      studyDate: '2026-08-01',
      subject: 'Physics',
      topic: 'Torque',
      notes: 'Pages 112-128',
    }),
    entry({ id: 'b', studyDate: '2026-08-20', subject: 'Maths', topic: 'Integrals by parts' }),
  ]

  it('finds across topic, subject and notes', () => {
    expect(searchEntries(entries, 'torque').map((e) => e.id)).toEqual(['a'])
    expect(searchEntries(entries, 'maths').map((e) => e.id)).toEqual(['b'])
    expect(searchEntries(entries, '112').map((e) => e.id)).toEqual(['a'])
  })

  it('is case insensitive and matches partial words', () => {
    expect(searchEntries(entries, 'INTEG').map((e) => e.id)).toEqual(['b'])
  })

  it('returns nothing for an empty query rather than everything', () => {
    expect(searchEntries(entries, '')).toEqual([])
    expect(searchEntries(entries, '   ')).toEqual([])
  })

  it('puts the most recent first', () => {
    expect(searchEntries(entries, 'a').map((e) => e.id)).toEqual(['b', 'a'])
  })
})
