import { describe, expect, it } from 'vitest'
import { equipmentIcon } from '~/utils/equipment'

describe('оборудование', () => {
  it('иконка вида; неизвестный вид — общая', () => {
    expect([equipmentIcon('keg'), equipmentIcon('нет такого')]).toEqual(['i-lucide-barrel', 'i-lucide-wrench'])
  })
})
