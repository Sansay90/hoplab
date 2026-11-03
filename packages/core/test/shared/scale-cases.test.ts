// Пересчёт под оборудование — как у сервиса (shared/scale-cases.json).
import { describe, it } from 'vitest'
import type { RecipeInput } from '../../src'
import { scaleRecipe } from '../../src'
import scaleCases from '../../../../shared/scale-cases.json'
import { cases, same } from './helpers'

describe('пересчёт под оборудование — как у сервиса (shared/scale-cases.json)', () => {
  it.each(cases<RecipeInput>(scaleCases))('%s', (_, c) => {
    const to = (c as unknown as { to: { volume: number | null; efficiency: number | null } }).to
    same(scaleRecipe(c.recipe as RecipeInput, to), c.expected)
  })
})
