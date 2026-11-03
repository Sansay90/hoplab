// Что общего с остальными пакетами — у интерфейса (apps/web), поверх конфига Nuxt (@nuxt/eslint).
import { strictRules, styleOverrides } from './shared.mjs'

/** Интерфейс не знает о сервере: типы API приходят из openapi.json, расчёты — из @hoplab/core. */
const noServerImports = {
  patterns: [
    { group: ['@hoplab/api', '@hoplab/api/*', '**/apps/api/**'], message: 'Интерфейс не импортирует apps/api: типы — из openapi.json, общий код — из @hoplab/core.' },
    { group: ['fastify', '@fastify/*', 'drizzle-orm', 'drizzle-orm/*'], message: 'Серверные библиотеки в интерфейсе не нужны.' },
  ],
}

export const webRules = {
  rules: {
    ...styleOverrides,
    ...strictRules,
    'no-restricted-imports': ['error', noServerImports],
  },
}
