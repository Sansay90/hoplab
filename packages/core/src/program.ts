// Программа пивоварни и закладки: шаги, таймеры, закладки по минутам кипячения, мощность и ограничения пивоварни.
// Выводятся из рецепта так же, как в сервисе (service/app/recipes/program.py); общие примеры — shared/program-cases.json.
import type { AdditionInput, RecipeInput } from './schema'

/** Ограничения пивоварни (GET /api/limits): шаги программы, закладки, температура и мощность ТЭНа. */
export interface Limits {
  maxSteps: number
  maxAdditions: number
  minTemp: number
  maxTemp: number
  boilTemp: number
  minWatts: number
  maxWatts?: number | null
  wattsStep?: number | null
}

/** Мощность ТЭНа на шагах программы прошлой партии: по паузам, кипячению и нагреву до первой паузы. */
export interface ProgramWatts {
  mash: number[]
  boil?: number | null
  heat?: number | null
}

// ── программа пивоварни и закладки (как в сервисе, program.py) ───────────────
export type ProgramSource = Pick<RecipeInput, 'mash' | 'heat' | 'boil' | 'hops' | 'miscs' | 'fermentables'>

/** Шаг «Нагрев» своей мощностью: после засыпи ещё минута догрева затора на ней (как HEAT_MINUTES в program.py). */
export const HEAT_MINUTES = 1

/** Мощность нагрева до первой паузы, если она своя (heat у рецепта партии, не как у первой паузы), иначе null —
 *  нагрев идёт на мощности первой паузы: у Easy Brew мощность шага — и на нагрев до него, и на выдержку. */
export function heatWatts(r: Pick<RecipeInput, 'mash' | 'heat'>) {
  const first = r.mash?.[0]
  const w = r.heat?.watts
  return first && w != null && w !== first.watts ? w : null
}

export interface ProgramStep {
  name: string
  temp: number
  minutes: number
  watts: number | null       // у рецепта партии на пивоварне; у рецепта — нет
  boil: boolean
}

/** Закладка на кипячении: тип и единица всегда есть, остальное — как в рецепте. */
export type BoilItem = Required<Pick<AdditionInput, 'minutes' | 'kind' | 'unit'>> & Pick<AdditionInput, 'name' | 'amount' | 'whirlpool'>

export interface AdditionGroup {
  minutes: number
  items: BoilItem[]
}

export function programOf(r: ProgramSource, boilTemp = 100.1): ProgramStep[] {
  const steps = (r.mash ?? []).map((s, i) => ({
    name: s.name || `Пауза ${i + 1}`, temp: s.temp, minutes: s.minutes, watts: s.watts ?? null, boil: false,
  }))
  const heat = heatWatts(r)
  if (heat != null) steps.unshift({ name: 'Нагрев', temp: r.mash![0]!.temp, minutes: HEAT_MINUTES, watts: heat, boil: false })
  if (r.boil) steps.push({ name: 'Кипячение', temp: boilTemp, minutes: r.boil.minutes, watts: r.boil.watts ?? null, boil: true })
  return steps
}

export function programMinutes(r: ProgramSource) {
  return programOf(r).reduce((a, s) => a + (s.minutes || 0), 0)
}

/** Что класть в кипячение и когда, от ранних к поздним. Вирпул — в конце кипячения (0 мин),
 *  сколько выдерживать — в whirlpool. */
export function boilItems(r: ProgramSource): BoilItem[] {
  if (!r.boil) return []
  const items: BoilItem[] = []
  const at = (use: string | undefined, minutes: number | null | undefined) =>
    use === 'boil' ? minutes ?? null : use === 'whirlpool' ? 0 : null
  const stand = (use: string | undefined, minutes: number | null | undefined) => use === 'whirlpool' ? minutes ?? null : null
  for (const h of r.hops ?? []) {
    const m = at(h.use ?? 'boil', h.minutes)
    if (m != null) items.push({ minutes: m, kind: 'hop', name: h.name, amount: h.amount, unit: 'g', whirlpool: stand(h.use, h.minutes) })
  }
  for (const x of r.miscs ?? []) {
    const m = at(x.use ?? 'boil', x.minutes)
    if (m != null) {
      items.push({ minutes: m, kind: x.kind ?? 'adjunct', name: x.name, amount: x.amount, unit: x.unit ?? 'g', whirlpool: stand(x.use, x.minutes) })
    }
  }
  for (const f of r.fermentables ?? []) {
    if (f.use === 'boil' && f.minutes != null) {
      items.push({ minutes: f.minutes, kind: 'sugar', name: f.name, amount: f.amount, unit: 'kg', whirlpool: null })
    }
  }
  return items.filter(i => i.minutes >= 0 && i.minutes <= r.boil!.minutes).sort((a, b) => b.minutes - a.minutes)
}

/** Напоминания на кипячении: одна минута — одно напоминание со всем, что на неё приходится. */
export function boilGroups(r: ProgramSource): AdditionGroup[] {
  const items = boilItems(r)
  return [...new Set(items.map(i => i.minutes))].map(minutes => ({ minutes, items: items.filter(i => i.minutes === minutes) }))
}

/** Минуты, на которых пищит пивоварня: строго внутри кипячения, без повторов. */
export function deviceTimers(r: ProgramSource) {
  const total = r.boil?.minutes ?? 0
  return [...new Set(boilItems(r).map(i => i.minutes))].filter(m => m > 0 && m < total)
}

export function whenInBoil(minutes: number, boilMinutes: number | undefined) {
  if (minutes === 0) return 'в конце кипячения'
  if (minutes === boilMinutes) return 'в начале кипячения'
  return `за ${minutes} мин до конца`
}

/** Мощность ТЭНа на шагах программы для «Сварить» — по одной на паузу, затем на кипячение: как в прошлой партии на
 *  этой пивоварне (пауз теперь больше — как у последней из них), иначе — потолок модели; чего пивоварня не примет —
 *  тоже потолок. */
export function defaultWatts(r: ProgramSource, last: ProgramWatts | null | undefined, options: number[]): number[] {
  if (!options.length) return []
  const mash = (r.mash ?? []).map((_, i) => wattOr(last?.mash[i] ?? last?.mash.at(-1), options))
  return r.boil ? [...mash, wattOr(last?.boil, options)] : mash
}

/** Мощность нагрева до первой паузы для «Сварить»: как в прошлой партии, иначе потолок модели. */
export function defaultHeat(last: ProgramWatts | null | undefined, options: number[]) {
  return options.length ? wattOr(last?.heat, options) : null
}

/** w, если пивоварня такую примет, иначе потолок модели (первый вариант). */
function wattOr(w: number | null | undefined, options: number[]) {
  return w != null && options.includes(w) ? w : options[0]!
}

/** Допустимая мощность ТЭНа: от потолка модели вниз с её шагом (по умолчанию 2500 / 100 / 100). Подписи — дело вида. */
export function wattValues(l: Limits | null): number[] {
  const out: number[] = []
  const step = l?.wattsStep ?? 100
  for (let w = l?.maxWatts ?? 2500; w >= (l?.minWatts ?? 100); w -= step) out.push(w)
  return out
}
