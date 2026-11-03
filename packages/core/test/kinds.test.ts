// Каталог оборудования и проверка параметров — как у сервиса (service/app/brewery/kinds.py, service/tests/test_equipment.py).
import { describe, expect, it } from 'vitest'
import { catalogView, checkParams, checkValues, HEATED, InvalidEquipmentError, isSystem, KIND_IDS, KINDS, SYSTEMS } from '../src'
import kinds from '../../../shared/kinds.json'

const message = (fn: () => unknown) => {
  try {
    fn()
  } catch (e) {
    return (e as Error).message
  }
  return ''
}

describe('каталог видов', () => {
  it('равен тому, что отдаёт сервис (shared/kinds.json)', () => {
    expect(catalogView()).toEqual(kinds)
  })

  it('виды, системы и пивоварни с ТЭНом', () => {
    expect(KIND_IDS).toHaveLength(30)
    expect(SYSTEMS).toEqual(['manual', 'allinone', 'easybrew'])
    expect(HEATED).toEqual(['easybrew', 'allinone'])
    expect([isSystem('easybrew'), isSystem('keg'), isSystem('spaceship')]).toEqual([true, false, false])
    expect(KINDS.keg!.category).toBe('package')
  })
})

describe('параметры оборудования', () => {
  const bad = (kind: string, props: Record<string, unknown>) => expect(() => checkParams(kind, null, props)).toThrow(InvalidEquipmentError)

  it('ферментер: значения из каталога', () => {
    const r = checkParams('fermenter', null, { volume: 32, pressure: 1, cooling: 'jacket', x: null })
    expect(r.props).toEqual({ volume: 32, pressure: 1, cooling: 'jacket' })
    expect(r.columns).toEqual({ volume: null, efficiency: null, evaporation: null, kettle: null })
  })

  it('чужое, вне пределов, не того типа и слишком точное — отказ', () => {
    bad('fermenter', { pressure: 9 })
    bad('fermenter', { cooling: 'ice' })
    bad('fermenter', { wheels: 4 })
    bad('fermenter', { pressure: 'high' })
    bad('fermenter', { pressure: 1.25 })
    bad('kegerator', { taps: 2.5 })
    bad('refractometer', { atc: 'да' })
  })

  it('тексты ошибок', () => {
    expect(message(() => checkParams('fermenter', null, { pressure: 9 }))).toBe('«Давление» — от 0 до 5 бар')
    expect(message(() => checkParams('fermenter', null, { pressure: 1.25 }))).toBe('«Давление» — не больше 1 знаков после запятой')
    expect(message(() => checkParams('kegerator', null, { taps: 2.5 }))).toBe('«Кранов» — целое число')
    expect(message(() => checkParams('kegerator', null, { taps: 50 }))).toBe('«Кранов» — от 1 до 20')
    expect(message(() => checkParams('fermenter', null, { wheels: 4 }))).toBe('у вида «Ферментер» нет параметра «wheels»')
    expect(message(() => checkParams('fermenter', null, { cooling: 'ice' }))).toBe('«Охлаждение» — выберите из списка')
    expect(message(() => checkParams('fermenter', null, { pressure: 'high' }))).toBe('«Давление» — число')
    expect(message(() => checkParams('refractometer', null, { atc: 1 }))).toBe('«Термокомпенсация (ATC)» — да или нет')
    expect(message(() => checkParams('spaceship', null, {}))).toBe('неизвестный вид оборудования')
    expect(message(() => checkParams('mill', null, { gap_min: 1.8, gap_max: 0.5 }))).toBe('«Зазор от» больше, чем «Зазор до»')
  })

  it('«от» не больше «до»', () => {
    expect(checkParams('mill', null, { gap_min: 0.5, gap_max: 1.8 }).props).toEqual({ gap_min: 0.5, gap_max: 1.8 })
    bad('mill', { gap_min: 1.8, gap_max: 0.5 })
  })

  it('«да/нет» и выбор принимаются, пустые выкидываются', () => {
    expect(checkParams('refractometer', null, { atc: true }).props).toEqual({ atc: true })
    expect(checkValues('Рефрактометр', KINDS.refractometer!.fields, { offset: 0.5, atc: false, empty: null })).toEqual({ offset: 0.5, atc: false })
    expect(checkValues('Рефрактометр', KINDS.refractometer!.fields, { offset: '' })).toEqual({})
  })

  it('варочная система: свои поля, не указанные эффективность и испарение — средние; props нельзя', () => {
    expect(checkParams('manual', { volume: 30 }, {})).toEqual({
      columns: { volume: 30, efficiency: 75, evaporation: 3, kettle: null }, props: {},
    })
    expect(checkParams('easybrew', { volume: 30, efficiency: 83, evaporation: 2.5, kettle: 40 }, null).columns)
      .toEqual({ volume: 30, efficiency: 83, evaporation: 2.5, kettle: 40 })
    expect(() => checkParams('manual', null, { volume: 30 })).toThrow('у варочной системы параметры')
    expect(checkParams('manual', null, { volume: null, x: '' }).props).toEqual({})
  })

  it('у прочего вида полей оборудования нет', () => {
    expect(() => checkParams('fermenter', { volume: 30 }, null)).toThrow('нет объёма партии')
  })
})
