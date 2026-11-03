import { describe, expect, it } from 'vitest'
import type { BrewDayStep } from '~/types'
import { additionWhen, stepLine } from '~/utils/brewday'
import { dots } from './fixtures'

const STEPS: BrewDayStep[] = [
  { index: 0, key: 'prepare-0', kind: 'prepare', name: 'Подготовка', measures: [], additions: [], at: 1000 },
  { index: 1, key: 'heat-1', kind: 'heat', name: 'Нагрев', temp: 66, measures: [], additions: [] },
  { index: 2, key: 'mash_in-2', kind: 'mash_in', name: 'Засыпать солод', measures: ['ph', 'mash_temp'], additions: [] },
  { index: 3, key: 'rest-3', kind: 'rest', name: 'Осахаривание', temp: 66, minutes: 60, measures: [], additions: [] },
  { index: 4, key: 'rest-4', kind: 'rest', name: 'Мэш-аут', temp: 78, minutes: 10, measures: [], additions: [] },
  { index: 5, key: 'sparge-5', kind: 'sparge', name: 'Промывка', measures: ['first_wort'], additions: [] },
  { index: 6, key: 'boil-6', kind: 'boil', name: 'Кипячение', minutes: 60, measures: [], additions: [{ minutes: 60, label: 'Magnum 26 г' }, { minutes: 10, label: 'Centennial 15 г' }] },
  { index: 7, key: 'chill-7', kind: 'chill', name: 'Охлаждение', temp: 18, measures: ['og', 'fermenter_volume'], additions: [] },
  { index: 8, key: 'pitch-8', kind: 'pitch', name: 'Задать дрожжи', measures: [], additions: [] },
]

describe('подписи шагов', () => {
  it('температура и время шага, закладки по минутам кипячения', () => {
    expect(stepLine(STEPS[3]!)).toBe(dots('66,0 °C · 1 ч'))
    expect(stepLine({ ...STEPS[3]!, watts: 2000 })).toBe(dots('66,0 °C · 1 ч · 2000 W'))      // партия на пивоварне
    expect(stepLine(STEPS[5]!)).toBe('')
    expect([60, 10, 0].map(m => additionWhen(m, 60))).toEqual(['старт', 'за 10 мин', 'конец'])
  })
})
