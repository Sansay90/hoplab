import { describe, expect, it } from 'vitest'
import { fmtMinutes, fmtNumber, plural } from '../src'

describe('форматирование', () => {
  it('число по-русски', () => {
    expect(fmtNumber(5.256, 2, ' кг')).toBe('5,26 кг')
    expect(fmtNumber(1234.5)).toBe('1\u00A0235')       // разряды — неразрывным пробелом
    expect(fmtNumber(0, 1, ' л')).toBe('0 л')
    expect(fmtNumber(null, 1, ' л')).toBe('—')
  })

  it('минуты', () => {
    expect(fmtMinutes(45)).toBe('45 мин')
    expect(fmtMinutes(60)).toBe('1 ч')
    expect(fmtMinutes(70)).toBe('1 ч 10 мин')
  })

  it.each([
    [0, 'шагов'], [1, 'шаг'], [2, 'шага'], [4, 'шага'], [5, 'шагов'], [11, 'шагов'], [12, 'шагов'], [14, 'шагов'],
    [21, 'шаг'], [22, 'шага'], [111, 'шагов'], [101, 'шаг'],
  ])('%i %s', (n, word) => {
    expect(plural(n, 'шаг', 'шага', 'шагов')).toBe(word)
  })
})
