// Запуск: настройки → база и миграции → buildApp → listen; SIGTERM/SIGINT (docker stop) → app.close() (закрывает и базу).
import closeWithGrace from 'close-with-grace'
import { buildApp } from './app'
import { ConfigError, loadConfigFromProcess } from './config'
import { createDb, migrateDb } from './db'

try {
  const config = loadConfigFromProcess()
  if (!config.databaseUrl) throw new ConfigError('Не задан DATABASE_URL (переменная окружения или файл .env)')
  const db = createDb(config.databaseUrl, { onError: error => console.error('база:', error.message) })
  // не вышло поднять приложение — пул закрываем, иначе процесс не завершится
  const app = await migrateDb(db).then(() => buildApp({ config, db })).catch(async (e: unknown) => {
    await db.$client.end()
    throw e
  })

  closeWithGrace({ delay: 10_000 }, async ({ signal, err }) => {
    if (err) app.log.error(err)
    app.log.info({ signal }, 'остановка')
    await app.close()
  })

  await app.listen({ host: config.host, port: config.port })
} catch (e) {
  if (e instanceof ConfigError) {
    console.error(e.message)
  } else {
    console.error(e)
  }
  process.exit(1)
}
