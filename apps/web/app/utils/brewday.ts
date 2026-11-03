// Варочный день партии, часть для экрана: подписи шагов. Шаги, «что приготовить», живой шаг пивоварни и остаток
// таймера — в @hoplab/core (брожение и варочный день считаются там).
import type { InjectionKey } from 'vue'
import type { BrewDayStep } from '~/types'
import { fmtMinutes, SEP } from '@hoplab/core'
import { fmtTemp, fmtWatts } from '~/utils/format'

/** Дописать введённые замеры шага: поле пишет значение через паузу или уходя из фокуса — «Дальше», нажатое сразу
 *  после ввода, сначала дожидается записи (day/NowCard.vue ↔ day/MeasureInput.vue). */
export const MEASURE_FLUSH: InjectionKey<Set<() => Promise<unknown>>> = Symbol('measure-flush')

/** «66,0 °C · 1 ч · 2500 W» — температура, время шага и мощность ТЭНа (у партии на пивоварне). */
export function stepLine(step: Pick<BrewDayStep, 'temp' | 'minutes' | 'watts'>) {
  return [step.temp != null && `${fmtTemp(step.temp)} °C`, step.minutes && fmtMinutes(step.minutes),
    step.watts != null && fmtWatts(step.watts)].filter(Boolean).join(SEP)
}

/** Когда закладка на кипячении: «старт», «конец», «за 10 мин». */
export function additionWhen(minutes: number, boil: number | null | undefined) {
  return minutes === boil ? 'старт' : minutes === 0 ? 'конец' : `за ${minutes} мин`
}
