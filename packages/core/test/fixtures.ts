// Заготовки для тестов: форма рецепта и ограничения пивоварни с разумными значениями.
import type { FermentableRow, HopRow, Limits, RecipeDraft } from '../src'
import { blankWater, newFermentable, newHop, SEP } from '../src'

/** Ограничения по умолчанию, как у сервиса без пивоварни, но с известным потолком мощности. */
export const LIMITS: Limits = {
  maxSteps: 9, maxAdditions: 9, minTemp: 20, maxTemp: 100, boilTemp: 100.1, minWatts: 100, maxWatts: 2500, wattsStep: 100,
}

export function draft(over: Partial<RecipeDraft> = {}): RecipeDraft {
  return {
    name: 'Тест',
    style: null,
    batch: { volume: 23, efficiency: 75 },
    fermentables: [],
    hops: [],
    miscs: [],
    yeasts: [],
    water: blankWater(),
    mash: [],
    boil: { minutes: 60 },
    fermentation: [],
    notes: '',
    ...over,
  }
}

export const malt = (amount: number, ebc: number, over: Partial<FermentableRow> = {}): FermentableRow =>
  ({ ...newFermentable(), name: 'Солод', amount, ebc, ...over })

export const hop = (amount: number, alpha: number, minutes: number | null, over: Partial<HopRow> = {}): HopRow =>
  ({ ...newHop(minutes), name: 'Хмель', amount, alpha, ...over })

/** Ожидаемая строка с разделителем: в тексте теста — « · », в интерфейсе — SEP (точка с широкими пробелами). */
export const dots = (text: string) => text.replaceAll(' · ', SEP)
