// Рецепт: форма редактора ↔ API, проверка по ограничениям пивоварни (/api/limits), программа и напоминания.
// Программа и закладки выводятся из рецепта так же, как в сервисе (program.py).
import type { Addition, AdditionKind, Equipment, Limits, ProgramWatts, Recipe, WaterAgent } from '~/types'
import type {
  FermentableRow, FermentationRow, HopRow, MashRow, MiscRow, RecipeDraft, WaterAdditionRow, WaterDraft, YeastRow,
} from '~/types/recipe'
import { ADDITION_KINDS } from '~/utils/additions'
import { calcRecipe, DEFAULT_EFFICIENCY } from '~/utils/calc'
import { fmtMinutes, fmtNumber, plural, SEP } from '~/utils/format'

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

// ── новые строки ─────────────────────────────────────────────────────────────
// когда обычно кладут: мох и чиллер — за 15 мин, специи — за 5
const MISC_DEFAULTS: Partial<Record<AdditionKind, Pick<MiscRow, 'use' | 'minutes'>>> = {
  spice: { use: 'boil', minutes: 5 },
  fining: { use: 'boil', minutes: 15 },
  adjunct: { use: 'boil', minutes: 10 },
  equipment: { use: 'boil', minutes: 15 },
}

export const newFermentable = (): FermentableRow => ({ name: '', kind: 'grain', amount: null, ebc: null, use: 'mash', minutes: null })
export const newHop = (minutes: number | null): HopRow => ({ name: '', alpha: null, amount: null, use: 'boil', minutes, day: null, gravity: null })
export const newMisc = (kind: MiscRow['kind']): MiscRow => ({
  name: '', kind, amount: null, unit: 'g', use: 'boil', minutes: null, ...MISC_DEFAULTS[kind],
})
export const newYeast = (): YeastRow => ({ name: '', form: 'dry', amount: 1, unit: 'pkg', attenuation: null })
export const newWaterAddition = (agent: WaterAgent): WaterAdditionRow => ({ agent, name: '', amount: null, target: 'mash' })
export const blankWater = (): WaterDraft => ({
  ratio: 3, source: { ca: 0, mg: 0, na: 0, cl: 0, so4: 0, hco3: 0 }, additions: [],
})
export const mashStep = (temp = 66, minutes = 60, name = ''): MashRow => ({ name, temp, minutes })
export const fermentationStep = (temp = 18, days = 7, name = '', until: FermentationRow['until'] = 'days'): FermentationRow =>
  ({ name, temp, days, until, gravity: null })

/** Новый рецепт: объём партии и эффективность — из основного оборудования (нет — объём задаёт пивовар). Мощности
 *  ТЭНа у рецепта нет — её задают при «Сварить» под пивоварню. */
export function blankRecipe(equipment: Pick<Equipment, 'volume' | 'efficiency'> | null): RecipeDraft {
  return {
    name: 'Новый рецепт',
    style: null,
    batch: { volume: equipment?.volume ?? null, efficiency: equipment?.efficiency ?? DEFAULT_EFFICIENCY },
    fermentables: [],
    hops: [],
    miscs: [],
    yeasts: [],
    water: blankWater(),
    mash: [mashStep(66, 60, 'Осахаривание'), mashStep(78, 10, 'Мэш-аут')],
    boil: { minutes: 60 },
    fermentation: [],
    notes: '',
  }
}

// ── API ↔ форма ──────────────────────────────────────────────────────────────
export function toDraft(r: Recipe): RecipeDraft {
  return {
    name: r.name,
    style: r.style ?? null,
    batch: { volume: r.batch?.volume ?? null, efficiency: r.batch?.efficiency ?? null },
    // сервис не присылает пустые поля (exclude_none) — дефолты новой строки сюда не подмешиваем
    fermentables: (r.fermentables ?? []).map(f => ({
      name: f.name ?? '', kind: f.kind ?? 'grain', amount: f.amount ?? null, ebc: f.ebc ?? null,
      use: f.use ?? 'mash', minutes: f.minutes ?? null,
    })),
    hops: (r.hops ?? []).map(h => ({
      name: h.name ?? '', alpha: h.alpha ?? null, amount: h.amount ?? null, use: h.use ?? 'boil',
      minutes: h.minutes ?? null, day: h.day ?? null, gravity: h.gravity ?? null,
    })),
    miscs: (r.miscs ?? []).map(m => ({
      name: m.name ?? '', kind: m.kind ?? 'adjunct', amount: m.amount ?? null, unit: m.unit ?? 'g',
      use: m.use ?? 'boil', minutes: m.minutes ?? null,
    })),
    yeasts: (r.yeasts ?? []).map(y => ({
      name: y.name ?? '', form: y.form ?? 'dry', amount: y.amount ?? null, unit: y.unit ?? 'pkg',
      attenuation: y.attenuation ?? null,
    })),
    water: {
      ratio: r.water?.ratio ?? null,
      source: { ...blankWater().source, ...r.water?.source },
      additions: (r.water?.additions ?? []).map(a => ({
        agent: a.agent, name: a.name ?? '', amount: a.amount ?? null, target: a.target ?? 'mash',
      })),
    },
    // мощность ТЭНа, если рецепт сохранили с ней раньше, — не в черновик: она у партии; кипячение — копией: иначе
    // «Отмена» оставит правку на странице рецепта
    mash: (r.mash ?? []).map(s => ({ name: s.name ?? '', temp: s.temp, minutes: s.minutes })),
    boil: r.boil ? { minutes: r.boil.minutes } : null,
    fermentation: (r.fermentation ?? []).map(s => ({ ...s, name: s.name ?? '', until: s.until ?? 'days', gravity: s.gravity ?? null })),
    notes: r.notes ?? '',
  }
}

const blank = (row: { name: string; amount: number | null }) => !row.name.trim() && row.amount == null
const timed = (use: string) => use === 'boil' || use === 'whirlpool'

/** Форма → API: пустые строки отбрасываются, время — только там, где оно имеет смысл;
 *  показатели — посчитанные по ингредиентам (по ним работают список и фильтры). */
export function toRecipe(d: RecipeDraft): Recipe {
  const calc = calcRecipe(d)
  return {
    name: d.name.trim(),
    style: d.style,
    batch: d.batch,
    // без округления: карточка списка и страница рецепта округляют одно и то же число — цифры совпадают
    targets: { og: calc.og, fg: calc.fg, ibu: calc.ibu, ebc: calc.ebc, abv: calc.abv },
    fermentables: d.fermentables.filter(f => !blank(f))
      .map(f => ({ ...f, name: f.name.trim(), minutes: f.use === 'boil' ? f.minutes : null })),
    hops: d.hops.filter(h => !blank(h)).map(h => ({
      ...h, name: h.name.trim(), minutes: timed(h.use) ? h.minutes : null, day: h.use === 'dry_hop' ? h.day : null,
      gravity: h.use === 'dry_hop' ? h.gravity : null,
    })),
    miscs: d.miscs.filter(m => !blank(m) || m.kind === 'equipment').map(m => ({
      ...m, name: m.name.trim(), amount: ADDITION_KINDS[m.kind].measured ? m.amount : null,
      minutes: timed(m.use) ? m.minutes : null,
    })),
    yeasts: d.yeasts.filter(y => y.name.trim()).map(y => ({ ...y, name: y.name.trim() })),
    water: {
      ...d.water,
      additions: d.water.additions
        .filter(a => a.amount != null || (a.agent === 'other' && a.name.trim()))
        .map(a => ({ ...a, name: a.agent === 'other' ? a.name.trim() : '' })),
    },
    mash: d.mash.map(s => ({ ...s, name: s.name.trim() || null })),
    boil: d.boil,
    fermentation: d.fermentation.map(s => ({ ...s, name: s.name.trim() || null, days: s.days ?? 0, gravity: s.until === 'gravity' ? s.gravity : null })),
    notes: d.notes.trim(),
  }
}

// ── программа пивоварни и закладки (как в сервисе, program.py) ───────────────
type ProgramSource = Pick<Recipe, 'mash' | 'heat' | 'boil' | 'hops' | 'miscs' | 'fermentables'>

/** Шаг «Нагрев» своей мощностью: после засыпи ещё минута догрева затора на ней (как HEAT_MINUTES в program.py). */
export const HEAT_MINUTES = 1

/** Мощность нагрева до первой паузы, если она своя (heat у рецепта партии, не как у первой паузы), иначе null —
 *  нагрев идёт на мощности первой паузы: у Easy Brew мощность шага — и на нагрев до него, и на выдержку. */
export function heatWatts(r: Pick<Recipe, 'mash' | 'heat'>) {
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

export interface AdditionGroup {
  minutes: number
  items: Addition[]
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
export function boilItems(r: ProgramSource): Addition[] {
  if (!r.boil) return []
  const items: Addition[] = []
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

// ── проверка ─────────────────────────────────────────────────────────────────
/** Ошибки рецепта человеческим языком; пустой список — можно сохранять. */
export function validateRecipe(d: RecipeDraft, l: Limits): string[] {
  const out: string[] = []
  if (!d.name.trim()) out.push('Нужно название рецепта')

  const steps = d.mash.length + (d.boil ? 1 : 0)
  if (steps > l.maxSteps) out.push(`Программа: не больше ${l.maxSteps} шагов вместе с кипячением`)
  d.mash.forEach((s, i) => {
    const n = `Пауза ${i + 1}`
    if (!(s.temp >= l.minTemp && s.temp <= l.maxTemp)) out.push(`${n}: температура ${l.minTemp}…${l.maxTemp} °C`)
    if (!(Number.isInteger(s.minutes) && s.minutes >= 1)) out.push(`${n}: длительность — целые минуты от 1`)
  })
  if (d.boil && !(Number.isInteger(d.boil.minutes) && d.boil.minutes >= 1)) out.push('Кипячение: длительность — целые минуты от 1')

  const timedRows = [
    ...d.hops.filter(h => h.use === 'boil').map(h => ({ name: h.name || 'хмель', minutes: h.minutes })),
    ...d.miscs.filter(m => m.use === 'boil').map(m => ({ name: m.name || ADDITION_KINDS[m.kind].label.toLowerCase(), minutes: m.minutes })),
    ...d.fermentables.filter(f => f.use === 'boil').map(f => ({ name: f.name || 'сахар', minutes: f.minutes })),
  ]
  for (const t of timedRows) {
    if (!d.boil) out.push(`«${t.name}» — на кипячении, а кипячения в программе нет`)
    else if (t.minutes == null) out.push(`«${t.name}»: укажите, за сколько минут до конца кипячения`)
    else if (t.minutes < 0 || t.minutes > d.boil.minutes) out.push(`«${t.name}» за ${t.minutes} мин — кипячение длится ${d.boil.minutes} мин`)
  }
  if (deviceTimers(d).length > l.maxAdditions) out.push(`Закладки на кипячении — не больше чем на ${l.maxAdditions} разных минут`)

  const unnamed = (rows: { name: string }[], what: string) => {
    if (rows.some(r => !r.name.trim())) out.push(`${what}: у строки нет названия`)
  }
  unnamed(d.fermentables.filter(f => !blank(f)), 'Засыпь')
  unnamed(d.hops.filter(h => !blank(h)), 'Хмель')
  // без названия строка не сохранится, а редактор уже считает FG по её сбраживанию
  unnamed(d.yeasts.filter(y => y.attenuation != null), 'Дрожжи')

  // пределы сервиса — здесь, чтобы ошибка была понятной, а не после «Сохранить»
  const over = (v: number | null | undefined, max: number) => v != null && v > max
  if (over(d.batch.volume, 10_000)) out.push('Объём после кипячения — не больше 10 000 л')
  for (const f of d.fermentables) {
    if (over(f.amount, 10_000)) out.push(`«${f.name || 'засыпь'}»: не больше 10 000 кг`)
    if (over(f.ebc, 10_000)) out.push(`«${f.name || 'засыпь'}»: цвет не больше 10 000 EBC`)
  }
  for (const h of d.hops) {
    if (over(h.alpha, 100)) out.push(`«${h.name || 'хмель'}»: альфа-кислоты не больше 100 %`)
    if (over(h.amount, 100_000)) out.push(`«${h.name || 'хмель'}»: не больше 100 000 г`)
  }
  for (const m of d.miscs) if (over(m.amount, 100_000)) out.push(`«${m.name || 'добавка'}»: не больше 100 000`)
  for (const y of d.yeasts) {
    if (over(y.attenuation, 100)) out.push(`«${y.name || 'дрожжи'}»: сбраживание не больше 100 %`)
    if (over(y.amount, 100_000)) out.push(`«${y.name || 'дрожжи'}»: не больше 100 000`)
  }
  if (d.water.additions.some(a => over(a.amount, 100_000))) out.push('Вода: соли и кислоты — не больше 100 000')
  d.fermentation.forEach((s, i) => {
    const name = s.name.trim() || `Этап ${i + 1}`
    if (s.until === 'gravity' && s.gravity == null) out.push(`Брожение: у этапа «${name}» — до какой плотности`)
    if (s.until === 'days' && !s.days) out.push(`Брожение: у выдержки «${name}» — сколько дней`)
  })
  return out
}

// ── сводка ───────────────────────────────────────────────────────────────────
export function totalKg(fermentables: { amount?: number | null }[]) {
  return fermentables.reduce((a, f) => a + (f.amount ?? 0), 0)
}

/** «25 л при 75 %» — объём после кипячения и эффективность. */
export function batchLine(r: Pick<Recipe, 'batch'>) {
  return `${fmtNumber(r.batch?.volume, 1, ' л')} при ${fmtNumber(r.batch?.efficiency, 0, ' %')}`
}

/** Сколько всего хмеля, г. */
export function hopGrams(r: Pick<Recipe, 'hops'>) {
  return totalKg(r.hops ?? [])
}

/** Доля в засыпи, % — от всей массы сбраживаемого. */
export function share(amount: number | null | undefined, total: number) {
  return amount && total ? (amount / total) * 100 : null
}

/** Длительность программы и шаги — для подписей. */
export function programSummary(r: ProgramSource) {
  const steps = programOf(r)
  return steps.length ? `${steps.length} ${plural(steps.length, 'шаг', 'шага', 'шагов')}${SEP}${fmtMinutes(programMinutes(r))}` : 'без программы'
}

/** Мощность ТЭНа на шагах программы для «Сварить» — по одной на паузу, затем на кипячение: как в прошлой партии на
 *  этой пивоварне (пауз теперь больше — как у последней из них), иначе — потолок модели; чего пивоварня не примет —
 *  тоже потолок. */
export function defaultWatts(r: ProgramSource, last: ProgramWatts | null | undefined, options: { value: number }[]): number[] {
  if (!options.length) return []
  const mash = (r.mash ?? []).map((_, i) => wattOr(last?.mash[i] ?? last?.mash.at(-1), options))
  return r.boil ? [...mash, wattOr(last?.boil, options)] : mash
}

/** Мощность нагрева до первой паузы для «Сварить»: как в прошлой партии, иначе потолок модели. */
export function defaultHeat(last: ProgramWatts | null | undefined, options: { value: number }[]) {
  return options.length ? wattOr(last?.heat, options) : null
}

/** w, если пивоварня такую примет, иначе потолок модели (первый вариант). */
function wattOr(w: number | null | undefined, options: { value: number }[]) {
  return w != null && options.some(o => o.value === w) ? w : options[0]!.value
}

/** Варианты мощности для выпадающего списка: от потолка модели вниз с её шагом мощности. */
export function wattOptions(l: Limits | null) {
  const out: { label: string; value: number }[] = []
  const step = l?.wattsStep ?? 100
  for (let w = l?.maxWatts ?? 2500; w >= (l?.minWatts ?? 100); w -= step) out.push({ label: `${w} W`, value: w })
  return out
}

/** «Кипячение · 60 мин», «Вирпул · 20 мин», «Сухое охмеление · 3-й день», «Затор». */
export function whenLabel(labels: Record<string, string>, use: string, minutes?: number | null, day?: number | null) {
  const base = labels[use] ?? use
  if ((use === 'boil' || use === 'whirlpool') && minutes != null) return `${base}${SEP}${minutes} мин`
  if (use === 'dry_hop' && day != null) return `${base}${SEP}${day}-й день`
  return base
}
