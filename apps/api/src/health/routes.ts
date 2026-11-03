// HTTP раздела: схема запроса и ответа, вызов сервиса, код ответа.
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { okSchema } from './schemas'
import { checkHealth } from './service'

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/health', {
    schema: {
      tags: ['состояние'],
      summary: 'Сервис жив — для проверок Docker и мониторинга',
      response: { 200: okSchema },
    },
  }, () => checkHealth())
}
