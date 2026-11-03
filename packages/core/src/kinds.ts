// Каталог оборудования пивовара: группы, виды и их параметры — всё, на чём и чем варят, бродят, меряют и разливают.
// Как у сервиса (service/app/brewery/kinds.py); общий пример — shared/kinds.json (то, что отдаёт GET /api/equipment/kinds).
//
// Варочные системы (system) — то, на чём варят: «Сварить» пересчитывает рецепт партии под их объём, эффективность
// и испарение, основное подставляется в новые рецепты; их параметры — поля оборудования (volume, efficiency,
// evaporation, kettle). У прочих видов параметры — свои, в props, и пока только описывают оборудование.
// Интерфейс строит формы и подписи по этому же каталогу; иконки видов — у интерфейса.
// Убрать или переименовать вид — только с миграцией данных: до неё такое оборудование видно как «Другое» и не правится.
// Поле: key, label, type (number | select | bool), для числа — unit, min, max, step, digits (знаков после запятой),
// prefix (перед значением в кратком описании: «котёл 40 л»), default — у нового; для выбора — options; для «да/нет» —
// short (в кратком описании, если да); help — подсказка под полем.

export type EquipmentKind
  = | 'manual' | 'allinone' | 'easybrew' | 'mash_tun' | 'hlt' | 'burner' | 'hop_spider' | 'mill' | 'chiller' | 'pump'
    | 'fermenter' | 'chamber' | 'glycol' | 'controller' | 'heater' | 'sensor' | 'hydrometer' | 'refractometer'
    | 'ph_meter' | 'thermometer' | 'scale' | 'stir_plate' | 'flask' | 'keg' | 'co2' | 'tap' | 'kegerator' | 'filter'
    | 'bottles' | 'other'

export interface EquipmentOption { value: string; label: string }

export interface EquipmentField {
  key: string
  label: string
  type: 'number' | 'select' | 'bool'
  unit?: string | null
  min?: number | null
  max?: number | null
  step?: number | null
  digits?: number | null            // знаков после запятой
  prefix?: string | null            // перед значением в кратком описании: «котёл 40 л»
  default?: number | null           // у нового
  short?: string | null             // «да/нет»: в кратком описании, если да
  options?: EquipmentOption[] | null
  help?: string | null
}

/** Вид оборудования, как его видит интерфейс. */
export interface EquipmentKindInfo {
  id: EquipmentKind
  label: string
  hint: string
  system: boolean
  fields: EquipmentField[]
}

export interface EquipmentCategory {
  id: string
  label: string
  kinds: EquipmentKindInfo[]
}

type Pair = [string, string]

/** Параметр-число: пустые свойства — null, как в ответе сервиса. */
interface NumberOptions { step?: number; digits?: number; help?: string; prefix?: string; default?: number }
function number(key: string, label: string, unit: string, lo: number, hi: number, o: NumberOptions = {}): EquipmentField {
  return {
    key, label, type: 'number', unit, min: lo, max: hi, step: o.step ?? 1, digits: o.digits ?? 0, help: o.help ?? null,
    prefix: o.prefix ?? null, default: o.default ?? null, short: null, options: null,
  }
}

function select(key: string, label: string, options: [string, string][], help?: string): EquipmentField {
  return {
    key, label, type: 'select', options: options.map(([value, text]) => ({ value, label: text })), help: help ?? null,
    unit: null, min: null, max: null, step: null, digits: null, prefix: null, default: null, short: null,
  }
}

function flag(key: string, label: string, short: string, help?: string): EquipmentField {
  return {
    key, label, type: 'bool', short, help: help ?? null,
    unit: null, min: null, max: null, step: null, digits: null, prefix: null, default: null, options: null,
  }
}

const SYSTEM_FIELDS: EquipmentField[] = [
  number('volume', 'Объём партии', 'л', 0.5, 2000, { digits: 1, help: 'После кипячения' }),
  number('efficiency', 'Эффективность', '%', 1, 100, { help: 'Для новых рецептов', default: 75 }),
  number('evaporation', 'Испарение', 'л/ч', 0, 20, { step: 0.1, digits: 1, help: 'За час, без крышки', default: 3 }),
  number('kettle', 'Объём котла', 'л', 1, 5000, { digits: 1, prefix: 'котёл', help: 'До краёв — проверить, влезет ли варка' }),
]
/** Средние значения варочной системы: у неё не указанные эффективность и испарение — они. */
export const SYSTEM_DEFAULTS: Record<string, number> = Object.fromEntries(
  SYSTEM_FIELDS.filter(f => f.default != null).map(f => [f.key, f.default!]),
)
const VOLUME = number('volume', 'Объём', 'л', 0.1, 5000, { digits: 1 })
const ATC = flag('atc', 'Термокомпенсация (ATC)', 'ATC')

/** Погрешность прибора: сколько он показывает сверх эталона; плюс — завышает. */
function offset(unit: string, lo: number, hi: number, step: number, digits: number, help: string) {
  return number('offset', 'Погрешность', unit, lo, hi, { step, digits, prefix: 'погрешность', help })
}

/** Вид каталога: ranges — пары полей «от» и «до»: «от» не больше «до»; наружу не отдаётся. */
export interface CatalogKind extends EquipmentKindInfo { ranges: Pair[] }
export interface CatalogCategory { id: string; label: string; kinds: CatalogKind[] }

function kind(id: EquipmentKind, label: string, hint: string, fields: EquipmentField[] = [], system = false, ranges: Pair[] = []): CatalogKind {
  return { id, label, hint, system, fields: system ? SYSTEM_FIELDS : fields, ranges }
}

export const CATEGORIES: CatalogCategory[] = [
  { id: 'brew', label: 'Варка', kinds: [
    kind('manual', 'Кастрюля или котёл', 'На плите, газе или электрокотле', [], true),
    kind('allinone', 'Автоматическая пивоварня', 'Brewzilla, Grainfather, Braumeister и другие — без подключения к сайту', [], true),
    kind('easybrew', 'Easy Brew Connect', 'Пивоварня, которой управляют с сайта: программа, закладки, график варки', [], true),
    kind('mash_tun', 'Заторный кулер', 'Изотермический бак для затирания', [VOLUME]),
    kind('hlt', 'Котёл для промывочной воды', 'Нагрев воды для промывки', [VOLUME]),
    kind('burner', 'Горелка или плита', 'Газовая, индукционная, электрическая',
      [number('power', 'Мощность', 'кВт', 0.1, 50, { step: 0.5, digits: 1 })]),
    kind('hop_spider', 'Хмелевой фильтр', 'Hop Spider, мешок для хмеля'),
  ] },
  { id: 'mill', label: 'Помол', kinds: [
    kind('mill', 'Мельница', 'Дробилка для солода', [
      number('gap_min', 'Зазор от', 'мм', 0.1, 3, { step: 0.05, digits: 2, prefix: 'зазор от', help: 'Пределы регулировки валков' }),
      number('gap_max', 'Зазор до', 'мм', 0.1, 3, { step: 0.05, digits: 2, prefix: 'до' }),
      select('rollers', 'Валков', [['2', '2 валка'], ['3', '3 валка']]),
    ], false, [['gap_min', 'gap_max']]),
  ] },
  { id: 'chill', label: 'Охлаждение сусла', kinds: [
    kind('chiller', 'Чиллер', 'Охлаждение сусла после кипячения', [
      select('type', 'Тип', [['immersion', 'погружной'], ['counterflow', 'противоточный'], ['plate', 'пластинчатый']]),
    ]),
    kind('pump', 'Насос', 'Перекачка сусла и воды', [flag('hot', 'Для горячего сусла', 'для горячего')]),
  ] },
  { id: 'ferment', label: 'Брожение', kinds: [
    kind('fermenter', 'Ферментер', 'Ведро, бутыль, ЦКТ', [
      VOLUME,
      number('pressure', 'Давление', 'бар', 0, 5, { step: 0.1, digits: 1, prefix: 'до', help: 'Сколько держит; 0 — без давления' }),
      select('cooling', 'Охлаждение', [['none', 'без охлаждения'], ['jacket', 'рубашка'], ['coil', 'змеевик']]),
    ]),
    kind('chamber', 'Камера брожения', 'Холодильник или морозильник под брожение',
      [number('min_temp', 'Холоднее всего', '°C', -10, 25, { digits: 1, prefix: 'от' })]),
    kind('glycol', 'Гликолевый охладитель', 'Охлаждение рубашки или змеевика ферментера',
      [number('min_temp', 'Холоднее всего', '°C', -10, 25, { digits: 1, prefix: 'от' })]),
    kind('controller', 'Контроллер температуры', 'STC, Inkbird и другие', [
      select('channels', 'Управляет', [['cool', 'охлаждением'], ['heat', 'нагревом'], ['both', 'охлаждением и нагревом']]),
    ]),
    kind('heater', 'Нагреватель', 'Пояс, коврик, тэн в камере', [number('power', 'Мощность', 'Вт', 1, 5000)]),
    kind('sensor', 'Датчик плотности', 'Tilt, iSpindel, RAPT Pill'),
  ] },
  { id: 'measure', label: 'Измерения', kinds: [
    kind('hydrometer', 'Ареометр', 'Плотность сусла и пива', [
      offset('°P', -5, 5, 0.1, 1, 'Что показывает на чистой воде; плюс — завышает'),
      number('calibration_temp', 'Калиброван при', '°C', 10, 30, { step: 0.5, digits: 1, prefix: 'при', help: 'Написано на шкале: обычно 20 °C' }),
    ]),
    kind('refractometer', 'Рефрактометр', 'Плотность по капле сусла', [
      offset('°Bx', -5, 5, 0.1, 1, 'Что показывает на чистой воде; плюс — завышает'), ATC]),
    kind('ph_meter', 'pH-метр', 'Кислотность затора и сусла', [
      offset('pH', -2, 2, 0.01, 2, 'Против буферного раствора; плюс — завышает'), ATC]),
    kind('thermometer', 'Термометр', 'Щуп, пирометр, стрелочный', [
      offset('°C', -10, 10, 0.1, 1, 'Против эталонного термометра; плюс — завышает')]),
    kind('scale', 'Весы', 'Солод, хмель, соли', [
      number('max', 'Предел', 'кг', 0.01, 500, { step: 0.5, digits: 2, prefix: 'до' }),
      number('precision', 'Точность', 'г', 0.001, 100, { step: 0.01, digits: 3 }),
    ]),
  ] },
  { id: 'yeast', label: 'Дрожжи', kinds: [
    kind('stir_plate', 'Магнитная мешалка', 'Для стартера'),
    kind('flask', 'Колба', 'Стартер дрожжей', [number('volume', 'Объём', 'л', 0.1, 20, { step: 0.5, digits: 1 })]),
  ] },
  { id: 'package', label: 'Розлив и газ', kinds: [
    kind('keg', 'Кег', 'Cornelius, Sanke и другие', [VOLUME]),
    kind('co2', 'Баллон CO₂', 'С редуктором', [number('volume', 'Объём', 'л', 0.5, 50, { step: 0.5, digits: 1 })]),
    kind('tap', 'Система розлива', 'Кран, пистолет, «фонтан»'),
    kind('kegerator', 'Кегератор', 'Холодильник под кеги', [number('taps', 'Кранов', '', 1, 20, { prefix: 'кранов:' })]),
    kind('filter', 'Фильтр', 'Осветление перед розливом', [number('micron', 'Тонкость', 'мкм', 0.1, 100, { step: 0.5, digits: 1 })]),
    kind('bottles', 'Бутылки и укупорка', 'Бутылки, крышки, укупорщик'),
  ] },
  { id: 'other', label: 'Другое', kinds: [
    kind('other', 'Другое', 'Всё, чего нет в списке'),
  ] },
]

export type CatalogKindEntry = CatalogKind & { category: string }

export const KINDS: Record<string, CatalogKindEntry> = Object.fromEntries(
  CATEGORIES.flatMap(c => c.kinds.map(k => [k.id, { ...k, category: c.id }] as const)),
)
export const KIND_IDS = Object.keys(KINDS)
export const SYSTEMS = Object.values(KINDS).filter(k => k.system).map(k => k.id)
/** Пивоварни с ТЭНом: у партии на них — мощность на шагах программы. */
export const HEATED: EquipmentKind[] = ['easybrew', 'allinone']

export function isSystem(kindId: string) {
  return KINDS[kindId]?.system ?? false
}

/** Параметры варочной системы — поля оборудования, а не props. */
export const COLUMNS = SYSTEM_FIELDS.map(f => f.key)

/** Каталог так, как его отдаёт GET /api/equipment/kinds: без внутренних ranges. */
export function catalogView(): EquipmentCategory[] {
  return CATEGORIES.map(c => ({
    id: c.id, label: c.label,
    kinds: c.kinds.map(({ id, label, hint, system, fields }) => ({ id, label, hint, system, fields })),
  }))
}

/** Число по-русски для текстов: 3,5; digits — округлить и убрать хвостовые нули (13,4 из 13,40). */
function ruNum(v: number, digits?: number) {
  const s = digits == null ? String(Number(v.toPrecision(6))) : v.toFixed(digits).replace(/0+$/, '').replace(/\.$/, '')
  return s.replace('.', ',')
}

/** Параметры не подошли виду: текст ошибки — человеческим языком. */
export class InvalidEquipmentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidEquipmentError'
  }
}

type Values = Record<string, unknown>

/** Значения по полям fields: только их ключи, числа — в пределах и не точнее digits, выбор — из списка,
 *  «да/нет» — boolean; пустые выкидываются. label — вид, для текста ошибки. */
export function checkValues(label: string, fields: EquipmentField[], values: Values | null | undefined) {
  const byKey = new Map(fields.map(f => [f.key, f]))
  const out: Record<string, number | string | boolean> = {}
  for (const [key, value] of Object.entries(values ?? {})) {
    if (value == null || value === '') continue
    const f = byKey.get(key)
    if (!f) throw new InvalidEquipmentError(`у вида «${label}» нет параметра «${key}»`)
    if (f.type === 'number') {
      if (typeof value !== 'number') throw new InvalidEquipmentError(`«${f.label}» — число`)
      if (!(f.min! <= value && value <= f.max!)) {
        throw new InvalidEquipmentError(`«${f.label}» — от ${ruNum(f.min!)} до ${ruNum(f.max!)} ${f.unit}`.trimEnd())
      }
      if (Math.abs(roundTo(value, f.digits ?? 0) - value) > 1e-9) {
        throw new InvalidEquipmentError(`«${f.label}» — ${!f.digits ? 'целое число' : `не больше ${f.digits} знаков после запятой`}`)
      }
      out[key] = value
    } else if (f.type === 'select') {
      if (!f.options?.some(o => o.value === value)) throw new InvalidEquipmentError(`«${f.label}» — выберите из списка`)
      out[key] = value as string
    } else {
      if (typeof value !== 'boolean') throw new InvalidEquipmentError(`«${f.label}» — да или нет`)
      out[key] = value
    }
  }
  return out
}

function roundTo(x: number, digits: number) {
  const k = 10 ** digits
  return Math.round(x * k) / k
}

/** (поля, props) оборудования вида kindId: у варочной системы — её поля (не указанные эффективность и испарение —
 *  средние), props пусты; у прочего — props, поля пусты. Прислали чужое для вида — InvalidEquipmentError. */
export function checkParams(kindId: string, columns: Values | null | undefined, props: Values | null | undefined) {
  const k = KINDS[kindId]
  if (!k) throw new InvalidEquipmentError('неизвестный вид оборудования')
  const given = Object.fromEntries(Object.entries(columns ?? {}).filter(([, v]) => v != null))
  const empty = Object.fromEntries(COLUMNS.map(key => [key, null])) as Record<string, number | null>
  if (k.system) {
    if (Object.values(props ?? {}).some(v => v != null && v !== '')) {
      throw new InvalidEquipmentError('у варочной системы параметры — объём партии, эффективность, испарение и котёл')
    }
    return { columns: { ...empty, ...SYSTEM_DEFAULTS, ...checkValues(k.label, k.fields, given) }, props: {} }
  }
  if (Object.keys(given).length) {
    throw new InvalidEquipmentError(`у вида «${k.label}» нет объёма партии, эффективности, испарения и котла — его параметры в props`)
  }
  const out = checkValues(k.label, k.fields, props)
  const fields = new Map(k.fields.map(f => [f.key, f]))
  for (const [lo, hi] of k.ranges) {
    const a = out[lo], b = out[hi]
    if (typeof a === 'number' && typeof b === 'number' && a > b) {
      throw new InvalidEquipmentError(`«${fields.get(lo)!.label}» больше, чем «${fields.get(hi)!.label}»`)
    }
  }
  return { columns: empty, props: out }
}
