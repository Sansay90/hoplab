// Старая база (Python-сервис) — только чтение, сырым SQL, без ORM старой схемы. Одна транзакция «repeatable read,
// read only» на всё время переноса: снимок согласован, а случайная запись в старую базу невозможна.
import pg from 'pg'

export type Row = Record<string, unknown>

export interface LegacySource {
  query: (sql: string, params?: unknown[]) => Promise<Row[]>
  /** Таблица порциями по ключу (keyset, ключ — одна колонка или несколько): ни одна таблица не читается в память
   *  целиком. where — необязательное условие (внутренняя строка, не пользовательский ввод). */
  pages: (table: string, keys: string[], size: number, where?: string) => AsyncGenerator<Row[]>
  /** Имена колонок отношения (таблица или подзапрос в скобках) — чтобы сверка не пропустила колонку молча. */
  columns: (relation: string) => Promise<string[]>
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
    async* pages(table, keys, size, where) {
      if (!IDENT.test(table) || keys.length === 0 || !keys.every(key => IDENT.test(key))) {
        throw new Error(`неверное имя таблицы или ключа: ${table}.${keys.join(',')}`)
      }
      const order = keys.join(', ')
      const cond = where ? `(${where})` : 'true'
      let last: unknown[] | null = null
      for (;;) {
        const rows: Row[] = last === null
          ? await query(`select * from ${table} where ${cond} order by ${order} limit ${size}`)
          : await query(
              `select * from ${table} where ${cond} and (${order}) > (${keys.map((_, i) => `$${i + 1}`).join(', ')}) order by ${order} limit ${size}`,
              last,
            )
        if (rows.length === 0) return
        yield rows
        const tail: Row = rows.at(-1)!
        last = keys.map(key => tail[key])
      }
    },
    async columns(relation) {
      const result = await client.query(`select * from ${relation} as l limit 0`)
      return result.fields.map(field => field.name)
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
