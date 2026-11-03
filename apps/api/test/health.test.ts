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

describe('trustProxy (FORWARDED_ALLOW_IPS)', () => {
  const ip = async (env: Record<string, string>, remoteAddress: string) => {
    const app = await makeApp(env)
    const res = await app.inject({ url: '/api/ip', remoteAddress, headers: { 'x-forwarded-for': '1.2.3.4' } })
    return res.json().ip
  }

  it('по умолчанию (127.0.0.1) X-Forwarded-For от чужого адреса не учитывается', async () => {
    expect(await ip({}, '203.0.113.5')).toBe('203.0.113.5')
  })
  it('от доверенного адреса — учитывается', async () => {
    expect(await ip({}, '127.0.0.1')).toBe('1.2.3.4')
  })
  it('«*» — учитывается от любого', async () => {
    expect(await ip({ FORWARDED_ALLOW_IPS: '*' }, '203.0.113.5')).toBe('1.2.3.4')
  })
  it('CIDR в списке', async () => {
    expect(await ip({ FORWARDED_ALLOW_IPS: '203.0.113.0/24' }, '203.0.113.5')).toBe('1.2.3.4')
  })
})
