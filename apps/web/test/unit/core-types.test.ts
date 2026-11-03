// Страховка типов: @hoplab/core описывает часть ответов API сам (core не зависит от openapi), а типы API генерируются
// из схемы сервиса. Расхождение ловит `pnpm typecheck` — тест на уровне типов, во время выполнения ничего не проверяет.
import { describe, expectTypeOf, it } from 'vitest'
import type {
  Addition as CoreAddition, BrewDayInput, BrewDayStep as CoreBrewDayStep, BreweryState, EntryKind,
  EquipmentKind as CoreEquipmentKind, EquipmentKindInfo as CoreEquipmentKindInfo, Fermentable as CoreFermentable,
  FermentationStep as CoreFermentationStep, Hop as CoreHop, Limits as CoreLimits, Misc as CoreMisc,
  ProgramWatts as CoreProgramWatts, RecipeInput, WaterAddition as CoreWaterAddition, Yeast as CoreYeast,
} from '@hoplab/core'
import type { components } from '#open-fetch-schemas/api'
import type { BrewDayStep, BrewDetail, BrewEntry, EquipmentKindInfo, Limits, ProgramWatts, Recipe, Snapshot } from '~/types'

type Schemas = components['schemas']

describe('типы core совпадают с API', () => {
  it('перечисления и union — равенство', () => {
    expectTypeOf<BrewEntry['kind']>().toEqualTypeOf<EntryKind>()
    expectTypeOf<BrewDayStep['kind']>().toEqualTypeOf<CoreBrewDayStep['kind']>()
    expectTypeOf<BrewDayStep['measures'][number]>().toEqualTypeOf<EntryKind>()
    expectTypeOf<BrewDetail['phase']>().toEqualTypeOf<BrewDayInput['phase']>()
    expectTypeOf<BrewDetail['status']>().toEqualTypeOf<BrewDayInput['status']>()
    // Equipment.kind в API — просто string, перечень видов — в EquipmentKindInfo.id
    expectTypeOf<EquipmentKindInfo['id']>().toEqualTypeOf<CoreEquipmentKind>()
  })

  // Схема рецепта core (zod) повторяет схему сервиса: лишнее значение в core сервис отклонит (422), недостающее —
  // core не разберёт рецепт. У полей со значением по умолчанию в API бывает «?», поэтому сравнение без null/undefined.
  it('перечисления схемы рецепта — равенство', () => {
    expectTypeOf<NonNullable<Schemas['Addition']['kind']>>().toEqualTypeOf<NonNullable<CoreAddition['kind']>>()
    expectTypeOf<NonNullable<Schemas['Addition']['unit']>>().toEqualTypeOf<NonNullable<CoreAddition['unit']>>()
    expectTypeOf<NonNullable<Schemas['WaterAddition']['agent']>>().toEqualTypeOf<NonNullable<CoreWaterAddition['agent']>>()
    expectTypeOf<NonNullable<Schemas['WaterAddition']['target']>>().toEqualTypeOf<NonNullable<CoreWaterAddition['target']>>()
    expectTypeOf<NonNullable<Schemas['Hop']['use']>>().toEqualTypeOf<NonNullable<CoreHop['use']>>()
    expectTypeOf<NonNullable<Schemas['Fermentable']['kind']>>().toEqualTypeOf<NonNullable<CoreFermentable['kind']>>()
    expectTypeOf<NonNullable<Schemas['Fermentable']['use']>>().toEqualTypeOf<NonNullable<CoreFermentable['use']>>()
    expectTypeOf<NonNullable<Schemas['Misc']['kind']>>().toEqualTypeOf<NonNullable<CoreMisc['kind']>>()
    expectTypeOf<NonNullable<Schemas['Misc']['use']>>().toEqualTypeOf<NonNullable<CoreMisc['use']>>()
    expectTypeOf<NonNullable<Schemas['Yeast']['form']>>().toEqualTypeOf<NonNullable<CoreYeast['form']>>()
    expectTypeOf<NonNullable<Schemas['FermentationStep']['until']>>().toEqualTypeOf<NonNullable<CoreFermentationStep['until']>>()
    // рецепт из API годится на вход любому расчёту core
    expectTypeOf<Recipe>().toExtend<RecipeInput>()
  })

  // Дальше — не равенство: core намеренно шире (необязательные поля, меньше полей), он принимает всё, что отдаёт API.
  it('объекты-входы: тип API присваивается типу core', () => {
    // у API wattsStep — int со значением по умолчанию 100 (в ответе всегда есть), у core — необязательное и null
    expectTypeOf<Limits>().toExtend<CoreLimits>()
    // ProgramWatts: у core boil/heat необязательные
    expectTypeOf<ProgramWatts>().toExtend<CoreProgramWatts>()
    // core берёт у шага только то, что читает варочный день; у API есть и другие поля
    expectTypeOf<BrewDayStep>().toExtend<CoreBrewDayStep>()
    // вид оборудования: core описывает поля сам, без лишнего
    expectTypeOf<EquipmentKindInfo>().toExtend<CoreEquipmentKindInfo>()
    // BreweryState — срез снимка пивоварни: у core online/brewId/alert/deviceRecipe, у API весь снимок
    expectTypeOf<Snapshot>().toExtend<BreweryState>()
  })

  // Присваиваемость не видит пропажу необязательного поля: уберут или переименуют wattsStep в API — Limits всё равно
  // подойдёт, а core молча уйдёт в значение по умолчанию. Поэтому каждое поле core должно быть и у API.
  it('у API есть все поля, которые читает core', () => {
    expectTypeOf<keyof CoreLimits>().toExtend<keyof Limits>()
    expectTypeOf<keyof CoreProgramWatts>().toExtend<keyof ProgramWatts>()
    expectTypeOf<keyof CoreBrewDayStep>().toExtend<keyof BrewDayStep>()
    expectTypeOf<keyof BreweryState>().toExtend<keyof Snapshot>()
    expectTypeOf<keyof CoreEquipmentKindInfo>().toExtend<keyof EquipmentKindInfo>()
  })
})
