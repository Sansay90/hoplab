import { describe, expect, it } from 'vitest'
import { dryHopDays } from '@hoplab/core'
import { batchStatus, brewFacts, dryHopWhen, entryInput, entryKindItems, entryValue, fromStored, planDelta, stageCondition, toStored } from '~/utils/brewlog'
import { dots } from './fixtures'

const DAY = 86400

describe('факт против плана', () => {
  it('разница — между показанными числами; совпали — «как в рецепте»', () => {
    expect(planDelta(5.16, 5.03, 1, ' %')).toBe('+0,2 %')                  // показаны 5,2 и 5,0
    expect(planDelta(12.04, 12.16, 1, ' °P')).toBe('−0,2 °P')                // 12,0 против 12,2
    expect(planDelta(12.06, 12.14, 1, ' °P')).toBe('как в рецепте')         // обе — 12,1
    expect(planDelta(1.0512, 1.0508, 3)).toBe('как в рецепте')               // обе — 1,051
    expect(planDelta(1.049, 1.051, 3)).toBe('−0,002')
  })
})

describe('журнал варки', () => {
  it('плотность вводится в °P, хранится в SG и обратно', () => {
    const sg = toStored('og', 12.8, 'plato')
    expect(sg).toBeCloseTo(1.0517, 3)
    expect(fromStored('og', sg, 'plato')).toBe(12.8)
    expect(toStored('og', 1.052, 'sg')).toBe(1.052)
    expect(toStored('ph', 5.32, 'plato')).toBe(5.32)              // не плотность — как есть
  })

  it('значение для показа — в единицах пивовара', () => {
    expect(entryValue('fg', 1.012, 'sg')).toBe('1,012')
    expect(entryValue('ph', 5.3, 'plato')).toBe('pH 5,3')
    expect(entryValue('fermenter_volume', 23.5, 'plato')).toBe('23,5 л')
    expect(entryValue('temp', 18, 'plato')).toBe('18 °C')
    expect(entryValue('note', null, 'plato')).toBe('')
  })

  it('поле ввода: единица и шаг; у вех и заметки поля нет', () => {
    expect(entryInput('gravity', 'plato')).toMatchObject({ suffix: '°P', step: 0.1 })
    expect(entryInput('temp', 'sg')).toMatchObject({ suffix: '°C', step: 0.5 })
    expect(entryInput('dry_hop', 'sg')).toBeNull()
  })

  it('итог варки одной строкой', () => {
    expect(brewFacts({ og: 1.052, fg: 1.012, abv: 5.25, volume: 23.5 }, 'sg')).toBe(dots('1,052 → 1,012 · 5,3 % · 23,5 л'))
    expect(brewFacts({ og: 1.052, fg: null, abv: null, volume: 23 }, 'sg')).toBe(dots('OG 1,052 · 23 л'))
    expect(brewFacts({ og: null, fg: null, abv: null, volume: null }, 'sg')).toBe('')
  })

  it('виды записей — по группам, в порядке варки', () => {
    const groups = entryKindItems()
    expect(groups.map(g => g[0]!.label)).toEqual(['Варочный день', 'Брожение и розлив', 'Заметка'])
    expect(groups[0]![1]).toMatchObject({ value: 'ph' })
  })
})

describe('статус партии', () => {
  it('статус партии', () => {
    expect(batchStatus({ phase: 'brewday', status: 'running', manual: false, fermentStart: null }, DAY)).toMatchObject({ label: 'варка идёт' })
    expect(batchStatus({ phase: 'brewday', status: 'stopped', manual: false, fermentStart: null }, DAY)).toMatchObject({ label: 'варочный день' })
    expect(batchStatus({ phase: 'brewday', status: 'running', manual: true, fermentStart: null }, DAY)).toMatchObject({ label: 'варочный день' })
    expect(batchStatus({ phase: 'fermenting', status: 'finished', manual: true, fermentStart: 0 }, 2.5 * DAY)).toMatchObject({ label: dots('брожение · день 3') })
    expect(batchStatus({ phase: 'packaged', status: 'finished', manual: true, fermentStart: 0 }, 9 * DAY)).toMatchObject({ label: 'разлито' })
    expect(batchStatus({ phase: 'dumped', status: 'finished', manual: true, fermentStart: 0 }, 9 * DAY)).toMatchObject({ label: 'вылито' })
    expect(batchStatus({ phase: 'fermenting', status: 'finished', manual: true, fermentStart: 0 }, 90 * DAY)).toBeNull()
    expect(batchStatus({ phase: 'fermenting', status: 'finished', manual: true, fermentStart: null }, DAY)).toBeNull()
  })
})

describe('условия этапов и сухого охмеления', () => {
  it('этап: до плотности, до FG, выдержка', () => {
    const stages = [
      { temp: 12, days: 5, until: 'gravity' as const, gravity: 1.024 },
      { temp: 16.5, days: 4, until: 'fg' as const },
      { temp: 4, days: 2, until: 'days' as const },
    ]
    expect(stageCondition(stages[0]!, 'sg')).toBe(dots('до 1,024 · ~5 дн.'))
    expect(stageCondition(stages[1]!, 'sg')).toBe(dots('до FG · ~4 дн.'))
    expect(stageCondition(stages[2]!, 'sg')).toBe('2 дн.')
  })

  it('сухое охмеление: по плотности и по дню', () => {
    const groups = dryHopDays([
      { name: 'Citra', amount: 50, use: 'dry_hop', day: 5 },
      { name: 'Mosaic', amount: 50, use: 'dry_hop', day: 4, gravity: 1.018 },
      { name: 'Simcoe', amount: 50, use: 'dry_hop', day: 3, gravity: 1.024 },
    ])
    expect(dryHopWhen(groups[0]!, 'sg')).toBe(dots('при 1,024 · ~3-й день'))
    expect(dryHopWhen(groups[2]!, 'sg')).toBe('5-й день брожения')
  })
})
