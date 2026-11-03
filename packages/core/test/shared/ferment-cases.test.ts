// Расписание брожения — как у сервиса (shared/ferment-cases.json).
import { describe, it } from 'vitest'
import type { Fact, PlanIn } from '../../src'
import { fermentAdvice, fermentCalm, fermentPlan } from '../../src'
import fermentCases from '../../../../shared/ferment-cases.json'
import { same } from './helpers'

interface FermentCase {
  name: string
  plan: PlanIn
  start: number
  now: number
  entries: Fact[]
  expected: unknown
}

describe('расписание брожения — как у сервиса (shared/ferment-cases.json)', () => {
  it.each((fermentCases as unknown as FermentCase[]).map(c => [c.name, c] as const))('%s', (_, c) => {
    const p = fermentPlan(c.plan, c.start, c.now, null, c.entries)
    const advice = fermentAdvice(p, c.plan, c.entries)
    const calm = fermentCalm(p, c.plan, c.entries)
    same({
      current: p.current,
      stages: p.stages.map(s => ({ from: s.from, to: s.to, target: s.target })),
      advice: advice && { stage: advice.stage, why: advice.why, value: advice.value, at: advice.at },
      calm: calm && { value: calm.value, at: calm.at, stuck: calm.stuck },
    }, c.expected)
  })
})
