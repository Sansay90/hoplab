// Схема рецепта (zod): Recipe и всё вложенное — как у сервиса (service/app/recipes/schemas.py): те же поля,
// обязательность, значения по умолчанию, пределы и перечисления. Рецепт описывает пиво (по мотивам BeerJSON);
// программа пивоварни — затирание и кипячение — и напоминания на кипячении выводятся из него (program.ts).
// Плотность — SG (1.048), цвет — EBC, объём — л, солод — кг, хмель — г.
// Типы: Recipe — разобранный рецепт (z.infer, все поля на месте); RecipeInput — то, что принимают расчёты и что
// приходит по сети (z.input: поля со значением по умолчанию можно не указывать).
import * as z from 'zod'

const AdditionKinds = ['hop', 'spice', 'fining', 'water', 'adjunct', 'sugar', 'equipment'] as const
const Units = ['g', 'kg', 'ml', 'pcs', 'pkg'] as const
const WaterAgents = ['cacl2', 'cacl2_anhydrous', 'gypsum', 'nacl', 'nahco3', 'caco3', 'epsom', 'lactic80', 'lactic88', 'other'] as const

/** Число или null, по умолчанию null: у сервиса `float | None = None`. */
const maybe = (n: z.ZodNumber) => n.nullable().default(null)
/** Мощность ТЭНа, W — только у рецепта партии: её задают при «Сварить» под пивоварню, у рецепта не хранится. */
const watts = z.int().nullable().default(null)

/** Что заложить в кипячение: хмель, специи, осветлитель, соли, добавка, сахар или оборудование (чиллер). */
export const additionSchema = z.object({
  minutes: z.int(),                                      // минут до конца кипячения
  kind: z.enum(AdditionKinds).default('hop'),
  name: z.string().nullable().default(null),
  amount: maybe(z.number().min(0).max(100_000)),         // у оборудования не бывает
  unit: z.enum(Units).default('g'),
  whirlpool: z.int().nullable().default(null),           // вирпул: закладывают в конце кипячения и выдерживают столько минут
})

/** Таймер пивоварни и всё, что закладывают по нему: на одну минуту — один писк. */
export const additionSlotSchema = z.object({
  minutes: z.int(),                                      // минут до конца кипячения
  items: z.array(additionSchema),                        // пусто — рецепт загружен не из приложения
  label: z.string(),
})

export const styleRefSchema = z.object({
  code: z.string().nullable().default(null),             // стиль BJCP 2021, напр. 5B; null — свой стиль
  name: z.string(),
})

export const batchSchema = z.object({
  volume: maybe(z.number().min(0).max(10_000)),          // л сусла после кипячения — к нему считаются OG, IBU и цвет
  efficiency: maybe(z.number()),                         // %: экстракт в сусле после кипячения / экстракт засыпи
  evaporation: maybe(z.number()),                        // л/ч — у рецепта партии: по нему вода на варку
})

/** Показатели по ингредиентам: сервис считает их сам при сохранении (calc.ts) — присланные не сохраняются. */
export const targetsSchema = z.object({
  og: maybe(z.number()),                                 // начальная плотность, SG
  fg: maybe(z.number()),                                 // конечная плотность, SG
  ibu: maybe(z.number()),
  ebc: maybe(z.number()),
  abv: maybe(z.number()),                                // % об. — с сахаром, добавленным на брожении
})

export const fermentableSchema = z.object({
  name: z.string().default(''),
  kind: z.enum(['grain', 'adjunct', 'sugar', 'extract']).default('grain'),
  amount: maybe(z.number().min(0).max(10_000)),          // кг
  ebc: maybe(z.number().min(0).max(10_000)),
  use: z.enum(['mash', 'boil', 'fermentation']).default('mash'),
  minutes: z.int().nullable().default(null),             // кипячение — за сколько минут до конца
})

export const hopSchema = z.object({
  name: z.string().default(''),
  alpha: maybe(z.number().min(0).max(100)),              // альфа-кислоты, %
  amount: maybe(z.number().min(0).max(100_000)),         // г
  use: z.enum(['mash', 'first_wort', 'boil', 'whirlpool', 'dry_hop']).default('boil'),
  minutes: z.int().nullable().default(null),             // кипячение — за сколько минут до конца; вирпул — сколько стоит
  day: z.int().nullable().default(null),                 // сухое охмеление — день брожения; при gravity — примерный
  gravity: maybe(z.number().min(0.98).max(1.2)),         // сухое охмеление — при какой плотности, SG; в партии — от фактической OG
})

export const miscSchema = z.object({
  name: z.string().default(''),
  kind: z.enum(['spice', 'fining', 'adjunct', 'equipment']).default('adjunct'),
  amount: maybe(z.number().min(0).max(100_000)),         // у оборудования не бывает
  unit: z.enum(Units).default('g'),
  use: z.enum(['mash', 'boil', 'whirlpool', 'fermentation', 'packaging']).default('boil'),
  minutes: z.int().nullable().default(null),             // кипячение — за сколько минут до конца
})

/** Ионы, мг/л. */
export const waterProfileSchema = z.object({
  ca: z.number().default(0),
  mg: z.number().default(0),
  na: z.number().default(0),
  cl: z.number().default(0),
  so4: z.number().default(0),
  hco3: z.number().default(0),
})

/** Соль (г) или кислота (мл) в заторную или промывочную воду. */
export const waterAdditionSchema = z.object({
  agent: z.enum(WaterAgents),
  name: z.string().default(''),                          // для agent = other
  amount: maybe(z.number().min(0).max(100_000)),
  target: z.enum(['mash', 'sparge']).default('mash'),
})

/** Заторная вода = гидромодуль × засыпь; промывочная — остальное до объёма перед кипячением с поправкой на дробину
 *  (считает water.ts: испарение — у оборудования, а не в рецепте). */
export const waterSchema = z.object({
  ratio: maybe(z.number()),                              // гидромодуль — заторная вода к засыпи, л/кг
  ph: maybe(z.number().min(4).max(7)),                   // цель pH затора — проба при комнатной температуре
  source: waterProfileSchema.prefault({}),               // исходная вода; нули — осмос
  additions: z.array(waterAdditionSchema).default([]),
})

export const yeastSchema = z.object({
  name: z.string().default(''),
  form: z.enum(['dry', 'liquid']).default('dry'),
  amount: maybe(z.number().min(0).max(100_000)),
  unit: z.enum(Units).default('pkg'),
  attenuation: maybe(z.number().min(0).max(100)),        // степень сбраживания, %
})

export const mashStepSchema = z.object({
  name: z.string().nullable().default(null),
  temp: z.number(),
  minutes: z.int(),
  watts,
})

export const boilSchema = z.object({
  minutes: z.int(),
  watts,
})

export const heatSchema = z.object({
  watts: z.int(),                                        // мощность ТЭНа на нагреве до первой паузы, W
})

/** Этап брожения: температура и когда переходить к следующему (until). gravity — плотность дошла до цели
 *  (в партии цель — от фактической OG, та же доля сбраживания); fg — плотность перестала падать (конечная);
 *  days — выдержка столько дней. У gravity и fg дни — примерная подсказка: для графика, дат и напоминания
 *  замерить; у days — само условие. Без until — days (рецепты до плотностей). */
export const fermentationStepSchema = z.object({
  name: z.string().nullable().default(null),
  temp: z.number(),
  days: z.number().min(0).default(0),                    // days — сколько держать; gravity и fg — примерно (не указано — 0: без прикидки)
  until: z.enum(['gravity', 'fg', 'days']).default('days'),
  gravity: maybe(z.number().min(0.98).max(1.2)),         // until = gravity: до какой плотности, SG
}).refine(s => !(s.until === 'gravity' && s.gravity == null), {
  error: 'этап «до плотности» — укажите плотность',
})

export const recipeSchema = z.object({
  name: z.string(),
  style: styleRefSchema.nullable().default(null),
  batch: batchSchema.prefault({}),
  targets: targetsSchema.prefault({}),
  fermentables: z.array(fermentableSchema).default([]),
  hops: z.array(hopSchema).default([]),
  miscs: z.array(miscSchema).default([]),
  yeasts: z.array(yeastSchema).default([]),
  water: waterSchema.prefault({}),
  mash: z.array(mashStepSchema).default([]),
  // нагрев до первой паузы своей мощностью — только у рецепта партии («Сварить»): не как у первой паузы —
  // перед ней шаг программы «Нагрев»
  heat: heatSchema.nullable().default(null),
  boil: boilSchema.nullable().default(null),
  fermentation: z.array(fermentationStepSchema).default([]),
  notes: z.string().default(''),
})

export type Recipe = z.infer<typeof recipeSchema>
export type RecipeInput = z.input<typeof recipeSchema>

export type Addition = z.infer<typeof additionSchema>
export type AdditionInput = z.input<typeof additionSchema>
export type AdditionKind = Addition['kind']
export type AdditionUnit = Addition['unit']
export type AdditionSlot = z.infer<typeof additionSlotSchema>
export type StyleRef = z.infer<typeof styleRefSchema>
export type StyleRefInput = z.input<typeof styleRefSchema>
export type Batch = z.infer<typeof batchSchema>
export type BatchInput = z.input<typeof batchSchema>
export type Targets = z.infer<typeof targetsSchema>
export type Fermentable = z.infer<typeof fermentableSchema>
export type FermentableInput = z.input<typeof fermentableSchema>
export type Hop = z.infer<typeof hopSchema>
export type HopInput = z.input<typeof hopSchema>
export type Misc = z.infer<typeof miscSchema>
export type MiscInput = z.input<typeof miscSchema>
export type WaterProfile = z.infer<typeof waterProfileSchema>
export type WaterProfileInput = z.input<typeof waterProfileSchema>
export type WaterAddition = z.infer<typeof waterAdditionSchema>
export type WaterAdditionInput = z.input<typeof waterAdditionSchema>
export type WaterAgent = WaterAddition['agent']
export type Water = z.infer<typeof waterSchema>
export type WaterInput = z.input<typeof waterSchema>
export type Yeast = z.infer<typeof yeastSchema>
export type YeastInput = z.input<typeof yeastSchema>
export type MashStep = z.infer<typeof mashStepSchema>
export type MashStepInput = z.input<typeof mashStepSchema>
export type Boil = z.infer<typeof boilSchema>
export type BoilInput = z.input<typeof boilSchema>
export type Heat = z.infer<typeof heatSchema>
export type FermentationStep = z.infer<typeof fermentationStepSchema>
export type FermentationStepInput = z.input<typeof fermentationStepSchema>
