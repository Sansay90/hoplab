// Точка входа: pnpm --filter @hoplab/api import-legacy -- [--dry-run] [--verify] (dev, через tsx);
// в образе — node dist/cli/import-legacy.mjs [--dry-run] [--verify] (DATABASE_URL и LEGACY_DATABASE_URL из окружения).
import { ConfigError, loadConfigFromProcess } from '../config'
import { LegacyImportError } from '../db/legacy'
import { runImportLegacy } from './import-legacy-command'

try {
  process.exitCode = await runImportLegacy(process.argv.slice(2), loadConfigFromProcess(), line => console.log(line))
} catch (e) {
  console.error(e instanceof ConfigError || e instanceof LegacyImportError ? e.message : e)
  process.exitCode = 1
}
