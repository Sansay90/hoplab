// Закладки: что кладут в затор, кипячение и брожение помимо солода — подписи, единицы. Иконки и цвета — у интерфейса.
// Пивоварня знает только минуты закладок на кипячении (таймер с писком) — что класть, хранит рецепт.
import type { AdditionInput, AdditionKind, AdditionUnit } from './schema'

export interface AdditionKindMeta {
  label: string
  measured: boolean          // есть ли количество
}

export const ADDITION_KINDS: Record<AdditionKind, AdditionKindMeta> = {
  hop: { label: 'Хмель', measured: true },
  spice: { label: 'Специи', measured: true },
  fining: { label: 'Осветлитель', measured: true },
  water: { label: 'Соли', measured: true },
  adjunct: { label: 'Добавка', measured: true },
  sugar: { label: 'Сахар', measured: true },
  equipment: { label: 'Оборудование', measured: false },
}

/** Типы в таблице «Другое»: хмель и сахар — в своих таблицах, соли — в разделе «Вода». */
export const MISC_KINDS = ['spice', 'fining', 'adjunct', 'equipment'] as const satisfies AdditionKind[]

export const ADDITION_UNITS: { value: AdditionUnit; label: string }[] = [
  { value: 'g', label: 'г' },
  { value: 'kg', label: 'кг' },
  { value: 'ml', label: 'мл' },
  { value: 'pcs', label: 'шт' },
  { value: 'pkg', label: 'пак.' },
]

type Item = Pick<AdditionInput, 'kind' | 'name' | 'amount' | 'unit'> & Partial<Pick<AdditionInput, 'whirlpool'>>

export function additionKind(a: Item) {
  return ADDITION_KINDS[a.kind ?? 'hop']
}

/** Название или, если не задано, тип: «Hallertau», «Оборудование». */
export function additionName(a: Item) {
  return a.name?.trim() || additionKind(a).label
}

export function unitLabel(unit: AdditionUnit | null | undefined) {
  return ADDITION_UNITS.find(u => u.value === (unit ?? 'g'))!.label
}

/** «30 г», «1 шт»; null — количества нет. */
export function additionAmount(a: Item) {
  if (!a.amount || !additionKind(a).measured) return null
  return `${a.amount.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${unitLabel(a.unit)}`
}

/** «вирпул 20 мин» — закладка в конце кипячения с выдержкой; null — не вирпул. */
export function additionNote(a: Item) {
  return a.whirlpool ? `вирпул ${a.whirlpool} мин` : null
}
