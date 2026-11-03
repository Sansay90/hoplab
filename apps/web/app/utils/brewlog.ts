// Журнал варки: виды записей, их единицы и показ. Значения хранятся как у сервиса (service/app/brewery/logbook.py):
// плотность — SG, pH, объём — л, температура — °C; плотность вводится и показывается в единицах пивовара.
// Расписание брожения (этапы, «пора переходить», сухое охмеление) — в @hoplab/core.
import type { BrewEvent, BrewSummary } from '~/types'
import type { EntryKind, GravityUnit, StageUntil } from '@hoplab/core'
import { DAY, fmtGravity, fmtNumber, gravityIn, SEP, sgFromPlato } from '@hoplab/core'
import { fixed } from '~/utils/format'

type Unit = 'sg' | 'ph' | 'l' | 'c'
type Group = 'Варочный день' | 'Брожение и розлив' | 'Заметка'

// short — короткая подпись (поле на шаге, журнал); transition — переход к этапу или шагу: ставится кнопками,
// не из общего выбора, номер у записи не меняется; own — своя кнопка («Партия вылита» в меню), не из общего выбора;
// optional — рекомендуемый замер (прибор есть не у всех): «Дальше» без него не переспрашивает
export interface EntryKindView { label: string; short?: string; icon: string; unit?: Unit; group: Group; transition?: true; own?: true; optional?: true }

/** Несброженное сусло: его плотность можно мерить рефрактометром (в пиве спирт искажает показание). */
export const UNFERMENTED = new Set<EntryKind>(['mash_gravity', 'first_wort', 'preboil_gravity', 'og'])

export const ENTRY_KINDS: Record<EntryKind, EntryKindView> = {
  ph: { label: 'pH затора', icon: 'i-lucide-flask-conical', unit: 'ph', group: 'Варочный день', optional: true },
  mash_temp: { label: 'Температура затора', icon: 'i-lucide-thermometer', unit: 'c', group: 'Варочный день' },
  mash_gravity: { label: 'Плотность затора', icon: 'i-lucide-droplet', unit: 'sg', group: 'Варочный день', optional: true },
  first_wort: { label: 'Плотность первого сусла', short: 'Плотность до промывки', icon: 'i-lucide-droplet', unit: 'sg', group: 'Варочный день' },
  preboil_volume: { label: 'Объём до кипячения', short: 'Объём в котле', icon: 'i-lucide-beaker', unit: 'l', group: 'Варочный день' },
  preboil_gravity: { label: 'Плотность до кипячения', short: 'Плотность в котле', icon: 'i-lucide-droplet', unit: 'sg', group: 'Варочный день' },
  postboil_volume: { label: 'Объём после кипячения', icon: 'i-lucide-beaker', unit: 'l', group: 'Варочный день' },
  og: { label: 'Начальная плотность (OG)', short: 'OG', icon: 'i-lucide-droplets', unit: 'sg', group: 'Варочный день' },
  fermenter_volume: { label: 'Объём в ферментере', short: 'В ферментере', icon: 'i-lucide-beaker', unit: 'l', group: 'Варочный день' },
  pitch_temp: { label: 'Температура сусла при задаче дрожжей', short: 'Температура сусла', icon: 'i-lucide-thermometer', unit: 'c', group: 'Брожение и розлив' },
  pitch: { label: 'Задача дрожжей', icon: 'i-lucide-microscope', group: 'Брожение и розлив' },
  temp: { label: 'Температура брожения', short: 'Температура', icon: 'i-lucide-thermometer', unit: 'c', group: 'Брожение и розлив' },
  gravity: { label: 'Плотность на брожении', short: 'Плотность', icon: 'i-lucide-droplet', unit: 'sg', group: 'Брожение и розлив' },
  dry_hop: { label: 'Сухое охмеление', icon: 'i-lucide-hop', group: 'Брожение и розлив' },
  fg: { label: 'Конечная плотность (FG)', short: 'FG', icon: 'i-lucide-droplets', unit: 'sg', group: 'Брожение и розлив' },
  cold_crash: { label: 'Холодное осветление', icon: 'i-lucide-thermometer-snowflake', group: 'Брожение и розлив' },
  package: { label: 'Розлив', icon: 'i-lucide-beer', group: 'Брожение и розлив' },
  dumped: { label: 'Партия вылита', icon: 'i-lucide-circle-x', group: 'Брожение и розлив', own: true },
  note: { label: 'Заметка', icon: 'i-lucide-notebook-pen', group: 'Заметка' },
  // переход к этапу брожения (value — номер этапа с нуля) и к шагу варочного дня (номер шага)
  stage: { label: 'Переход к этапу', icon: 'i-lucide-arrow-right', group: 'Брожение и розлив', transition: true },
  step: { label: 'Шаг варочного дня', icon: 'i-lucide-list-checks', group: 'Варочный день', transition: true },
}

/** Факт против плана: «+0,2 %», «−0,1 °P» или «как в рецепте». Разница — между показанными числами (digits
 *  знаков): 5,16 и 5,03 показаны как «5,2» и «5,0» — значит +0,2, а не +0,1. */
export function planDelta(fact: number, plan: number, digits: number, unit = '') {
  const shown = (v: number) => Number(fixed(v, digits).replace(',', '.'))
  const d = shown(fact) - shown(plan)
  return Math.abs(d) < 10 ** -digits / 2 ? 'как в рецепте' : `${d > 0 ? '+' : '−'}${fixed(Math.abs(d), digits)}${unit}`
}

/** Выбор вида записи — по группам, в порядке варки; переходы и «Партия вылита» — не отсюда. */
export function entryKindItems() {
  const groups = new Map<Group, { label: string; value: EntryKind; icon: string }[]>()
  for (const [value, k] of Object.entries(ENTRY_KINDS) as [EntryKind, EntryKindView][]) {
    if (k.transition || k.own) continue
    groups.set(k.group, [...groups.get(k.group) ?? [], { label: k.label, value, icon: k.icon }])
  }
  return [...groups].map(([group, items]) => [{ type: 'label' as const, label: group }, ...items])
}

/** Поле ввода замера: единица, шаг и пределы — в единицах пивовара. */
export function entryInput(kind: EntryKind, gravity: GravityUnit) {
  switch (ENTRY_KINDS[kind].unit) {
    case 'sg': return gravity === 'plato'
      ? { suffix: '°P', step: 0.1, min: 0, max: 40, digits: 1 }
      : { suffix: 'SG', step: 0.001, min: 0.98, max: 1.2, digits: 3 }
    case 'ph': return { suffix: 'pH', step: 0.01, min: 2, max: 9, digits: 2 }
    case 'l': return { suffix: 'л', step: 0.1, min: 0.1, max: 2000, digits: 1 }
    case 'c': return { suffix: '°C', step: 0.5, min: -5, max: 110, digits: 1 }
    default: return null
  }
}

/** Введённое пивоваром → как хранит сервис (плотность — в SG). */
export function toStored(kind: EntryKind, input: number, gravity: GravityUnit) {
  return ENTRY_KINDS[kind].unit === 'sg' && gravity === 'plato' ? Math.round(sgFromPlato(input) * 10000) / 10000 : input
}

/** Хранимое → в поле ввода пивовара. */
export function fromStored(kind: EntryKind, value: number, gravity: GravityUnit) {
  return ENTRY_KINDS[kind].unit === 'sg' ? gravityIn(value, gravity) : value
}

/** Значение замера для показа: «12,8 °P», «1,052», «pH 5,32», «23,5 л», «18 °C». */
export function entryValue(kind: EntryKind, value: number | null | undefined, gravity: GravityUnit) {
  if (value == null) return ''
  const n = (v: number, d: number) => v.toLocaleString('ru-RU', { maximumFractionDigits: d })
  switch (ENTRY_KINDS[kind].unit) {
    case 'sg': return fmtGravity(value, gravity)
    case 'ph': return `pH ${n(value, 2)}`
    case 'l': return `${n(value, 1)} л`
    case 'c': return `${n(value, 1)} °C`
    default: return ''
  }
}

/** Итог варки одной строкой: «12,8 → 2,9 °P · 5,2 % · 23,5 л»; пока нет FG — «OG 12,8 °P · 23,5 л». */
export function brewFacts(b: Pick<BrewSummary, 'og' | 'fg' | 'abv' | 'volume'>, gravity: GravityUnit) {
  const parts: string[] = []
  if (b.og != null && b.fg != null) parts.push(`${fmtGravity(b.og, gravity)} → ${fmtGravity(b.fg, gravity)}`)
  else if (b.og != null) parts.push(`OG ${fmtGravity(b.og, gravity)}`)
  else if (b.fg != null) parts.push(`FG ${fmtGravity(b.fg, gravity)}`)
  if (b.abv != null) parts.push(`${b.abv.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} %`)
  if (b.volume != null) parts.push(`${b.volume.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} л`)
  return parts.join(SEP)
}

/** События пивоварни: значок и тон — на экране варки и в журнале. */
export const EVENT_LOOK: Record<BrewEvent['kind'], { icon: string; tone: string }> = {
  alert: { icon: 'i-lucide-hand', tone: 'text-warning' },
  alertCleared: { icon: 'i-lucide-circle-check', tone: 'text-success' },
  addition: { icon: 'i-lucide-bell-ring', tone: 'text-warning' },
  added: { icon: 'i-lucide-circle-check', tone: 'text-success' },
  step: { icon: 'i-lucide-arrow-right', tone: 'text-info' },
  end: { icon: 'i-lucide-flag', tone: 'text-success' },
  powerOff: { icon: 'i-lucide-power', tone: 'text-muted' },
  error: { icon: 'i-lucide-circle-alert', tone: 'text-error' },
  offline: { icon: 'i-lucide-wifi-off', tone: 'text-error' },
  online: { icon: 'i-lucide-wifi', tone: 'text-success' },
}

/** Условие этапа кратко: «до 6,0 °P · ~5 дн.», «до FG · ~4 дн.», «2 дн.». */
export function stageCondition(s: { until?: StageUntil | null; gravity?: number | null; days: number }, unit: GravityUnit) {
  const until = s.until ?? 'days'
  const days = fmtNumber(s.days, 1)
  if (until === 'days') return `${days} дн.`
  const goal = until === 'fg' ? 'до FG' : `до ${fmtGravity(s.gravity, unit)}`
  return s.days ? `${goal}${SEP}~${days} дн.` : goal
}

/** Где партия: варочный день (идёт программа пивоварни — «варка идёт») → брожение, день N → разлито; или вылито.
 *  Брожения не видно (ни задачи дрожжей, ни плана — например, проверка пивоварни на воде) или давно без розлива
 *  (больше STALE дней) — не гадаем. */
const STALE = 60
export function batchStatus(b: Pick<BrewSummary, 'phase' | 'status' | 'manual' | 'fermentStart'>, now: number) {
  if (b.phase === 'brewday') return { label: !b.manual && b.status === 'running' ? 'варка идёт' : 'варочный день', color: 'info' as const }
  if (b.phase === 'packaged') return { label: 'разлито', color: 'success' as const }
  if (b.phase === 'dumped') return { label: 'вылито', color: 'neutral' as const }
  if (b.fermentStart == null) return null
  const day = Math.floor((now - b.fermentStart) / DAY) + 1
  if (day < 1 || day > STALE) return null
  return { label: `брожение${SEP}день ${day}`, color: 'primary' as const }
}

/** Когда сухое охмеление: «при 4,4 °P · ~4-й день», «4-й день брожения», «день не указан». */
export function dryHopWhen(d: { day: number | null; gravity?: number | null; target?: number | null }, unit: GravityUnit) {
  const g = d.target ?? d.gravity ?? null
  if (g != null) return `при ${fmtGravity(g, unit)}${d.day != null ? `${SEP}~${d.day}-й день` : ''}`
  return d.day != null ? `${d.day}-й день брожения` : 'день не указан'
}

/** На чём варили: «Кастрюля 20 л»; оборудование удалили — «без пивоварни» или «на пивоварне». */
export function equipmentLabel(b: Pick<BrewSummary, 'equipment' | 'manual'>) {
  return b.equipment?.name ?? (b.manual ? 'без пивоварни' : 'на пивоварне')
}
