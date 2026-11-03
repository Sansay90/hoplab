# CLAUDE.md

Инструкции для Claude Code (и других агентов — `AGENTS.md` ссылается сюда) в репозитории hoplab. Общение, документация, комментарии в коде и тексты интерфейса — **по-русски**; технические термины и имена из кода — как есть.

## Что это

Открытый русскоязычный сервис рецептов для домашних пивоваров СНГ с управлением пивоварней Easy Brew Connect. Сервис делается **для любых пивоваров и любых владельцев Easy Brew**: никаких поправок под конкретный экземпляр пивоварни или привычки одного пивовара — в пивоварню уходит ровно то, что задано в рецепте; параметры, зависящие от модели (мощность и т. п.), берутся от пивоварни, а не из констант.

- Документация — [docs/](docs/README.md): что умеет ([features](docs/features.md), [scenarios](docs/scenarios.md)), доступы ([access](docs/access.md)), устройство ([architecture](docs/architecture.md), [api](docs/api.md), [data](docs/data.md), [decisions](docs/decisions.md)), работа ([development](docs/development.md), [operations](docs/operations.md)), планы ([roadmap](docs/roadmap.md)).
- Документация меняется вместе с кодом, в том же изменении: поведение функции — `features.md` и `scenarios.md`, права — `access.md`, API и формат данных — `api.md` и `data.md`, решение «почему так» — `decisions.md`.
- `service/` — FastAPI + Postgres (пакет `app`, разделы `auth/`, `recipes/`, `brewery/`, `push/`, `notifications/`); `agent/` — агент у пивоварни (tinytuya, websockets); `apps/web/` — Nuxt 4 + Nuxt UI (гибридный рендеринг: каталог и рецепт — на сервере, личное — в браузере); `shared/` — общие примеры расчётов; `deploy/` — сервер. Идёт перенос сервиса на TypeScript ([план](docs/design/node-migration.md)): монорепа pnpm — `apps/web`, `apps/api` (Fastify, пока каркас), `packages/core` (пока пустой); `service/` работает как раньше, пока `apps/api` не заменит его.

## Команды

```sh
ruff check service agent shared           # из корня; настройки — ruff.toml
cd service && pytest                       # нужен Postgres: docker compose up -d db (в service/)
cd agent && pytest
pnpm install                               # из корня: монорепа pnpm (apps/web, apps/api, packages/core)
pnpm lint && pnpm typecheck && pnpm test   # из корня: web, api, core; тест границ — apps/api/test/boundaries.test.ts
pnpm knip && pnpm audit --audit-level high # мёртвый код (core, api) и уязвимости — как в CI
ENV_FILE=../../service/.env pnpm --filter @hoplab/api dev   # API на Fastify (:8000) с переменными сервиса; без ENV_FILE — .env в apps/api
cd apps/web && pnpm api:types              # после правки схем API: openapi.json → типы (nuxt-open-fetch)
cd service && alembic revision --autogenerate -m "…"   # после правки app/models.py
python -m app [serve|agents new|agents list|vapid|openapi]   # команды сервиса (из service/)
```

Python — из `.venv` своей папки (`service/.venv`, `agent/.venv`). На Windows в Git Bash heredoc ломает `\` и тройные кавычки — скрипты писать в файл.

MCP-серверы проекта (`.mcp.json`): **nuxt-ui** — компоненты, пропсы и примеры Nuxt UI; **context7** — актуальная документация библиотек (Nuxt, FastAPI, SQLModel, Pydantic, tinytuya…). Перед использованием API библиотеки сверяться с ними, а не с памятью.

Скилы проекта (`.claude/settings.json`, плагины ставятся при первом запуске Claude Code в `hoplab/`): **ui-ux-pro-max** (nextlevelbuilder) — стили, палитры, шрифтовые пары и UX-правила, в том числе для Nuxt UI; **example-skills** (anthropics/skills) — frontend-design, webapp-testing (проверка интерфейса через Playwright), theme-factory, canvas-design, skill-creator и др.; **academy-guide**. Для дизайна и вёрстки — сначала они. Скрипты ui-ux-pro-max, которые ходят в сеть (генерация логотипов и картинок через Gemini и др.), запускать только по просьбе пользователя.

## Правила кода

- **Сервис.** Новый эндпоинт — в `router.py` своего раздела. Кто спрашивает — `Viewer` / `CurrentUser` / `Admin`; общие объекты — зависимости из `deps.py` (`app.state`), глобального состояния нет. Отказ — ошибка из `errors.py` в модуле данных, роутер не ловит исключения ради HTTP-статуса. Права — только в `access.py`; интерфейс лишь прячет кнопки.
- **Схемы API** — источник типов интерфейса. Поменял `schemas.py` — `pnpm api:types` в `apps/web` (выгружает `apps/web/openapi.json`, nuxt-open-fetch строит по нему типизированные `$api` / `useApi` и типы схем `#open-fetch-schemas/api`); типы в `apps/web` руками не пишутся. CI сверяет `apps/web/openapi.json` с сервисом.
- **База** — только миграциями Alembic; применённые миграции не править (ruff их не проверяет).
- **Два места одного правила:** программа пивоварни (`recipes/program.py` ≡ `apps/web/app/utils/recipe.ts`), показатели (`recipes/calc.py` ≡ `apps/web/app/utils/calc.ts`), пересчёт под оборудование (`recipes/scale.py` ≡ `apps/web/app/utils/scale.ts`) и расписание брожения (`brewery/reminders.py` ≡ `fermentPlan` в `apps/web/app/utils/brewlog.ts`). Меняется одно — меняется и второе, и примеры в `shared/` (`shared/README.md`). Показатели в базу пишет сервис.
- **Протокол агента** (`brewery/hub.py` ↔ `agent/link.py`, описание — `agent/README.md`): записи с `seq` подтверждаются `ack`; команды не копятся; ключи Tuya не покидают агента.
- **Интерфейс** — идиомы Nuxt: данные через `useApi` / `useAsyncData` и `$api` (nuxt-open-fetch), Pinia — только для клиентского состояния; страницы, которые рендерит сервер, не трогают `window` / `localStorage` при создании и не дают расхождений гидратации; без «самоделок» вроде глобальных ref вне сторов и строк-URL в компонентах. Тексты — для пивовара, без инструкций разработчику (про запуск, Docker и т. п.).
- **Стиль** — как в окружающем коде: короткие комментарии по-русски там, где они помогают; Python — ruff, строка до 120; TS/Vue — ESLint stylistic, один на весь репозиторий (без точек с запятой, одинарные кавычки; `pnpm lint:fix`), Prettier нет.
- **Тесты** — к каждому изменению поведения. Сквозные тесты сервиса — с настоящим сервисом, базой и агентом на имитации пивоварни (`service/tests/support.py`, `agent/agent/fake.py`).

## Архитектура API (`apps/api`, `packages/core`)

Новый сервис на Fastify (план — [docs/design/node-migration.md](docs/design/node-migration.md), разделы 3 и 3а). Пока заведён каркас и раздел `health`; разделы с базой появятся по шагам плана. Правила ниже проверяет ESLint (`eslint/*.mjs`) — ошибкой, а не предупреждением; каждое закреплено тестом `apps/api/test/boundaries.test.ts`.

**Слои раздела** — `apps/api/src/<раздел>/` (образец — `health/`):

| Файл | Что делает | Чего не делает |
|---|---|---|
| `routes.ts` | HTTP: схема запроса и ответа, вызов сервиса, код ответа | не знает SQL, не зовёт `queries.ts` |
| `service.ts` | смысл: права (`access.ts`), правила, ошибки предметной области | не знает HTTP (`fastify`, `request`, `reply`) |
| `queries.ts` | SQL на Drizzle — функции, не классы; транзакции здесь | не знает прав и HTTP |
| `schemas.ts` | zod: тела и ответы → OpenAPI | — |
| `index.ts` | публичный вход раздела (плагин, публичный сервис) | — |

Общее: `src/app.ts` — `buildApp(deps)` (плагины, ошибки → `{detail}`, CORS, Origin, OpenAPI, регистрация разделов); `src/main.ts` — запуск и остановка; `src/config.ts` — настройки из env через zod (имена — как у `service/app/config.py`); `src/errors.ts` — ошибки предметной области (`Invalid` 400, `Forbidden` 403, `NotFound` 404, `Conflict` 409, `Unsupported` 415, `Offline` 503…): сервис бросает, общий обработчик отдаёт `{ detail }`, а 422 от zod — список `{ type, loc, msg }`, как у FastAPI.

**Запрещено** (ESLint, `pnpm lint`):
- Drizzle, `pg` и SQL — вне `queries.ts` и `src/db/**` (в том числе в `src/cli/**`: SQL переноса данных — в `src/db/legacy/`, CLI зовёт функции оттуда);
- `routes.ts` импортирует `queries.ts`; `service.ts` импортирует `fastify`;
- раздел лезет во внутренности другого: можно только `../<раздел>` или `../<раздел>/index`; путь `./../…` не пишем вовсе;
- `process.env` вне `src/config.ts`;
- `let`/`var` и `new Map/Set` на уровне модуля — это глобальное состояние: зависимости идут через `buildApp(deps)`;
- `any` — только с комментарием-обоснованием: `// eslint-disable-next-line … -- причина` (без причины — ошибка);
- обходы `process.env` (`process['env']`, `const { env } = process`, `globalThis.process.env`, импорт `process` / `node:process`) — тоже вне `config.ts` нельзя;
- `packages/core` импортирует `apps/*`, `fastify`, `drizzle-orm`, `node:*` и встроенные модули Node (код идёт и в браузер); `apps/web` импортирует `apps/api` или `@hoplab/api`.

Остальное ловит CI: `pnpm typecheck` (строгий TS, `noUncheckedIndexedAccess`), `pnpm test` (у `core` порог 90 % строк), `pnpm knip` (мёртвый код в core и api; у web не включён), `pnpm audit`, `gitleaks`.

**Как добавить раздел.** Пока — по образцу `src/health/`: папка `<раздел>/` с `routes.ts`, `service.ts`, `schemas.ts`, `index.ts` (и `queries.ts`, когда появится база); регистрация в `buildApp` — `app.register(<раздел>Routes, { prefix: '/api' })`; тесты в `apps/api/test/` через `app.inject()`. С шага 3 плана (раздел «оборудование») — шаблон `pnpm new:module <имя>`.

**Зависимости и слои в коде.**
- `buildApp(deps)` кладёт зависимости в `app.deps` (`app.decorate('deps', deps)`). Тип `Deps` и расширение `FastifyInstance` — `src/deps.ts`; сейчас в нём только `config`, база, почта, хаб и т. д. добавляются по шагам. Журнал и прочие параметры сборки — второй аргумент `buildApp(deps, options)`.
- Маршрут берёт `app.deps` и передаёт сервису нужную часть. Сервис — **функции** `(deps, viewer, input)`: `deps` — подмножество (`Pick<Deps, 'db' | 'mailer'>`), `viewer` — кто спрашивает (с шага 3 это `request.viewer`; сервис получает его аргументом, а не из запроса). Queries — функции `(db, …)`, где `db` — пул или транзакция Drizzle.
- Классов-сервисов и синглтонов нет; тесты передают подмены в `buildApp(deps)`.
- `index.ts` раздела экспортирует только плагин маршрутов и публичные функции и типы сервиса для других разделов — не queries и не внутренние хелперы.
- Подпапки разделов допустимы (`src/brews/reminders/service.ts`): подпапка — мини-раздел со своим `index.ts`, правила слоёв действуют и в ней. Чужой раздел виден только через его `index.ts`, **соседняя подпапка того же раздела — тоже только через её `index.ts`** (`../logbook`, не `../logbook/service`; из корня раздела — `./reminders`, не `./reminders/schedule`).
- Права — `src/access.ts`, функции по образцу `service/app/access.py` (`isAdmin(user)`, `canView(user, recipe)`, `canEdit`, `canModerate`, `canPublish`). `viewer` — пользователь или `null` для гостя (как `user` в `access.py`); хуки маршрутов `requireUser` / `requireAdmin` экспортирует `src/auth/index.ts` (появятся на шаге 3).

**Контракт API** (то, что пишется в `schemas.ts`; сверено с `service/app/schemas.py` и `recipes/schemas.py`):
- ключи JSON — camelCase; время — unix-секунды числом (в Python это `float`, например `updatedAt`); id — строки;
- действие без данных отвечает `{ ok: true }`;
- ошибки — `{ detail }` строкой; 422 — списком `{ type, loc, msg }`, где `loc` начинается с `body` / `query` / `path` / `header`; невалидный JSON — `json_invalid` с позицией; непредвиденная 500 — простой текст `Internal Server Error`, без `detail` (интерфейс покажет свой текст);
- плотность — SG (`og`, `fg`, `gravity`), цвет — EBC (`ebc`).

**Тексты ошибок, которые видит человек, — русские**, и задаёт их сервис через `AppError`, а не встроенные ошибки Fastify (у них английский текст). Например, лимит тела — `bodyLimit` маршрута и своя ошибка с текстом, как в Python («фото больше 10 МБ», 413).

**Чек-лист ревью** (то, чего линтер не видит):
- права — только через `access.ts`, а не «if в маршруте»;
- ошибки предметной области — классами из `errors.ts`, в одном формате `{ detail }`, тексты для человека;
- у раздела есть тесты по сценариям из `docs/scenarios.md`;
- несколько таблиц пишутся в одной транзакции (в `queries.ts`);
- контракт API: схема ответа изменилась — обновлены `openapi.json` и интерфейс в том же коммите;
- зависимости раздела приходят через `buildApp(deps)`, а не глобальным объектом (в том числе `const`-объектом с изменяемым содержимым);
- расчёты — в `packages/core`, а не дублем в `api` и `web`.

## Безопасность и железо

- `agent/devices.json`, `agent/tinytuya.json`, любые `.env` — ключи и пароли: не выводить, не коммитить, не пересылать.
- С настоящей пивоварней: DP 109 (модель) не записывать; нагрев и насос не включать без воды в котле.
- Команды пивоварне через интернет — по правилам [docs/roadmap.md, «Управление через интернет»](docs/roadmap.md#управление-через-интернет).

## Git и выкатка

Пуш в `main` сразу выкатывается на сервер (CI: линтеры, тесты, образ, SSH). Пока идёт перенос на Node, вся работа — в ветке `node`, шаги — PR в неё (план, раздел 8). Коммитить и пушить — только по просьбе. Перед пушем — проверки из «Команд».
