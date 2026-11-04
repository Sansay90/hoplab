// Схема и миграции в синхроне (для CI): `drizzle-kit check` проверяет целостность папки drizzle/, а `generate --explain`
// (сухой прогон) не должен предлагать ни одного изменения — иначе schema.ts правили без `pnpm db:generate`.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const kit = fileURLToPath(new URL('../node_modules/drizzle-kit/bin.cjs', import.meta.url))
const run = (...args: string[]) => spawnSync(process.execPath, [kit, ...args], { encoding: 'utf8' })

const check = run('check')
process.stdout.write(check.stdout)
if (check.status !== 0) {
  process.stderr.write(check.stderr)
  process.exit(check.status ?? 1)
}

const plan = run('generate', '--explain')
if (plan.status !== 0) {
  process.stderr.write(plan.stdout + plan.stderr)
  process.exit(plan.status ?? 1)
}
if (plan.stdout.includes('Generated migration statements')) {
  process.stderr.write(`${plan.stdout}\nsrc/db/schema.ts изменён без миграции: запустите pnpm --filter @hoplab/api db:generate и добавьте drizzle/ в коммит.\n`)
  process.exit(1)
}
console.log('Схема и миграции в синхроне.')
