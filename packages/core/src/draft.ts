// Форма редактора рецепта ↔ рецепт сервиса: модель формы, новые строки, проверка по ограничениям пивоварни (Limits).
// Модель формы: все поля на месте (необязательные — null), строки — не null.
import { ADDITION_KINDS } from './additions'
import { calcRecipe, DEFAULT_EFFICIENCY } from './calc'
import type { EquipmentParams } from './equipment'
import type { Limits } from './program'
import { deviceTimers } from './program'
import type {
  AdditionKind, Batch, Boil, Fermentable, FermentationStep, Hop, MashStep, Misc, RecipeInput, StyleRefInput,
  WaterAddition, WaterAgent, WaterProfile, Yeast,
} from './schema'

export type FermentableRow = Fermentable
export type HopRow = Hop
export type MiscRow = Misc
export type YeastRow = Yeast
// мощности ТЭНа у рецепта нет — она у партии («Сварить»)
export type MashRow = Omit<MashStep, 'watts'> & { name: string }
export type FermentationRow = FermentationStep & { name: string }
export type WaterAdditionRow = WaterAddition

export interface WaterDraft {
  ratio: number | null                  // гидромодуль, л/кг; литры считаются (water.ts)
  ph: number | null                     // цель pH затора
  source: WaterProfile
  additions: WaterAdditionRow[]
}

export interface RecipeDraft {
  name: string
  style: StyleRefInput | null
  batch: Omit<Batch, 'evaporation'>        // испарение — у рецепта партии, не у рецепта; показатели (OG, IBU…) не хранятся в форме — считаются (calc.ts)
  fermentables: FermentableRow[]
  hops: HopRow[]
  miscs: MiscRow[]
  yeasts: YeastRow[]
  water: WaterDraft
  mash: MashRow[]
  boil: Omit<Boil, 'watts'> | null
  fermentation: FermentationRow[]
  notes: string
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
  ratio: 3, ph: null, source: { ca: 0, mg: 0, na: 0, cl: 0, so4: 0, hco3: 0 }, additions: [],
})
export const mashStep = (temp = 66, minutes = 60, name = ''): MashRow => ({ name, temp, minutes })
export const fermentationStep = (temp = 18, days = 7, name = '', until: FermentationRow['until'] = 'days'): FermentationRow =>
  ({ name, temp, days, until, gravity: null })

/** Новый рецепт: объём партии и эффективность — из основного оборудования (нет — объём задаёт пивовар). Мощности
 *  ТЭНа у рецепта нет — её задают при «Сварить» под пивоварню. */
export function blankRecipe(equipment: Pick<EquipmentParams, 'volume' | 'efficiency'> | null): RecipeDraft {
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
export function toDraft(r: RecipeInput): RecipeDraft {
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
      ph: r.water?.ph ?? null,
      source: { ...blankWater().source, ...r.water?.source },
      additions: (r.water?.additions ?? []).map(a => ({
        agent: a.agent, name: a.name ?? '', amount: a.amount ?? null, target: a.target ?? 'mash',
      })),
    },
    // мощность ТЭНа, если рецепт сохранили с ней раньше, — не в черновик: она у партии; кипячение — копией: иначе
    // «Отмена» оставит правку на странице рецепта
    mash: (r.mash ?? []).map(s => ({ name: s.name ?? '', temp: s.temp, minutes: s.minutes })),
    boil: r.boil ? { minutes: r.boil.minutes } : null,
    fermentation: (r.fermentation ?? []).map(s => ({ ...s, name: s.name ?? '', days: s.days ?? 0, until: s.until ?? 'days', gravity: s.gravity ?? null })),   // days: сервис всегда присылает (по умолчанию 0); `?? 0` нужен только для типа строки формы (number)
    notes: r.notes ?? '',
  }
}

const blank = (row: { name: string; amount: number | null }) => !row.name.trim() && row.amount == null
const timed = (use: string) => use === 'boil' || use === 'whirlpool'

/** Форма → API: пустые строки отбрасываются, время — только там, где оно имеет смысл;
 *  показатели — посчитанные по ингредиентам (по ним работают список и фильтры). */
export function toRecipe(d: RecipeDraft) {
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
  if (d.water.ph != null && !(d.water.ph >= 4 && d.water.ph <= 7)) out.push('Вода: pH затора — от 4 до 7')
  d.fermentation.forEach((s, i) => {
    const name = s.name.trim() || `Этап ${i + 1}`
    if (s.until === 'gravity' && s.gravity == null) out.push(`Брожение: у этапа «${name}» — до какой плотности`)
    if (s.until === 'days' && !s.days) out.push(`Брожение: у выдержки «${name}» — сколько дней`)
  })
  return out
}
