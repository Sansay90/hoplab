// buildApp(deps) собирает приложение: плагины, общий обработчик ошибок, CORS, проверка источника запросов,
// OpenAPI и разделы. Зависимости приходят аргументом — глобального состояния нет, тесты подменяют их.
import cors from '@fastify/cors'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import Fastify from 'fastify'
import type { FastifyError, FastifyRequest } from 'fastify'
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { Config } from './config'
import { AppError } from './errors'
import { healthRoutes } from './health'

export interface Deps {
  config: Config
  /** Журнал pino: true/false или настройки; по умолчанию — уровень из настроек. */
  logger?: boolean | object
}

const SAFE_METHODS: readonly string[] = ['GET', 'HEAD', 'OPTIONS']
const FOREIGN_SITE = 'запрос с чужого сайта'

/** Своя страница: тот же адрес, с которого пришёл запрос, или доверенный адрес из настроек. */
function isTrusted(origin: string, request: FastifyRequest, config: Config) {
  return origin === `${request.protocol}://${request.headers.host ?? ''}` || config.trustedOrigin.test(origin)
}

/** Тело 422 — как у FastAPI: { detail: [{ type, loc, msg }] }, интерфейс склеивает msg (utils/api.ts). */
function validationDetail(error: FastifyError & { validation: { keyword: string; instancePath: string; message?: string }[] }) {
  const place = error.validationContext === 'querystring' ? 'query' : (error.validationContext ?? 'body')
  return error.validation.map(issue => ({
    type: issue.keyword,
    loc: [place, ...issue.instancePath.split('/').filter(Boolean).map(part => /^\d+$/.test(part) ? Number(part) : part)],
    msg: issue.message ?? '',
  }))
}

export async function buildApp(deps: Deps) {
  const { config } = deps
  const app = Fastify({
    logger: deps.logger ?? { level: config.logLevel },
    // за nginx: адрес клиента и схема (https для cookie) — из X-Forwarded-*
    trustProxy: true,
  }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  // ошибки: всё отдаём как { detail }
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof AppError) return reply.code(error.status).send({ detail: error.detail })
    if (hasZodFastifySchemaValidationErrors(error)) return reply.code(422).send({ detail: validationDetail(error) })
    const status = error.statusCode ?? 500
    if (status < 500) return reply.code(status).send({ detail: error.message })
    request.log.error(error)
    return reply.code(500).send({ detail: 'Internal Server Error' })
  })
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ detail: 'Not Found' }))

  // CORS — только доверенный адрес, с cookie
  await app.register(cors, {
    origin: config.trustedOrigin,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  // изменяющие запросы — только со своего сайта: cookie входа браузер приложит и к форме с чужой страницы (CSRF)
  app.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin
    if (SAFE_METHODS.includes(request.method) || !origin || isTrusted(origin, request, config)) return
    request.raw.resume() // тело отклонённого запроса не читаем, но и обрыва клиенту не устраиваем
    return reply.code(403).send({ detail: FOREIGN_SITE })
  })

  // OpenAPI и страница документации — по тем же адресам, что у FastAPI: /docs и /openapi.json
  await app.register(swagger, {
    openapi: { info: { title: 'Hoplab', version: '0.4' } },
    transform: jsonSchemaTransform,
  })
  await app.register(swaggerUi, { routePrefix: '/docs' })
  app.get('/openapi.json', { schema: { hide: true } }, () => app.swagger())

  // разделы
  await app.register(healthRoutes, { prefix: '/api' })

  return app
}
