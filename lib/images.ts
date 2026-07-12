import { dirname, join } from 'path'

// Images live next to the SQLite file so the Docker volume persists both
export function imageDir() {
  const dbPath = (process.env.DATABASE_URL ?? 'file:./db/meal-planner.db').replace('file:', '')
  return join(dirname(dbPath), 'images')
}
