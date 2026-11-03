// Границы и правила из ESLint (eslint/*.mjs) проверяются каждый раз: через Node API ESLint линтуется «виртуальный»
// файл (lintText с filePath) и смотрится, что нарушение даёт ошибку, а разрешённое — нет.
// Нарочно нарушенная граница валит CI не один раз руками, а при каждом прогоне тестов.
import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const dir = (path: string) => fileURLToPath(new URL(path, import.meta.url))
const cwds = {
  api: dir('..'),
  core: dir('../../../packages/core'),
  web: dir('../../web'),
}
const linters = {
  api: new ESLint({ cwd: cwds.api }),
  core: new ESLint({ cwd: cwds.core }),
  web: new ESLint({ cwd: cwds.web }),
}

/** Правила, по которым нашлись ошибки (severity 2) в тексте, как если бы он лежал в файле filePath пакета. */
async function errors(pkg: keyof typeof linters, filePath: string, code: string) {
  const eslint = linters[pkg]
  const [result] = await eslint.lintText(code, { filePath: `${cwds[pkg]}/${filePath}` })
  return (result?.messages ?? []).filter(m => m.severity === 2).map(m => m.ruleId ?? `ошибка разбора: ${m.message}`)
}

const bad = (pkg: keyof typeof linters, rule: string, filePath: string, code: string) =>
  async () => expect(await errors(pkg, filePath, code)).toContain(rule)
const ok = (pkg: keyof typeof linters, filePath: string, code: string) =>
  async () => expect(await errors(pkg, filePath, code)).toEqual([])

const DRIZZLE = 'import { eq } from \'drizzle-orm\'\nexport const f = () => eq\n'
const IMPORT = 'no-restricted-imports'
const SYNTAX = 'no-restricted-syntax'

describe('apps/api: SQL и Drizzle — только в queries.ts и src/db', () => {
  it('service.ts — нельзя', bad('api', IMPORT, 'src/recipes/service.ts', DRIZZLE))
  it('routes.ts — нельзя', bad('api', IMPORT, 'src/recipes/routes.ts', DRIZZLE))
  it('schemas.ts — нельзя', bad('api', IMPORT, 'src/recipes/schemas.ts', DRIZZLE))
  it('app.ts — нельзя', bad('api', IMPORT, 'src/app.ts', DRIZZLE))
  it('драйвер базы — тоже нельзя', bad('api', IMPORT, 'src/recipes/service.ts', 'import pg from \'pg\'\nexport default pg\n'))
  it('queries.ts — можно', ok('api', 'src/recipes/queries.ts', DRIZZLE))
  it('src/db — можно', ok('api', 'src/db/schema.ts', DRIZZLE))
  it('src/cli — нельзя: SQL переноса живёт в src/db/legacy', bad('api', IMPORT, 'src/cli/import-legacy.ts', DRIZZLE))
  it('src/db/legacy — можно', ok('api', 'src/db/legacy/users.ts', DRIZZLE))
})

describe('apps/api: слои раздела', () => {
  it('routes.ts не импортирует queries.ts', bad('api', IMPORT, 'src/recipes/routes.ts', 'import { list } from \'./queries\'\nexport const f = list\n'))
  it('routes.ts может импортировать service.ts', ok('api', 'src/recipes/routes.ts', 'import { list } from \'./service\'\nexport const f = list\n'))
  it('service.ts не импортирует fastify', bad('api', IMPORT, 'src/recipes/service.ts', 'import type { FastifyRequest } from \'fastify\'\nexport type R = FastifyRequest\n'))
  it('service.ts может импортировать queries.ts и ошибки', ok('api', 'src/recipes/service.ts', 'import { NotFound } from \'../errors\'\nimport { find } from \'./queries\'\nexport const f = () => find ?? new NotFound(\'нет\')\n'))
})

describe('apps/api: разделы видят друг друга только через index.ts', () => {
  const from = 'src/recipes/service.ts'
  it('внутренний файл другого раздела — нельзя', bad('api', IMPORT, from, 'import { q } from \'../health/queries\'\nexport const f = q\n'))
  it('routes другого раздела — нельзя', bad('api', IMPORT, from, 'import { r } from \'../health/routes\'\nexport const f = r\n'))
  it('queries.ts тоже не лезет в чужие внутренности', bad('api', IMPORT, 'src/recipes/queries.ts', 'import { s } from \'../health/service\'\nexport const f = s\n'))
  it('публичный вход раздела — можно', ok('api', from, 'import { health } from \'../health\'\nexport const f = health\n'))
  it('index.ts явно — можно', ok('api', from, 'import { health } from \'../health/index\'\nexport const f = health\n'))
  it('queries.ts может тянуть схему из src/db', ok('api', 'src/recipes/queries.ts', 'import { recipes } from \'../db/schema\'\nexport const f = recipes\n'))
  it('«./../» вместо «../» — нельзя', bad('api', IMPORT, from, 'import { q } from \'./../health/queries\'\nexport const f = q\n'))
  it('из корня раздела во внутренности своей подпапки — нельзя', bad('api', IMPORT, 'src/brews/scheduler.ts', 'import { s } from \'./reminders/schedule\'\nexport const f = s\n'))
  it('из корня раздела в index своей подпапки — можно', ok('api', 'src/brews/scheduler.ts', 'import { a } from \'./reminders\'\nimport { b } from \'./reminders/index\'\nexport const f = [a, b]\n'))
  it('service.ts в src/db не лезет', bad('api', IMPORT, from, 'import { recipes } from \'../db/schema\'\nexport const f = recipes\n'))
})

describe('apps/api: process.env — только в config.ts', () => {
  const code = 'export const f = () => process.env.HOME\n'
  it('в разделе — нельзя', bad('api', SYNTAX, 'src/recipes/service.ts', code))
  it('в app.ts — нельзя', bad('api', SYNTAX, 'src/app.ts', code))
  it('в config.ts — можно', ok('api', 'src/config.ts', code))
})

describe('apps/api: изменяемое состояние на уровне модуля запрещено', () => {
  it('let в файле — нельзя', bad('api', SYNTAX, 'src/recipes/service.ts', 'let cache = 0\nexport const f = () => cache++\n'))
  it('экспортируемый let — нельзя', bad('api', SYNTAX, 'src/recipes/service.ts', 'export let cache = 0\n'))
  it('var — нельзя', bad('api', SYNTAX, 'src/recipes/service.ts', 'var cache = 0\nexport const f = () => cache\n'))
  it('Map на уровне модуля — нельзя', bad('api', SYNTAX, 'src/recipes/service.ts', 'const cache = new Map<string, number>()\nexport const f = () => cache\n'))
  it('let в config.ts — тоже нельзя', bad('api', SYNTAX, 'src/config.ts', 'let cache = 0\nexport const f = () => cache++\n'))
  it('let внутри функции — можно', ok('api', 'src/recipes/service.ts', 'export function f() {\n  let n = 0\n  n += 1\n  return n\n}\n'))
  it('const и константные массивы — можно', ok('api', 'src/recipes/service.ts', 'export const LIMITS = [1, 2, 3] as const\n'))
})

describe('apps/api: подпапки раздела и трёхсегментные пути', () => {
  const sub = 'src/brews/reminders/service.ts'
  it('routes.ts в подпапке не импортирует queries.ts', bad('api', IMPORT, 'src/brews/reminders/routes.ts', 'import { list } from \'./queries\'\nexport const f = list\n'))
  it('service.ts в подпапке не импортирует fastify', bad('api', IMPORT, sub, 'import type { FastifyRequest } from \'fastify\'\nexport type R = FastifyRequest\n'))
  it('Drizzle в service.ts подпапки — нельзя', bad('api', IMPORT, sub, DRIZZLE))
  it('Drizzle в queries.ts подпапки — можно', ok('api', 'src/brews/reminders/queries.ts', DRIZZLE))
  it('чужой раздел, трёхсегментный путь — нельзя', bad('api', IMPORT, 'src/recipes/service.ts', 'import { s } from \'../brews/reminders/schedule\'\nexport const f = s\n'))
  it('из подпапки в queries чужого раздела — нельзя', bad('api', IMPORT, sub, 'import { q } from \'../../recipes/queries\'\nexport const f = q\n'))
  it('из подпапки в подпапку чужого раздела — нельзя', bad('api', IMPORT, sub, 'import { q } from \'../../recipes/photos/resize\'\nexport const f = q\n'))
  it('из подпапки в index чужого раздела — можно', ok('api', sub, 'import { r } from \'../../recipes/index\'\nexport const f = r\n'))
  it('из подпапки в корень чужого раздела — можно', ok('api', sub, 'import { r } from \'../../recipes\'\nexport const f = r\n'))
  it('файл своего раздела по соседству — можно', ok('api', sub, 'import { s } from \'../schedule\'\nexport const f = s\n'))
  it('queries.ts в подпапке может тянуть схему базы', ok('api', 'src/brews/reminders/queries.ts', 'import { t } from \'../../db/schema\'\nexport const f = t\n'))
})

describe('apps/api: process.env — без обходов', () => {
  const file = 'src/recipes/service.ts'
  it('process[\'env\']', bad('api', SYNTAX, file, 'export const f = () => process[\'env\'].HOME\n'))
  it('const { env } = process', bad('api', SYNTAX, file, 'const { env } = process\nexport const f = () => env.HOME\n'))
  it('const p = process', bad('api', SYNTAX, file, 'const p = process\nexport const f = () => p.cwd()\n'))
  it('globalThis.process.env', bad('api', SYNTAX, file, 'export const f = () => globalThis.process.env.HOME\n'))
  it('import { env } from \'node:process\'', bad('api', IMPORT, file, 'import { env } from \'node:process\'\nexport const f = () => env.HOME\n'))
  it('import process from \'process\'', bad('api', IMPORT, file, 'import process from \'process\'\nexport const f = () => process.cwd()\n'))
  it('в config.ts process.env по-прежнему можно', ok('api', 'src/config.ts', 'export const f = () => process.env.HOME\n'))
})

describe('any и отключение правил', () => {
  const any = 'export const x: any = 1\n'
  it('any — ошибка', bad('api', '@typescript-eslint/no-explicit-any', 'src/recipes/service.ts', any))
  it('any в core — ошибка', bad('core', '@typescript-eslint/no-explicit-any', 'src/index.ts', any))
  it('any в web — ошибка', bad('web', '@typescript-eslint/no-explicit-any', 'app/utils/x.ts', any))
  it('отключение с причиной — можно', ok('api', 'src/recipes/service.ts',
    '// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ответ внешней библиотеки без типов\n' + any))
  it('отключение без причины — ошибка', bad('api', '@eslint-community/eslint-comments/require-description', 'src/recipes/service.ts',
    '// eslint-disable-next-line @typescript-eslint/no-explicit-any\n' + any))
})

describe('packages/core: чистый TS', () => {
  const file = 'src/index.ts'
  const imp = (what: string) => `import * as m from '${what}'\nexport default m\n`
  it('node:fs — нельзя', bad('core', IMPORT, file, imp('node:fs')))
  it('встроенный модуль без префикса — нельзя', bad('core', IMPORT, file, imp('path')))
  it('fastify — нельзя', bad('core', IMPORT, file, imp('fastify')))
  it('drizzle-orm — нельзя', bad('core', IMPORT, file, imp('drizzle-orm')))
  it('apps/* по пути — нельзя', bad('core', IMPORT, file, imp('../../../apps/api/src/config')))
  it('@hoplab/api — нельзя', bad('core', IMPORT, file, imp('@hoplab/api')))
  it('process — нельзя', bad('core', 'no-restricted-globals', file, 'export const f = () => process.cwd()\n'))
  it('zod и свои файлы — можно', ok('core', file, 'import { z } from \'zod\'\nimport { x } from \'./other\'\nexport const f = () => z.string().parse(x)\n'))
})

// Случай web берёт конфиг Nuxt из apps/web/.nuxt/eslint.config.mjs: его создаёт `nuxt prepare` (postinstall интерфейса).
// При `pnpm install --ignore-scripts` этот блок упадёт — выполните `pnpm --filter @hoplab/web exec nuxt prepare`.
describe('apps/web: не знает о сервере', { timeout: 60_000 }, () => {
  const file = 'app/utils/x.ts'
  const imp = (what: string) => `import * as m from '${what}'\nexport default m\n`
  it('@hoplab/api — нельзя', bad('web', IMPORT, file, imp('@hoplab/api')))
  it('apps/api по пути — нельзя', bad('web', IMPORT, file, imp('../../../../apps/api/src/app')))
  it('fastify — нельзя', bad('web', IMPORT, file, imp('fastify')))
  it('@hoplab/core — можно', ok('web', file, 'import * as m from \'@hoplab/core\'\n\nexport default m\n'))
})
