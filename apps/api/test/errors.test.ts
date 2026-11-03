import { describe, expect, it } from 'vitest'
import { AppError, Conflict, Forbidden, Invalid, Lost, NotFound, Offline, Unsupported } from '../src/errors'
import { makeApp } from './helpers'

// ошибка предметной области → код ответа и тело {detail}
const cases: [string, AppError, number, string][] = [
  ['Invalid', new Invalid('неверные данные'), 400, 'неверные данные'],
  ['Forbidden', new Forbidden('нельзя'), 403, 'нельзя'],
  ['NotFound', new NotFound('нет такого'), 404, 'нет такого'],
  ['Conflict', new Conflict('нельзя в этом состоянии'), 409, 'нельзя в этом состоянии'],
  ['Unsupported', new Unsupported(), 415, 'нужна картинка JPEG, PNG или WebP'],
  ['Offline', new Offline(), 503, 'пивоварня не в сети'],
  ['Lost', new Lost(), 503, 'связь с пивоварней прервалась — команда могла выполниться, проверьте её состояние'],
  ['AppError со своим кодом', new AppError('пивоварня не ответила', 504), 504, 'пивоварня не ответила'],
]

describe('ошибки → { detail }', () => {
  it.each(cases)('%s', async (_name, error, status, detail) => {
    const app = await makeApp()
    app.get('/api/boom', () => {
      throw error
    })
    const res = await app.inject('/api/boom')
    expect(res.statusCode).toBe(status)
    expect(res.json()).toEqual({ detail })
  })

  it('непредвиденная ошибка — 500 без подробностей', async () => {
    const app = await makeApp()
    app.get('/api/boom', () => {
      throw new Error('секрет внутри')
    })
    const res = await app.inject('/api/boom')
    expect(res.statusCode).toBe(500)
    expect(res.json()).toEqual({ detail: 'Internal Server Error' })
  })
})

describe('422 — формат FastAPI: { detail: [{ type, loc, msg }] }', () => {
  it('невалидное тело', async () => {
    const app = await makeApp()
    const res = await app.inject({ method: 'POST', url: '/api/echo', payload: { name: 'я', count: 1.5 } })
    expect(res.statusCode).toBe(422)
    const { detail } = res.json()
    expect(detail).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'too_small', loc: ['body', 'name'], msg: expect.any(String) }),
      expect.objectContaining({ loc: ['body', 'count'], msg: expect.any(String) }),
    ]))
    // интерфейс склеивает msg (apps/web/app/utils/api.ts): у каждой записи он непустой
    expect(detail.every((d: { msg: string }) => d.msg.length > 0)).toBe(true)
  })

  it('нет обязательного поля', async () => {
    const app = await makeApp()
    const res = await app.inject({ method: 'POST', url: '/api/echo', payload: {} })
    expect(res.statusCode).toBe(422)
    expect(res.json().detail[0]).toMatchObject({ type: 'invalid_type', loc: ['body', 'name'] })
  })

  it('невалидный запрос (query) — loc начинается с query', async () => {
    const app = await makeApp()
    const res = await app.inject('/api/search?limit=0')
    expect(res.statusCode).toBe(422)
    expect(res.json().detail[0]).toMatchObject({ loc: ['query', 'limit'] })
  })

  it('верное тело проходит', async () => {
    const app = await makeApp()
    const res = await app.inject({ method: 'POST', url: '/api/echo', payload: { name: 'Пиво' } })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ name: 'Пиво' })
  })
})
