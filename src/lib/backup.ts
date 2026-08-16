import { exportBackup, importBackup, type ImportMode } from '../db/storage'
import { todayKey } from './dates'

/** Write the whole database to a JSON file in her Downloads folder. */
export async function downloadBackup(): Promise<void> {
  const backup = await exportBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `revision-backup-${todayKey()}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Prompt for a backup file and load it back in. Resolves to entries restored. */
export function pickAndImportBackup(mode: ImportMode): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      try {
        const text = await file.text()
        const count = await importBackup(JSON.parse(text), mode)
        resolve(count)
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Could not read that file.'))
      }
    }
    input.oncancel = () => resolve(null)
    input.click()
  })
}

export const DAYS_BEFORE_NAG = 14

export function backupIsStale(lastBackupAt: number | null, entryCount: number): boolean {
  if (entryCount === 0) return false
  if (lastBackupAt === null) return entryCount >= 5
  return Date.now() - lastBackupAt > DAYS_BEFORE_NAG * 86_400_000
}
