// Таблицы приёмника, которые заполняет перенос, — в порядке записи (родители раньше детей). Тот же список — у сверки:
// колонки каждой таблицы она берёт из схемы Drizzle.
import * as t from '../schema'

export const TABLES = {
  users: t.users, userAvatars: t.userAvatars, sessions: t.sessions, authTokens: t.authTokens, agents: t.agents,
  devices: t.devices, equipment: t.equipment, recipes: t.recipes, recipePhotos: t.recipePhotos,
  favorites: t.favorites, recipeVotes: t.recipeVotes, comments: t.comments, commentVotes: t.commentVotes,
  brews: t.brews, brewEntries: t.brewEntries, brewReminders: t.brewReminders, readings: t.readings, events: t.events,
  notifications: t.notifications, pushSubscriptions: t.pushSubscriptions,
}
