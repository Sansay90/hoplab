import { describe, expect, it } from 'vitest'
import { HOP_USES, options, programSummary, whenLabel } from '~/utils/recipe'
import { dots } from './fixtures'

describe('подписи', () => {
  const program = { mash: [{ temp: 52, minutes: 15 }, { temp: 66, minutes: 60 }], boil: { minutes: 60 } }

  it('когда закладка', () => {
    expect(whenLabel(HOP_USES, 'boil', 60)).toBe(dots('Кипячение · 60 мин'))
    expect(whenLabel(HOP_USES, 'whirlpool', 20)).toBe(dots('Вирпул · 20 мин'))
    expect(whenLabel(HOP_USES, 'dry_hop', null, 3)).toBe(dots('Сухое охмеление · 3-й день'))
    expect(whenLabel(HOP_USES, 'mash')).toBe('Затор')
    expect(whenLabel(HOP_USES, 'unknown')).toBe('unknown')
  })

  it('сводка программы', () => {
    expect(programSummary(program)).toBe(dots('3 шага · 2 ч 15 мин'))
    expect(programSummary({ ...program, mash: [], boil: { minutes: 60, watts: 2000 } })).toBe(dots('1 шаг · 1 ч'))
    expect(programSummary({ ...program, mash: [], boil: null })).toBe('без программы')
  })

  it('варианты для выпадающего списка', () => {
    expect(options({ a: 'А', b: 'Б' })).toEqual([{ value: 'a', label: 'А' }, { value: 'b', label: 'Б' }])
  })
})
