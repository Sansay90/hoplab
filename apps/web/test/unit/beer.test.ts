import { describe, expect, it } from 'vitest'
import { beerColor, ebcGradient } from '~/utils/beer'

describe('beerColor', () => {
  const lower = (c: string | null) => c?.toLowerCase()

  it('на опорных точках — их цвет', () => {
    expect(lower(beerColor(2))).toBe('#f8eaa2')
    expect(lower(beerColor(4))).toBe('#f6e07a')
    expect(lower(beerColor(20))).toBe('#c77423')
    expect(lower(beerColor(80))).toBe('#0a0605')
  })

  it('между точками — линейно по каналам', () => {
    // 3 EBC — посередине между #F8EAA2 и #F6E07A
    expect(lower(beerColor(3))).toBe('#f7e58e')
  })

  it('за краями шкалы — крайние цвета', () => {
    expect(lower(beerColor(0))).toBe('#f8eaa2')
    expect(lower(beerColor(500))).toBe('#0a0605')
  })

  it('цвет не задан — null', () => {
    expect(beerColor(null)).toBeNull()
    expect(beerColor(undefined)).toBeNull()
  })

  it('градиент проходит через опорные точки внутри диапазона', () => {
    expect(ebcGradient(4, 12)).toBe('linear-gradient(to right, #f6e07a 0.0%, #f2d04e 25.0%, #edc03a 50.0%, #e2a42c 100.0%)')
    expect(ebcGradient(10, 10)).toBe(beerColor(10))
  })
})
