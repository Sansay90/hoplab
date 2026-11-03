# Разработка

Как устроен проект — [architecture.md](./architecture.md). Нужны Python 3.13, Node.js 24, pnpm 10 (`corepack enable` или `npm i -g pnpm@10.33.0`) и Docker (база для сервиса и тестов).

Команды ниже — из активированного окружения Python: `.venv\Scripts\activate` (Windows) или `source .venv/bin/activate` (Linux, macOS).

## Первый запуск

```sh
# база — в Docker, порт 5433 только на этом ПК
cd service
cp .env.example .env                      # POSTGRES_PASSWORD и DATABASE_URL с тем же паролем
docker compose up -d db

# сервис
python -m venv .venv                      # и активировать (см. выше)
pip install -r requirements-dev.txt
python -m app                             # http://127.0.0.1:8000, документация API — /docs

# интерфейс
cd ..                                     # корень репозитория: монорепа pnpm
pnpm install
pnpm --filter @hoplab/web dev             # http://localhost:3000; /api Nuxt проксирует сервису на :8000

# агент — если рядом есть пивоварня (ключи — agent/README.md)
cd ../agent
cp .env.example .env                      # SERVICE_URL=ws://127.0.0.1:8000/api/agent, AGENT_TOKEN, BREWERY_IP
python -m venv .venv                      # и активировать
pip install -r requirements-dev.txt
python -m agent
```

Токен агента выдаёт сервис: `python -m app agents new "Название"` (из `service`, после первой регистрации в интерфейсе). Первый зарегистрировавшийся на своём ПК — администратор.

Всё в Docker, как на сервере: `docker compose up -d --build` в `service/` — база, сервис (`service/Dockerfile`, :8000) и интерфейс (`apps/web/Dockerfile`, контекст — корень репозитория, http://127.0.0.1:3000; тот же порт, что у `pnpm dev`); агент — `docker compose up -d --build` в `agent/`.

## Проверки

Те же, что в CI (`.github/workflows/deploy.yml`), — перед пушем:

```sh
ruff check service agent                  # из корня репозитория (настройки — ruff.toml)
cd agent && pytest
cd service && pytest
pnpm install --frozen-lockfile           # из корня репозитория
pnpm lint && pnpm typecheck && pnpm test # web, api, core; границы слоёв — тест apps/api/test/boundaries.test.ts
pnpm knip && pnpm audit --audit-level high
```

API на Fastify (`apps/api`) с переменными Python-сервиса: `ENV_FILE=../../service/.env pnpm --filter @hoplab/api dev` (без `ENV_FILE` читается `.env` в `apps/api`; непустые переменные окружения важнее файла, пустые — как незаданные).

- **Тесты сервиса** поднимают настоящий сервис в потоке и работают с настоящим Postgres. База — `TEST_DATABASE_URL`, а без неё — `hoplab_test` рядом с базой из `DATABASE_URL` (создаётся сама; нужна запущенная база из `service/compose.yaml`). Её имя обязано кончаться на `_test`: перед каждым тестом таблицы очищаются. Агент в сквозных тестах настоящий (`Controller`, `Link`), пивоварня — имитация (`agent/agent/fake.py`).
- **Тесты интерфейса** (vitest) — чистые утилиты вида `app/utils`, без Nuxt: `apps/web/test/unit`. **Тесты api и core** (vitest) — `apps/api/test` (приложение собирается через `buildApp` и опрашивается `app.inject()`, без сети и базы), `packages/core/test` (порог покрытия 90 % строк).
- **Автоисправления:** `ruff check --fix service agent`, `pnpm lint:fix`.

## Как вносить изменения

- **API.** Схемы — `schemas.py` своего раздела в `service/app/…`. Поменял — `pnpm api:types` в `apps/web`: выгружает `apps/web/openapi.json`, по нему nuxt-open-fetch строит типизированные `$api` / `useApi`. Руками типы не пишутся; CI сверяет `openapi.json` с сервисом.
- **Новый эндпоинт** — в `router.py` своего раздела. Кто спрашивает — зависимости `Viewer` / `CurrentUser` / `Admin` (`auth/dependencies.py`), общие объекты — из `deps.py`. Отказ — ошибка из `errors.py` в модуле данных, а не `HTTPException` в роутере. Права — только в `access.py`.
- **Схема базы.** Правка `app/models.py` → `alembic revision --autogenerate -m "что изменилось"` в `service`, проверить сгенерированное, миграции применяются при старте. Применённые миграции не правятся.
- **Правила, которые живут в двух местах:** программа пивоварни (`service/app/recipes/program.py` и `packages/core/src/program.ts`), расчёт показателей (`service/app/recipes/calc.py` и `packages/core/src/calc.ts`), пересчёт, расписание брожения, схема рецепта и каталог оборудования (пары `service/app/…` ≡ `packages/core/src/…`, см. CLAUDE.md, раздел «Ядро»). Меняешь правило — меняешь обе стороны и примеры в `shared/` (там же — как их пересчитать).
- **Протокол агента** — меняются обе стороны: `service/app/brewery/hub.py` и `agent/agent/link.py`, описание — `agent/README.md`, «Протокол».
- **API на Node** (`apps/api`) — слои, запреты и чек-лист ревью: раздел «Архитектура API» в [CLAUDE.md](../CLAUDE.md). Нарушенная граница не проходит `pnpm lint`.
- **Тексты** — по-русски, для пивовара, а не для разработчика: в интерфейсе нет инструкций про запуск, Docker и т. п. Комментарии в коде и сообщения коммитов — тоже по-русски.

## Выкатка

Пуш в `main` → CI: линтеры, тесты, сверка схемы API → образ `ghcr.io/sansay90/hoplab` → сервер. Pull request проходит только проверки. Сервер и секреты — [deploy/README.md](../deploy/README.md).
