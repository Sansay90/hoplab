// Помощники текстов по-русски, которые нужны расчётам: разделитель частей строки, числа, склонение, минуты.
// Остальное форматирование для экрана (время, температура, мощность) — у интерфейса.

/** Разделитель частей строки: «12 °C · до 6,0 °P · ~5 дн.». Пробелы вокруг точки — полукруглые, шире обычных:
 *  с обычными части сливаются (внутри частей те же пробелы). */
export const SEP = ' · '

/** Число по-русски, с единицей: fmtNumber(5.25, 2, ' кг') → «5,25 кг»; нет значения — «—». */
export function fmtNumber(v: number | null | undefined, digits = 0, unit = '') {
  return v == null ? '—' : `${v.toLocaleString('ru-RU', { maximumFractionDigits: digits })}${unit}`
}

/** Слово по числу: plural(3, 'шаг', 'шага', 'шагов') → «шага». */
export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

/** Минуты → «1 ч 10 мин» / «45 мин». */
export function fmtMinutes(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (!h) return `${m} мин`
  return m ? `${h} ч ${m} мин` : `${h} ч`
}
