# CLAUDE.md

Инструкции для Claude Code (и других агентов — `AGENTS.md` ссылается сюда) в репозитории hoplab. Общение, документация, комментарии в коде и тексты интерфейса — **по-русски**; технические термины и имена из кода — как есть.

## Что это

Открытый русскоязычный сервис рецептов для домашних пивоваров СНГ с управлением пивоварней Easy Brew Connect. Сервис делается **для любых пивоваров и любых владельцев Easy Brew**: никаких поправок под конкретный экземпляр пивоварни или привычки одного пивовара — в пивоварню уходит ровно то, что задано в рецепте; параметры, зависящие от модели (мощность и т. п.), берутся от пивоварни, а не из констант.

- Документация — [docs/](docs/README.md): что умеет ([features](docs/features.md), [scenarios](docs/scenarios.md)), доступы ([access](docs/access.md)), устройство ([architecture](docs/architecture.md), [api](docs/api.md), [data](docs/data.md), [decisions](docs/decisions.md)), работа ([development](docs/development.md), [operations](docs/operations.md)), планы ([roadmap](docs/roadmap.md)).
- Документация меняется вместе с кодом, в том же изменении: поведение функции — `features.md` и `scenarios.md`, права — `access.md`, API и формат данных — `api.md` и `data.md`, решение «почему так» — `decisions.md`.
- `service/` — FastAPI + Postgres (пакет `app`, разделы `auth/`, `recipes/`, `brewery/`, `push/`, `notifications/`); `agent/` — агент у пивоварни (tinytuya, websockets); `apps/web/` — Nuxt 4 + Nuxt UI (гибридный рендеринг: каталог и рецепт — на сервере, личное — в браузере); `shared/` — общие примеры расчётов; `deploy/` — сервер. Идёт перенос сервиса на TypeScript ([план](docs/design/node-migration.md)): монорепа pnpm — `apps/web`, `apps/api` (Fastify, пока каркас), `packages/core` (расчёты и правила рецепта для браузера и сервера); `service/` работает как раньше, пока `apps/api` не заменит его.

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
pnpm --filter @hoplab/api db:generate      # после правки apps/api/src/db/schema.ts: миграция в apps/api/drizzle (в коммит)
pnpm --filter @hoplab/api db:check         # схема и миграции в синхроне (CI)
TEST_DATABASE_URL=postgresql://hoplab:hoplab@127.0.0.1:5432/hoplab_test pnpm --filter @hoplab/api test   # тесты базы; без переменной — пропускаются
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
- **Два места одного правила** (до шага 8 плана, пока жив `service/`): программа пивоварни (`recipes/program.py` ≡ `packages/core/src/program.ts`), показатели (`recipes/calc.py` ≡ `packages/core/src/calc.ts`), пересчёт под оборудование (`recipes/scale.py` ≡ `packages/core/src/scale.ts`), расписание брожения (`brewery/reminders.py` ≡ `fermentPlan` в `packages/core/src/ferment.ts`), схема рецепта (`recipes/schemas.py` ≡ `packages/core/src/schema.ts`) и каталог видов оборудования (`brewery/kinds.py` ≡ `packages/core/src/kinds.ts`). Меняется одно — меняется и второе, и примеры в `shared/` (`shared/README.md`). Показатели в базу пишет сервис.
- **Протокол агента** (`brewery/hub.py` ↔ `agent/link.py`, описание — `agent/README.md`): записи с `seq` подтверждаются `ack`; команды не копятся; ключи Tuya не покидают агента.
- **Интерфейс** — идиомы Nuxt: данные через `useApi` / `useAsyncData` и `$api` (nuxt-open-fetch), Pinia — только для клиентского состояния; страницы, которые рендерит сервер, не трогают `window` / `localStorage` при создании и не дают расхождений гидратации; без «самоделок» вроде глобальных ref вне сторов и строк-URL в компонентах. Тексты — для пивовара, без инструкций разработчику (про запуск, Docker и т. п.).
- **Стиль** — как в окружающем коде: короткие комментарии по-русски там, где они помогают; Python — ruff, строка до 120; TS/Vue — ESLint stylistic, один на весь репозиторий (без точек с запятой, одинарные кавычки; `pnpm lint:fix`), Prettier нет.
- **Тесты** — к каждому изменению поведения. Сквозные тесты сервиса — с настоящим сервисом, базой и агентом на имитации пивоварни (`service/tests/support.py`, `agent/agent/fake.py`).

## Ядро (`packages/core`)

Чистый TS для браузера и сервера, из зависимостей — только zod. Публичный вход — `src/index.ts`; `apps/web` импортирует оттуда явно (`import { calcRecipe } from '@hoplab/core'`), без автоимпорта и без файлов-прослоек в `app/utils`.

- **Что живёт в core:** схема рецепта на zod (`schema.ts`; типы — `z.infer`, а входы расчётов — `z.input`: `RecipeInput` и др.), показатели и подгонка под цель (`calc.ts`), программа пивоварни и закладки (`program.ts`), форма редактора и проверка (`draft.ts`), пересчёт под оборудование (`scale.ts`), расписание брожения (`ferment.ts`), шаги варочного дня (`brewday.ts`), вода (`water.ts`), каталог видов оборудования и проверка параметров (`kinds.ts`, `equipment.ts`), единицы пива (`beer.ts`), закладки (`additions.ts`), помощники текстов, которые нужны расчётам (`format.ts`: `SEP`, `fmtNumber`, `plural`, `fmtMinutes`).
- **Граница «расчёт / вид».** В core — расчёты и правила предметной области, в том числе тексты, которые делает и Python-близнец. В `apps/web` — вид: форматирование для экрана, иконки и цвета (`ADDITION_VIEW`, `equipmentIcon`, `beerColor`), подписи списков для выбора, Vue. Помощник форматирования, нужный и расчётам, живёт в core, а web импортирует его оттуда: двух копий нет.
- **Типы.** Данные API интерфейс до шага 7 плана типизирует из `openapi.json`; вызовы core из web — без `as`. Параметр функции core сужен до структуры, которую она читает (`Pick` от `RecipeInput`, `EquipmentParams`, `BreweryState` и т. п.), схему ради этого не ослабляют.
- **Без Node:** ни `node:*`, ни `process`, ни Vue/Nuxt, ни Fastify (ESLint, `eslint/core.mjs`). `"sideEffects": false` — схема zod не попадает в клиентский бандл, пока интерфейс её не использует.
- **Python-близнецы и общие примеры.** До шага 8 (удаление `service/`) пары «Python ≡ core» проверяют себя по `shared/*.json`: тесты core читают их оттуда — один файл на JSON (`packages/core/test/shared/`, каталог оборудования — `test/kinds.test.ts`), Python — `service/tests/test_shared.py`. Правило изменилось намеренно — поменять обе стороны и пересчитать примеры: из `service/` — `.venv/Scripts/python ../shared/update.py` (на Linux — `.venv/bin/python`).

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
- `buildApp(deps)` кладёт зависимости в `app.deps` (`app.decorate('deps', deps)`). Тип `Deps` и расширение `FastifyInstance` — `src/deps.ts`; сейчас в нём `config` и `db`, почта, хаб и т. д. добавляются по шагам. Журнал и прочие параметры сборки — второй аргумент `buildApp(deps, options)`.
- Маршрут берёт `app.deps` и передаёт сервису нужную часть. Сервис — **функции** `(deps, viewer, input)`: `deps` — подмножество (`Pick<Deps, 'db' | 'mailer'>`), `viewer` — кто спрашивает (с шага 3 это `request.viewer`; сервис получает его аргументом, а не из запроса). Queries — функции `(db, …)`, где `db` — пул или транзакция Drizzle.
- Классов-сервисов и синглтонов нет; тесты передают подмены в `buildApp(deps)`.
- `index.ts` раздела экспортирует только плагин маршрутов и публичные функции и типы сервиса для других разделов — не queries и не внутренние хелперы.
- Подпапки разделов допустимы (`src/brews/reminders/service.ts`): подпапка — мини-раздел со своим `index.ts`, правила слоёв действуют и в ней. Чужой раздел виден только через его `index.ts`, **соседняя подпапка того же раздела — тоже только через её `index.ts`** (`../logbook`, не `../logbook/service`; из корня раздела — `./reminders`, не `./reminders/schedule`).
- Права — `src/access.ts`, функции по образцу `service/app/access.py` (`isAdmin(user)`, `canView(user, recipe)`, `canEdit`, `canModerate`, `canPublish`). `viewer` — пользователь или `null` для гостя (как `user` в `access.py`); хуки маршрутов `requireUser` / `requireAdmin` экспортирует `src/auth/index.ts` (появятся на шаге 3).

**База** (`apps/api/src/db/`, Drizzle `1.0.0-rc.5` и `pg`, версии закреплены точно):
- `schema.ts` — вся схема (план, раздел 4: `user_avatars`, `recipes.doc` + `doc_version`, `brews.program` / `batch_recipe`, `brew_reminders` (`sent_at` и `silent` — NULL только у перенесённых строк), `notifications.data` (у перенесённых без данных — `{}`; лента комментариев строится живьём), перечисления — `text` + `check`, кроме `equipment.kind`, `events.kind`, `readings.status`). Колонки в базе — snake_case (casing у `pgTable` в схеме), в TS — camelCase. Новые ключи — `uuidv7()` из core (`$defaultFn`), у `events` и `readings` — `bigint identity` «by default». Время — `timestamptz(3)`.
- **Как менять:** правишь `schema.ts` → `pnpm --filter @hoplab/api db:generate` → папка `apps/api/drizzle/` идёт в тот же коммит. Миграции только сгенерированные; ручной SQL — с комментарием-обоснованием. `db:check` (он же шаг CI) падает, если схема и миграции разошлись. Применённые миграции не правятся.
- `client.ts` — `createDb(url)`: пул `pg` (`max: 5`) и Drizzle; пул — `db.$client`. `migrate.ts` — `migrateDb(db)`; `main.ts` подключается к `DATABASE_URL` и применяет миграции при старте, `db` лежит в `Deps` и закрывается в `onClose` (`app.close()`); `/api/health` базу не проверяет. Адрес `postgresql+psycopg://…` из `.env` Python-сервиса принимается (суффикс драйвера отбрасывается).
- **Тестовая база** — как у Python: `TEST_DATABASE_URL` (имя обязано кончаться на `_test`, иначе отказ: её очищают); база создаётся сама, схема — миграциями с чистого листа на старте прогона (`test/global-setup.ts`), перед тестом, которому нужна база, — `truncate … restart identity cascade` (`useTestDb()` из `test/db.ts`). Без `TEST_DATABASE_URL` тесты базы пропускаются (`describeDb`), остальные тесты api Postgres не требуют. Файлы тестов идут по очереди (`fileParallelism: false`).
- **Перенос данных из старой базы** (SQL — только в `src/db/legacy/`, CLI зовёт функции оттуда): `src/cli/import-legacy.ts`. Источник — `LEGACY_DATABASE_URL`, приёмник — `DATABASE_URL`. Команда сама применяет миграции приёмника (`migrateDb`, идемпотентно; в `--verify-only` — нет), затем проверяет, что он пуст, иначе отказ; всё в одной транзакции; каждый документ рецепта проверяется `recipeSchema` (хоть один не проходит — отказ со списком id и ошибок). Старая база читается страницами (keyset), вставки — порциями по 500 строк (лимит 65 535 параметров). Режимы: `--dry-run` (всё делает и сверяет, транзакцию откатывает, печатает счётчики), `--verify` (сверка до commit; расхождение — откат и код 1), `--verify-only` (сверка уже перенесённого). Счётчики identity у `events` и `readings` сдвигаются только после успешной сверки, перед commit. Запуск: `pnpm --filter @hoplab/api import-legacy -- --dry-run --verify` (dev, через `tsx`); в образе — `node dist/cli/import-legacy.mjs [--dry-run] [--verify]` (второй вход `tsdown`, `DATABASE_URL` и `LEGACY_DATABASE_URL` из окружения). Копию данных с сервера в этом шаге не трогают — только синтетический дамп.
- **Сверка** (`src/db/legacy/verify.ts`): каждая таблица построчно, по всем колонкам, одним общим механизмом. Колонки берутся из Drizzle-схемы (`getTableColumns`); пары «новая колонка → старая» — одноимённые, а где схема изменилась, — явная карта `SPECS` в `verify.ts`. Добавил колонку в схему — без пары в старой базе и без записи в `SPECS` сверка не запустится (`VerifyConfigError`), тест «каждая колонка сверяется» портит значение в каждой колонке и требует, чтобы сверка покраснела именно на ней. Старая и новая база читаются параллельно страницами по ключу; значения нормализуются в SQL: время — миллисекунды, `readings.temp`/`target` — `real` (сужение намеренное), прочие числа — `float8`, JSON — по смыслу (JSON null ≡ SQL NULL), байты — SHA-256, остальное — текстом. Отчёт: таблица, ключ, колонка, не больше 5 примеров на таблицу.
- **Дамп для теста** — `apps/api/test/fixtures/legacy.sql`: данные создаёт код старого сервиса (`service/scripts/legacy_fixture.py`: миграции Alembic + сценарий через HTTP API и модели сервиса), `pg_dump --no-owner --no-privileges --column-inserts`, без метакоманд psql. Пересоздать, из `service/`: поднять Postgres (`docker run -d --name hoplab-pg-node -p 127.0.0.1:5434:5432 -e POSTGRES_USER=hoplab -e POSTGRES_PASSWORD=hoplab postgres:17-alpine`), затем `.venv/Scripts/python scripts/legacy_fixture.py --docker hoplab-pg-node --url postgresql+psycopg://hoplab:hoplab@127.0.0.1:5434/hoplab_legacy_fixture_test` и `docker rm -f hoplab-pg-node`. UUID и время в дампе при каждой сборке новые — тест читает значения из самой базы. Схема старой базы в дампе тоже есть, тест поднимает её без Alembic. В дампе есть фото без превью (`thumb = NULL`) и напоминание с `data = NULL`; строка `SET transaction_timeout` из него вырезается (дамп грузится и в Postgres 16). Служебные базы тестов (`*_legacy_test`, `*_empty_test`, `*_migrate_test`) тесты удаляют за собой.

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
