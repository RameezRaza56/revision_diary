import {
  addDays,
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  differenceInCalendarDays,
} from 'date-fns'

/** Canonical key format used everywhere in storage and lookups. */
export const KEY = 'yyyy-MM-dd'

export const toKey = (d: Date): string => format(d, KEY)
export const fromKey = (k: string): Date => parseISO(k)
export const todayKey = (): string => toKey(new Date())

export const addDaysKey = (key: string, days: number): string =>
  toKey(addDays(fromKey(key), days))

export const daysBetweenKeys = (a: string, b: string): number =>
  differenceInCalendarDays(fromKey(b), fromKey(a))

export const prettyDate = (key: string): string => format(fromKey(key), 'EEE d MMM yyyy')
export const shortDate = (key: string): string => format(fromKey(key), 'd MMM yyyy')

/** The 6-week grid that backs a month view, including the leading/trailing days
 *  from neighbouring months. Weeks start Monday. */
export interface GridDay {
  key: string
  date: Date
  dayOfMonth: number
  inMonth: boolean
}

export function monthGrid(cursor: Date): GridDay[] {
  const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 })
  return eachDayOfInterval({ start, end }).map((date) => ({
    key: toKey(date),
    date,
    dayOfMonth: date.getDate(),
    inMonth: isSameMonth(date, cursor),
  }))
}

export function monthBounds(cursor: Date): { from: string; to: string } {
  const days = monthGrid(cursor)
  return { from: days[0].key, to: days[days.length - 1].key }
}

/** Human phrasing for an interval, e.g. 7 -> "1 week", 60 -> "2 months". */
export function describeInterval(days: number): string {
  if (days % 365 === 0) return plural(days / 365, 'year')
  if (days % 30 === 0) return plural(days / 30, 'month')
  if (days % 7 === 0) return plural(days / 7, 'week')
  return plural(days, 'day')
}

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
