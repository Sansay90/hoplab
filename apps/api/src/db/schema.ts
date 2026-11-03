// Схема базы (Drizzle) — раздел 4 плана node-migration.md. Источник истины для миграций: правишь этот файл →
// `pnpm --filter @hoplab/api db:generate` → папка drizzle/ идёт в коммит. Имена колонок в базе — snake_case
// (casing у pgTable ниже), в TS — camelCase.
//
// users ─┬─ user_avatars · sessions · auth_tokens · agents · push_subscriptions
//        ├─ equipment ── devices ─┬─ readings · events · brews
//        ├─ brews ── brew_entries · brew_reminders
//        ├─ recipes ─┬─ recipe_photos · recipe_votes · comments ── comment_votes
//        ├─ favorites ── recipes
//        └─ notifications ─┬─ comments · brews
//
// Ключи — UUID: у новых записей v7 (uuidv7 из core, генерирует приложение), у перенесённых из старой базы — прежние
// v4. Время — timestamptz с точностью до миллисекунды (как у Date в JS). Перечисления — text + check, кроме
// equipment.kind, events.kind и readings.status (см. комментарии у таблиц).
import { uuidv7 } from '@hoplab/core'
import { sql } from 'drizzle-orm'
import {
  bigint, boolean, check, customType, doublePrecision, index, integer, jsonb, pgTableCreator, primaryKey, real, smallint,
  text, timestamp, uniqueIndex, uuid,
} from 'drizzle-orm/pg-core'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'

/** Имена колонок — snake_case, в TS — camelCase: casing задан у создателя таблиц, а не у каждого запроса. */
const pgTable = pgTableCreator(name => name, 'snake_case')

const bytea = customType<{ data: Buffer }>({ dataType: () => 'bytea' })

const time = () => timestamp({ withTimezone: true, precision: 3, mode: 'date' })
const createdAt = () => time().notNull().defaultNow()
/** Документ JSONB: форма — забота схем zod на границах (рецепт — recipeSchema из core). */
const json = () => jsonb().$type<Record<string, unknown>>()

const id = () => uuid().primaryKey().$defaultFn(uuidv7)
const owner = () => uuid().notNull().references(() => users.id, { onDelete: 'cascade' })
// значения — литералами, не параметрами: check попадает в SQL миграции как есть
const inList = (column: AnyPgColumn, values: readonly (string | number)[]) =>
  sql`${column} in (${sql.raw(values.map(v => typeof v === 'number' ? String(v) : `'${v}'`).join(', '))})`

// ── пользователи и вход ───────────────────────────────────────────────────────

/** Без почты — владелец данных, заведённых до входа («у себя на ПК»): его забирает первая регистрация.
 *  name — ник, его видят все; nameKey — ник для сравнения (строчными, «ё» как «е»); почта — строчными. */
export const users = pgTable('users', {
  id: id(),
  name: text(),
  nameKey: text().unique(),
  avatarVersion: integer().notNull().default(0),   // в адресе аватара — для кеша; байты — в user_avatars
  email: text().unique(),
  passwordHash: text(),
  emailVerifiedAt: time(),
  role: text().notNull().default('user'),
  pushComments: boolean().notNull().default(true),
  pushBrews: boolean().notNull().default(true),
  createdAt: createdAt(),
}, t => [check('users_role_check', inList(t.role, ['user', 'admin']))])

/** JPEG 256×256. Отдельно от users: пользователь читается всюду, байты аватара не должны ехать с ним. */
export const userAvatars = pgTable('user_avatars', {
  userId: uuid().primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  data: bytea().notNull(),
})

/** Вход: случайный токен в cookie, здесь — его SHA-256. */
export const sessions = pgTable('sessions', {
  id: id(),
  userId: owner(),
  tokenHash: text().notNull().unique(),
  userAgent: text(),
  createdAt: createdAt(),
  lastSeenAt: createdAt(),
  expiresAt: time().notNull(),
}, t => [index('ix_sessions_user_id').on(t.userId)])

/** Одноразовая ссылка из письма: verify — подтвердить почту, reset — сбросить пароль; в базе — SHA-256 токена. */
export const authTokens = pgTable('auth_tokens', {
  id: id(),
  userId: owner(),
  kind: text().notNull(),
  tokenHash: text().notNull().unique(),
  createdAt: createdAt(),
  expiresAt: time().notNull(),
  usedAt: time(),
}, t => [
  index('ix_auth_tokens_user_id').on(t.userId),
  check('auth_tokens_kind_check', inList(t.kind, ['verify', 'reset'])),
])

// ── рецепты и обсуждение ──────────────────────────────────────────────────────

/** doc — рецепт целиком (recipeSchema из core), docVersion — номер формата документа; name дублирует doc.name
 *  для сортировки. private — видит только автор, public — все, и гости. */
export const recipes = pgTable('recipes', {
  id: id(),
  userId: owner(),
  name: text().notNull(),
  doc: json().notNull(),
  docVersion: smallint().notNull().default(1),
  visibility: text().notNull().default('private'),
  publishedAt: time(),
  createdAt: createdAt(),
  updatedAt: createdAt(),
}, t => [
  index('ix_recipes_user_id').on(t.userId),
  index('ix_recipes_visibility').on(t.visibility),
  check('recipes_visibility_check', inList(t.visibility, ['private', 'public'])),
])

/** Фото пива: снимок, уже уменьшенный интерфейсом; thumb — превью для списков (JPEG до 480 px). */
export const recipePhotos = pgTable('recipe_photos', {
  id: id(),
  recipeId: uuid().notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  userId: owner(),
  contentType: text().notNull(),
  data: bytea().notNull(),
  thumb: bytea(),
  credit: text(),
  createdAt: createdAt(),
}, t => [
  index('ix_recipe_photos_recipe_id').on(t.recipeId),
  index('ix_recipe_photos_user_id').on(t.userId),
  check('recipe_photos_content_type_check', inList(t.contentType, ['image/jpeg', 'image/png', 'image/webp'])),
])

/** Избранное — ссылка, а не копия. */
export const favorites = pgTable('favorites', {
  userId: owner(),
  recipeId: uuid().notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  createdAt: createdAt(),
}, t => [primaryKey({ columns: [t.userId, t.recipeId] }), index('ix_favorites_recipe_id').on(t.recipeId)])

/** Голос за рецепт: 1 — нравится, −1 — не нравится; один на человека. */
export const recipeVotes = pgTable('recipe_votes', {
  userId: owner(),
  recipeId: uuid().notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  value: smallint().notNull(),
  createdAt: createdAt(),
}, t => [
  primaryKey({ columns: [t.userId, t.recipeId] }),
  index('ix_recipe_votes_recipe_id').on(t.recipeId),
  check('recipe_votes_value_check', inList(t.value, [1, -1])),
])

/** parentId — ответ (один уровень). Удалённый с ответами остаётся пустым (deletedAt); без ответов — удаляется. */
export const comments = pgTable('comments', {
  id: id(),
  recipeId: uuid().notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  userId: owner(),
  parentId: uuid().references((): AnyPgColumn => comments.id, { onDelete: 'cascade' }),
  text: text().notNull(),
  createdAt: createdAt(),
  editedAt: time(),
  deletedAt: time(),
}, t => [
  index('ix_comments_recipe_id').on(t.recipeId),
  index('ix_comments_user_id').on(t.userId),
  index('ix_comments_parent_id').on(t.parentId),
])

export const commentVotes = pgTable('comment_votes', {
  userId: owner(),
  commentId: uuid().notNull().references(() => comments.id, { onDelete: 'cascade' }),
  value: smallint().notNull(),
  createdAt: createdAt(),
}, t => [
  primaryKey({ columns: [t.userId, t.commentId] }),
  index('ix_comment_votes_comment_id').on(t.commentId),
  check('comment_votes_value_check', inList(t.value, [1, -1])),
])

// ── пивоварни, оборудование, партии ───────────────────────────────────────────

/** Агент у пивоварни; в базе — SHA-256 его токена. */
export const agents = pgTable('agents', {
  id: id(),
  userId: owner(),
  name: text().notNull(),
  tokenHash: text().notNull().unique(),
  createdAt: createdAt(),
  lastSeenAt: time(),
}, t => [index('ix_agents_user_id').on(t.userId)])

/** Пивоварня пользователя; ключи и адрес — у агента, здесь — модель и ограничения (сообщает агент). */
export const devices = pgTable('devices', {
  id: id(),
  userId: owner(),
  agentId: uuid().references(() => agents.id, { onDelete: 'set null' }),
  tuyaId: text().notNull().unique(),
  name: text().notNull(),
  model: text(),
  limits: json(),
  createdAt: createdAt(),
}, t => [index('ix_devices_user_id').on(t.userId), index('ix_devices_agent_id').on(t.agentId)])

/** Оборудование пивовара. Варочная система — с объёмом, эффективностью, испарением и котлом, остальное — в props.
 *  main — основная система для новых рецептов, одна у пользователя. Вид (kind) — из каталога в коде, без check:
 *  убранный из каталога вид остаётся в данных и виден как «Другое». */
export const equipment = pgTable('equipment', {
  id: id(),
  userId: owner(),
  name: text().notNull(),
  kind: text().notNull().default('manual'),
  deviceId: uuid().references(() => devices.id, { onDelete: 'set null' }),
  volume: doublePrecision(),
  efficiency: doublePrecision(),
  evaporation: doublePrecision(),
  kettle: doublePrecision(),
  props: json().notNull().default({}),
  notes: text(),
  main: boolean().notNull().default(false),
  createdAt: createdAt(),
}, t => [
  index('ix_equipment_user_id').on(t.userId),
  index('ix_equipment_device_id').on(t.deviceId),
  uniqueIndex('ix_equipment_one_main').on(t.userId).where(sql`${t.main}`),
])

/** Партия. source — откуда: device (с пивоварни) или manual (вручную) — не выводится из deviceId: у устройства
 *  on delete set null, удаление пивоварни не должно переписать историю. program — программа, как загружена в
 *  пивоварню (у ручных — null); batchRecipe — рецепт партии под оборудование на момент варки; plan — задумано
 *  по нему: OG, FG, брожение. dayEndedAt — варочный день позади; null — день идёт. */
export const brews = pgTable('brews', {
  id: id(),
  userId: owner(),
  deviceId: uuid().references(() => devices.id, { onDelete: 'set null' }),
  source: text().notNull().default('device'),
  recipeId: uuid().references(() => recipes.id, { onDelete: 'set null' }),
  equipmentId: uuid().references(() => equipment.id, { onDelete: 'set null' }),
  name: text().notNull(),
  program: json(),
  batchRecipe: json(),
  plan: json(),
  status: text().notNull().default('running'),
  energyWh: doublePrecision().notNull().default(0),
  startedAt: createdAt(),
  endedAt: time(),
  dayEndedAt: time(),
}, t => [
  index('ix_brews_user_id').on(t.userId),
  index('ix_brews_device_id').on(t.deviceId),
  index('ix_brews_recipe_id').on(t.recipeId),
  index('ix_brews_equipment_id').on(t.equipmentId),
  index('ix_brews_started_at').on(t.startedAt),
  check('brews_source_check', inList(t.source, ['device', 'manual'])),
  check('brews_status_check', inList(t.status, ['running', 'finished', 'stopped'])),
])

/** Виды записей журнала партии — как KINDS в service/app/brewery/logbook.py. */
export const BREW_ENTRY_KINDS = [
  'mash_gravity', 'first_wort', 'preboil_gravity', 'og', 'gravity', 'fg', 'ph', 'preboil_volume', 'postboil_volume',
  'fermenter_volume', 'mash_temp', 'pitch_temp', 'temp', 'pitch', 'dry_hop', 'cold_crash', 'package', 'dumped', 'note',
  'stage', 'step',
] as const

/** Запись журнала: замер (value — SG, pH, л или °C по kind), веха или заметка. */
export const brewEntries = pgTable('brew_entries', {
  id: id(),
  brewId: uuid().notNull().references(() => brews.id, { onDelete: 'cascade' }),
  at: createdAt(),
  kind: text().notNull(),
  value: doublePrecision(),
  text: text(),
  createdAt: createdAt(),
}, t => [
  index('ix_brew_entries_brew_id').on(t.brewId),
  check('brew_entries_kind_check', inList(t.kind, BREW_ENTRY_KINDS)),
])

/** Журнал уже отработанных напоминаний по партии (ключи measure-…, stuck-N, stable-N, dry-gN, …), а не очередь:
 *  что пора напомнить, считается на каждом проходе из плана, записей журнала и времени. silent — отмечено без
 *  уведомления (этап начат по факту). sentAt и silent — NULL только у перенесённых из старой базы строк: там
 *  хранились одни ключи, «когда» и «молча ли» неизвестно. Новые строки планировщик заполняет всегда. */
export const brewReminders = pgTable('brew_reminders', {
  brewId: uuid().notNull().references(() => brews.id, { onDelete: 'cascade' }),
  key: text().notNull(),
  sentAt: time(),
  silent: boolean(),
}, t => [primaryKey({ columns: [t.brewId, t.key] })])

/** События пивоварни. Ключ — identity «by default»: при переносе id задаются явно, дальше выдаёт база. kind — словарь
 *  протокола агента, без check: расширение словаря не должно требовать миграции. */
export const events = pgTable('events', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  deviceId: uuid().notNull().references(() => devices.id, { onDelete: 'cascade' }),
  brewId: uuid().references(() => brews.id, { onDelete: 'cascade' }),
  at: createdAt(),
  kind: text().notNull(),
  text: text().notNull(),
  data: json(),
}, t => [index('ix_events_device_at').on(t.deviceId, t.at), index('ix_events_brew_id').on(t.brewId)])

/** Температура во времени; real — точности датчика хватает. status — словарь протокола агента, без check:
 *  расширение словаря не должно требовать миграции. */
export const readings = pgTable('readings', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  deviceId: uuid().notNull().references(() => devices.id, { onDelete: 'cascade' }),
  brewId: uuid().references(() => brews.id, { onDelete: 'cascade' }),
  at: createdAt(),
  temp: real().notNull(),
  target: real(),
  step: integer(),
  status: text(),
}, t => [index('ix_readings_device_at').on(t.deviceId, t.at), index('ix_readings_brew_id').on(t.brewId)])

// ── уведомления и push ────────────────────────────────────────────────────────

/** Уведомление на сайте. kind: comment — к моему рецепту, reply — ответ мне (actor, recipe, comment), brew —
 *  напоминание о брожении (brew). data — снимок для push: { title, text }, как ушёл в push; у новых уведомлений
 *  заполняется всегда. У перенесённых из старой базы, где data не было (комментарии, ответы, напоминание с
 *  data = null), data = {}: текст там не выдумывается. Лента, как и в Python (notifications/feed.py), строит
 *  текст комментариев и ответов живьём — join с comments и recipes, чтобы правка комментария и переименование
 *  рецепта были видны; data нужна только push. */
export const notifications = pgTable('notifications', {
  id: id(),
  userId: owner(),
  kind: text().notNull(),
  actorId: uuid().references(() => users.id, { onDelete: 'cascade' }),
  recipeId: uuid().references(() => recipes.id, { onDelete: 'cascade' }),
  commentId: uuid().references(() => comments.id, { onDelete: 'cascade' }),
  brewId: uuid().references(() => brews.id, { onDelete: 'cascade' }),
  data: json().notNull(),
  createdAt: createdAt(),
  readAt: time(),
}, t => [
  index('ix_notifications_user_created').on(t.userId, t.createdAt),
  index('ix_notifications_actor_id').on(t.actorId),
  index('ix_notifications_recipe_id').on(t.recipeId),
  index('ix_notifications_comment_id').on(t.commentId),
  index('ix_notifications_brew_id').on(t.brewId),
  check('notifications_kind_check', inList(t.kind, ['comment', 'reply', 'brew'])),
])

/** Подписка браузера на Web Push: одна на устройство (endpoint уникален). */
export const pushSubscriptions = pgTable('push_subscriptions', {
  id: id(),
  userId: owner(),
  endpoint: text().notNull().unique(),
  p256dh: text().notNull(),
  auth: text().notNull(),
  userAgent: text(),
  createdAt: createdAt(),
  lastSeenAt: createdAt(),
}, t => [index('ix_push_subscriptions_user_id').on(t.userId)])
