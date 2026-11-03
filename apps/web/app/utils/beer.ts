// Цвет пива в бокале по EBC — для отображения. Расчёты плотности и крепости — в @hoplab/core.

// Цвет пива в бокале по EBC — опорные точки, между ними линейно. Для отображения, не для расчётов.
// Таблицы SRM обычно сняты в тонком слое: тёмное пиво по ним красно-коричневое, а в бокале оно
// уже с ~50 EBC почти чёрное — поэтому шкала своя.
const EBC_STOPS: [number, string][] = [
  [2, '#F8EAA2'], [4, '#F6E07A'], [6, '#F2D04E'], [8, '#EDC03A'], [12, '#E2A42C'], [16, '#D58A26'], [20, '#C77423'],
  [26, '#B4561A'], [33, '#923F16'], [40, '#692B12'], [47, '#3D1C0F'], [57, '#1F100B'], [69, '#120A07'], [80, '#0A0605'],
]

const rgb = (hex: string) => [1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16))
const hex = (c: number[]) => `#${c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`

/** «#C77423» по EBC; null — цвет не задан. */
export function beerColor(ebc: number | null | undefined) {
  if (ebc == null) return null
  const i = EBC_STOPS.findIndex(([e]) => e >= ebc)
  if (i <= 0) return EBC_STOPS[i === 0 ? 0 : EBC_STOPS.length - 1]![1]
  const [e0, c0] = EBC_STOPS[i - 1]!, [e1, c1] = EBC_STOPS[i]!
  const k = (ebc - e0) / (e1 - e0)
  const a = rgb(c0), b = rgb(c1)
  return hex(a.map((v, n) => v + (b[n]! - v) * k))
}

/** CSS-градиент цвета пива слева направо от from до to EBC — для шкал. */
export function ebcGradient(from: number, to: number) {
  if (to <= from) return beerColor(from)!
  const points = [from, ...EBC_STOPS.map(([e]) => e).filter(e => e > from && e < to), to]
  return `linear-gradient(to right, ${points.map(e => `${beerColor(e)} ${(((e - from) / (to - from)) * 100).toFixed(1)}%`).join(', ')})`
}
