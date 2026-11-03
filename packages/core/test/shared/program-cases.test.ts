// Программа пивоварни — как у сервиса (shared/program-cases.json).
import { describe, expect, it } from 'vitest'
import type { RecipeInput } from '../../src'
import { boilGroups, deviceTimers, programOf } from '../../src'
import programCases from '../../../../shared/program-cases.json'
import { cases } from './helpers'

interface ProgramExpected {
  steps: { temp: number; minutes: number; watts: number; boil: boolean }[]
  timers: number[]
  slots: { minutes: number; items: unknown[] }[]
}

describe('программа пивоварни — как у сервиса (shared/program-cases.json)', () => {
  it.each(cases<ProgramExpected>(programCases))('%s', (_, c) => {
    const r = c.recipe as RecipeInput
    // температура кипячения на экране — метка пивоварни, у сервиса — 100 °C: сравниваются паузы
    expect(programOf(r).map(s => ({ minutes: s.minutes, watts: s.watts, boil: s.boil, ...(s.boil ? {} : { temp: s.temp }) })))
      .toEqual(c.expected.steps.map(s => ({ minutes: s.minutes, watts: s.watts, boil: s.boil, ...(s.boil ? {} : { temp: s.temp }) })))
    expect(deviceTimers(r)).toEqual(c.expected.timers)
    // в JSON у сервиса нет undefined: отсутствующее количество (у оборудования) приходит как null
    const groups = boilGroups(r).map(g => ({ ...g, items: g.items.map(i => ({ ...i, amount: i.amount ?? null })) }))
    expect(groups).toEqual(c.expected.slots)
  })
})
