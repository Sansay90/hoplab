// Показатели — как у сервиса (shared/calc-cases.json).
import { describe, expect, it } from 'vitest'
import type { RecipeInput } from '../../src'
import { calcRecipe } from '../../src'
import calcCases from '../../../../shared/calc-cases.json'
import { cases } from './helpers'

describe('показатели — как у сервиса (shared/calc-cases.json)', () => {
  it.each(cases<Record<string, number | boolean | null>>(calcCases))('%s', (_, c) => {
    const got: Record<string, number | boolean | null> = { ...calcRecipe(c.recipe as RecipeInput) }
    expect(Object.keys(got).sort()).toEqual(Object.keys(c.expected).sort())
    for (const [key, value] of Object.entries(c.expected)) {
      if (typeof value === 'number') expect(got[key], key).toBeCloseTo(value, 9)
      else expect(got[key], key).toBe(value)
    }
  })
})
