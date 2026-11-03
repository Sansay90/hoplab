// Пивные величины: плотность (хранится в SG, показывается в °P или SG), приборы, крепость.
// Цвет пива в бокале по EBC — вид, он у интерфейса.

export type GravityUnit = 'plato' | 'sg'

export function platoFromSg(sg: number) {
  return -616.868 + 1111.14 * sg - 630.272 * sg ** 2 + 135.997 * sg ** 3
}

export function sgFromPlato(p: number) {
  return 1 + p / (258.6 - (p / 258.2) * 227.1)
}

/** Плотность в единицах человека: 12.0 (°P) или 1.048 (SG). */
export function gravityIn(sg: number, unit: GravityUnit) {
  return unit === 'plato' ? Math.round(platoFromSg(sg) * 10) / 10 : Math.round(sg * 1000) / 1000
}

export function fmtGravity(sg: number | null | undefined, unit: GravityUnit) {
  if (sg == null) return '—'
  const digits = unit === 'plato' ? 1 : 3
  const text = gravityIn(sg, unit).toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  return unit === 'plato' ? `${text} °P` : text
}

/** Ареометр откалиброван на calibC (обычно 20 °C): показание sg при температуре пробы sampleC → при калибровочной.
 *  Поправка — по плотности воды (полином для °F, общепринятый у пивоваров). */
export function hydrometerSg(sg: number, sampleC: number, calibC = 20) {
  const k = (c: number) => {
    const t = c * 9 / 5 + 32
    return 1.00130346 - 0.000134722124 * t + 0.00000204052596 * t ** 2 - 0.00000000232820948 * t ** 3
  }
  return (sg * k(sampleC)) / k(calibC)
}

/** Рефрактометр: Brix несброженного сусла → °P. WCF — поправка на сусло (у прибора шкала по сахарозе). */
export const DEFAULT_WCF = 1.04
export function refractometerPlato(brix: number, wcf = DEFAULT_WCF) {
  return brix / wcf
}

/** Крепость по начальной и конечной плотности, % об. */
export function abvOf(og: number | null | undefined, fg: number | null | undefined) {
  if (!og || !fg || fg >= og) return null
  return ((76.08 * (og - fg)) / (1.775 - og)) * (fg / 0.794)
}
