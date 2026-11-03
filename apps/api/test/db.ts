// Тестовая база — как у Python (service/tests/conftest.py): TEST_DATABASE_URL, имя обязано кончаться на _test
// (её очищают); база создаётся сама, схема — миграциями с чистого листа на старте прогона (global-setup.ts),
// перед каждым тестом, которому нужна база, таблицы очищаются. Без TEST_DATABASE_URL тесты базы пропускаются.
import pg from 'pg'
import { afterAll, beforeAll, beforeEach, describe } from 'vitest'
import { createDb } from '../src/db'
import type { Db } from '../src/db'

class TestDbError extends Error {}

export const databaseName = (url: string) => decodeURIComponent(new URL(url).pathname.slice(1))

/** Адрес тестовой базы из TEST_DATABASE_URL; не задан — undefined; имя не *_test — отказ. */
export function testDatabaseUrl(): string | undefined {
  const url = process.env.TEST_DATABASE_URL
  if (!url) return undefined
  const name = databaseName(url)
  if (!name.endsWith('_test')) throw new TestDbError(`тестовая база должна называться *_test, а не ${name}: её очищают`)
  return url
}

/** Тот же сервер, другая база. */
export function withDatabase(url: string, name: string) {
  const u = new URL(url)
  u.pathname = `/${name}`
  return u.toString()
}

/** Адрес базы «старого сервиса» для тестов переноса: hoplab_test → hoplab_legacy_test. */
export function legacyTestUrl(url: string) {
  return withDatabase(url, databaseName(url).replace(/_test$/, '_legacy_test'))
}

/** Создать базу, если её нет (через служебную базу postgres того же сервера). */
export async function ensureDatabase(url: string) {
  const name = databaseName(url)
  if (!name.endsWith('_test')) throw new TestDbError(`тестовая база должна называться *_test, а не ${name}`)
  const admin = new pg.Client({ connectionString: withDatabase(url, 'postgres') })
  await admin.connect()
  try {
    const found = await admin.query('select 1 from pg_database where datname = $1', [name])
    if (found.rowCount === 0) await admin.query(`create database "${name}"`)
  } finally {
    await admin.end()
  }
}

/** Удалить служебную базу, созданную тестом (*_test; соединения с ней должны быть закрыты — на всякий случай force). */
export async function dropDatabase(url: string) {
  const name = databaseName(url)
  if (!name.endsWith('_test')) throw new TestDbError(`удаляются только базы *_test, а не ${name}`)
  const admin = new pg.Client({ connectionString: withDatabase(url, 'postgres') })
  await admin.connect()
  try {
    await admin.query(`drop database if exists "${name}" with (force)`)
  } finally {
    await admin.end()
  }
}

/** Пустая схема: всё, что было, удаляется (и журнал миграций drizzle). */
export async function resetSchema(url: string) {
  const client = new pg.Client({ connectionString: url })
  await client.connect()
  try {
    await client.query('drop schema if exists public cascade')
    await client.query('drop schema if exists drizzle cascade')
    await client.query('create schema public')
  } finally {
    await client.end()
  }
}

/** truncate … restart identity cascade по всем таблицам схемы public. */
export async function truncateAll(db: Db) {
  const { rows } = await db.$client.query<{ name: string }>(
    'select quote_ident(tablename) as name from pg_tables where schemaname = \'public\'')
  if (rows.length) await db.$client.query(`truncate ${rows.map(r => r.name).join(', ')} restart identity cascade`)
}

const hasTestDb = testDatabaseUrl() !== undefined

/** describe для тестов базы: без TEST_DATABASE_URL — пропускается (global-setup.ts говорит об этом в журнале). */
export const describeDb = describe.skipIf(!hasTestDb)

/** Подключение к тестовой базе на время describe: таблицы очищаются перед каждым тестом. */
export function useTestDb() {
  const state: { db?: Db } = {}
  function get() {
    if (!state.db) throw new TestDbError('база ещё не подключена')
    return state.db
  }
  beforeAll(() => {
    state.db = createDb(testDatabaseUrl() ?? '')
  })
  beforeEach(async () => {
    await truncateAll(get())
  })
  afterAll(async () => {
    await state.db?.$client.end()
  })
  return get
}
