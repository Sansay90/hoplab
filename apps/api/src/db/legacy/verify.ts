// Сверка старой и новой базы: каждая таблица — построчно и по всем колонкам. Набор колонок берётся из Drizzle-схемы
// новой таблицы (getTableColumns), а не руками; соответствие «новая колонка → выражение в старой базе» — одноимённая
// колонка, а где схема изменилась, — явная карта SPECS ниже. У колонки без пары в старой базе и без записи в карте
// сверка не запускается (VerifyConfigError): колонка, которую никто не сверяет, — ошибка механизма, а не тишина.
//
// Обе базы читаются параллельно, страницами по ключу (keyset) и в одном порядке; строки сливаются по ключу: нет в
// одной из баз — расхождение «строка», иначе сравниваются колонки. Ни таблица целиком, ни string_agg по ней в
// память не попадают. Значения приводятся к общему виду в самом SQL (kind колонки — по её типу в новой схеме):
//   время  — миллисекунды (новая база хранит timestamptz(3));
//   число  — float8; real в новой схеме — и там, и там через real (см. norm);
//   JSON   — jsonb, сравнивается по смыслу (25.0 ≡ 25, порядок ключей не важен); JSON null ≡ SQL NULL;
//   байты  — SHA-256 (фото, превью, аватары);
//   прочее — текстом.
import { isDeepStrictEqual } from 'node:util'
import { getTableColumns, getTableName, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { getTableConfig } from 'drizzle-orm/pg-core'
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core'
import type { Db } from '../client'
import type { LegacySource, Row } from './source'
import { TABLES } from './tables'

/** Что умеет выполнять запросы в новой базе: пул или транзакция (при переносе сверка идёт до commit). */
export type Target = Pick<Db, 'execute'>

/** Одно расхождение: таблица, ключ строки, колонка ('(строка)' — строки нет в одной из баз) и значения. */
interface Mismatch {
  table: string
  key: string
  column: string
  legacy: string
  target: string
}

/** Итог по таблице: legacy и target — число строк в каждой базе; ok — строки и значения сошлись. */
export interface CheckResult {
  name: string
  legacy: string
  target: string
  ok: boolean
  /** Всего расхождений значений и строк. */
  mismatchCount: number
  /** Первые примеры (не больше examples на таблицу). */
  mismatches: Mismatch[]
}

export interface VerifyOptions {
  /** Сверить только эти таблицы (имена в новой базе) — для тестов; по умолчанию все. */
  tables?: string[]
  /** Сколько примеров расхождений хранить на таблицу (по умолчанию 5); счётчик считает все. */
  examples?: number
}

export class VerifyConfigError extends Error {}

/** Откуда читать таблицу в старой базе и чем отличается от новой. map — только где схема изменилась: ключ — колонка
 *  новой таблицы, значение — выражение над колонками старого отношения (оно доступно как l). */
interface Spec {
  /** Таблица старой базы или подзапрос в скобках (колонки подзапроса названы как в новой таблице). */
  from: string
  map?: Record<string, string>
}

/** Ключи reminded — как их читает перенос: только массив, повторы схлопнуты. */
const REMINDED = `jsonb_array_elements_text(case when jsonb_typeof(b.reminded) = 'array' then b.reminded else '[]'::jsonb end)`

const SPECS: Record<string, Spec> = {
  users: { from: 'users' },
  // users.avatar → user_avatars.data
  user_avatars: { from: '(select id as user_id, avatar as data from users where avatar is not null)' },
  sessions: { from: 'sessions' },
  auth_tokens: { from: 'auth_tokens' },
  agents: { from: 'agents' },
  devices: { from: 'devices' },
  equipment: { from: 'equipment' },
  // recipes.data → doc; doc_version у перенесённых — 1
  recipes: { from: 'recipes', map: { doc: 'l.data', doc_version: '1' } },
  recipe_photos: { from: 'recipe_photos' },
  favorites: { from: 'favorites' },
  recipe_votes: { from: 'recipe_votes' },
  comments: { from: 'comments' },
  comment_votes: { from: 'comment_votes' },
  // brews.recipe → program ({} ↔ NULL: у ручной партии программы нет), brews.snapshot → batch_recipe
  brews: { from: 'brews', map: { program: `nullif(l.recipe, '{}'::jsonb)`, batch_recipe: 'l.snapshot' } },
  brew_entries: { from: 'brew_entries' },
  // brews.reminded (массив ключей) → строки brew_reminders; когда и молча ли — в старой базе не хранилось: NULL
  brew_reminders: {
    from: `(select distinct b.id as brew_id, k as key from brews b, ${REMINDED} as k)`,
    map: { sent_at: 'null::timestamptz', silent: 'null::boolean' },
  },
  // readings.temp и target — double precision → real: сужение намеренное (план, раздел 4: точности датчика хватает),
  // поэтому оба значения сравниваются как real
  readings: { from: 'readings' },
  events: { from: 'events' },
  // notifications.data: где в старой базе не было (SQL NULL, JSON null — комментарии, ответы), в новой — {}
  notifications: {
    from: 'notifications',
    map: { data: `case when l.data is null or jsonb_typeof(l.data) = 'null' then '{}'::jsonb else l.data end` },
  },
  push_subscriptions: { from: 'push_subscriptions' },
}

type Kind = 'text' | 'num' | 'json' | 'time' | 'bytes'

interface Column {
  name: string
  kind: Kind
  /** Нормализованное выражение для старой и новой базы. */
  legacy: string
  target: string
}

interface Key {
  name: string
  type: 'uuid' | 'bigint' | 'text'
  legacy: string
  target: string
}

interface Plan {
  table: string
  from: string
  columns: Column[]
  keys: Key[]
}

const quote = (name: string) => `"${name}"`

/** Вид колонки — по её типу в новой схеме. */
function kindOf(column: AnyPgColumn): Kind {
  const type = column.getSQLType()
  if (type.startsWith('timestamp')) return 'time'
  if (type === 'jsonb') return 'json'
  if (type === 'bytea') return 'bytes'
  if (['integer', 'smallint', 'bigint', 'double precision', 'real'].includes(type)) return 'num'
  if (['uuid', 'text', 'boolean'].includes(type)) return 'text'
  throw new VerifyConfigError(`сверка не знает тип ${type} (${column.name})`)
}

/** Привести выражение к общему виду: оно одинаково для обеих баз, различается только само выражение. */
function norm(kind: Kind, expr: string, type: string): string {
  switch (kind) {
    case 'time': return `floor(extract(epoch from ${expr}) * 1000)::bigint::text`
    case 'num': return type === 'real' ? `((${expr})::real)::float8` : `(${expr})::float8`
    case 'json': return `case when jsonb_typeof(${expr}) = 'null' then null else (${expr})::jsonb end`
    case 'bytes': return `encode(sha256(${expr}), 'hex')`
    case 'text': return `(${expr})::text`
  }
}

/** Колонки ключа: первичный ключ таблицы (составной или одиночный). */
function keyColumns(table: PgTable): AnyPgColumn[] {
  const composite = getTableConfig(table).primaryKeys[0]
  const columns = composite ? composite.columns : Object.values(getTableColumns(table)).filter(c => c.primary)
  if (columns.length === 0) throw new VerifyConfigError(`у таблицы ${getTableName(table)} нет первичного ключа`)
  return columns
}

async function planOf(table: PgTable, source: LegacySource): Promise<Plan> {
  const name = getTableName(table)
  const spec = SPECS[name]
  if (!spec) throw new VerifyConfigError(`для таблицы ${name} нет записи в SPECS (verify.ts)`)
  const map = spec.map ?? {}
  const own = getTableColumns(table)
  const dbNames = Object.values(own).map(c => c.name)
  for (const extra of Object.keys(map).filter(k => !dbNames.includes(k))) {
    throw new VerifyConfigError(`${name}: в карте колонка ${extra}, которой нет в новой таблице`)
  }
  const legacyColumns = await source.columns(spec.from)
  const legacyExpr = (column: AnyPgColumn) => {
    const mapped = map[column.name]
    if (mapped !== undefined) return mapped
    if (legacyColumns.includes(column.name)) return `l.${quote(column.name)}`
    throw new VerifyConfigError(
      `${name}.${column.name}: нет пары в старой базе — объявите её в SPECS (verify.ts), иначе колонка не сверяется`,
    )
  }
  const columns = Object.values(own).map((column): Column => {
    const kind = kindOf(column)
    const type = column.getSQLType()
    return {
      name: column.name, kind,
      legacy: norm(kind, legacyExpr(column), type),
      target: norm(kind, `t.${quote(column.name)}`, type),
    }
  })
  const keys = keyColumns(table).map((column): Key => {
    const type = column.getSQLType()
    if (type !== 'uuid' && type !== 'bigint' && type !== 'text') throw new VerifyConfigError(`ключ ${name}.${column.name}: тип ${type}`)
    return { name: column.name, type, legacy: legacyExpr(column), target: `t.${quote(column.name)}` }
  })
  return { table: name, from: spec.from, columns, keys }
}

const PAGE = 1000

/** Текст запроса страницы: выбранные колонки и ключи (как текст) после ключа `after`; параметры — $1… */
function pageQuery(plan: Plan, side: 'legacy' | 'target', after: string[] | null) {
  const from = side === 'legacy' ? `${plan.from} as l` : `${quote(plan.table)} as t`
  const selected = plan.columns.map((c, i) => `${c[side]} as c${i}`)
  // text-ключ сравнивается побайтно (collate "C"): порядок не зависит от настроек баз
  const ordered = plan.keys.map(k => k.type === 'text' ? `${k[side]} collate "C"` : k[side])
  const keyed = plan.keys.map((k, i) => `(${k[side]})::text as k${i}`)
  const where = after
    ? `where (${ordered.join(', ')}) > (${plan.keys.map((k, i) => `$${i + 1}::${k.type}`).join(', ')})`
    : ''
  return {
    text: `select ${[...selected, ...keyed].join(', ')} from ${from} ${where} order by ${ordered.join(', ')} limit ${PAGE}`,
    params: after ?? [],
  }
}

/** Запрос с параметрами $n → SQL Drizzle (target.execute принимает только SQL). */
function toSql(text: string, params: unknown[]): SQL {
  const parts = text.split(/\$(\d+)/)
  return sql.join(parts.map((part, i) => i % 2 === 0 ? sql.raw(part) : sql`${params[Number(part) - 1]}`))
}

/** Строки результата запроса к новой базе (драйвер для нескольких команд отдаёт массив результатов). */
export async function rowsOf(target: Target, query: SQL): Promise<Row[]> {
  const result = await target.execute(query)
  return Array.isArray(result) ? result.flatMap(r => r.rows) : result.rows
}

interface Item {
  key: string[]
  values: unknown[]
}

/** Строки одной базы по порядку ключа, страница за страницей. */
async function* stream(plan: Plan, fetch: (query: { text: string; params: unknown[] }) => Promise<Row[]>, side: 'legacy' | 'target'): AsyncGenerator<Item> {
  let after: string[] | null = null
  for (;;) {
    const rows = await fetch(pageQuery(plan, side, after))
    for (const row of rows) {
      yield { key: plan.keys.map((_, i) => String(row[`k${i}`])), values: plan.columns.map((_, i) => row[`c${i}`]) }
    }
    if (rows.length < PAGE) return
    const tail: Row = rows[rows.length - 1]!
    after = plan.keys.map((_, i) => String(tail[`k${i}`]))
  }
}

/** Порядок ключей в базе: uuid — как его текст (шестнадцатеричные цифры), bigint — число, text — побайтно. */
function compareKeys(plan: Plan, a: string[], b: string[]): number {
  for (const [i, key] of plan.keys.entries()) {
    const x = a[i]!
    const y = b[i]!
    const order = key.type === 'bigint'
      ? (BigInt(x) < BigInt(y) ? -1 : BigInt(x) > BigInt(y) ? 1 : 0)
      : key.type === 'uuid' ? (x < y ? -1 : x > y ? 1 : 0) : Buffer.compare(Buffer.from(x), Buffer.from(y))
    if (order !== 0) return order
  }
  return 0
}

const same = (kind: Kind, a: unknown, b: unknown) => kind === 'json' ? isDeepStrictEqual(a, b) : a === b

const show = (value: unknown) => {
  if (value === null || value === undefined) return 'NULL'
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
  return text.length > 80 ? `${text.slice(0, 79)}…` : text
}

async function verifyTable(plan: Plan, target: Target, source: LegacySource, examples: number): Promise<CheckResult> {
  const before = stream(plan, q => source.query(q.text, q.params), 'legacy')
  const after = stream(plan, q => rowsOf(target, toSql(q.text, q.params)), 'target')
  const found: Mismatch[] = []
  let total = 0
  const counts = { legacy: 0, target: 0 }
  const report = (item: Item, column: string, legacy: unknown, fresh: unknown) => {
    total++
    if (found.length < examples) found.push({ table: plan.table, key: item.key.join(' / '), column, legacy: show(legacy), target: show(fresh) })
  }
  let x = await before.next()
  let y = await after.next()
  while (!x.done || !y.done) {
    const order = x.done ? 1 : y.done ? -1 : compareKeys(plan, x.value.key, y.value.key)
    if (order < 0 && !x.done) {
      counts.legacy++
      report(x.value, '(строка)', 'есть', 'нет')
      x = await before.next()
    } else if (order > 0 && !y.done) {
      counts.target++
      report(y.value, '(строка)', 'нет', 'есть')
      y = await after.next()
    } else if (!x.done && !y.done) {
      counts.legacy++
      counts.target++
      for (const [i, column] of plan.columns.entries()) {
        if (!same(column.kind, x.value.values[i], y.value.values[i])) report(x.value, column.name, x.value.values[i], y.value.values[i])
      }
      x = await before.next()
      y = await after.next()
    }
  }
  return {
    name: plan.table, legacy: String(counts.legacy), target: String(counts.target),
    ok: total === 0, mismatchCount: total, mismatches: found,
  }
}

/** Сравнить старую и новую базу; все ok — перенос верный. */
export async function verifyLegacy(target: Target, source: LegacySource, options: VerifyOptions = {}): Promise<CheckResult[]> {
  const results: CheckResult[] = []
  const tables = Object.values(TABLES).filter(table => !options.tables || options.tables.includes(getTableName(table)))
  for (const table of tables) {
    results.push(await verifyTable(await planOf(table, source), target, source, options.examples ?? 5))
  }
  return results
}
