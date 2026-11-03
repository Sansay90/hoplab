import { describe, expect, it } from 'vitest'
import { abvOf, fmtGravity, gravityIn, hydrometerSg, platoFromSg, refractometerPlato, sgFromPlato } from '../src'

describe('плотность', () => {
  it('ареометр — поправка на температуру пробы, рефрактометр — Brix ÷ WCF', () => {
    expect(platoFromSg(hydrometerSg(sgFromPlato(12), 29))).toBeCloseTo(12.55, 1)   // тёплая проба — показывает меньше
    expect(hydrometerSg(1.048, 20)).toBeCloseTo(1.048, 6)                             // на калибровочной — как есть
    expect(platoFromSg(hydrometerSg(sgFromPlato(12), 15))).toBeLessThan(12)           // холодная — больше
    expect(refractometerPlato(12.9)).toBeCloseTo(12.4, 1)
    expect(refractometerPlato(12.9, 1)).toBe(12.9)
  })

  it('°P и SG взаимно обратны', () => {
    for (const p of [0, 5, 12, 20, 30]) expect(platoFromSg(sgFromPlato(p))).toBeCloseTo(p, 1)
  })

  it('опорные точки: 12 °P ≈ 1.0484, 1.048 ≈ 11.9 °P', () => {
    expect(sgFromPlato(12)).toBeCloseTo(1.0484, 4)
    expect(platoFromSg(1.048)).toBeCloseTo(11.9, 1)
    expect(sgFromPlato(0)).toBe(1)
  })

  it('в единицах человека и с подписью', () => {
    expect(gravityIn(1.048, 'plato')).toBe(11.9)
    expect(gravityIn(1.0484, 'sg')).toBe(1.048)
    expect(fmtGravity(1.048, 'plato')).toBe('11,9 °P')
    expect(fmtGravity(1.05, 'sg')).toBe('1,050')
    expect(fmtGravity(null, 'plato')).toBe('—')
  })
})

describe('abvOf', () => {
  it('1.050 → 1.010: формула с поправкой на плотность даёт 5.34 %, упрощённая 131.25 × ΔSG — 5.25 %', () => {
    // 76.08 × 0.040 / (1.775 − 1.050) × 1.010 / 0.794 = 5.339
    expect(abvOf(1.05, 1.01)).toBeCloseTo(5.339, 2)
    expect(Math.abs(abvOf(1.05, 1.01)! - 0.04 * 131.25)).toBeLessThan(0.1)
  })

  it('без плотностей или без сбраживания — null', () => {
    expect(abvOf(null, 1.01)).toBeNull()
    expect(abvOf(1.05, undefined)).toBeNull()
    expect(abvOf(1.05, 1.05)).toBeNull()
    expect(abvOf(1.01, 1.05)).toBeNull()
  })
})
