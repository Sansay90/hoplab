// Рецепт для экрана: подписи, списки для выбора и строки сводки. Форма редактора, проверка, программа пивоварни
// и закладки — в @hoplab/core.
import type { Recipe } from '~/types'
import { fmtMinutes, fmtNumber, plural, programMinutes, programOf, SEP } from '@hoplab/core'
import type { ProgramSource } from '@hoplab/core'

// ── подписи ──────────────────────────────────────────────────────────────────
export const FERMENTABLE_KINDS = { grain: 'Солод', adjunct: 'Несоложёное', sugar: 'Сахар', extract: 'Экстракт' } as const
export const FERMENTABLE_USES = { mash: 'Затор', boil: 'Кипячение', fermentation: 'Брожение' } as const
export const HOP_USES = { mash: 'Затор', first_wort: 'Первое сусло', boil: 'Кипячение', whirlpool: 'Вирпул', dry_hop: 'Сухое охмеление' } as const
export const MISC_USES = { mash: 'Затор', boil: 'Кипячение', whirlpool: 'Вирпул', fermentation: 'Брожение', packaging: 'Розлив' } as const
export const YEAST_FORMS = { dry: 'Сухие', liquid: 'Жидкие' } as const

/** Для USelect: { label, value } из словаря подписей. */
export function options<K extends string>(labels: Record<K, string>) {
  return (Object.entries(labels) as [K, string][]).map(([value, label]) => ({ value, label }))
}

/** «25 л при 75 %» — объём после кипячения и эффективность. */
export function batchLine(r: Pick<Recipe, 'batch'>) {
  return `${fmtNumber(r.batch?.volume, 1, ' л')} при ${fmtNumber(r.batch?.efficiency, 0, ' %')}`
}

/** Длительность программы и шаги — для подписей. */
export function programSummary(r: ProgramSource) {
  const steps = programOf(r)
  return steps.length ? `${steps.length} ${plural(steps.length, 'шаг', 'шага', 'шагов')}${SEP}${fmtMinutes(programMinutes(r))}` : 'без программы'
}

/** «Кипячение · 60 мин», «Вирпул · 20 мин», «Сухое охмеление · 3-й день», «Затор». */
export function whenLabel(labels: Record<string, string>, use: string, minutes?: number | null, day?: number | null) {
  const base = labels[use] ?? use
  if ((use === 'boil' || use === 'whirlpool') && minutes != null) return `${base}${SEP}${minutes} мин`
  if (use === 'dry_hop' && day != null) return `${base}${SEP}${day}-й день`
  return base
}
