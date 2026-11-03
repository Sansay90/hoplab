// apps/api — границы слоёв и разделов (раздел 3а плана node-migration.md, правила — в CLAUDE.md, «Архитектура API»).
// Пути в files — от папки пакета apps/api; раздел может иметь подпапки (src/brews/reminders/service.ts), поэтому
// глобы вида src/*/**/service.ts. no-restricted-imports и no-restricted-syntax при совпадении нескольких блоков
// не складываются (побеждает последний), поэтому наборы собраны под каждый вид файла отдельно.

const SQL = {
  group: ['drizzle-orm', 'drizzle-orm/*', 'drizzle-kit', 'drizzle-kit/*', 'pg', 'pg/*', 'postgres'],
  message: 'Drizzle и SQL — только в queries.ts раздела и в src/db/.',
}
// раздел виден другому только через index.ts: ../recipes и ../recipes/index можно, ../recipes/queries и
// ../brews/reminders/schedule — нет; то же из подпапки раздела (../../recipes/queries)
const up = depth => '../'.repeat(depth)
// порядок важен: сначала запреты всех глубин, потом исключения (* в паттерне может быть и «..»)
const sectionGroup = (...allow) => [
  ...[1, 2, 3].map(d => `${up(d)}*/**`),
  ...[1, 2, 3].map(d => `!${up(d)}*/index`),
  // файл или папка в корне src (../../errors, ../../recipes) — это не внутренности раздела
  '!../../*', '!../../../*',
  ...allow,
]
const CROSS = {
  group: sectionGroup(),
  message: 'Разделы видят друг друга только через <раздел>/index.ts.',
}
// queries.ts может тянуть схему базы из src/db
const CROSS_QUERIES = { ...CROSS, group: sectionGroup(...[1, 2, 3].map(d => `!${up(d)}db/**`)) }
const NO_QUERIES = { group: ['./queries', '**/queries'], message: 'routes.ts не зовёт queries.ts: маршрут — только через service.ts.' }
const NO_FASTIFY = {
  group: ['fastify', 'fastify/*', '@fastify/*', 'fastify-type-provider-zod'],
  message: 'service.ts не знает HTTP: ни fastify, ни request/reply. Принимает и возвращает обычные значения.',
}
// process.env читается только в config.ts: и через import { env } from 'node:process'
const ENV_PATHS = ['process', 'node:process'].map(name => ({
  name,
  message: 'process.env читается только в src/config.ts.',
}))

const restrict = (...patterns) => ['error', { patterns, paths: ENV_PATHS }]

const TOP_LEVEL_STATE = [
  {
    selector: ':matches(Program > VariableDeclaration, Program > ExportNamedDeclaration > VariableDeclaration)[kind=/^(let|var)$/]',
    message: 'Изменяемое состояние на уровне модуля запрещено: зависимости и состояние — через buildApp(deps).',
  },
  {
    selector: 'Program > :matches(VariableDeclaration, ExportNamedDeclaration > VariableDeclaration) > VariableDeclarator[init.type="NewExpression"][init.callee.name=/^(Map|Set|WeakMap|WeakSet)$/]',
    message: 'Коллекция на уровне модуля — это глобальное состояние: держите её в deps (buildApp).',
  },
]
// все способы добраться до окружения: process.env, process['env'], globalThis.process.env,
// const { env } = process, const p = process
const PROCESS_ENV = [
  'MemberExpression[object.name="process"][property.name="env"]',
  'MemberExpression[object.name="process"][computed=true][property.value="env"]',
  'MemberExpression[object.property.name="process"][property.name="env"]',
  'MemberExpression[object.property.name="process"][computed=true][property.value="env"]',
  'VariableDeclarator[init.name="process"]',
  'VariableDeclarator[init.property.name="process"]',
  'AssignmentExpression[right.name="process"]',
].map(selector => ({ selector, message: 'process.env читается только в src/config.ts.' }))

export const apiRules = [
  {
    files: ['src/**/*.ts'],
    ignores: ['src/db/**', 'src/**/queries.ts'],
    rules: { 'no-restricted-imports': restrict(SQL) },
  },
  {
    files: ['src/*/**/*.ts'],
    ignores: ['src/db/**', 'src/cli/**', 'src/**/queries.ts'],
    rules: { 'no-restricted-imports': restrict(SQL, CROSS) },
  },
  {
    files: ['src/*/**/queries.ts'],
    rules: { 'no-restricted-imports': restrict(CROSS_QUERIES) },
  },
  {
    files: ['src/*/**/routes.ts'],
    rules: { 'no-restricted-imports': restrict(SQL, CROSS, NO_QUERIES) },
  },
  {
    files: ['src/*/**/service.ts'],
    rules: { 'no-restricted-imports': restrict(SQL, CROSS, NO_FASTIFY) },
  },
  {
    files: ['src/db/**/*.ts'],
    rules: { 'no-restricted-imports': restrict() },
  },
  {
    files: ['src/**/*.ts'],
    rules: { 'no-restricted-syntax': ['error', ...TOP_LEVEL_STATE, ...PROCESS_ENV] },
  },
  {
    // config.ts — единственное место, где читается окружение
    files: ['src/config.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...TOP_LEVEL_STATE],
      'no-restricted-imports': ['error', { patterns: [SQL] }],
    },
  },
]
