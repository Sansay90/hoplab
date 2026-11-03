// Перенос данных из старой базы (Python-сервис) в новую схему: читаем старую сырым SQL (source.ts), пишем через Drizzle
// в одной транзакции приёмника. Приёмник — с применёнными миграциями и пустой; иначе отказ (миграции перед переносом
// применяет CLI). Что изменилось по плану (раздел 4 node-migration.md): аватар уходит в user_avatars; recipes.data →
// doc (как есть, без нормализации, каждый документ проверяется recipeSchema); brews.recipe → program ({} → null),
// snapshot → batch_recipe; brews.reminded → brew_reminders (времён в старой базе не было: sent_at и silent — NULL);
// у уведомлений без data — data = {}.
import { recipeSchema } from '@hoplab/core'
import { getTableName, sql } from 'drizzle-orm'
import type { Db, Tx } from '../client'
import * as t from '../schema'
import { connectLegacy } from './source'
import type { LegacySource, Row } from './source'
import { TABLES } from './tables'
import { rowsOf, verifyLegacy } from './verify'
import type { CheckResult, Target, VerifyOptions } from './verify'

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

/** Старую базу читаем страницами по PAGE строк, пишем порциями по CHUNK: в одном insert не больше 65 535 параметров. */
const PAGE = 2000
const PHOTO_PAGE = 20
const CHUNK = 500

const camel = (key: string) => key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())

/** Строка старой базы → объект для вставки: snake_case → camelCase, лишние колонки (drop) убраны, rename — переименованы.
 *  Колонки одноимённы в обеих схемах — форму проверяют ограничения новой базы и тест переноса. */
function mapRow<T>(row: Row, rename: Record<string, string> = {}, drop: string[] = []): T {
  const entries = Object.entries(row).filter(([key]) => !drop.includes(key))
    .map(([key, value]) => [rename[key] ?? camel(key), value])
  return Object.fromEntries(entries) as T
}

/** Приёмник готов: все таблицы на месте (миграции применены) и пусты. */
async function assertTargetReady(tx: Tx) {
  const names = Object.values(TABLES).map(table => getTableName(table))
  for (const name of names) {
    const [found] = await rowsOf(tx, sql`select to_regclass(${`public.${name}`}) as found`)
    if (found?.found == null) {
      throw new LegacyImportError(`в новой базе нет таблицы ${name}: сначала примените миграции`)
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
  for await (const rows of source.pages('recipes', ['id'], PAGE)) {
    for (const row of rows) {
      const parsed = recipeSchema.safeParse(row.data)
      if (!parsed.success) {
        const issues = parsed.error.issues.map(issue => `${issue.path.join('.') || '(документ)'}: ${issue.message}`)
        bad.push(`  ${String(row.id)} «${String(row.name)}»: ${issues.join('; ')}`)
      }
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
  /** Скопировать страницы строк: write вставляет порцию (не больше CHUNK строк). Пустая таблица — ни одной вставки
   *  (values([]) в Drizzle — ошибка). */
  async function copy(table: keyof typeof TABLES, pages: AsyncIterable<Row[]>, write: (rows: Row[]) => Promise<void>) {
    for await (const page of pages) {
      for (let from = 0; from < page.length; from += CHUNK) {
        const rows = page.slice(from, from + CHUNK)
        await write(rows)
        add(table, rows.length)
      }
    }
  }
  /** Вся таблица страницами по ключу. */
  const whole = (table: string, keys = ['id'], where?: string) => source.pages(table, keys, PAGE, where)

  await copy('users', whole('users'), async (rows) => {
    await tx.insert(t.users).values(rows.map(r => mapRow<typeof t.users.$inferInsert>(r, {}, ['avatar'])))
    const avatars = rows.filter(r => r.avatar != null)
      .map(r => ({ userId: r.id as string, data: r.avatar as Buffer }))
    if (avatars.length) await tx.insert(t.userAvatars).values(avatars)
    add('userAvatars', avatars.length)
  })
  await copy('sessions', whole('sessions'), async (rows) => {
    await tx.insert(t.sessions).values(rows.map(r => mapRow<typeof t.sessions.$inferInsert>(r)))
  })
  await copy('authTokens', whole('auth_tokens'), async (rows) => {
    await tx.insert(t.authTokens).values(rows.map(r => mapRow<typeof t.authTokens.$inferInsert>(r)))
  })
  await copy('agents', whole('agents'), async (rows) => {
    await tx.insert(t.agents).values(rows.map(r => mapRow<typeof t.agents.$inferInsert>(r)))
  })
  await copy('devices', whole('devices'), async (rows) => {
    await tx.insert(t.devices).values(rows.map(r => mapRow<typeof t.devices.$inferInsert>(r)))
  })
  await copy('equipment', whole('equipment'), async (rows) => {
    await tx.insert(t.equipment).values(rows.map(r => mapRow<typeof t.equipment.$inferInsert>(r)))
  })
  // документ рецепта — как есть; номер формата у перенесённых — 1
  await copy('recipes', whole('recipes'), async (rows) => {
    await tx.insert(t.recipes).values(rows.map(r => ({ ...mapRow<typeof t.recipes.$inferInsert>(r, { data: 'doc' }), docVersion: 1 })))
  })
  await copy('recipePhotos', source.pages('recipe_photos', ['id'], PHOTO_PAGE), async (rows) => {
    await tx.insert(t.recipePhotos).values(rows.map(r => mapRow<typeof t.recipePhotos.$inferInsert>(r)))
  })
  await copy('favorites', whole('favorites', ['user_id', 'recipe_id']), async (rows) => {
    await tx.insert(t.favorites).values(rows.map(r => mapRow<typeof t.favorites.$inferInsert>(r)))
  })
  await copy('recipeVotes', whole('recipe_votes', ['user_id', 'recipe_id']), async (rows) => {
    await tx.insert(t.recipeVotes).values(rows.map(r => mapRow<typeof t.recipeVotes.$inferInsert>(r)))
  })
  // комментарии: сначала корневые, потом ответы (один уровень) — ссылка parent_id на уже записанную строку;
  // страницы и порции этот порядок не ломают
  const writeComments = async (rows: Row[]) => {
    await tx.insert(t.comments).values(rows.map(r => mapRow<typeof t.comments.$inferInsert>(r)))
  }
  await copy('comments', whole('comments', ['id'], 'parent_id is null'), writeComments)
  await copy('comments', whole('comments', ['id'], 'parent_id is not null'), writeComments)
  await copy('commentVotes', whole('comment_votes', ['user_id', 'comment_id']), async (rows) => {
    await tx.insert(t.commentVotes).values(rows.map(r => mapRow<typeof t.commentVotes.$inferInsert>(r)))
  })
  // партии раньше уведомлений (у напоминаний ссылка на партию); reminded — в журнал напоминаний
  await copy('brews', whole('brews'), async (rows) => {
    const empty = (value: unknown) => value == null || (typeof value === 'object' && Object.keys(value).length === 0)
    await tx.insert(t.brews).values(rows.map(r => ({
      ...mapRow<typeof t.brews.$inferInsert>(r, { recipe: 'program', snapshot: 'batchRecipe' }, ['reminded']),
      program: empty(r.recipe) ? null : r.recipe as Record<string, unknown>,
    })))
    // в reminded хранились только ключи: когда и молча ли — неизвестно, NULL
    const reminders = rows.flatMap(r => [...new Set(Array.isArray(r.reminded) ? r.reminded as string[] : [])]
      .map(key => ({ brewId: r.id as string, key, sentAt: null, silent: null })))
    for (let from = 0; from < reminders.length; from += CHUNK) {
      await tx.insert(t.brewReminders).values(reminders.slice(from, from + CHUNK))
    }
    add('brewReminders', reminders.length)
  })
  await copy('brewEntries', whole('brew_entries'), async (rows) => {
    await tx.insert(t.brewEntries).values(rows.map(r => mapRow<typeof t.brewEntries.$inferInsert>(r)))
  })
  // bigint-ключи pg отдаёт строкой — в числа; явные id, а счётчик identity сдвигается в конце, после сверки
  await copy('readings', source.pages('readings', ['id'], PAGE), async (rows) => {
    await tx.insert(t.readings).values(rows.map(r => ({ ...mapRow<typeof t.readings.$inferInsert>(r), id: Number(r.id) })))
  })
  await copy('events', source.pages('events', ['id'], PAGE), async (rows) => {
    await tx.insert(t.events).values(rows.map(r => ({ ...mapRow<typeof t.events.$inferInsert>(r), id: Number(r.id) })))
  })
  // data: у напоминаний — как было; где не было (комментарии, ответы, напоминание с data = null — SQL NULL или JSON
  // null) — {}: текста не выдумываем, лента строит его живьём (см. комментарий у таблицы в schema.ts)
  await copy('notifications', whole('notifications'), async (rows) => {
    await tx.insert(t.notifications).values(rows.map(r => ({
      ...mapRow<typeof t.notifications.$inferInsert>(r),
      data: (r.data ?? {}) as Record<string, unknown>,
    })))
  })
  await copy('pushSubscriptions', whole('push_subscriptions'), async (rows) => {
    await tx.insert(t.pushSubscriptions).values(rows.map(r => mapRow<typeof t.pushSubscriptions.$inferInsert>(r)))
  })
  return counts
}

/** Identity у events и readings: после вставки с явными id следующая запись получит max(id) + 1, а не 1. Вызывается
 *  только перед commit, после успешной сверки: setval не откатывается вместе с транзакцией. */
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
      const checks = options.verify || options.dryRun ? await verifyLegacy(tx, source) : undefined
      if (checks && mismatches(checks).length) throw new LegacyVerifyError(checks)
      if (options.dryRun) throw new DryRun({ counts, checks, dryRun: true })
      await syncIdentities(tx)
      return { counts, checks, dryRun: false }
    })
  } catch (e) {
    if (e instanceof DryRun) return e.report
    throw e
  }
}

/** Сверка без переноса: уже перенесённое против старой базы. */
export async function verifyOnly(db: Db, source: LegacySource, options?: VerifyOptions): Promise<CheckResult[]> {
  return verifyLegacy(db, source, options)
}
