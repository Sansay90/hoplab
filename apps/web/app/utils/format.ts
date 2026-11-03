// Форматирование для экрана. Числа, минуты, склонение и разделитель SEP — в @hoplab/core (нужны и расчётам).

/** Ровно digits знаков после запятой: fixed(65, 1) → «65,0». */
export function fixed(v: number, digits: number) {
  return v.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

/** Температура: 65 → «65,0». */
export function fmtTemp(t: number | null | undefined, digits = 1) {
  return t == null ? '—' : fixed(t, digits)
}

/** 3725 → «1:02:05», 125 → «2:05». */
export function fmtDuration(sec: number | null | undefined) {
  if (sec == null) return '—'
  const s = Math.max(0, Math.round(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/** unix-время → «14:05». */
export function fmtTime(epoch: number) {
  return new Date(epoch * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

/** unix-время → «5 окт.». */
export function fmtDay(epoch: number) {
  return new Date(epoch * 1000).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

/** Крепость: 7 → «7,0 %». */
export function fmtAbv(v: number) {
  return `${fixed(v, 1)} %`
}

/** unix-время → значение поля ввода в местном времени: «2026-10-28» (date) или «2026-10-28T14:05» (datetime-local). */
export function localInput(epoch: number, withTime = false) {
  const d = new Date(epoch * 1000)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, withTime ? 16 : 10)
}

export function fmtClock(epoch: number) {
  return new Date(epoch * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function fmtWatts(w: number | null | undefined) {
  return w == null ? '—' : `${w} W`
}

/** Вт·ч → «850 Вт·ч» / «2,35 кВт·ч». */
export function fmtEnergy(wh: number | null | undefined) {
  if (wh == null) return '—'
  return wh < 1000 ? `${Math.round(wh)} Вт·ч` : `${fixed(wh / 1000, 2)} кВт·ч`
}
