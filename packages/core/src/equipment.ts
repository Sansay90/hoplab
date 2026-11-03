// Оборудование: значения параметров формой и кратким описанием. Виды и их поля — каталог (kinds.ts, как у сервиса
// service/app/brewery/kinds.py): у варочной системы параметры — свои поля оборудования (объём, эффективность,
// испарение, котёл), у прочего — props. Иконки видов — у интерфейса.
import { fmtNumber, SEP } from './format'
import type { EquipmentField, EquipmentKindInfo } from './kinds'

export type EquipmentValue = number | string | boolean | null
export type EquipmentValues = Record<string, EquipmentValue>

/** Оборудование — то, что читают расчёты: параметры варочной системы и props остального. */
export interface EquipmentParams {
  volume?: number | null
  efficiency?: number | null
  evaporation?: number | null
  kettle?: number | null
  props?: Record<string, boolean | number | string> | null
}

type SystemKey = 'volume' | 'efficiency' | 'evaporation' | 'kettle'

/** Значения параметров оборудования для формы: у системы — её поля, у прочего — props; «да/нет» без значения —
 *  «нет», как у переключателя (иначе включить и выключить — уже «изменено»). */
export function equipmentValues(e: EquipmentParams, kind: EquipmentKindInfo | undefined): EquipmentValues {
  const out: EquipmentValues = {}
  for (const f of kind?.fields ?? []) {
    const v = (kind!.system ? e[f.key as SystemKey] : e.props?.[f.key]) ?? null
    out[f.key] = f.type === 'bool' ? !!v : v
  }
  return out
}

/** Значения по умолчанию для нового оборудования этого вида. */
export function equipmentDefaults(kind: EquipmentKindInfo): EquipmentValues {
  return Object.fromEntries(kind.fields.map(f => [f.key, f.default ?? (f.type === 'bool' ? false : null)]))
}

/** Тело запроса из значений формы: у системы — поля оборудования, у прочего — props. */
export function equipmentBody(kind: EquipmentKindInfo, values: EquipmentValues) {
  if (!kind.system) return { props: values }
  const n = (k: string) => (typeof values[k] === 'number' ? values[k] as number : null)
  return { volume: n('volume'), efficiency: n('efficiency'), evaporation: n('evaporation'), kettle: n('kettle'), props: {} }
}

function factOf(f: EquipmentField, v: EquipmentValue) {
  if (v == null || v === '' || v === false) return null
  if (f.type === 'bool') return f.short ?? f.label
  if (f.type === 'select') return f.options?.find(o => o.value === v)?.label ?? String(v)
  // где бывает минус (погрешность, температура), плюс пишется явно: «погрешность +0,5 °P»
  const n = v as number
  const text = (f.min ?? 0) < 0 && n > 0 ? `+${fmtNumber(n, f.digits ?? 0)}` : fmtNumber(n, f.digits ?? 0)
  return [f.prefix, text, f.unit].filter(Boolean).join(' ')
}

/** Кратко о параметрах: «15 л · 70 % · 2,5 л/ч · котёл 20 л», «32 л · до 1 бар · рубашка». */
export function equipmentFacts(e: EquipmentParams, kind: EquipmentKindInfo | undefined) {
  const values = equipmentValues(e, kind)
  return (kind?.fields ?? []).map(f => factOf(f, values[f.key] ?? null)).filter(Boolean).join(SEP)
}
