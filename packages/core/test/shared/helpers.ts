// Общие примеры (hoplab/shared/*.json): по ним до переключения на Node сверяет себя и сервис на Python
// (service/tests/test_shared.py). Файлы остаются в shared/ — на шаге 8 они переедут в packages/core/test/cases/.
import { expect } from 'vitest'

export interface Case<E> { name: string; recipe: unknown; expected: E }

export const cases = <E>(data: unknown) => (data as Case<E>[]).map(c => [c.name, c] as const)

/** Глубокое сравнение: числа — приблизительно, остальное — точно; у сервиса в JSON нет undefined — его нет и здесь. */
export function same(got: unknown, expected: unknown, path = '') {
  if (Array.isArray(expected)) {
    expect(Array.isArray(got), path).toBe(true)
    expect((got as unknown[]).length, path).toBe(expected.length)
    expected.forEach((v, i) => same((got as unknown[])[i], v, `${path}[${i}]`))
  } else if (expected && typeof expected === 'object') {
    const g = got as Record<string, unknown>
    expect(Object.keys(g).sort(), path).toEqual(Object.keys(expected).sort())
    for (const [k, v] of Object.entries(expected)) same(g[k], v, `${path}.${k}`)
  } else if (typeof expected === 'number' && !Number.isInteger(expected)) {
    expect(got, path).toBeCloseTo(expected, 9)
  } else {
    expect(got, path).toBe(expected)
  }
}
