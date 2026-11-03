import { describe, expect, it } from 'vitest'
import { makeApp } from './helpers'
import type { TestApp } from './helpers'

const preflight = (app: TestApp, origin: string) => app.inject({
  method: 'OPTIONS',
  url: '/api/echo',
  headers: { 'origin': origin, 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' },
})

describe('CORS — только доверенный адрес, с cookie', () => {
  const env = { APP_URL: 'https://hoplab.example' }

  it('доверенный адрес получает разрешение с credentials', async () => {
    const res = await preflight(await makeApp(env), 'https://hoplab.example')
    expect(res.statusCode).toBe(204)
    expect(res.headers['access-control-allow-origin']).toBe('https://hoplab.example')
    expect(res.headers['access-control-allow-credentials']).toBe('true')
    expect(res.headers['access-control-allow-methods']).toContain('POST')
  })

  it('обычный запрос с доверенного адреса тоже отвечает с заголовками CORS', async () => {
    const app = await makeApp(env)
    const res = await app.inject({ url: '/api/health', headers: { origin: 'https://hoplab.example' } })
    expect(res.headers['access-control-allow-origin']).toBe('https://hoplab.example')
    expect(res.headers['access-control-allow-credentials']).toBe('true')
  })

  it('чужой адрес разрешения не получает', async () => {
    const res = await preflight(await makeApp(env), 'https://evil.example')
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('без APP_URL доверенный — локальный адрес', async () => {
    const app = await makeApp()
    expect((await preflight(app, 'http://localhost:3000')).headers['access-control-allow-origin']).toBe('http://localhost:3000')
    expect((await preflight(app, 'https://evil.example')).headers['access-control-allow-origin']).toBeUndefined()
  })
})
