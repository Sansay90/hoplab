// Перенос данных из старой базы (Python-сервис) в новую схему: читаем старую сырым SQL (source.ts), пишем через Drizzle
// в одной транзакции приёмника. Приёмник — с применёнными миграциями и пустой; иначе отказ. Что изменилось по
// плану (раздел 4 node-migration.md): аватар уходит в user_avatars; recipes.data → doc (как есть, без нормализации,
// каждый документ проверяется recipeSchema); brews.recipe → program ({} → null), snapshot → batch_recipe;
// brews.reminded → brew_reminders; у уведомлений о комментариях data заполняется как у push.
import { recipeSchema } from '@hoplab/core'
import { getTableName, sql } from 'drizzle-orm'
import type { Db, Tx } from '../client'
import * as t from '../schema'
import { connectLegacy } from './source'
import type { LegacySource, Row } from './source'
import { rowsOf, verifyLegacy } from './verify'
import type { CheckResult, Target } from './verify'

export { connectLegacy }
export type { CheckResult, LegacySource }

export class LegacyImportError extends Error {}

export class LegacyVerifyError extends LegacyImportError {
  constructor(readonly checks: CheckResult[]) {
    super(`сверка не сошлась, перенос откатан: ${checks.filter(c => !c.ok).map(c => c.name).join('; ')}`)
  }
}

class DryRun extends Error {
  constructor(readonly report: ImportReport) {
    super('dry-run')
  }
}

export interface ImportOptions {
  /** Всё сделать и проверить, но транзакцию откатить. */
  dryRun?: boolean
  /** Сверить старую и новую базу до commit: расхождение — откат и ошибка. */
  verify?: boolean
}

export interface ImportReport {
  /** Сколько строк записано в каждую таблицу новой базы. */
  counts: Record<string, number>
  /** Результаты сверки — если она была (dry-run сверяет всегда). */
  checks?: CheckResult[]
  dryRun: boolean
}

const PAGE = 2000
const PHOTO_PAGE = 20
const EXCERPT = 140

/** Таблицы приёмника, которые заполняет перенос, — в порядке записи (родители раньше детей). */
const TABLES = {
  users: t.users, userAvatars: t.userAvatars, sessions: t.sessions, authTokens: t.authTokens, agents: t.agents,
  devices: t.devices, equipment: t.equipment, recipes: t.recipes, recipePhotos: t.recipePhotos,
  favorites: t.favorites, recipeVotes: t.recipeVotes, comments: t.comments, commentVotes: t.commentVotes,
  brews: t.brews, brewEntries: t.brewEntries, brewReminders: t.brewReminders, readings: t.readings, events: t.events,
  notifications: t.notifications, pushSubscriptions: t.pushSubscriptions,
}

const camel = (key: string) => key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())

/** Строка старой базы → объект для вставки: snake_case → camelCase, лишние колонки (drop) убраны, rename — переименованы.
 *  Колонки одноимённы в обеих схемах — форму проверяют ограничения новой базы и тест переноса. */
function mapRow<T>(row: Row, rename: Record<string, string> = {}, drop: string[] = []): T {
  const entries = Object.entries(row).filter(([key]) => !drop.includes(key))
    .map(([key, value]) => [rename[key] ?? camel(key), value])
  return Object.fromEntries(entries) as T
}

/** Начало комментария для уведомления — как excerpt() старого сервиса: пробелы схлопнуты, обрезка с «…». */
function excerpt(text: string, limit = EXCERPT) {
  const flat = text.split(/\s+/).filter(Boolean).join(' ')
  return flat.length <= limit ? flat : `${flat.slice(0, limit - 1).trimEnd()}…`
}

/** data уведомления: у напоминаний — как было; у комментариев и ответов раньше не было, заполняем заголовком и
 *  началом текста — теми же словами, что получил push (title, text). */
function notificationData(row: Row): Record<string, unknown> {
  if (row.kind === 'brew') {
    const data = row.data as { title?: string; text?: string } | null
    return { ...data, title: data?.title ?? 'Напоминание о брожении', text: data?.text ?? '' }
  }
  const name = (row.recipe_name as string | null) || 'Без названия'
  const title = row.kind === 'reply' ? `Вам ответили в рецепте «${name}»` : `Новый комментарий к рецепту «${name}»`
  return { title, text: excerpt(String(row.comment_text ?? '')) }
}

/** Приёмник готов: все таблицы на месте (миграции применены) и пусты. */
async function assertTargetReady(tx: Tx) {
  const names = Object.values(TABLES).map(table => getTableName(table))
  for (const name of names) {
    const [found] = await rowsOf(tx, sql`select to_regclass(${`public.${name}`}) as found`)
    if (found?.found == null) {
      throw new LegacyImportError(`в новой базе нет таблицы ${name}: сначала примените миграции (их применяет запуск сервиса)`)
    }
  }
  const filled: string[] = []
  for (const name of names) {
    const [row] = await rowsOf(tx, sql`select count(*)::int as n from ${sql.identifier(name)}`)
    if (Number(row?.n) > 0) filled.push(`${name}: ${String(row?.n)}`)
  }
  if (filled.length) {
    throw new LegacyImportError(`новая база не пуста (${filled.join(', ')}): перенос идёт только в пустую`)
  }
}

/** Каждый документ рецепта должен проходить схему core — иначе отказ со списком id и ошибок. */
async function assertRecipesValid(source: LegacySource) {
  const bad: string[] = []
  for (const row of await source.query('select id, name, data from recipes order by id')) {
    const parsed = recipeSchema.safeParse(row.data)
    if (!parsed.success) {
      const issues = parsed.error.issues.map(issue => `${issue.path.join('.') || '(документ)'}: ${issue.message}`)
      bad.push(`  ${String(row.id)} «${String(row.name)}»: ${issues.join('; ')}`)
    }
  }
  if (bad.length) {
    throw new LegacyImportError(`${bad.length} рецепт(ов) не проходят схему рецепта:\n${bad.join('\n')}`)
  }
}

async function copyAll(tx: Tx, source: LegacySource): Promise<Record<string, number>> {
  const counts = Object.fromEntries(Object.values(TABLES).map(table => [getTableName(table), 0]))
  const add = (table: keyof typeof TABLES, n: number) => {
    counts[getTableName(TABLES[table])] = (counts[getTableName(TABLES[table])] ?? 0) + n
  }
  /** Скопировать страницы строк: write вставляет порцию и возвращает, сколько строк записано. */
  async function copy(table: keyof typeof TABLES, pages: AsyncIterable<Row[]> | Row[][], write: (rows: Row[]) => Promise<void>) {
    for await (const rows of pages) {
      await write(rows)
      add(table, rows.length)
    }
  }
  /** Таблица целиком одной порцией — для небольших. */
  const whole = async (table: string, order = 'id') => [await source.query(`select * from ${table} order by ${order}`)]

  await copy('users', await whole('users', 'created_at, id'), async (rows) => {
    await tx.insert(t.users).values(rows.map(r => mapRow<typeof t.users.$inferInsert>(r, {}, ['avatar'])))
    const avatars = rows.filter(r => r.avatar != null)
      .map(r => ({ userId: r.id as string, data: r.avatar as Buffer }))
    if (avatars.length) await tx.insert(t.userAvatars).values(avatars)
    add('userAvatars', avatars.length)
  })
  await copy('sessions', await whole('sessions'), async (rows) => {
    await tx.insert(t.sessions).values(rows.map(r => mapRow<typeof t.sessions.$inferInsert>(r)))
  })
  await copy('authTokens', await whole('auth_tokens'), async (rows) => {
    await tx.insert(t.authTokens).values(rows.map(r => mapRow<typeof t.authTokens.$inferInsert>(r)))
  })
  await copy('agents', await whole('agents'), async (rows) => {
    await tx.insert(t.agents).values(rows.map(r => mapRow<typeof t.agents.$inferInsert>(r)))
  })
  await copy('devices', await whole('devices'), async (rows) => {
    await tx.insert(t.devices).values(rows.map(r => mapRow<typeof t.devices.$inferInsert>(r)))
  })
  await copy('equipment', await whole('equipment'), async (rows) => {
    await tx.insert(t.equipment).values(rows.map(r => mapRow<typeof t.equipment.$inferInsert>(r)))
  })
  // документ рецепта — как есть; номер формата у перенесённых — 1
  await copy('recipes', await whole('recipes'), async (rows) => {
    await tx.insert(t.recipes).values(rows.map(r => ({ ...mapRow<typeof t.recipes.$inferInsert>(r, { data: 'doc' }), docVersion: 1 })))
  })
  await copy('recipePhotos', source.pages('recipe_photos', 'id', PHOTO_PAGE), async (rows) => {
    await tx.insert(t.recipePhotos).values(rows.map(r => mapRow<typeof t.recipePhotos.$inferInsert>(r)))
  })
  await copy('favorites', await whole('favorites', 'user_id, recipe_id'), async (rows) => {
    await tx.insert(t.favorites).values(rows.map(r => mapRow<typeof t.favorites.$inferInsert>(r)))
  })
  await copy('recipeVotes', await whole('recipe_votes', 'user_id, recipe_id'), async (rows) => {
    await tx.insert(t.recipeVotes).values(rows.map(r => mapRow<typeof t.recipeVotes.$inferInsert>(r)))
  })
  // комментарии: сначала корневые, потом ответы — ссылка parent_id на уже записанную строку
  const comments = await source.query('select * from comments order by created_at, id')
  await copy('comments', [[...comments.filter(r => r.parent_id == null), ...comments.filter(r => r.parent_id != null)]],
    async (rows) => {
      await tx.insert(t.comments).values(rows.map(r => mapRow<typeof t.comments.$inferInsert>(r)))
    })
  await copy('commentVotes', await whole('comment_votes', 'user_id, comment_id'), async (rows) => {
    await tx.insert(t.commentVotes).values(rows.map(r => mapRow<typeof t.commentVotes.$inferInsert>(r)))
  })
  // партии раньше уведомлений (у напоминаний ссылка на партию); reminded — в журнал напоминаний
  const importedAt = new Date()
  await copy('brews', await whole('brews', 'started_at, id'), async (rows) => {
    const empty = (value: unknown) => value == null || (typeof value === 'object' && Object.keys(value).length === 0)
    await tx.insert(t.brews).values(rows.map(r => ({
      ...mapRow<typeof t.brews.$inferInsert>(r, { recipe: 'program', snapshot: 'batchRecipe' }, ['reminded']),
      program: empty(r.recipe) ? null : r.recipe as Record<string, unknown>,
    })))
    const reminders = rows.flatMap(r => [...new Set(Array.isArray(r.reminded) ? r.reminded as string[] : [])]
      .map(key => ({ brewId: r.id as string, key, sentAt: importedAt, silent: false })))
    if (reminders.length) await tx.insert(t.brewReminders).values(reminders)
    add('brewReminders', reminders.length)
  })
  await copy('brewEntries', await whole('brew_entries'), async (rows) => {
    await tx.insert(t.brewEntries).values(rows.map(r => mapRow<typeof t.brewEntries.$inferInsert>(r)))
  })
  // bigint-ключи pg отдаёт строкой — в числа; явные id, а счётчик identity сдвигается ниже
  await copy('readings', source.pages('readings', 'id', PAGE), async (rows) => {
    await tx.insert(t.readings).values(rows.map(r => ({ ...mapRow<typeof t.readings.$inferInsert>(r), id: Number(r.id) })))
  })
  await copy('events', source.pages('events', 'id', PAGE), async (rows) => {
    await tx.insert(t.events).values(rows.map(r => ({ ...mapRow<typeof t.events.$inferInsert>(r), id: Number(r.id) })))
  })
  const notices = await source.query(`
    select n.*, r.data ->> 'name' as recipe_name, c.text as comment_text from notifications n
    left join recipes r on r.id = n.recipe_id left join comments c on c.id = n.comment_id order by n.created_at, n.id`)
  await copy('notifications', [notices], async (rows) => {
    await tx.insert(t.notifications).values(rows.map(r => ({
      ...mapRow<typeof t.notifications.$inferInsert>(r, {}, ['recipe_name', 'comment_text']),
      data: notificationData(r),
    })))
  })
  await copy('pushSubscriptions', await whole('push_subscriptions'), async (rows) => {
    await tx.insert(t.pushSubscriptions).values(rows.map(r => mapRow<typeof t.pushSubscriptions.$inferInsert>(r)))
  })
  return counts
}

/** Identity у events и readings: после вставки с явными id следующая запись получит max(id) + 1, а не 1. */
async function syncIdentities(target: Target) {
  for (const table of ['events', 'readings']) {
    await target.execute(sql`
      select setval(pg_get_serial_sequence(${table}, 'id'), coalesce(max(id), 1), max(id) is not null)
      from ${sql.identifier(table)}`)
  }
}

const mismatches = (checks: CheckResult[]) => checks.filter(c => !c.ok)

/** Перенести старую базу в новую. Всё в одной транзакции: ошибка, расхождение при сверке или dry-run — откат. */
export async function importLegacy(db: Db, source: LegacySource, options: ImportOptions = {}): Promise<ImportReport> {
  try {
    return await db.transaction(async (tx) => {
      await assertTargetReady(tx)
      await assertRecipesValid(source)
      const counts = await copyAll(tx, source)
      await syncIdentities(tx)
      const checks = options.verify || options.dryRun ? await verifyLegacy(tx, source) : undefined
      const report: ImportReport = { counts, checks, dryRun: Boolean(options.dryRun) }
      if (checks && mismatches(checks).length) throw new LegacyVerifyError(checks)
      if (options.dryRun) throw new DryRun(report)
      return report
    })
  } catch (e) {
    if (!(e instanceof DryRun)) throw e
    // setval не откатывается вместе с транзакцией — возвращаем счётчики в исходное состояние (таблицы были пусты)
    for (const table of ['events', 'readings']) {
      await db.execute(sql`select setval(pg_get_serial_sequence(${table}, 'id'), 1, false)`)
    }
    return e.report
  }
}

/** Сверка без переноса: уже перенесённое против старой базы. */
export async function verifyOnly(db: Db, source: LegacySource): Promise<CheckResult[]> {
  return verifyLegacy(db, source)
}
