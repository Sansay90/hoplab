import { describe, expect, it } from 'vitest'
import { ConfigError, loadConfig, mergeEnv } from '../src/config'

describe('настройки из окружения', () => {
  it('значения по умолчанию — как у Python-сервиса', () => {
    const c = loadConfig({})
    expect(c).toMatchObject({
      databaseUrl: '', appUrl: '', siteUrl: '', host: '127.0.0.1', port: 8000, trustProxy: '127.0.0.1',
      smtp: { host: '', port: 465, user: '', password: '', from: '' },
      vapid: { privateKey: '', subject: 'mailto:hoplab@example.com' },
    })
    expect(c.adminEmails.size).toBe(0)
  })

  it('читает все переменные Python-сервиса', () => {
    const c = loadConfig({
      DATABASE_URL: 'postgresql://x', APP_URL: 'https://hoplab.example/', ADMIN_EMAILS: ' A@x.ru, b@x.ru ,',
      SMTP_HOST: 'smtp.x', SMTP_PORT: '587', SMTP_USER: 'u', SMTP_PASSWORD: 'p', SMTP_FROM: 'f@x',
      VAPID_PRIVATE_KEY: 'k', VAPID_SUBJECT: 'mailto:a@x', SERVICE_HOST: '0.0.0.0', SERVICE_PORT: '9000',
      FORWARDED_ALLOW_IPS: '*',
    })
    expect(c.siteUrl).toBe('https://hoplab.example')
    expect([...c.adminEmails]).toEqual(['a@x.ru', 'b@x.ru'])
    expect(c.smtp.port).toBe(587)
    expect(c.port).toBe(9000)
    expect(c.host).toBe('0.0.0.0')
  })

  it('пустая переменная — как незаданная', () => {
    expect(loadConfig({ SERVICE_PORT: '', SMTP_PORT: '' }).port).toBe(8000)
  })

  it('доверенный адрес сравнивается целиком', () => {
    const c = loadConfig({ APP_URL: 'https://hoplab.example' })
    expect(c.trustedOrigin.test('https://hoplab.example')).toBe(true)
    expect(c.trustedOrigin.test('https://hoplab.example.evil.com')).toBe(false)
    expect(c.trustedOrigin.test('https://hoplabXexample')).toBe(false)
  })

  it('неверное значение — ConfigError с именем переменной', () => {
    expect(() => loadConfig({ SERVICE_PORT: 'восемь' })).toThrow(ConfigError)
    expect(() => loadConfig({ SERVICE_PORT: '70000' })).toThrow(/SERVICE_PORT/)
    expect(() => loadConfig({ LOG_LEVEL: 'болтливый' })).toThrow(/LOG_LEVEL/)
  })
})

describe('FORWARDED_ALLOW_IPS → trustProxy', () => {
  it('«*» — верить всем', () => {
    expect(loadConfig({ FORWARDED_ALLOW_IPS: '*' }).trustProxy).toBe(true)
  })
  it('список адресов и CIDR — как есть; по умолчанию 127.0.0.1', () => {
    expect(loadConfig({ FORWARDED_ALLOW_IPS: '10.0.0.0/8,127.0.0.1' }).trustProxy).toBe('10.0.0.0/8,127.0.0.1')
    expect(loadConfig({}).trustProxy).toBe('127.0.0.1')
  })
})

describe('окружение поверх файла .env', () => {
  const file = ['SERVICE_PORT=9100', 'APP_URL=https://from-file.example', 'SMTP_HOST=smtp.file'].join(String.fromCharCode(10))

  it('пустая переменная окружения — значение из файла', () => {
    const c = loadConfig(mergeEnv({ SERVICE_PORT: '' }, file))
    expect(c.port).toBe(9100)
  })

  it('непустая переменная окружения файл перекрывает', () => {
    const c = loadConfig(mergeEnv({ SERVICE_PORT: '9200', APP_URL: 'https://env.example' }, file))
    expect(c.port).toBe(9200)
    expect(c.appUrl).toBe('https://env.example')
    expect(c.smtp.host).toBe('smtp.file')
  })

  it('пустая и в файле не заданная — по умолчанию', () => {
    expect(loadConfig(mergeEnv({ SMTP_PORT: '' }, file)).smtp.port).toBe(465)
  })
})
