// Закладки для экрана: иконки, цвета и подсказки видов. Подписи, единицы и количество — в @hoplab/core.
// Пивоварня знает только минуты закладок на кипячении (таймер с писком) — что класть, хранит рецепт.
import type { AdditionInput, AdditionKind, AdditionKindMeta } from '@hoplab/core'
import { ADDITION_KINDS } from '@hoplab/core'

interface AdditionLook {
  icon: string
  tint: string               // цвет иконки
  placeholder: string
}

const LOOK: Record<AdditionKind, AdditionLook> = {
  hop: { icon: 'i-lucide-hop', tint: 'text-success', placeholder: 'Сорт хмеля' },
  spice: { icon: 'i-lucide-leaf', tint: 'text-orange-500 dark:text-orange-400', placeholder: 'Кориандр, цедра…' },
  fining: { icon: 'i-lucide-sparkles', tint: 'text-info', placeholder: 'Ирландский мох, Brewtan B…' },
  water: { icon: 'i-lucide-droplet', tint: 'text-sky-500 dark:text-sky-400', placeholder: 'CaCl₂, гипс, молочная кислота…' },
  adjunct: { icon: 'i-lucide-flask-conical', tint: 'text-violet-500 dark:text-violet-400', placeholder: 'Питание дрожжей, лактоза…' },
  sugar: { icon: 'i-lucide-candy', tint: 'text-amber-500 dark:text-amber-400', placeholder: 'Декстроза, инвертный сироп…' },
  equipment: { icon: 'i-lucide-wrench', tint: 'text-muted', placeholder: 'Чиллер' },
}

/** Вид закладки целиком: подпись и «есть ли количество» — из core, иконка, цвет и подсказка — отсюда. */
const view = (k: AdditionKind): AdditionKindMeta & AdditionLook => ({ ...ADDITION_KINDS[k], ...LOOK[k] })
export const ADDITION_VIEW: Record<AdditionKind, AdditionKindMeta & AdditionLook> = {
  hop: view('hop'), spice: view('spice'), fining: view('fining'), water: view('water'), adjunct: view('adjunct'),
  sugar: view('sugar'), equipment: view('equipment'),
}

type Item = Pick<AdditionInput, 'kind'>

export function additionView(a: Item) {
  return ADDITION_VIEW[a.kind ?? 'hop']
}

/** Иконка напоминания: тип, если всё по нему одного типа, иначе общая. */
export function slotIcon(items: Item[]) {
  const kinds = new Set(items.map(a => a.kind ?? 'hop'))
  return kinds.size === 1 ? ADDITION_VIEW[[...kinds][0]!].icon : 'i-lucide-list-plus'
}
