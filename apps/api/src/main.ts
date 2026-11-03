// Запуск: настройки → buildApp → listen; SIGTERM/SIGINT (docker stop) → app.close().
import closeWithGrace from 'close-with-grace'
import { buildApp } from './app'
import { ConfigError, loadConfigFromProcess } from './config'

try {
  const config = loadConfigFromProcess()
  const app = await buildApp({ config })

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
