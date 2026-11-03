// Схема базы на настоящем Postgres: миграции, ключи, ограничения, каскады, закрытие пула.
import { eq, sql } from 'drizzle-orm'
import { afterAll, expect, it } from 'vitest'
import { createDb, migrateDb } from '../src/db'
import * as t from '../src/db/schema'
import { databaseName, describeDb, dropDatabase, ensureDatabase, resetSchema, testDatabaseUrl, truncateAll, useTestDb, withDatabase } from './db'
import { makeApp } from './helpers'

const V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describeDb('схема базы', () => {
  const getDb = useTestDb()

  async function user(name: string, extra: Partial<typeof t.users.$inferInsert> = {}) {
    const [row] = await getDb().insert(t.users).values({ name, ...extra }).returning()
    return row!
  }

  /** Текст ошибки Postgres: Drizzle оборачивает её в «Failed query», настоящая — в cause. */
  async function failure(run: () => Promise<unknown>) {
    try {
      await run()
    } catch (e) {
      const cause = (e as { cause?: Error }).cause
      return `${(e as Error).message} ${cause?.message ?? ''}`
    }
    return ''
  }

  // без TEST_DATABASE_URL describe пропускается, но тело всё равно выполняется (сбор тестов) — адрес-заглушка
  const url = testDatabaseUrl() ?? 'postgresql://hoplab@127.0.0.1:1/none_test'
  const scratch = withDatabase(url, `${databaseName(url).replace(/_test$/, '')}_migrate_test`)
  afterAll(() => dropDatabase(scratch))

  it('миграции применяются на пустой базе: все таблицы на месте, повторный запуск ничего не ломает', async () => {
    await ensureDatabase(scratch)
    await resetSchema(scratch)
    const db = createDb(scratch)
    try {
      await migrateDb(db)
      await migrateDb(db)
      const { rows } = await db.$client.query<{ name: string }>(
        'select tablename as name from pg_tables where schemaname = \'public\' order by 1')
      expect(rows.map(r => r.name)).toEqual([
        'agents', 'auth_tokens', 'brew_entries', 'brew_reminders', 'brews', 'comment_votes', 'comments', 'devices',
        'equipment', 'events', 'favorites', 'notifications', 'push_subscriptions', 'readings', 'recipe_photos',
        'recipe_votes', 'recipes', 'sessions', 'user_avatars', 'users',
      ])
    } finally {
      await db.$client.end()
    }
  })

  it('новые записи получают UUID v7, колонки — snake_case', async () => {
    const u = await user('Пивовар')
    expect(u.id).toMatch(V7)
    const { rows } = await getDb().$client.query('select * from users where id = $1', [u.id])
    expect(Object.keys(rows[0])).toContain('password_hash')
    expect(Object.keys(rows[0])).toContain('avatar_version')
  })

  it('ограничения перечислений: роль, вид уведомления, вид записи журнала, исход партии', async () => {
    expect(await failure(() => user('Х', { role: 'root' }))).toContain('users_role_check')
    const u = await user('Автор')
    expect(await failure(() => getDb().insert(t.notifications).values({ userId: u.id, kind: 'spam', data: {} })))
      .toContain('notifications_kind_check')
    const [brew] = await getDb().insert(t.brews).values({ userId: u.id, name: 'Партия', source: 'manual' }).returning()
    expect(await failure(() => getDb().insert(t.brewEntries).values({ brewId: brew!.id, kind: 'бред' })))
      .toContain('brew_entries_kind_check')
    expect(await failure(() => getDb().insert(t.brews).values({ userId: u.id, name: 'Х', status: 'idle' })))
      .toContain('brews_status_check')
  })

  it('основная система одна у пользователя (частичный уникальный индекс), у другого — своя', async () => {
    const [a, b] = [await user('A'), await user('B')]
    const add = (userId: string, name: string, main: boolean) =>
      getDb().insert(t.equipment).values({ userId, name, main })
    await add(a.id, 'Кастрюля', true)
    await add(a.id, 'Котёл', false)
    expect(await failure(() => add(a.id, 'Ещё одна основная', true))).toContain('ix_equipment_one_main')
    await add(b.id, 'Своя основная', true)
  })

  it('журнал напоминаний: ключ в партии один раз; у партии удаляется вместе с ней', async () => {
    const u = await user('A')
    const [brew] = await getDb().insert(t.brews).values({ userId: u.id, name: 'П', source: 'manual' }).returning()
    await getDb().insert(t.brewReminders).values({ brewId: brew!.id, key: 'dry-g1', sentAt: new Date(), silent: false })
    const [row] = await getDb().select().from(t.brewReminders)
    expect(row).toMatchObject({ key: 'dry-g1', silent: false })
    expect(row?.sentAt).toBeInstanceOf(Date)
    // у перенесённых строк «когда» и «молча ли» неизвестны — NULL, значений по умолчанию нет
    await getDb().insert(t.brewReminders).values({ brewId: brew!.id, key: 'dry-g2' })
    const { rows: migrated } = await getDb().$client.query('select sent_at, silent from brew_reminders where key = $1', ['dry-g2'])
    expect(migrated).toEqual([{ sent_at: null, silent: null }])
    expect(await failure(() => getDb().insert(t.brewReminders).values({ brewId: brew!.id, key: 'dry-g1' })))
      .toContain('brew_reminders_pkey')
    await getDb().delete(t.brews).where(eq(t.brews.id, brew!.id))
    expect(await getDb().select().from(t.brewReminders)).toEqual([])
  })

  it('события и показания: id выдаёт база, явный id тоже можно', async () => {
    const u = await user('A')
    const [device] = await getDb().insert(t.devices).values({ userId: u.id, tuyaId: 'x', name: 'Easy Brew' }).returning()
    const [e1] = await getDb().insert(t.events).values({ deviceId: device!.id, kind: 'info', text: 'старт' }).returning()
    const [e2] = await getDb().insert(t.events).values({ id: 100, deviceId: device!.id, kind: 'info', text: 'явный' }).returning()
    const [r1] = await getDb().insert(t.readings).values({ deviceId: device!.id, temp: 20.5 }).returning()
    expect([e1?.id, e2?.id, r1?.id]).toEqual([1, 100, 1])
    expect(r1?.temp).toBeCloseTo(20.5)
  })

  it('каскады: пользователь уносит свои данные; устройство у оборудования и партии обнуляется', async () => {
    const u = await user('A')
    await getDb().insert(t.userAvatars).values({ userId: u.id, data: Buffer.from([1, 2, 3]) })
    await getDb().insert(t.sessions).values({ userId: u.id, tokenHash: 'h', expiresAt: new Date() })
    const [device] = await getDb().insert(t.devices).values({ userId: u.id, tuyaId: 'x', name: 'D' }).returning()
    const [gear] = await getDb().insert(t.equipment).values({ userId: u.id, name: 'E', deviceId: device!.id }).returning()
    const [brew] = await getDb().insert(t.brews).values({ userId: u.id, name: 'П', deviceId: device!.id }).returning()
    await getDb().delete(t.devices).where(eq(t.devices.id, device!.id))
    expect((await getDb().select().from(t.equipment).where(eq(t.equipment.id, gear!.id)))[0]?.deviceId).toBeNull()
    expect((await getDb().select().from(t.brews).where(eq(t.brews.id, brew!.id)))[0])
      .toMatchObject({ deviceId: null, source: 'device' })
    await getDb().delete(t.users).where(eq(t.users.id, u.id))
    for (const table of [t.userAvatars, t.sessions, t.equipment, t.brews]) {
      expect(await getDb().select({ n: sql<number>`count(*)::int` }).from(table)).toEqual([{ n: 0 }])
    }
  })

  it('байты и JSONB возвращаются как записаны', async () => {
    const u = await user('A')
    const bytes = Buffer.from(Array.from({ length: 256 }, (_, i) => i))
    await getDb().insert(t.userAvatars).values({ userId: u.id, data: bytes })
    const [avatar] = await getDb().select().from(t.userAvatars)
    expect(Buffer.compare(avatar!.data, bytes)).toBe(0)
    const doc = { name: 'Пилснер', hops: [{ name: 'Saaz', amount: 20.5 }] }
    const [recipe] = await getDb().insert(t.recipes).values({ userId: u.id, name: 'Пилснер', doc }).returning()
    expect(recipe).toMatchObject({ doc, docVersion: 1, visibility: 'private' })
  })

  it('очистка между тестами сбрасывает и identity', async () => {
    const u = await user('A')
    const [device] = await getDb().insert(t.devices).values({ userId: u.id, tuyaId: 'x', name: 'D' }).returning()
    await getDb().insert(t.events).values({ deviceId: device!.id, kind: 'k', text: 't' })
    await truncateAll(getDb())
    const u2 = await user('A')
    const [d2] = await getDb().insert(t.devices).values({ userId: u2.id, tuyaId: 'x', name: 'D' }).returning()
    const [e] = await getDb().insert(t.events).values({ deviceId: d2!.id, kind: 'k', text: 't' }).returning()
    expect(e?.id).toBe(1)
  })

  it('app.close() закрывает пул базы', async () => {
    const db = createDb(testDatabaseUrl() ?? '')
    const app = await makeApp({}, db)
    await db.$client.query('select 1')
    await app.close()
    expect(db.$client.ended).toBe(true)
  })
})

it('без базы приложение собирается: пул ленивый, закрытие безопасно', async () => {
  const app = await makeApp()
  await app.close()
})
