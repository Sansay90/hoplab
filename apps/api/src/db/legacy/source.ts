// Старая база (Python-сервис) — только чтение, сырым SQL, без ORM старой схемы. Одна транзакция «repeatable read,
// read only» на всё время переноса: снимок согласован, а случайная запись в старую базу невозможна.
import pg from 'pg'

export type Row = Record<string, unknown>

export interface LegacySource {
  query: (sql: string, params?: unknown[]) => Promise<Row[]>
  /** Таблица порциями по ключу (keyset): readings и фото не помещаются в память целиком. */
  pages: (table: string, key: string, size: number) => AsyncGenerator<Row[]>
  close: () => Promise<void>
}

const IDENT = /^[a-z_]+$/

export async function connectLegacy(url: string): Promise<LegacySource> {
  const client = new pg.Client({ connectionString: url })
  await client.connect()
  await client.query('begin isolation level repeatable read read only')
  const query = async (sql: string, params?: unknown[]) => (await client.query<Row>(sql, params)).rows
  return {
    query,
    async* pages(table, key, size) {
      if (!IDENT.test(table) || !IDENT.test(key)) throw new Error(`неверное имя таблицы или ключа: ${table}.${key}`)
      let last: unknown = null
      for (;;) {
        const rows = last === null
          ? await query(`select * from ${table} order by ${key} limit ${size}`)
          : await query(`select * from ${table} where ${key} > $1 order by ${key} limit ${size}`, [last])
        if (rows.length === 0) return
        yield rows
        last = rows.at(-1)?.[key]
      }
    },
    async close() {
      try {
        await client.query('rollback')
      } finally {
        await client.end()
      }
    },
  }
}
