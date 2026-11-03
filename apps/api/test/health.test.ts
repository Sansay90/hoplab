import { describe, expect, it } from 'vitest'
import { makeApp } from './helpers'

describe('/api/health', () => {
  it('отвечает {ok: true}', async () => {
    const app = await makeApp()
    const res = await app.inject('/api/health')
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
  })

  it('описан в OpenAPI (/openapi.json), страница документации — /docs', async () => {
    const app = await makeApp()
    const spec = (await app.inject('/openapi.json')).json()
    expect(spec.info.title).toBe('Hoplab')
    expect(spec.paths['/api/health'].get.summary).toContain('Сервис жив')
    const docs = await app.inject('/docs/')
    expect(docs.statusCode).toBe(200)
    expect(docs.headers['content-type']).toContain('text/html')
  })

  it('неизвестный адрес — 404 с detail', async () => {
    const app = await makeApp()
    const res = await app.inject('/api/нет-такого')
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ detail: 'Not Found' })
  })
})
