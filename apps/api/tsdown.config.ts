// Прод-сборка: один бандл, @hoplab/core внутрь (в node_modules он лежит исходниками), остальное — внешние зависимости.
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/main.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node24',
  clean: true,
  deps: { alwaysBundle: ['@hoplab/core'] },
})
