// Команда переноса данных из старой базы (Python-сервис) в новую: разбор аргументов и вызов src/db/legacy — SQL здесь нет.
// Запуск — import-legacy.ts (в dev: pnpm --filter @hoplab/api import-legacy -- [--dry-run] [--verify]).
import { parseArgs } from 'node:util'
import type { Config } from '../config'
import { createDb, migrateDb } from '../db'
import { connectLegacy, importLegacy, LegacyImportError, LegacyVerifyError, verifyOnly } from '../db/legacy'
import type { CheckResult } from '../db/legacy'

export const USAGE = `Перенос данных из старой базы (LEGACY_DATABASE_URL) в новую (DATABASE_URL).
Миграции новой базы команда применяет сама (идемпотентно), затем проверяет, что база пуста; иначе отказ. Сервис для
этого запускать не нужно.

  --dry-run      всё сделать и проверить (сверка включена), но транзакцию откатить; печатает счётчики.
                 Миграции при этом применяются: они не часть переноса, а подготовка пустой базы
  --verify       сверить старую и новую базу до commit: каждая таблица построчно, по всем колонкам;
                 расхождение — откат и ненулевой код выхода
  --verify-only  только сверка уже перенесённых данных, без записи (миграции не применяются)
  --help         эта подсказка
`

const EXAMPLES = 5

function printChecks(checks: CheckResult[], out: (line: string) => void) {
  const bad = checks.filter(c => !c.ok)
  out(`Сверка: ${checks.length} таблиц, ${bad.length === 0 ? 'расхождений нет' : `с расхождениями: ${bad.length}`}`)
  for (const c of bad) {
    out(`  РАСХОЖДЕНИЕ ${c.name}: строк в старой ${c.legacy}, в новой ${c.target}; расхождений ${c.mismatchCount}`
      + (c.mismatchCount > c.mismatches.length ? ` (показаны первые ${c.mismatches.length})` : ''))
    for (const m of c.mismatches) out(`    ${m.table} [${m.key}] ${m.column}: старая ${m.legacy}, новая ${m.target}`)
  }
}

/** Выполнить команду; вернуть код выхода (0 — успех). */
export async function runImportLegacy(argv: string[], config: Config, out: (line: string) => void): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      'dry-run': { type: 'boolean' }, 'verify': { type: 'boolean' }, 'verify-only': { type: 'boolean' },
      'help': { type: 'boolean' },
    },
  })
  if (values.help) {
    out(USAGE)
    return 0
  }
  if (values['verify-only'] && (values['dry-run'] || values.verify)) {
    out('--verify-only не сочетается с --dry-run и --verify')
    return 1
  }
  if (!config.legacyDatabaseUrl) throw new LegacyImportError('Не задан LEGACY_DATABASE_URL — адрес старой базы')
  if (!config.databaseUrl) throw new LegacyImportError('Не задан DATABASE_URL — адрес новой базы')
  if (config.legacyDatabaseUrl === config.databaseUrl) {
    throw new LegacyImportError('LEGACY_DATABASE_URL и DATABASE_URL совпадают: перенос идёт из одной базы в другую')
  }

  const db = createDb(config.databaseUrl)
  const source = await connectLegacy(config.legacyDatabaseUrl)
  try {
    if (values['verify-only']) {
      const checks = await verifyOnly(db, source, { examples: EXAMPLES })
      printChecks(checks, out)
      return checks.every(c => c.ok) ? 0 : 1
    }
    await migrateDb(db)
    const report = await importLegacy(db, source, { dryRun: values['dry-run'], verify: values.verify })
    out(report.dryRun ? 'Пробный перенос (dry-run): ничего не записано. Строк:' : 'Перенесено строк:')
    for (const [table, n] of Object.entries(report.counts)) out(`  ${table.padEnd(20)}${n}`)
    if (report.checks) printChecks(report.checks, out)
    return 0
  } catch (e) {
    if (e instanceof LegacyVerifyError) {
      printChecks(e.checks, out)
      out(e.message)
      return 1
    }
    throw e
  } finally {
    await source.close()
    await db.$client.end()
  }
}
