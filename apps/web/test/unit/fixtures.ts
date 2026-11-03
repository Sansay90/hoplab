// Заготовки для тестов: снимок сервиса с разумными значениями.
import type { Snapshot } from '~/types'
import { SEP } from '@hoplab/core'

export function snapshot(over: Partial<Snapshot> = {}): Snapshot {
  return {
    online: true,
    power: true,
    running: false,
    status: 'idle',
    mode: 'recipe',
    temp: 20,
    pump: false,
    step: 0,
    stepTarget: null,
    timer: { minutes: null, remaining: null, counting: false, at: 0 },
    alert: null,
    error: 0,
    settings: {},
    deviceRecipe: null,
    additions: [],
    additionsPending: [],
    energy: { wh: 0, watts: 0 },
    ...over,
  }
}

/** Ожидаемая строка с разделителем: в тексте теста — « · », в интерфейсе — SEP (точка с широкими пробелами). */
export const dots = (text: string) => text.replaceAll(' · ', SEP)
