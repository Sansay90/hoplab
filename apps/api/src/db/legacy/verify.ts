// Сверка старой и новой базы: счётчики всех таблиц, контрольные суммы ключевых колонок и SHA-256 байтов каждого фото
// и аватара. Один и тот же запрос выполняется в обеих базах (где колонки названы иначе — свой для каждой).
import { isDeepStrictEqual } from 'node:util'
import { sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import type { Db } from '../client'
import type { LegacySource, Row } from './source'

/** Строка SQL без экранирования: кавычки внутри — обычные одинарные. */
const S = String.raw

export interface CheckResult {
  name: string
  legacy: string
  target: string
  ok: boolean
}

/** Что умеет выполнять запросы в новой базе: пул или транзакция (при переносе сверка идёт до commit). */
export type Target = Pick<Db, 'execute'>

interface Check {
  name: string
  legacy: string
  target: string
}

const COUNTED = [
  'users', 'sessions', 'auth_tokens', 'agents', 'devices', 'equipment', 'recipes', 'recipe_photos', 'favorites',
  'recipe_votes', 'comments', 'comment_votes', 'brews', 'brew_entries', 'readings', 'events', 'notifications',
  'push_subscriptions',
]

const count = (name: string, legacy: string, target = legacy): Check => ({
  name: `${name}: строк`, legacy: `select count(*)::text from ${legacy}`, target: `select count(*)::text from ${target}`,
})

/** Колонки через « | »: одна строка на запись, null — пустой. */
const join = (...parts: string[]) => parts.join(S` || '|' || `)

/** Контрольная сумма: md5 от строк expr по всем записям в порядке order; targetExpr — если в новой базе колонки иные. */
const digest = (table: string, expr: string, targetExpr = expr, order = 'id'): Check => ({
  name: `${table}: сумма`,
  legacy: `select md5(coalesce(string_agg(${expr}, ',' order by ${order}), '')) from ${table}`,
  target: `select md5(coalesce(string_agg(${targetExpr}, ',' order by ${order}), '')) from ${table}`,
})

const orEmpty = (column: string) => `coalesce(${column}, '')`

const CHECKS: Check[] = [
  ...COUNTED.map(table => count(table, table)),
  count('user_avatars', 'users where avatar is not null', 'user_avatars'),
  count('brew_reminders', '(select distinct id, k from brews, jsonb_array_elements_text(reminded) as k) as r', 'brew_reminders'),
  digest('users', join('id::text', orEmpty('email'), orEmpty('password_hash'), orEmpty('name_key'), 'role', 'avatar_version::text')),
  digest('sessions', join('id::text', 'user_id::text', 'token_hash')),
  digest('auth_tokens', join('id::text', 'kind', 'token_hash', '(used_at is null)::text')),
  digest('agents', join('id::text', 'token_hash', 'name')),
  digest('devices', join('id::text', 'tuya_id', orEmpty('agent_id::text'))),
  digest('equipment', join('id::text', 'name', 'kind', 'main::text', orEmpty('volume::text'))),
  digest('push_subscriptions', join('id::text', 'endpoint', 'p256dh', 'auth')),
  digest('recipes', join('id::text', 'name', 'visibility')),
  digest('comments', join('id::text', 'text', orEmpty('parent_id::text'), '(deleted_at is null)::text')),
  digest('notifications', join('id::text', 'kind', 'user_id::text', '(read_at is null)::text')),
  digest('brew_entries', join('id::text', 'kind', orEmpty('value::text'), orEmpty('text'))),
  digest('brews', join('id::text', 'name', 'source', 'status', 'energy_wh::text', orEmpty('recipe_id::text'))),
  {
    name: 'brew_reminders: сумма',
    legacy: S`select md5(coalesce(string_agg(brew || ':' || k, ',' order by brew, k), '')) from (select distinct id::text as brew, k from brews, jsonb_array_elements_text(reminded) as k) as r`,
    target: S`select md5(coalesce(string_agg(brew_id::text || ':' || key, ',' order by brew_id::text, key), '')) from brew_reminders`,
  },
  digest('readings', join('id::text', 'device_id::text', 'temp::real::text', orEmpty('target::real::text'), orEmpty('step::text'), orEmpty('status'))),
  digest('events', join('id::text', 'kind', 'text')),
]

// документы JSONB сравниваются по смыслу, а не по тексту: через JS число 25.0 становится 25 — то же значение, другая запись;
// JSON null и SQL NULL (старая база писала None как JSON null) — «нет значения», такие строки пропускаются
const j = (name: string, table: string, legacy: string, target = legacy) => ({
  name: `JSON ${name}`,
  legacy: `select id::text as id, ${legacy} as j from ${table} where jsonb_typeof(${legacy}) <> 'null'`,
  target: `select id::text as id, ${target} as j from ${table} where jsonb_typeof(${target}) <> 'null'`,
})
const JSONS = [
  j('recipes.data → doc', 'recipes', 'data', 'doc'),
  j('brews.snapshot → batch_recipe', 'brews', 'snapshot', 'batch_recipe'),
  // у ручной партии программа была «{}», теперь null — по смыслу то же
  j('brews.recipe → program', 'brews', `nullif(recipe, '{}'::jsonb)`, 'program'),
  j('brews.plan', 'brews', 'plan'),
  j('devices.limits', 'devices', 'limits'),
  j('equipment.props', 'equipment', 'props'),
  j('events.data', 'events', 'data'),
]

// пары «id → SHA-256 байтов»: расходящиеся id называем поимённо
const HASHES = [
  {
    name: 'фото',
    legacy: S`select id::text, encode(sha256(data), 'hex') as h from recipe_photos`,
    target: S`select id::text, encode(sha256(data), 'hex') as h from recipe_photos`,
  },
  {
    name: 'превью фото',
    legacy: S`select id::text, encode(sha256(thumb), 'hex') as h from recipe_photos where thumb is not null`,
    target: S`select id::text, encode(sha256(thumb), 'hex') as h from recipe_photos where thumb is not null`,
  },
  {
    name: 'аватары',
    legacy: S`select id::text, encode(sha256(avatar), 'hex') as h from users where avatar is not null`,
    target: S`select user_id::text as id, encode(sha256(data), 'hex') as h from user_avatars`,
  },
]

const firstValue = (rows: Row[]) => String(Object.values(rows[0] ?? {})[0] ?? '')

/** Строки результата запроса к новой базе (драйвер для нескольких команд отдаёт массив результатов). */
export async function rowsOf(target: Target, query: SQL): Promise<Row[]> {
  const result = await target.execute(query)
  return Array.isArray(result) ? result.flatMap(r => r.rows) : result.rows
}

const targetRows = (target: Target, query: string) => rowsOf(target, sql.raw(query))

/** Сравнить старую и новую базу; все ok — перенос верный. */
export async function verifyLegacy(target: Target, source: LegacySource): Promise<CheckResult[]> {
  const results: CheckResult[] = []
  for (const check of CHECKS) {
    const legacy = firstValue(await source.query(check.legacy))
    const fresh = firstValue(await targetRows(target, check.target))
    results.push({ name: check.name, legacy, target: fresh, ok: legacy === fresh })
  }
  for (const doc of JSONS) {
    const before = new Map((await source.query(doc.legacy)).map(r => [String(r.id), r.j]))
    const after = new Map((await targetRows(target, doc.target)).map(r => [String(r.id), r.j]))
    const bad = [...new Set([...before.keys(), ...after.keys()])].filter(id => !isDeepStrictEqual(before.get(id), after.get(id)))
    results.push({
      name: doc.name,
      legacy: String(before.size),
      target: bad.length === 0 ? String(after.size) : `расходятся id: ${bad.slice(0, 10).join(', ')}`,
      ok: bad.length === 0,
    })
  }
  for (const hashes of HASHES) {
    const before = new Map((await source.query(hashes.legacy)).map(r => [String(r.id), String(r.h)]))
    const after = new Map((await targetRows(target, hashes.target)).map(r => [String(r.id), String(r.h)]))
    const bad = [...new Set([...before.keys(), ...after.keys()])].filter(id => before.get(id) !== after.get(id))
    results.push({
      name: `SHA-256 байтов: ${hashes.name}`,
      legacy: String(before.size),
      target: bad.length === 0 ? String(after.size) : `расходятся id: ${bad.join(', ')}`,
      ok: bad.length === 0,
    })
  }
  return results
}
