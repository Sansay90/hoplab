// Перенос данных из старой базы на синтетическом дампе (test/fixtures/legacy.sql — собран кодом старого сервиса,
// service/scripts/legacy_fixture.py): старая база — *_legacy_test из дампа, новая — *_test с миграциями.
import { readFileSync } from 'node:fs'
import { sql } from 'drizzle-orm'
import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { loadConfig } from '../src/config'
import { runImportLegacy, USAGE } from '../src/cli/import-legacy-command'
import { createDb } from '../src/db'
import { connectLegacy, importLegacy, LegacyImportError, verifyOnly } from '../src/db/legacy'
import type { ImportReport } from '../src/db/legacy'
import * as t from '../src/db/schema'
import {
  databaseName, describeDb, ensureDatabase, legacyTestUrl, resetSchema, testDatabaseUrl, truncateAll, useTestDb, withDatabase,
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
  afterAll(async () => {
    await legacy.pool?.end()
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
    expect(report.checks?.length).toBeGreaterThan(30)
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
      expect(Buffer.compare(photo.thumb!, src.thumb as Buffer)).toBe(0)
      expect(photo.contentType).toBe(src.content_type)
      expect(photo.credit).toBe(src.credit)
    }
    expect(photos.some(p => p.credit)).toBe(true)
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

  it('brew_reminders = ключи из reminded с sent_at и silent', async () => {
    await run()
    const expected = (await old('select id, reminded from brews')).flatMap(b => (b.reminded as string[]).map(key => `${String(b.id)}:${key}`))
    expect(expected.length).toBeGreaterThanOrEqual(4)
    const rows = await getDb().select().from(t.brewReminders)
    expect(rows.map(r => `${r.brewId}:${r.key}`).sort()).toEqual([...expected].sort())
    for (const row of rows) {
      expect(row.sentAt).toBeInstanceOf(Date)
      expect(row.silent).toBe(false)
    }
    expect(await fresh('select count(*) as n from brews where id not in (select brew_id from brew_reminders)')).toEqual([{ n: '1' }])
  })

  it('уведомления: data у всех видов; у напоминаний прежнее, у комментариев — заголовок и начало текста', async () => {
    await run()
    const notes = await getDb().select().from(t.notifications)
    const before = await old('select * from notifications')
    expect(notes).toHaveLength(before.length)
    expect(new Set(notes.map(n => n.kind))).toEqual(new Set(['comment', 'reply', 'brew']))
    for (const note of notes) {
      const src = before.find(b => b.id === note.id)!
      expect(note.data).toBeTruthy()
      if (note.kind === 'brew') {
        expect(note.data).toEqual(src.data)
      } else {
        expect(String(note.data.title)).toMatch(note.kind === 'reply'
          ? /^Вам ответили в рецепте «.+»$/
          : /^Новый комментарий к рецепту «.+»$/)
        const [comment] = await old('select text from comments where id = $1', [src.comment_id])
        expect(String(comment?.text).startsWith(String(note.data.text).replace(/…$/, ''))).toBe(true)
      }
    }
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
    const scratch = withDatabase(targetUrl, `${databaseName(targetUrl).replace(/_test$/, '')}_empty_test`)
    await ensureDatabase(scratch)
    await resetSchema(scratch)
    const db = createDb(scratch)
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

  it('dry-run: всё считает и сверяет, но ничего не оставляет; счётчики id не сдвигаются', async () => {
    const report = await run({ dryRun: true })
    expect(report.dryRun).toBe(true)
    expect(report.counts.readings).toBeGreaterThan(200)
    expect(report.checks?.filter(c => !c.ok)).toEqual([])
    for (const table of ['users', 'recipes', 'brews', 'readings', 'events', 'brew_reminders', 'user_avatars']) {
      expect(await countOf(table), table).toBe(0)
    }
    // после настоящего переноса всё на месте — dry-run ему не мешает
    const real = await run()
    expect(real.counts.readings).toBe(report.counts.readings)
    expect(await countOf('readings')).toBe(report.counts.readings)
  })

  it('сверка видит порчу: подменённый байт фото, хэш пароля, лишняя строка', async () => {
    await run()
    await fresh('update recipe_photos set data = set_byte(data, 0, get_byte(data, 0) # 255) where id = (select id from recipe_photos order by id limit 1)')
    await fresh('update users set password_hash = \'x\' where password_hash is not null and id = (select id from users where password_hash is not null order by id limit 1)')
    await fresh('delete from readings where id = (select min(id) from readings)')
    const source = await connectLegacy(legacyUrl)
    try {
      const bad = (await verifyOnly(getDb(), source)).filter(c => !c.ok).map(c => c.name)
      expect(bad).toEqual(expect.arrayContaining(['SHA-256 байтов: фото', 'users: сумма', 'readings: строк', 'readings: сумма']))
    } finally {
      await source.close()
    }
  })

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
      expect(broken.text).toContain('РАСХОЖДЕНИЕ sessions: сумма')
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
