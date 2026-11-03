// packages/core — чистый TS для браузера и сервера: без Node, фреймворков, базы и приложений.
import { builtinModules } from 'node:module'

const message = 'packages/core — чистый TS: без приложений, Fastify, Drizzle и Node-API (код идёт и в браузер).'

export const coreRules = [
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: builtinModules.map(name => ({ name, message })),
        patterns: [
          { group: ['node:*'], message },
          { group: ['@hoplab/api', '@hoplab/api/*', '@hoplab/web', '@hoplab/web/*', '**/apps/**'], message },
          { group: ['fastify', 'fastify/*', '@fastify/*', 'drizzle-orm', 'drizzle-orm/*', 'drizzle-kit', 'pg', 'postgres'], message },
        ],
      }],
      'no-restricted-globals': ['error',
        ...['process', 'Buffer', '__dirname', '__filename', 'require'].map(name => ({ name, message })),
      ],
    },
  },
]
