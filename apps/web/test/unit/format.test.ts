import { describe, expect, it } from 'vitest'
import { fmtClock, fmtDuration, fmtEnergy, fmtTemp, fmtWatts } from '~/utils/format'

describe('форматирование', () => {
  it('температура', () => {
    expect(fmtTemp(66)).toBe('66,0')                 // дробная часть — через запятую, как везде в интерфейсе
    expect(fmtTemp(65.97, 0)).toBe('66')
    expect(fmtTemp(null)).toBe('—')
  })

  it('длительность', () => {
    expect(fmtDuration(3725)).toBe('1:02:05')
    expect(fmtDuration(125)).toBe('2:05')
    expect(fmtDuration(59.6)).toBe('1:00')
    expect(fmtDuration(-5)).toBe('0:00')
    expect(fmtDuration(null)).toBe('—')
  })

  it('время суток', () => {
    expect(fmtClock(0)).toMatch(/^\d{2}:\d{2}:\d{2}$/)
  })

  it('мощность и энергия', () => {
    expect(fmtWatts(2500)).toBe('2500 W')
    expect(fmtWatts(undefined)).toBe('—')
    expect(fmtEnergy(849.6)).toBe('850 Вт·ч')
    expect(fmtEnergy(2350)).toBe('2,35 кВт·ч')
    expect(fmtEnergy(null)).toBe('—')
  })
})
