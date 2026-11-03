// Сводка рецепта: масса засыпи, хмеля, доля в засыпи.
import type { RecipeInput } from './schema'

export function totalKg(fermentables: { amount?: number | null }[]) {
  return fermentables.reduce((a, f) => a + (f.amount ?? 0), 0)
}

/** Сколько всего хмеля, г. */
export function hopGrams(r: Pick<RecipeInput, 'hops'>) {
  return totalKg(r.hops ?? [])
}

/** Доля в засыпи, % — от всей массы сбраживаемого. */
export function share(amount: number | null | undefined, total: number) {
  return amount && total ? (amount / total) * 100 : null
}
