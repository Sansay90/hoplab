// Страховка типов: @hoplab/core описывает часть ответов API сам (core не зависит от openapi), а типы API генерируются
// из схемы сервиса. Расхождение ловит `pnpm typecheck` — тест на уровне типов, во время выполнения ничего не проверяет.
import { describe, expectTypeOf, it } from 'vitest'
import type {
  BrewDayInput, BrewDayStep as CoreBrewDayStep, BreweryState, EntryKind, EquipmentKind as CoreEquipmentKind,
  EquipmentKindInfo as CoreEquipmentKindInfo, Limits as CoreLimits, ProgramWatts as CoreProgramWatts,
} from '@hoplab/core'
import type { BrewDayStep, BrewDetail, BrewEntry, EquipmentKindInfo, Limits, ProgramWatts, Snapshot } from '~/types'

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
})
