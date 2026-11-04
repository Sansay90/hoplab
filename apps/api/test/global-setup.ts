// Один раз на прогон: тестовая база создаётся, схема — миграциями с чистого листа.
import { createDb, migrateDb } from '../src/db'
import { ensureDatabase, resetSchema, testDatabaseUrl } from './db'

export default async function setup() {
  const url = testDatabaseUrl()
  if (!url) {
    console.warn('TEST_DATABASE_URL не задан — тесты базы пропущены (нужен Postgres и база *_test, пример — в CLAUDE.md)')
    return
  }
  await ensureDatabase(url)
  await resetSchema(url)
  const db = createDb(url)
  try {
    await migrateDb(db)
  } finally {
    await db.$client.end()
  }
}
