// UUID v7 (RFC 9562): 48 бит времени в миллисекундах, версия 7, вариант 10, остальное случайное. Ключи новых записей
// базы: упорядочены по времени — индексы и сортировки дешевле, чем у v4. Чистый TS: случайность — globalThis.crypto.

/** UUID v7 строкой. `now` — миллисекунды Unix (по умолчанию сейчас); задаётся в тестах. */
export function uuidv7(now: number = Date.now()): string {
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  // 48 бит времени, старшие — первыми; делением, а не сдвигом: сдвиг в JS 32-битный
  let time = Math.floor(now)
  for (let i = 5; i >= 0; i--) {
    bytes[i] = time % 256
    time = Math.floor(time / 256)
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x70   // версия 7
  bytes[8] = (bytes[8]! & 0x3f) | 0x80   // вариант 10
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
