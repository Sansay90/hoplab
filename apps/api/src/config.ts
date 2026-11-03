// Настройки сервиса — из переменных окружения (или файла .env). Имена и смысл — как у Python-сервиса
// (service/app/config.py): тот же .env подходит обоим. Пустая переменная считается незаданной.
// process.env читается только здесь.
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { z } from 'zod'

// без APP_URL сервис стоит у пивовара дома: интерфейсу с этого ПК и из домашней сети — можно
const LOCAL_ORIGIN = /https?:\/\/(localhost|127\.0\.0\.1|10(\.\d{1,3}){3}|192\.168(\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2})(:\d+)?/

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const port = z.coerce.number().int().min(1).max(65535)

const schema = z.object({
  // адрес базы; пока базы нет — не используется
  DATABASE_URL: z.string().default(''),
  // адрес сайта: ссылки в письмах и проверка источника запросов; пусто — сервис на своём ПК
  APP_URL: z.string().default(''),
  // почты администраторов через запятую; пусто — администратор первый зарегистрировавшийся
  ADMIN_EMAILS: z.string().default(''),

  // письма; без SMTP_HOST текст письма со ссылкой пишется в журнал
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: port.default(465),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  SMTP_FROM: z.string().default(''),

  // Web Push: закрытый ключ сервера; пусто — уведомления выключены
  VAPID_PRIVATE_KEY: z.string().default(''),
  VAPID_SUBJECT: z.string().default('mailto:hoplab@example.com'),

  SERVICE_HOST: z.string().default('127.0.0.1'),
  SERVICE_PORT: port.default(8000),
  // за reverse proxy: чьим заголовкам X-Forwarded-* верить (схема https для cookie, адрес клиента для лимитов)
  FORWARDED_ALLOW_IPS: z.string().default('127.0.0.1'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
})

export interface Config {
  databaseUrl: string
  appUrl: string
  /** Адрес сайта без завершающего «/». */
  siteUrl: string
  adminEmails: Set<string>
  smtp: { host: string; port: number; user: string; password: string; from: string }
  vapid: { privateKey: string; subject: string }
  host: string
  port: number
  /** Для Fastify trustProxy: «*» — true (верить всем), иначе список адресов или CIDR через запятую. */
  trustProxy: boolean | string
  logLevel: z.infer<typeof schema>['LOG_LEVEL']
  /** Чьи страницы могут слать изменяющие запросы с cookie входа: свой сайт, без APP_URL — этот ПК. */
  trustedOrigin: RegExp
}

export class ConfigError extends Error {}

/** Разобрать настройки из переменных окружения; ошибка — ConfigError с перечнем неверных переменных. */
export function loadConfig(env: Record<string, string | undefined>): Config {
  // пустая переменная — как незаданная
  const given = Object.fromEntries(Object.entries(env).filter(([, value]) => value !== undefined && value !== ''))
  const parsed = schema.safeParse(given)
  if (!parsed.success) {
    const lines = parsed.error.issues.map(issue => `  ${issue.path.join('.')}: ${issue.message}`)
    throw new ConfigError(`Неверные настройки окружения:\n${lines.join('\n')}`)
  }
  const e = parsed.data
  const siteUrl = e.APP_URL.replace(/\/+$/, '')
  const source = siteUrl ? escapeRegExp(siteUrl) : LOCAL_ORIGIN.source
  return {
    databaseUrl: e.DATABASE_URL,
    appUrl: e.APP_URL,
    siteUrl,
    adminEmails: new Set(e.ADMIN_EMAILS.split(',').map(x => x.trim().toLowerCase()).filter(Boolean)),
    smtp: { host: e.SMTP_HOST, port: e.SMTP_PORT, user: e.SMTP_USER, password: e.SMTP_PASSWORD, from: e.SMTP_FROM },
    vapid: { privateKey: e.VAPID_PRIVATE_KEY, subject: e.VAPID_SUBJECT },
    host: e.SERVICE_HOST,
    port: e.SERVICE_PORT,
    trustProxy: e.FORWARDED_ALLOW_IPS.trim() === '*' ? true : e.FORWARDED_ALLOW_IPS,
    logLevel: e.LOG_LEVEL,
    // целиком, как fullmatch у Python
    trustedOrigin: new RegExp(`^(?:${source})$`),
  }
}

/** Переменные окружения поверх файла .env: пустая переменная — как незаданная, значение берётся из файла. */
export function mergeEnv(env: Record<string, string | undefined>, fileText: string) {
  const merged: Record<string, string | undefined> = parseEnv(fileText)
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined && value !== '') merged[key] = value
    else merged[key] ??= value
  }
  return merged
}

/** Настройки процесса: окружение поверх файла .env (ENV_FILE или .env в текущей папке, если он есть). */
export function loadConfigFromProcess(): Config {
  let fileText = ''
  try {
    fileText = readFileSync(process.env.ENV_FILE ?? '.env', 'utf8')
  } catch (e) {
    // файла нет — достаточно переменных окружения; любая другая ошибка — настоящая
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
  }
  return loadConfig(mergeEnv(process.env, fileText))
}
