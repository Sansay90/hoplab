// drizzle-kit: схема → SQL миграции (папка drizzle/ — в коммит). Запуск: pnpm db:generate, проверка — pnpm db:check.
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
})
