import { describe, expect, it } from 'vitest'
import { ADDITION_VIEW, additionView, slotIcon } from '~/utils/additions'

describe('закладки', () => {
  it('вид закладки: подпись из core, иконка отсюда; тип по умолчанию — хмель', () => {
    expect(additionView({ kind: 'fining' })).toBe(ADDITION_VIEW.fining)
    expect(ADDITION_VIEW.fining).toMatchObject({ label: 'Осветлитель', measured: true, icon: 'i-lucide-sparkles' })
    expect(additionView({})).toBe(ADDITION_VIEW.hop)
    expect(ADDITION_VIEW.equipment.measured).toBe(false)
  })

  it('иконка напоминания: один тип — его, разные — общая', () => {
    expect(slotIcon([{ kind: 'hop' }, {}])).toBe(ADDITION_VIEW.hop.icon)
    expect(slotIcon([{ kind: 'hop' }, { kind: 'fining' }])).toBe('i-lucide-list-plus')
    expect(slotIcon([])).toBe('i-lucide-list-plus')
  })
})
