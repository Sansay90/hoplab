// Пересчёт под оборудование: коэффициенты и проверка, что варка влезает в котёл (общие примеры — shared/scale-cases.json).
import { describe, expect, it } from 'vitest'
import { hopGrams, kettleWarnings, scaleFactors, scaleRecipe } from '../src'
import { draft, hop, malt } from './fixtures'

describe('scaleFactors', () => {
  it('объём — множитель для всего, эффективность — только для затираемого', () => {
    const r = { batch: { volume: 20, efficiency: 75 } }
    expect(scaleFactors(r, { volume: 40, efficiency: 75 })).toEqual({ kv: 2, kg: 2, volume: 40, efficiency: 75 })
    expect(scaleFactors(r, { volume: 20, efficiency: 50 }).kg).toBeCloseTo(1.5, 9)
    expect(scaleFactors({}, { volume: 30 })).toMatchObject({ kv: 1, volume: 30 })
  })

  it('копия рецепта: тот же тип и показатели по новым количествам', () => {
    const r = draft({ fermentables: [malt(5, 5)], hops: [hop(30, 10, 60)] })
    const scaled = scaleRecipe(r, { volume: 46, efficiency: 75 })
    expect(scaled.fermentables[0]!.amount).toBe(10)
    expect(scaled.hops[0]!.amount).toBe(60)
    expect(scaled.batch).toMatchObject({ volume: 46, efficiency: 75 })
    expect(r.fermentables[0]!.amount).toBe(5)                      // исходный не тронут
  })
})

describe('kettleWarnings', () => {
  const r = draft({ batch: { volume: 30, efficiency: 75 }, fermentables: [malt(8, 5)], water: { ...draft().water, ratio: 3 } })

  it('нет объёма котла — предупреждений нет', () => {
    expect(kettleWarnings(r, { kettle: null, evaporation: 3 })).toEqual([])
  })

  it('затор не влезает; объём перед кипячением не влезает', () => {
    // заторная вода 24 л + 8 кг × 0,67 = 29,4 л; перед кипячением 30 + 3 = 33 л
    const w = kettleWarnings(r, { kettle: 25, evaporation: 3 })
    expect(w).toHaveLength(2)
    expect(w[0]).toContain('Затор')
    expect(w[1]).toContain('Перед кипячением будет')
  })

  it('влезает — пусто', () => {
    expect(kettleWarnings(r, { kettle: 50, evaporation: 3 })).toEqual([])
  })
})

describe('summary', () => {
  it('сколько хмеля, г', () => {
    expect(hopGrams({ hops: [{ amount: 30 }, { amount: null }, { amount: 12.5 }] })).toBe(42.5)
    expect(hopGrams({})).toBe(0)
  })
})
