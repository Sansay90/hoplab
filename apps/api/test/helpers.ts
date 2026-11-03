import { z } from 'zod'
import { buildApp } from '../src/app'
import { loadConfig } from '../src/config'
import type { Config } from '../src/config'

const testConfig = (env: Record<string, string> = {}): Config => loadConfig(env)

export type TestApp = Awaited<ReturnType<typeof makeApp>>

/** Приложение для теста: журнал выключен; пробные маршруты регистрируются до первого запроса. */
export async function makeApp(env: Record<string, string> = {}) {
  const app = await buildApp({ config: testConfig(env) }, { logger: false })
  app.post('/api/echo', {
    schema: { body: z.object({ name: z.string().min(2), count: z.number().int().optional() }) },
  }, request => request.body)
  app.get('/api/search', { schema: { querystring: z.object({ limit: z.coerce.number().int().min(1) }) } }, () => ({ ok: true }))
  app.get('/api/item/:n', { schema: { params: z.object({ n: z.coerce.number().int() }) } }, () => ({ ok: true }))
  app.get('/api/needs-header', { schema: { headers: z.object({ 'x-token': z.string() }) } }, () => ({ ok: true }))
  app.get('/api/ip', request => ({ ip: request.ip }))
  return app
}
