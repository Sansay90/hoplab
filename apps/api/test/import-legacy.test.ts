// Перенос данных из старой базы на синтетическом дампе (test/fixtures/legacy.sql — собран кодом старого сервиса,
// service/scripts/legacy_fixture.py): старая база — *_legacy_test из дампа, новая — *_test с миграциями.
import { readFileSync } from 'node:fs'
import { getTableColumns, getTableName, sql } from 'drizzle-orm'
import { getTableConfig } from 'drizzle-orm/pg-core'
import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { loadConfig } from '../src/config'
import { runImportLegacy, USAGE } from '../src/cli/import-legacy-command'
import { createDb } from '../src/db'
import { connectLegacy, importLegacy, LegacyImportError, LegacyVerifyError, verifyOnly } from '../src/db/legacy'
import type { ImportReport } from '../src/db/legacy'
import { TABLES } from '../src/db/legacy/tables'
import { VerifyConfigError, verifyLegacy } from '../src/db/legacy/verify'
import * as t from '../src/db/schema'
import {
  databaseName, describeDb, dropDatabase, ensureDatabase, legacyTestUrl, resetSchema, testDatabaseUrl, truncateAll, useTestDb,
  withDatabase,
} from './db'

const DUMP = readFileSync(new URL('./fixtures/legacy.sql', import.meta.url), 'utf8')

type Rows = Record<string, unknown>[]

describeDb('перенос данных из старой базы', () => {
  const getDb = useTestDb()
  // без TEST_DATABASE_URL describe пропускается, но тело всё равно выполняется (сбор тестов) — адрес-заглушка
  const targetUrl = testDatabaseUrl() ?? 'postgresql://hoplab@127.0.0.1:1/none_test'
  const legacyUrl = legacyTestUrl(targetUrl)
  const legacy = { pool: undefined as pg.Pool | undefined }

  /** Старая база — чистая копия дампа. */
  async function loadLegacy() {
    await ensureDatabase(legacyUrl)
    await resetSchema(legacyUrl)
    const loader = new pg.Client({ connectionString: legacyUrl })
    await loader.connect()
    try {
      await loader.query(DUMP)   // дамп ставит пустой search_path на сессию — отдельная сессия только для загрузки
    } finally {
      await loader.end()
    }
  }

  // перенос старую базу только читает: дамп грузится один раз (тест, который её портит, грузит заново)
  beforeAll(async () => {
    await loadLegacy()
    legacy.pool = new pg.Pool({ connectionString: legacyUrl, max: 2 })
  })
  const scratchUrl = withDatabase(targetUrl, `${databaseName(targetUrl).replace(/_test$/, '')}_empty_test`)
  afterAll(async () => {
    await legacy.pool?.end()
    await dropDatabase(legacyUrl)
    await dropDatabase(scratchUrl)
  })

  const old = async (query: string, params: unknown[] = []): Promise<Rows> => (await legacy.pool!.query(query, params)).rows
  const fresh = async (query: string): Promise<Rows> => (await getDb().$client.query(query)).rows

  /** Перенос с настоящим источником: подключение закрывается само. */
  async function run(options: { dryRun?: boolean; verify?: boolean } = {}): Promise<ImportReport> {
    const source = await connectLegacy(legacyUrl)
    try {
      return await importLegacy(getDb(), source, options)
    } finally {
      await source.close()
    }
  }

  const countOf = async (table: string) => Number((await fresh(`select count(*) as n from ${table}`))[0]?.n)

  it('перенос со сверкой: счётчики сходятся, расхождений нет', async () => {
    const report = await run({ verify: true })
    expect(report.dryRun).toBe(false)
    expect(report.checks?.map(c => c.name)).toEqual(Object.values(TABLES).map(table => getTableName(table)))   // проверка на таблицу
    expect(report.checks?.filter(c => !c.ok)).toEqual([])
    for (const table of ['users', 'sessions', 'auth_tokens', 'agents', 'devices', 'equipment', 'recipes', 'recipe_photos',
      'favorites', 'recipe_votes', 'comments', 'comment_votes', 'notifications', 'brews', 'brew_entries', 'readings',
      'events', 'push_subscriptions']) {
      const expected = Number((await old(`select count(*) as n from ${table}`))[0]?.n)
      expect(expected, `в дампе нет данных ${table}`).toBeGreaterThan(0)
      expect(await countOf(table), table).toBe(expected)
      expect(report.counts[table], `счётчик ${table}`).toBe(expected)
    }
    // отдельный прогон сверки по готовому результату
    const source = await connectLegacy(legacyUrl)
    try {
      expect((await verifyOnly(getDb(), source)).filter(c => !c.ok)).toEqual([])
    } finally {
      await source.close()
    }
  })

  it('пользователи: хэши пароля и сессий те же, ключи прежние, режим «у себя на ПК» (без почты и пароля) на месте', async () => {
    await run()
    expect(await fresh('select id, email, password_hash, name_key, role, email_verified_at, avatar_version from users order by id'))
      .toEqual(await old('select id, email, password_hash, name_key, role, email_verified_at, avatar_version from users order by id'))
    expect(await fresh('select id, user_id, token_hash, user_agent, expires_at from sessions order by id'))
      .toEqual(await old('select id, user_id, token_hash, user_agent, expires_at from sessions order by id'))
    expect(await fresh('select id, user_id, token_hash from agents order by id'))
      .toEqual(await old('select id, user_id, token_hash from agents order by id'))
    const kinds = await fresh('select email is null as no_email, password_hash is null as no_password from users')
    expect(kinds).toContainEqual({ no_email: true, no_password: true })     // владелец данных до входа
    expect(await fresh('select count(*) filter (where email_verified_at is null) as n from users where email is not null'))
      .toEqual([{ n: '1' }])                                                // пользователь без подтверждённой почты
    expect((await fresh('select distinct role from users order by 1')).map(r => r.role)).toEqual(['admin', 'user'])
  })

  it('время сохраняется с точностью до миллисекунды', async () => {
    await run()
    const q = 'select floor(extract(epoch from started_at) * 1000)::bigint as ms, id from brews order by id'
    const before = await old(q)
    const after = await fresh(q)
    expect(after.map(r => r.id)).toEqual(before.map(r => r.id))
    for (const [i, row] of after.entries()) {
      expect(Math.abs(Number(row.ms) - Number(before[i]?.ms))).toBeLessThanOrEqual(1)
    }
  })

  it('аватар — в user_avatars, байты те же; avatar_version остаётся в users', async () => {
    await run()
    const avatars = await getDb().select().from(t.userAvatars)
    const legacyAvatars = await old('select id, avatar, avatar_version from users where avatar is not null')
    expect(legacyAvatars).toHaveLength(1)
    expect(avatars).toHaveLength(1)
    expect(avatars[0]?.userId).toBe(legacyAvatars[0]?.id)
    expect(Buffer.compare(avatars[0]!.data, legacyAvatars[0]!.avatar as Buffer)).toBe(0)
    const [user] = await getDb().select().from(t.users).where(sql`${t.users.id} = ${legacyAvatars[0]?.id}`)
    expect(user?.avatarVersion).toBe(legacyAvatars[0]?.avatar_version)
    expect(await countOf('users')).toBe(4)
    expect(Object.keys(user ?? {})).not.toContain('avatar')
  })

  it('фото — побайтно (и превью)', async () => {
    await run()
    const photos = await getDb().select().from(t.recipePhotos).orderBy(t.recipePhotos.id)
    const before = await old('select * from recipe_photos order by id')
    expect(photos).toHaveLength(before.length)
    expect(photos.length).toBeGreaterThanOrEqual(4)
    for (const [i, photo] of photos.entries()) {
      const src = before[i]!
      expect(photo.id).toBe(src.id)
      expect(Buffer.compare(photo.data, src.data as Buffer)).toBe(0)
      if (src.thumb === null) expect(photo.thumb).toBeNull()      // фото до миграции photo_thumbs — без превью
      else expect(Buffer.compare(photo.thumb!, src.thumb as Buffer)).toBe(0)
      expect(photo.contentType).toBe(src.content_type)
      expect(photo.credit).toBe(src.credit)
    }
    expect(photos.some(p => p.credit)).toBe(true)
    expect(photos.some(p => p.thumb === null), 'в дампе нет фото без превью').toBe(true)
    expect(photos.some(p => p.thumb !== null)).toBe(true)
  })

  it('рецепты: документ как есть, doc_version = 1, ключи прежние', async () => {
    await run()
    const recipes = await getDb().select().from(t.recipes).orderBy(t.recipes.id)
    const before = await old('select * from recipes order by id')
    expect(recipes).toHaveLength(before.length)
    for (const [i, recipe] of recipes.entries()) {
      expect(recipe.id).toBe(before[i]?.id)
      expect(recipe.doc).toEqual(before[i]?.data)
      expect(recipe.docVersion).toBe(1)
      expect(recipe.visibility).toBe(before[i]?.visibility)
    }
    expect(new Set(recipes.map(r => r.visibility))).toEqual(new Set(['public', 'private']))
    expect(recipes.some(r => (r.doc.water as { additions: unknown[] }).additions?.length > 0)).toBe(true)   // вода, брожение
  })

  it('партии: program = NULL у ручной, программа у партии с пивоварни; batch_recipe и plan на месте', async () => {
    await run()
    const brews = await getDb().select().from(t.brews).orderBy(t.brews.id)
    const before = await old('select * from brews order by id')
    expect(brews).toHaveLength(3)
    for (const [i, brew] of brews.entries()) {
      const src = before[i]!
      expect(brew.id).toBe(src.id)
      expect(brew.batchRecipe).toEqual(src.snapshot)
      expect(brew.plan).toEqual(src.plan)
      expect(brew.source).toBe(src.source)
      expect(brew.program).toEqual(src.source === 'manual' ? null : src.recipe)
      expect(brew.energyWh).toBe(src.energy_wh)
    }
    expect(brews.filter(b => b.program === null)).toHaveLength(2)
    expect(brews.filter(b => b.program !== null)).toHaveLength(1)
  })

  it('brew_reminders = ключи из reminded; sent_at и silent — NULL («перенесено, неизвестно»)', async () => {
    await run()
    const expected = (await old('select id, reminded from brews')).flatMap(b => (b.reminded as string[]).map(key => `${String(b.id)}:${key}`))
    expect(expected.length).toBeGreaterThanOrEqual(4)
    const rows = await getDb().select().from(t.brewReminders)
    expect(rows.map(r => `${r.brewId}:${r.key}`).sort()).toEqual([...expected].sort())
    for (const row of rows) {
      expect(row.sentAt).toBeNull()
      expect(row.silent).toBeNull()
    }
    expect(await fresh('select count(*) as n from brews where id not in (select brew_id from brew_reminders)')).toEqual([{ n: '1' }])
  })

  it('уведомления: data напоминаний как была; где её не было (комментарии, ответы, напоминание с NULL) — {}', async () => {
    await run()
    const notes = await getDb().select().from(t.notifications)
    const before = await old('select * from notifications')
    expect(notes).toHaveLength(before.length)
    expect(new Set(notes.map(n => n.kind))).toEqual(new Set(['comment', 'reply', 'brew']))
    // в дампе есть все случаи: JSON null (комментарии, ответы), SQL NULL (одно напоминание), настоящие данные
    expect(before.some(b => b.kind === 'comment' && b.data === null)).toBe(true)
    expect(await old('select count(*)::int as n from notifications where data is null')).toEqual([{ n: 1 }])
    let withData = 0
    for (const note of notes) {
      const src = before.find(b => b.id === note.id)!
      if (src.data === null) {
        expect(note.data, `${note.kind} ${note.id}`).toEqual({})      // текст не выдумывается
      } else {
        expect(note.data).toEqual(src.data)
        withData++
      }
    }
    expect(withData).toBeGreaterThanOrEqual(3)
    expect(notes.some(n => n.readAt)).toBe(true)
    expect(notes.some(n => !n.readAt)).toBe(true)
  })

  it('идентификаторы показаний и событий сохранены; следующая запись не упирается в занятый id (identity сдвинут)', async () => {
    await run()
    const maxes = async () => ({
      readings: Number((await old('select max(id) as m from readings'))[0]?.m),
      events: Number((await old('select max(id) as m from events'))[0]?.m),
    })
    const { readings, events } = await maxes()
    expect(readings).toBeGreaterThan(200)
    const [device] = await getDb().select().from(t.devices)
    const [reading] = await getDb().insert(t.readings).values({ deviceId: device!.id, temp: 21 }).returning()
    const [event] = await getDb().insert(t.events).values({ deviceId: device!.id, kind: 'info', text: 'после переноса' }).returning()
    expect(reading?.id).toBe(readings + 1)
    expect(event?.id).toBe(events + 1)
  })

  it('перенос в непустую базу — отказ, данные не тронуты', async () => {
    await run()
    const before = await countOf('readings')
    await expect(run()).rejects.toThrow(LegacyImportError)
    await expect(run()).rejects.toThrow(/не пуста/)
    expect(await countOf('readings')).toBe(before)
  })

  it('в базе без миграций — отказ с подсказкой', async () => {
    await ensureDatabase(scratchUrl)
    await resetSchema(scratchUrl)
    const db = createDb(scratchUrl)
    const source = await connectLegacy(legacyUrl)
    try {
      await expect(importLegacy(db, source)).rejects.toThrow(/примените миграции/)
    } finally {
      await source.close()
      await db.$client.end()
    }
  })

  it('битый документ рецепта — отказ со списком id и ошибок, ничего не записано', async () => {
    const [recipe] = await old('select id from recipes order by id limit 1')
    await old('update recipes set data = $1::jsonb where id = $2', [JSON.stringify({ name: 5, batch: { volume: 'много' } }), recipe?.id])
    await old(`update recipes set data = '{"fermentation": [{"temp": 18, "until": "gravity"}]}'::jsonb where id = (select id from recipes order by id desc limit 1)`)
    const error = await run().then(() => new Error('перенос не отказал'), (e: unknown) => e as Error)
    await loadLegacy()                                 // вернуть старую базу в исходное состояние для следующих тестов
    expect(error).toBeInstanceOf(LegacyImportError)
    expect(error.message).toContain(String(recipe?.id))
    expect(error.message).toMatch(/name: /)
    expect(error.message).toMatch(/batch\.volume: /)
    expect(error.message).toMatch(/2 рецепт\(ов\)/)
    expect(await countOf('users')).toBe(0)
  })

  /** Последние выданные значения счётчиков identity: null — счётчик не трогали. */
  const sequences = async () => (await fresh(
    `select sequencename as name, last_value from pg_sequences where sequencename in ('events_id_seq', 'readings_id_seq') order by 1`))

  it('dry-run: всё считает и сверяет, но ничего не оставляет и счётчики id не трогает', async () => {
    const report = await run({ dryRun: true })
    expect(report.dryRun).toBe(true)
    expect(report.counts.readings).toBeGreaterThan(200)
    expect(report.checks?.filter(c => !c.ok)).toEqual([])
    for (const table of ['users', 'recipes', 'brews', 'readings', 'events', 'brew_reminders', 'user_avatars']) {
      expect(await countOf(table), table).toBe(0)
    }
    expect(await sequences()).toEqual([{ name: 'events_id_seq', last_value: null }, { name: 'readings_id_seq', last_value: null }])
    // после настоящего переноса всё на месте — dry-run ему не мешает
    const real = await run()
    expect(real.counts.readings).toBe(report.counts.readings)
    expect(await countOf('readings')).toBe(report.counts.readings)
  })

  it('отказ сверки: приёмник пуст, счётчики id не сдвинуты — следующий id в readings и events равен 1', async () => {
    // триггер портит каждое показание при вставке — сверка обязана отказать
    await fresh(`create function hoplab_skew() returns trigger language plpgsql as $$ begin new.temp := new.temp + 1; return new; end $$`)
    await fresh('create trigger hoplab_skew before insert on readings for each row execute function hoplab_skew()')
    let error: unknown
    try {
      await run({ verify: true }).catch((e: unknown) => { error = e })
    } finally {
      await fresh('drop trigger hoplab_skew on readings')
      await fresh('drop function hoplab_skew()')
    }
    expect(error).toBeInstanceOf(LegacyVerifyError)
    expect((error as LegacyVerifyError).checks.filter(c => !c.ok).map(c => c.name)).toEqual(['readings'])
    for (const table of ['users', 'readings', 'events', 'brews']) expect(await countOf(table), table).toBe(0)
    expect(await sequences()).toEqual([{ name: 'events_id_seq', last_value: null }, { name: 'readings_id_seq', last_value: null }])
    const [user] = await getDb().insert(t.users).values({ name: 'после отказа' }).returning()
    const [device] = await getDb().insert(t.devices).values({ userId: user!.id, tuyaId: 'x', name: 'y' }).returning()
    const [reading] = await getDb().insert(t.readings).values({ deviceId: device!.id, temp: 21 }).returning()
    const [event] = await getDb().insert(t.events).values({ deviceId: device!.id, kind: 'info', text: 'z' }).returning()
    expect([reading?.id, event?.id]).toEqual([1, 1])
  })

  it('пустые таблицы (нет избранного и push-подписок): перенос проходит, счётчики 0, сверка зелёная', async () => {
    await old('delete from favorites')
    await old('delete from push_subscriptions')
    try {
      const report = await run({ verify: true })
      expect(report.counts.favorites).toBe(0)
      expect(report.counts.push_subscriptions).toBe(0)
      expect(report.checks?.filter(c => !c.ok)).toEqual([])
      expect(report.checks?.find(c => c.name === 'favorites')).toMatchObject({ legacy: '0', target: '0' })
      expect(await countOf('favorites')).toBe(0)
      expect(await countOf('users')).toBeGreaterThan(0)
    } finally {
      await loadLegacy()
    }
  })

  it('большая база: >10 000 записей журнала и >2 500 показаний — страницы и порции, лимит параметров не мешает', async () => {
    await old(`insert into brew_entries (id, brew_id, at, kind, value, text, created_at)
      select gen_random_uuid(), (select id from brews order by id limit 1), now() - n * interval '1 minute', 'gravity',
             1.05 - n / 100000.0, 'замер ' || n, now()
      from generate_series(1, 12000) as n`)
    await old(`insert into readings (id, device_id, brew_id, at, temp, target, step, status)
      select 100000 + n, (select id from devices order by id limit 1), null, now() - n * interval '1 second', 20 + n / 100.0, null, null, null
      from generate_series(1, 2500) as n`)
    try {
      const expected = {
        brew_entries: Number((await old('select count(*) as n from brew_entries'))[0]?.n),
        readings: Number((await old('select count(*) as n from readings'))[0]?.n),
      }
      expect(expected.brew_entries).toBeGreaterThan(12000)
      const report = await run({ verify: true })
      expect(report.checks?.filter(c => !c.ok)).toEqual([])
      expect(report.counts.brew_entries).toBe(expected.brew_entries)
      expect(await countOf('brew_entries')).toBe(expected.brew_entries)
      expect(await countOf('readings')).toBe(expected.readings)
      // сверка отдельным прогоном; порча в хвосте большой таблицы (за первой страницей) видна
      await fresh('delete from readings where id = 100000 + 2500')
      const source = await connectLegacy(legacyUrl)
      try {
        const bad = (await verifyOnly(getDb(), source)).filter(c => !c.ok)
        expect(bad.map(c => c.name)).toEqual(['readings'])
        expect(bad[0]?.mismatches).toEqual([expect.objectContaining({ key: '102500', column: '(строка)' })])
      } finally {
        await source.close()
      }
    } finally {
      await loadLegacy()
    }
  })

  it('сверка видит порчу: байт фото, хэш пароля, лишняя строка — в отчёте таблица, ключ и колонка', async () => {
    await run()
    await fresh('update recipe_photos set data = set_byte(data, 0, get_byte(data, 0) # 255) where id = (select id from recipe_photos order by id limit 1)')
    await fresh('update users set password_hash = \'x\' where password_hash is not null and id = (select id from users where password_hash is not null order by id limit 1)')
    await fresh('delete from readings where id = (select min(id) from readings)')
    const source = await connectLegacy(legacyUrl)
    try {
      const bad = (await verifyOnly(getDb(), source)).filter(c => !c.ok)
      expect(bad.map(c => c.name)).toEqual(['users', 'recipe_photos', 'readings'])
      expect(bad.flatMap(c => c.mismatches).map(m => [m.table, m.column])).toEqual(
        [['users', 'password_hash'], ['recipe_photos', 'data'], ['readings', '(строка)']])
      expect(bad.every(m => m.mismatches[0]?.key.length)).toBe(true)
    } finally {
      await source.close()
    }
  })

  it('отчёт сверки: примеров не больше заданного числа, счётчик считает все расхождения', async () => {
    await run()
    await fresh('update brew_entries set text = coalesce(text, \'\') || \'x\'')
    const source = await connectLegacy(legacyUrl)
    try {
      const [check] = await verifyOnly(getDb(), source, { tables: ['brew_entries'], examples: 2 })
      expect(check?.mismatchCount).toBeGreaterThan(2)
      expect(check?.mismatches).toHaveLength(2)
    } finally {
      await source.close()
    }
  })

  it('колонка новой таблицы без пары в старой базе и без записи в карте — ошибка механизма, а не тишина', async () => {
    const source = await connectLegacy(legacyUrl)
    try {
      const blind = { ...source, columns: async (relation: string) => (await source.columns(relation)).filter(c => c !== 'thumb') }
      const refusal = verifyLegacy(getDb(), blind, { tables: ['recipe_photos'] })
      await expect(refusal).rejects.toBeInstanceOf(VerifyConfigError)
      await expect(refusal).rejects.toThrow(/recipe_photos\.thumb: нет пары в старой базе/)
    } finally {
      await source.close()
    }
  })

  it('каждая колонка новой схемы сверяется: порча одного значения красит сверку именно на ней', async () => {
    await run()
    class Rollback extends Error {}
    // значения, допустимые ограничениями check (text-колонки с перечислениями портятся только ими)
    const OVERRIDES: Record<string, string> = {
      'users.role': `case when role = 'admin' then 'user' else 'admin' end`,
      'auth_tokens.kind': `case when kind = 'verify' then 'reset' else 'verify' end`,
      'recipes.visibility': `case when visibility = 'public' then 'private' else 'public' end`,
      'recipe_photos.content_type': `case when content_type = 'image/png' then 'image/jpeg' else 'image/png' end`,
      'recipe_votes.value': '-value',
      'comment_votes.value': '-value',
      'brews.source': `case when source = 'manual' then 'device' else 'manual' end`,
      'brews.status': `case when status = 'running' then 'finished' else 'running' end`,
      'brew_entries.kind': `case when kind = 'note' then 'og' else 'note' end`,
      'notifications.kind': `case when kind = 'comment' then 'reply' else 'comment' end`,
    }
    /** Другое значение колонки того же типа: SQL-выражение над t.колонка (null становится значением). */
    function corruption(type: string, column: string) {
      const v = `t.${column}`
      if (type === 'uuid') return 'gen_random_uuid()'          // и ключ, и внешний ключ (на несуществующую строку)
      if (type === 'bigint') return `${v} + 1000000000`
      if (type === 'text') return `coalesce(${v}, '') || 'x'`
      if (type === 'boolean') return `not coalesce(${v}, false)`
      if (type === 'jsonb') return `coalesce(${v}, '{}'::jsonb) || '{"__x": 1}'::jsonb`
      if (type === 'bytea') return `case when ${v} is null then '\\x00'::bytea else ${v} || '\\x00'::bytea end`
      if (type.startsWith('timestamp')) return `coalesce(${v}, now()) + interval '1 millisecond'`
      return `coalesce(${v}, 0) + 1`
    }
    // строка для порчи: частичный уникальный индекс «одна основная система» позволяет только снять main
    const ROWS: Record<string, string> = { 'equipment.main': 'main' }
    const quote = (name: string) => `"${name}"`
    const tested: string[] = []
    const skipped: string[] = []
    const source = await connectLegacy(legacyUrl)
    try {
      for (const table of Object.values(TABLES)) {
        const name = getTableName(table)
        const config = getTableConfig(table)
        const columns = Object.values(getTableColumns(table))
        const keys = (config.primaryKeys[0]?.columns ?? columns.filter(c => c.primary)).map(c => c.name)
        for (const column of columns) {
          const n = column.name
          const id = `${name}.${n}`
          const type = column.getSQLType()
          const value = OVERRIDES[id] ?? corruption(type, quote(n))
          // строка, где значение есть (если такая есть): порча null → значение тоже проверяет колонку, но слабее
          const row = ROWS[id] ? `where ${ROWS[id]}` : `where ${quote(n)} is not null`
          const target = `(select ctid from ${quote(name)} ${row} order by ${keys.map(quote).join(', ')} limit 1)`
          const fallback = `(select ctid from ${quote(name)} order by ${keys.map(quote).join(', ')} limit 1)`
          const update = `update ${quote(name)} as t set ${quote(n)} = ${value} where t.ctid = coalesce(${target}, ${fallback})`
          let check: Awaited<ReturnType<typeof verifyLegacy>>[number] | undefined
          let failure: string | undefined
          try {
            await getDb().transaction(async (tx) => {
              // портятся и ключи, и внешние ключи: проверки внешних ключей выключаются (нужны права суперпользователя —
              // у тестовой базы они есть)
              await tx.execute(sql.raw('set local session_replication_role = replica'))
              try {
                const updated = (await tx.execute(sql.raw(update)) as unknown as { rowCount: number }).rowCount
                if (updated !== 1) throw new Error(`обновлено строк: ${String(updated)}`)
              } catch (e) {
                failure = ((e as { cause?: Error }).cause ?? (e as Error)).message
                throw new Rollback()
              }
              check = (await verifyLegacy(tx, source, { tables: [name], examples: 50 }))[0]
              throw new Rollback()      // порча откатывается: следующая колонка портится на чистой базе
            })
          } catch (e) {
            if (!(e instanceof Rollback)) throw e
          }
          if (failure !== undefined) {
            skipped.push(`${id}: ${failure}`)
            continue
          }
          tested.push(id)
          expect(check?.ok, `${id}: сверка не заметила порчу`).toBe(false)
          // ключ при порче превращается в «строки нет в одной из баз», остальные колонки — в расхождение значения
          const expected = keys.includes(n) ? '(строка)' : n
          expect(check?.mismatches.map(m => m.column), id).toContain(expected)
        }
      }
    } finally {
      await source.close()
    }
    const total = Object.values(TABLES).reduce((sum, table) => sum + Object.keys(getTableColumns(table)).length, 0)
    console.info(`сверка: колонок в схеме ${total}, испорчено и поймано ${tested.length}, не удалось испортить ${skipped.length}`)
    // колонки, которые испортить нельзя (допустимого другого значения нет); пусто — испортились все
    expect(skipped).toEqual([])
    expect(tested.length).toBe(total)
  }, 120_000)

  describe('команда import-legacy', () => {
    const config = (env: Record<string, string> = {}) => loadConfig({ DATABASE_URL: targetUrl, LEGACY_DATABASE_URL: legacyUrl, ...env })
    const exec = async (args: string[], env?: Record<string, string>) => {
      const lines: string[] = []
      const code = await runImportLegacy(args, config(env), line => lines.push(line))
      return { code, text: lines.join('\n') }
    }

    it('--dry-run печатает счётчики и итог сверки, код 0, база пуста', async () => {
      const { code, text } = await exec(['--dry-run'])
      expect(code).toBe(0)
      expect(text).toContain('dry-run')
      expect(text).toMatch(/readings\s+241/)
      expect(text).toContain('расхождений нет')
      expect(await countOf('users')).toBe(0)
    })

    it('перенос с --verify, затем --verify-only; порча — код 1 и расхождение в выводе', async () => {
      expect((await exec(['--verify'])).code).toBe(0)
      expect(await exec(['--verify-only'])).toMatchObject({ code: 0 })
      await fresh('update sessions set token_hash = token_hash || \'0\' where id = (select id from sessions order by id limit 1)')
      const broken = await exec(['--verify-only'])
      expect(broken.code).toBe(1)
      expect(broken.text).toContain('РАСХОЖДЕНИЕ sessions: строк в старой')
      expect(broken.text).toMatch(/sessions \[[0-9a-f-]{36}\] token_hash: старая [0-9a-f]+, новая [0-9a-f]+0$/m)
    })

    it('миграции применяет сам: в пустой базе без схемы перенос проходит, повтор — отказ «не пуста»', async () => {
      await ensureDatabase(scratchUrl)
      await resetSchema(scratchUrl)
      const env = { DATABASE_URL: scratchUrl }
      const first = await exec(['--verify'], env)
      expect(first.code).toBe(0)
      expect(first.text).toContain('расхождений нет')
      await expect(exec(['--verify'], env)).rejects.toThrow(/не пуста/)     // миграции повторно — идемпотентно
      const db = createDb(scratchUrl)
      try {
        expect((await db.$client.query('select count(*)::int as n from readings')).rows).toEqual([{ n: 241 }])
      } finally {
        await db.$client.end()
      }
    })

    it('подсказка, несовместимые флаги, одинаковые адреса, нет адреса старой базы', async () => {
      expect((await exec(['--help'])).text).toBe(USAGE)
      expect((await exec(['--verify-only', '--dry-run'])).code).toBe(1)
      await expect(exec([], { LEGACY_DATABASE_URL: targetUrl })).rejects.toThrow(/совпадают/)
      await expect(runImportLegacy([], loadConfig({ DATABASE_URL: targetUrl }), () => undefined)).rejects.toThrow(/LEGACY_DATABASE_URL/)
    })

    it('в непустую базу — ошибка (точка входа превращает её в сообщение и код 1)', async () => {
      await exec([])
      await expect(exec([])).rejects.toThrow(LegacyImportError)
      await truncateAll(getDb())
    })
  })
})
