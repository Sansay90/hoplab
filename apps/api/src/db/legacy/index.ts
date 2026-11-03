// Перенос данных из старой базы (шаг 2 плана): CLI src/cli/import-legacy.ts зовёт только эти функции.
export { connectLegacy, importLegacy, LegacyImportError, LegacyVerifyError, verifyOnly } from './import'
export type { CheckResult, ImportReport } from './import'
