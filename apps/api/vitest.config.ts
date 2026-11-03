import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globalSetup: ['test/global-setup.ts'],
    // тесты базы делят одну тестовую базу и чистят её перед каждым тестом — файлы идут по очереди
    fileParallelism: false,
  },
})
