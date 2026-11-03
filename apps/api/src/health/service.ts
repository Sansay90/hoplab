// Смысл раздела: сервис жив. Ни HTTP, ни базы — как должен выглядеть service.ts любого раздела.
import type { z } from 'zod'
import type { okSchema } from './schemas'

export function checkHealth(): z.infer<typeof okSchema> {
  return { ok: true }
}
