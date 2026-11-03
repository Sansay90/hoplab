// Прод-сборка: один бандл, @hoplab/core внутрь (в node_modules он лежит исходниками), остальное — внешние зависимости.
import { defineConfig } from 'tsdown'

export default defineConfig({
  // сервис и команда переноса данных (node dist/cli/import-legacy.mjs); общий код — в общих файлах dist
  entry: { 'main': 'src/main.ts', 'cli/import-legacy': 'src/cli/import-legacy.ts' },
  format: 'esm',
  platform: 'node',
  target: 'node24',
  clean: true,
  deps: { alwaysBundle: ['@hoplab/core'] },
})
