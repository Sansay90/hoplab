// apps/api — границы слоёв и разделов (раздел 3а плана node-migration.md, правила — в CLAUDE.md, «Архитектура API»).
// Пути в files — от папки пакета apps/api. no-restricted-imports и no-restricted-syntax при совпадении
// нескольких блоков не складываются (побеждает последний), поэтому наборы собраны под каждый вид файла отдельно.

const SQL = {
  group: ['drizzle-orm', 'drizzle-orm/*', 'drizzle-kit', 'drizzle-kit/*', 'pg', 'pg/*', 'postgres'],
  message: 'Drizzle и SQL — только в queries.ts раздела и в src/db/.',
}
// раздел виден другому только через index.ts: ../recipes и ../recipes/index можно, ../recipes/queries — нет
const CROSS = {
  group: ['../*/*', '!../*/index', '../../*/*', '!../../*/index'],
  message: 'Разделы видят друг друга только через <раздел>/index.ts.',
}
const CROSS_QUERIES = { ...CROSS, group: [...CROSS.group, '!../db/*'] }
const NO_QUERIES = { group: ['./queries', '**/queries'], message: 'routes.ts не зовёт queries.ts: маршрут — только через service.ts.' }
const NO_FASTIFY = {
  group: ['fastify', 'fastify/*', '@fastify/*', 'fastify-type-provider-zod'],
  message: 'service.ts не знает HTTP: ни fastify, ни request/reply. Принимает и возвращает обычные значения.',
}

const restrict = (...patterns) => ['error', { patterns }]

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
const PROCESS_ENV = {
  selector: 'MemberExpression[object.name="process"][property.name="env"]',
  message: 'process.env читается только в src/config.ts.',
}

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
    files: ['src/*/queries.ts'],
    rules: { 'no-restricted-imports': restrict(CROSS_QUERIES) },
  },
  {
    files: ['src/*/routes.ts'],
    rules: { 'no-restricted-imports': restrict(SQL, CROSS, NO_QUERIES) },
  },
  {
    files: ['src/*/service.ts'],
    rules: { 'no-restricted-imports': restrict(SQL, CROSS, NO_FASTIFY) },
  },
  {
    files: ['src/**/*.ts'],
    rules: { 'no-restricted-syntax': ['error', ...TOP_LEVEL_STATE, PROCESS_ENV] },
  },
  {
    files: ['src/config.ts'],
    rules: { 'no-restricted-syntax': ['error', ...TOP_LEVEL_STATE] },
  },
]
