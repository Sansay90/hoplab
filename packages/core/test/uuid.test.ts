import { describe, expect, it } from 'vitest'
import { uuidv7 } from '../src'

const V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('uuidv7', () => {
  it('версия 7 и вариант RFC', () => {
    for (let i = 0; i < 200; i++) expect(uuidv7()).toMatch(V7)
  })

  it('время — в первых 48 битах', () => {
    const at = Date.UTC(2026, 10, 3, 12, 0, 0)
    const hex = uuidv7(at).replaceAll('-', '').slice(0, 12)
    expect(Number.parseInt(hex, 16)).toBe(at)
  })

  it('время после 2^32 мс не теряется (сдвиг в JS 32-битный)', () => {
    const at = 2 ** 40 + 12345
    expect(Number.parseInt(uuidv7(at).replaceAll('-', '').slice(0, 12), 16)).toBe(at)
  })

  it('возрастает с временем: строки сортируются как моменты', () => {
    const start = Date.UTC(2026, 0, 1)
    const ids = Array.from({ length: 50 }, (_, i) => uuidv7(start + i * 7))
    expect([...ids].sort()).toEqual(ids)
  })

  it('не повторяется в одну миллисекунду', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => uuidv7(1_700_000_000_000)))
    expect(ids.size).toBe(1000)
  })

  it('по умолчанию — текущее время', () => {
    const before = Date.now()
    const stamp = Number.parseInt(uuidv7().replaceAll('-', '').slice(0, 12), 16)
    expect(stamp).toBeGreaterThanOrEqual(before)
    expect(stamp).toBeLessThanOrEqual(Date.now())
  })
})
