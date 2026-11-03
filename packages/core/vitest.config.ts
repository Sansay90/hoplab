import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // расчёты рецепта: ошибка здесь — неверный рецепт
      thresholds: { lines: 90 },
    },
  },
})
