// Схема рецепта: общие рецепты проходят, отказы по телу рецепта (422 у сервиса, service/tests) — отклоняются так же.
import { describe, expect, it } from 'vitest'
import { recipeSchema } from '../src'
import calcCases from '../../../shared/calc-cases.json'
import programCases from '../../../shared/program-cases.json'
import scaleCases from '../../../shared/scale-cases.json'

// у общих примеров рецепт — только то, что читают расчёты, без названия (у сервиса оно обязательно): название подставляем
const named = (name: string, recipe: object) => ({ name, ...recipe })

const shared: (readonly [string, unknown])[] = [
  ...calcCases.map(c => [`calc: ${c.name}`, named(c.name, c.recipe)] as const),
  ...programCases.map(c => [`program: ${c.name}`, named(c.name, c.recipe)] as const),
  ...scaleCases.flatMap(c => [
    [`scale: ${c.name}`, named(c.name, c.recipe)], [`scale (результат): ${c.name}`, named(c.name, c.expected)],
  ] as const),
]

describe('общие рецепты (shared/*.json) проходят схему', () => {
  it.each(shared)('%s', (_, recipe) => {
    expect(recipeSchema.safeParse(recipe).success).toBe(true)
  })
})

describe('значения по умолчанию — как у сервиса', () => {
  it('один name — остальное по умолчанию', () => {
    expect(recipeSchema.parse({ name: 'Пилс' })).toEqual({
      name: 'Пилс',
      style: null,
      batch: { volume: null, efficiency: null, evaporation: null },
      targets: { og: null, fg: null, ibu: null, ebc: null, abv: null },
      fermentables: [],
      hops: [],
      miscs: [],
      yeasts: [],
      water: { ratio: null, ph: null, source: { ca: 0, mg: 0, na: 0, cl: 0, so4: 0, hco3: 0 }, additions: [] },
      mash: [],
      heat: null,
      boil: null,
      fermentation: [],
      notes: '',
    })
  })

  it('строки получают свои значения по умолчанию', () => {
    const r = recipeSchema.parse({
      name: 'X',
      fermentables: [{}], hops: [{}], miscs: [{}], yeasts: [{}],
      water: { additions: [{ agent: 'gypsum' }] },
      mash: [{ temp: 66, minutes: 60 }], boil: { minutes: 60 }, fermentation: [{ temp: 18 }],
    })
    expect(r.fermentables[0]).toEqual({ name: '', kind: 'grain', amount: null, ebc: null, use: 'mash', minutes: null })
    expect(r.hops[0]).toEqual({ name: '', alpha: null, amount: null, use: 'boil', minutes: null, day: null, gravity: null })
    expect(r.miscs[0]).toEqual({ name: '', kind: 'adjunct', amount: null, unit: 'g', use: 'boil', minutes: null })
    expect(r.yeasts[0]).toEqual({ name: '', form: 'dry', amount: null, unit: 'pkg', attenuation: null })
    expect(r.water.additions[0]).toEqual({ agent: 'gypsum', name: '', amount: null, target: 'mash' })
    expect(r.mash[0]).toEqual({ name: null, temp: 66, minutes: 60, watts: null })
    expect(r.boil).toEqual({ minutes: 60, watts: null })
    expect(r.fermentation[0]).toEqual({ name: null, temp: 18, days: 0, until: 'days', gravity: null })
  })

  it('лишние поля отбрасываются, как у сервиса', () => {
    expect(recipeSchema.parse({ name: 'X', unknown: true })).not.toHaveProperty('unknown')
  })
})

describe('отказы по телу рецепта', () => {
  const base = { name: 'Тест' }
  const rejects = (over: object) => expect(recipeSchema.safeParse({ ...base, ...over }).success).toBe(false)
  const accepts = (over: object) => expect(recipeSchema.safeParse({ ...base, ...over }).success).toBe(true)

  // service/tests/test_recipes.py::test_recipe_numbers_bounded
  it('отрицательный объём и масса — отказ; крошечный объём — можно', () => {
    rejects({ batch: { volume: -1 } })
    rejects({ fermentables: [{ name: 'Пилснер', amount: -5 }] })
    accepts({ batch: { volume: 1e-300 } })
  })

  // service/tests/test_reminders.py::test_fermentation_stage_is_checked
  it('этап «до плотности»: без плотности и плотность вне разумного — отказ; дни необязательны', () => {
    const stage = { name: 'Основное', temp: 12, until: 'gravity' }
    rejects({ fermentation: [stage] })
    rejects({ fermentation: [{ ...stage, gravity: 1.5 }] })
    accepts({ fermentation: [{ ...stage, gravity: 1.024 }] })
    expect(recipeSchema.parse({ ...base, fermentation: [{ ...stage, gravity: 1.024 }] }).fermentation[0]!.days).toBe(0)
    expect(recipeSchema.safeParse({ ...base, fermentation: [stage] }).error!.issues[0]!.message).toBe('этап «до плотности» — укажите плотность')
  })

  it('пределы полей рецепта', () => {
    rejects({ batch: { volume: 10_001 } })
    rejects({ fermentables: [{ amount: 10_001 }] })
    rejects({ fermentables: [{ ebc: -1 }] })
    rejects({ hops: [{ alpha: 101 }] })
    rejects({ hops: [{ amount: 100_001 }] })
    rejects({ hops: [{ gravity: 0.97 }] })
    rejects({ miscs: [{ amount: -1 }] })
    rejects({ yeasts: [{ attenuation: 101 }] })
    rejects({ water: { ph: 3.9 } })
    rejects({ water: { ph: 7.1 } })
    rejects({ water: { additions: [{ agent: 'gypsum', amount: -1 }] } })
    rejects({ fermentation: [{ temp: 18, days: -1 }] })
    accepts({ water: { ph: 5.4 }, hops: [{ alpha: 100, gravity: 1.2 }] })
  })

  it('перечисления, обязательные поля и целые', () => {
    rejects({ fermentables: [{ kind: 'honey' }] })
    rejects({ hops: [{ use: 'keg' }] })
    rejects({ miscs: [{ kind: 'hop' }] })
    rejects({ yeasts: [{ unit: 'kg2' }] })
    rejects({ water: { additions: [{ agent: 'salt' }] } })
    rejects({ water: { additions: [{}] } })
    rejects({ mash: [{ temp: 66 }] })
    rejects({ mash: [{ temp: 66, minutes: 60.5 }] })
    rejects({ boil: { minutes: 'час' } })
    expect(recipeSchema.safeParse({}).success).toBe(false)
    expect(recipeSchema.safeParse({ name: 5 }).success).toBe(false)
  })
})
