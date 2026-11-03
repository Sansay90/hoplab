// Применение миграций (папка drizzle/, сгенерирована drizzle-kit) — при старте сервиса и в тестах.
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import type { Db } from './client'

/** Папка миграций: из исходников (src/db) — apps/api/drizzle, из бандла (dist/main.mjs, dist/cli/*.mjs) — drizzle/ рядом с dist. */
function migrationsFolder() {
  const candidates = ['../../drizzle', '../drizzle'].map(path => fileURLToPath(new URL(path, import.meta.url)))
  const found = candidates.find(path => existsSync(path))
  if (!found) throw new Error(`не найдена папка миграций: ${candidates.join(', ')}`)
  return found
}

export async function migrateDb(db: Db) {
  await migrate(db, { migrationsFolder: migrationsFolder() })
}
