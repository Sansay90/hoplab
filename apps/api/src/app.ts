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
import type { Deps } from './deps'
import { AppError } from './errors'
import { healthRoutes } from './health'

export interface BuildOptions {
  /** Журнал pino: true/false или настройки; по умолчанию — уровень из настроек. */
  logger?: boolean | object
}

const SAFE_METHODS: readonly string[] = ['GET', 'HEAD', 'OPTIONS']
const FOREIGN_SITE = 'запрос с чужого сайта'

/** Своя страница: тот же адрес, с которого пришёл запрос, или доверенный адрес из настроек. */
function isTrusted(origin: string, request: FastifyRequest, config: Config) {
  return origin === `${request.protocol}://${request.headers.host ?? ''}` || config.trustedOrigin.test(origin)
}

/** Где ошибка — как у FastAPI: body, query, path, header. */
const PLACES: Record<string, string> = { body: 'body', querystring: 'query', params: 'path', headers: 'header' }

/** Тело 422 — как у FastAPI: { detail: [{ type, loc, msg }] }, интерфейс склеивает msg (utils/api.ts). */
function validationDetail(error: FastifyError & { validation: { keyword: string; instancePath: string; message?: string }[] }) {
  const place = PLACES[error.validationContext ?? 'body'] ?? 'body'
  return error.validation.map(issue => ({
    type: issue.keyword,
    loc: [place, ...issue.instancePath.split('/').filter(Boolean).map(part => /^\d+$/.test(part) ? Number(part) : part)],
    msg: issue.message ?? '',
  }))
}

/** Невалидный JSON — 422 json_invalid с позицией ошибки, как у FastAPI; пустое тело — «нет поля». */
function jsonProblem(error: FastifyError) {
  if (error.code === 'FST_ERR_CTP_EMPTY_JSON_BODY') {
    return [{ type: 'missing', loc: ['body'], msg: 'Field required' }]
  }
  if (error.code === 'FST_ERR_CTP_INVALID_JSON_BODY' || (error instanceof SyntaxError && error.statusCode === 400)) {
    const position = Number(/position (\d+)/.exec(error.message)?.[1] ?? 0)
    return [{ type: 'json_invalid', loc: ['body', position], msg: 'JSON decode error' }]
  }
  return undefined
}

export async function buildApp(deps: Deps, options: BuildOptions = {}) {
  const { config } = deps
  const app = Fastify({
    logger: options.logger ?? { level: config.logLevel },
    // за nginx: адрес клиента и схема (https для cookie) — из X-Forwarded-* от адресов FORWARDED_ALLOW_IPS
    trustProxy: config.trustProxy,
  }).withTypeProvider<ZodTypeProvider>()

  app.decorate('deps', deps)
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  // ошибки: всё отдаём как { detail }
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof AppError) return reply.code(error.status).send({ detail: error.detail })
    if (hasZodFastifySchemaValidationErrors(error)) return reply.code(422).send({ detail: validationDetail(error) })
    const json = jsonProblem(error)
    if (json) return reply.code(422).send({ detail: json })
    const status = error.statusCode ?? 500
    if (status < 500) return reply.code(status).send({ detail: error.message })
    // как у FastAPI: тело — простой текст, без detail (интерфейс покажет «Сервис ответил ошибкой 500»)
    request.log.error(error)
    return reply.code(500).type('text/plain; charset=utf-8').send('Internal Server Error')
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
