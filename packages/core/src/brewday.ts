// Варочный день партии: шаги, текущий шаг и когда начат каждый приходят с сервиса (service/app/brewery/brewday.py —
// по записям «step» пивовара и событиям программы пивоварни). Здесь — что приготовить на шаге (вода и соли, засыпь,
// дрожжи, промывочная вода, объём и плотность до кипячения — из рецепта партии с испарением оборудования; на идущей
// промывке — хватает ли экстракта по объёму и плотности в котле) и живой шаг пивоварни, пока она варит эту
// партию: k-й шаг программы — k-я пауза, кипячение — кипячение, подсказка «солод» — засыпь, «конец затирания» —
// промывка, нагрев до первой паузы — нагрев. Варочный день позади (дрожжи, «закончить», брошен) — все шаги сделаны;
// вылили в варочный день, без дрожжей, — пройденное сделано, остальное так и не случилось.
// Остаток таймера считает «Сейчас» (stepRemaining): ему нужны секунды, остальной странице — нет.
import { additionAmount, additionName, unitLabel } from './additions'
import type { GravityUnit } from './beer'
import { fmtGravity, gravityIn } from './beer'
import { extractForSg, mashShare, mashSgMax, preBoilSg, sgFromExtract } from './calc'
import { fmtMinutes, fmtNumber, SEP } from './format'
import type { RecipeInput } from './schema'
import { WATER_AGENTS, waterAmount, waterVolumes } from './water'

/** Вид записи журнала варки. */
export type EntryKind
  = | 'mash_gravity' | 'first_wort' | 'preboil_gravity' | 'og' | 'gravity' | 'fg' | 'ph' | 'preboil_volume'
    | 'postboil_volume' | 'fermenter_volume' | 'mash_temp' | 'pitch_temp' | 'temp' | 'pitch' | 'dry_hop' | 'cold_crash'
    | 'package' | 'dumped' | 'note' | 'stage' | 'step'

/** Запись журнала: вид, когда (unix-время, с) и значение (плотность — SG, pH, объём — л, температура — °C). */
export interface BrewEntryFact { kind: EntryKind; at: number; value?: number | null }

/** Закладка шага кипячения: за сколько минут до конца и подпись. */
export interface BrewDayAddition { minutes: number; label: string }

/** Шаг варочного дня, как его отдаёт сервис. */
export interface BrewDayStep {
  index: number
  key: string
  kind: 'prepare' | 'heat' | 'mash_in' | 'rest' | 'sparge' | 'boil' | 'chill' | 'pitch'
  name: string
  temp?: number | null
  minutes?: number | null
  watts?: number | null
  measures: EntryKind[]
  additions: BrewDayAddition[]
  at?: number | null
}

/** Живое состояние пивоварни — то, что читает варочный день. */
export interface BreweryState {
  brewId?: string | null
  online: boolean
  alert?: string | null
  deviceRecipe?: { steps: { boil: boolean }[] } | null
}

/** Где программа пивоварни: шаг, нагрев, кипячение. */
export interface BreweryPhase {
  inRecipe: boolean
  heating: boolean
  step: number
  current: { boil: boolean } | null
}

/** Партия — то, что читает варочный день. */
export interface BrewDayInput {
  id: string
  brewDay?: BrewDayStep[]
  currentStep: number
  phase: 'brewday' | 'fermenting' | 'packaged' | 'dumped'
  snapshot?: RecipeInput | null
  fermentStart?: number | null
  status: 'running' | 'finished' | 'stopped'
  manual: boolean
  entries: BrewEntryFact[]
}

export type StepState = 'done' | 'now' | 'next'

export interface DayStep extends BrewDayStep {
  state: StepState
  details: string[]          // что приготовить
  ends: number | null        // когда истекает таймер шага
}
export interface BrewDayView {
  steps: DayStep[]
  current: number
  active: boolean            // варочный день идёт: показывать «Сейчас»
  byBrewery: boolean         // шаги ведёт пивоварня
}

/** Шаг варочного дня по живой программе пивоварни; null — программа не идёт. У нагрева может быть свой шаг программы
 *  перед первой паузой («Нагрев» своей мощностью): шагов-не-кипячения в программе больше, чем пауз, — паузы сдвинуты. */
export function breweryStep(steps: BrewDayStep[], s: BreweryState | null, phase: BreweryPhase) {
  if (!s || !phase.inRecipe) return null
  const by = (kind: BrewDayStep['kind']) => steps.find(x => x.kind === kind)?.index ?? null
  if (s.alert === 'malt') return by('mash_in')
  if (s.alert === 'mashEnd') return by('sparge')
  if (phase.current?.boil) return by('boil')
  const rests = steps.filter(x => x.kind === 'rest')
  const offset = Math.max(0, (s.deviceRecipe?.steps ?? []).filter(d => !d.boil).length - rests.length)
  const k = phase.step - offset                      // номер паузы; свой шаг нагрева — 0
  if (k < 1) return phase.heating ? by('heat') ?? rests[0]?.index ?? null : rests[0]?.index ?? null   // после засыпи — догрев
  const rest = rests[k - 1]
  if (!rest) return null
  return k === 1 && !offset && phase.heating ? by('heat') ?? rest.index : rest.index
}

const litres = (v: number | null) => (v == null ? '—' : fmtNumber(v, 1, ' л'))

/** «Brewtan B 0,5 г», «Hallertau 20 г» — хмель и прочее рецепта с этим применением. */
function usedAt(r: RecipeInput, hopUse: string, miscUse: string | null) {
  return [
    ...(r.hops ?? []).filter(h => h.use === hopUse).map(h => ({ kind: 'hop' as const, name: h.name, amount: h.amount, unit: 'g' as const })),
    ...(r.miscs ?? []).filter(m => miscUse != null && m.use === miscUse),
  ].map(a => [additionName(a), additionAmount(a)].filter(Boolean).join(' '))
}

/** Сусло в котле по замерам: объём, л, и плотность, SG. */
export interface Kettle { volume: number; sg: number }

const VOLUME_NEAR = 0.05                   // л: объём до кипячения набран, если отличается не больше

/** Промывка по экстракту, а не по объёму: промывка каждый раз вымывает по-разному, поэтому считаем, сколько экстракта
 *  уже в котле, — какая плотность выйдет при объёме до кипячения, если сейчас остановиться и долить водой. Хватает
 *  (в показанных цифрах) — стоп и долить; в котле уже больше объёма до кипячения — стоп и кипятить дольше (сколько —
 *  по испарению evaporation, л/ч); не хватает — промывать дальше, а объём уже набран — только недобор. */
export function spargeLine(kettle: Kettle, preBoil: number, target: number, unit: GravityUnit = 'plato',
  evaporation: number | null = null) {
  const at = sgFromExtract(extractForSg(kettle.sg, kettle.volume), preBoil)
  const got = `набрано на ${fmtGravity(at, unit)} при ${litres(preBoil)}`
  const extra = kettle.volume - preBoil
  if (gravityIn(at, unit) >= gravityIn(target, unit)) {
    if (extra < -VOLUME_NEAR) return `${got} — хватает: промывку стоп, долейте воды до ${litres(preBoil)}`
    if (extra <= VOLUME_NEAR) return `${got} — хватает: промывку стоп`
    const longer = evaporation ? ` на ~${fmtMinutes(Math.max(1, Math.round((extra / evaporation) * 60)))}` : ''
    return `${got} — хватает: промывку стоп; в котле лишние ${litres(extra)} — кипятить${longer} дольше`
  }
  return `${got}, нужно ${fmtGravity(target, unit)}${extra < -VOLUME_NEAR ? ' — промывайте дальше' : ''}`
}

/** Что приготовить на шаге: на подготовке — вода с солями и тем, что идёт в затор (хмель, Brewtan B…), засыпь по
 *  солодам, дрожжи; на промывке — объёмы, плотность до кипячения (в единицах пивовара), хватает ли экстракта по
 *  замерам в котле (kettle) и хмель на первое сусло. */
export function stepDetails(step: Pick<BrewDayStep, 'kind'>, r: RecipeInput | null | undefined, unit: GravityUnit = 'plato',
  kettle: Kettle | null = null): string[] {
  if (!r || (step.kind !== 'prepare' && step.kind !== 'sparge')) return []
  const v = waterVolumes(r, r.batch?.evaporation)
  if (step.kind === 'sparge') {
    const firstWort = usedAt(r, 'first_wort', null)
    const sg = v.preBoil != null ? preBoilSg(r, v.preBoil) : null
    return [v.sparge != null && `промывочная вода ${litres(v.sparge)}`,
      v.preBoil != null && `до кипячения ${litres(v.preBoil)}${sg != null && sg > 1 ? `${SEP}${fmtGravity(sg, unit)}` : ''}`,
      kettle && kettle.sg > 1 && kettle.volume > 0 && v.preBoil != null && sg != null && sg > 1 && spargeLine(kettle, v.preBoil, sg, unit, r.batch?.evaporation),
      firstWort.length > 0 && `на первое сусло: ${firstWort.join(', ')}`]
      .filter(Boolean) as string[]
  }
  const out: string[] = []
  const salts = r.water?.additions ?? []
  for (const [target, label, l] of [['mash', 'Затор', v.mash], ['sparge', 'Промывка', v.sparge]] as const) {
    const mine = salts.filter(a => (a.target ?? 'mash') === target)
    const parts = mine.map(a => [(a.agent === 'other' ? a.name || 'добавка' : WATER_AGENTS[a.agent].label).toLowerCase(),
      waterAmount(a.agent, a.amount)].filter(Boolean).join(' '))
    if (target === 'mash') parts.push(...usedAt(r, 'mash', 'mash'))
    if (l == null && !parts.length) continue
    out.push(`${label}: ${litres(l)}${parts.length ? ` — ${parts.join(', ')}` : ''}`)
  }
  const grains = (r.fermentables ?? []).filter(f => (f.use ?? 'mash') === 'mash' && f.amount)
  if (grains.length) {
    const total = grains.reduce((a, f) => a + f.amount!, 0)
    out.push(`Засыпь ${fmtNumber(total, 2, ' кг')}: ${grains.map(f => `${f.name || 'солод'} ${fmtNumber(f.amount, 3, ' кг')}`).join(SEP)}`)
  }
  const yeasts = (r.yeasts ?? []).filter(y => y.name)
  if (yeasts.length) {
    out.push(`Дрожжи: ${yeasts.map(y => y.name + (y.amount ? ` ${fmtNumber(y.amount, 1)} ${unitLabel(y.unit ?? 'pkg')}` : '')).join(', ')}`)
  }
  return out
}

export function brewDay(
  brew: BrewDayInput,
  s: BreweryState | null,
  phase: BreweryPhase,
  unit: GravityUnit = 'plato',
): BrewDayView {
  const steps = brew.brewDay ?? []
  const over = brew.phase !== 'brewday'
  const cut = brew.phase === 'dumped' && brew.fermentStart == null
  // программа партии идёт, а живого состояния пивоварни нет — день всё равно ведёт она, а не ручные шаги
  const byBrewery = !over && (s?.brewId === brew.id || (brew.status === 'running' && !brew.manual && !s?.online))
  const current = (byBrewery ? breweryStep(steps, s, phase) : null) ?? brew.currentStep
  // сусло в котле — последние замеры объёма и плотности; на идущей промывке по ним видно, хватает ли экстракта
  const m = lastMeasures(brew.entries)
  const volume = m.get('preboil_volume')?.value
  const sg = m.get('preboil_gravity')?.value
  const kettle = volume != null && sg != null ? { volume, sg } : null
  const views: DayStep[] = steps.map((st, i) => {
    const state: StepState = cut ? (i < current ? 'done' : 'next') : over || i < current ? 'done' : i === current ? 'now' : 'next'
    return {
      ...st,
      state,
      details: stepDetails(st, brew.snapshot, unit, state === 'now' ? kettle : null),
      ends: st.at != null && st.minutes ? st.at + st.minutes * 60 : null,
    }
  })
  return { steps: views, current, active: !over, byBrewery }
}

/** Секунд до конца таймера шага; отрицательное — время вышло; null — у шага нет таймера или он не начат. */
export function stepRemaining(step: Pick<DayStep, 'ends'>, now: number) {
  return step.ends != null ? step.ends - now : null
}

/** Подсказка к замеру на шаге: pH — цель по рецепту (партии), не задана — обычный диапазон; плотность затора —
 *  сколько будет при полном осахаривании и сколько уже есть по последнему замеру (last, SG). */
export function measureHint(kind: EntryKind, r: RecipeInput | null | undefined, unit: GravityUnit = 'plato',
  last: number | null = null) {
  if (kind === 'ph') {
    const ph = r?.water?.ph
    return ph != null ? `по рецепту ${fmtNumber(ph, 2)}` : 'обычно 5,2–5,4'
  }
  if (kind !== 'mash_gravity' || !r) return null
  const max = mashSgMax(r)
  if (max == null) return null
  const now = last != null && last > 1 ? `${SEP}сейчас ~${Math.round(mashShare(last, max) * 100)} %` : ''
  return `полное осахаривание — до ~${fmtGravity(max, unit)}${now}`
}

/** Последний замер каждого вида — для чипов на шагах. */
export function lastMeasures<E extends BrewEntryFact>(entries: E[]) {
  const out = new Map<EntryKind, E>()
  for (const e of entries) {
    if (e.value == null) continue
    const prev = out.get(e.kind)
    if (!prev || e.at >= prev.at) out.set(e.kind, e)
  }
  return out
}
