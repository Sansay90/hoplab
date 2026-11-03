import { describe, expect, it } from 'vitest'
import { makeApp } from './helpers'
import type { TestApp } from './helpers'

const post = (app: TestApp, headers: Record<string, string>) =>
  app.inject({ method: 'POST', url: '/api/echo', headers, payload: { name: 'Пиво' } })

describe('изменяющие запросы — только со своего сайта (APP_URL задан)', () => {
  const env = { APP_URL: 'https://hoplab.example/' }

  it('чужой Origin — 403 «запрос с чужого сайта»', async () => {
    const res = await post(await makeApp(env), { origin: 'https://evil.example' })
    expect(res.statusCode).toBe(403)
    expect(res.json()).toEqual({ detail: 'запрос с чужого сайта' })
  })

  it('похожий адрес с хвостом — тоже чужой', async () => {
    const res = await post(await makeApp(env), { origin: 'https://hoplab.example.evil.com' })
    expect(res.statusCode).toBe(403)
  })

  it('свой Origin (APP_URL) проходит', async () => {
    const res = await post(await makeApp(env), { origin: 'https://hoplab.example' })
    expect(res.statusCode).toBe(200)
  })

  it('Origin совпал с адресом запроса (заголовок Host) — проходит', async () => {
    const res = await post(await makeApp(env), { origin: 'http://api.internal:8000', host: 'api.internal:8000' })
    expect(res.statusCode).toBe(200)
  })

  it('запрос без Origin (не браузер) проходит', async () => {
    const res = await post(await makeApp(env), {})
    expect(res.statusCode).toBe(200)
  })

  it('GET с чужим Origin проходит: читать можно', async () => {
    const app = await makeApp(env)
    const res = await app.inject({ url: '/api/health', headers: { origin: 'https://evil.example' } })
    expect(res.statusCode).toBe(200)
  })

  it('схема из X-Forwarded-Proto учитывается (за nginx)', async () => {
    const res = await post(await makeApp(env), {
      'origin': 'https://api.internal', 'host': 'api.internal', 'x-forwarded-proto': 'https',
    })
    expect(res.statusCode).toBe(200)
  })
})

describe('без APP_URL сервис у себя на ПК', () => {
  it.each(['http://localhost:3000', 'http://127.0.0.1:3000', 'http://192.168.1.20:3000', 'http://10.0.0.5'])(
    'свой адрес %s проходит', async (origin) => {
      expect((await post(await makeApp(), { origin })).statusCode).toBe(200)
    })

  it('чужой — отказ', async () => {
    const res = await post(await makeApp(), { origin: 'https://evil.example' })
    expect(res.statusCode).toBe(403)
    expect(res.json()).toEqual({ detail: 'запрос с чужого сайта' })
  })
})
