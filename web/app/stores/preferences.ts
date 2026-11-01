import type { GravityUnit } from '~/utils/beer'

const YEAR_S = 365 * 24 * 3600

/** Настройки этого устройства (не пивоварни): в cookie браузера — по ним же рендер на сервере показывает
 *  плотность в нужных единицах, и страница не перерисовывается после загрузки. */
export const usePreferencesStore = defineStore('preferences', () => {
  const sound = preference<boolean>('hoplab.sound', false)
  const gravityUnit = preference<GravityUnit>('hoplab.gravityUnit', 'plato')
  const wcf = preference<string>('hoplab.wcf', '1.04')          // поправка рефрактометра на сусло — запоминается
  // чем мерил плотность сусла в прошлый раз — калькулятор откроется на нём
  const gravityInstrument = preference<'hydrometer' | 'refractometer'>('hoplab.gravityInstrument', 'hydrometer')
  return { sound, gravityUnit, wcf, gravityInstrument }
})

/** Настройка: пока её не меняли, cookie нет (гостю и поисковикам сервер её не ставит), значение — fallback. */
function preference<T extends string | boolean>(name: string, fallback: T) {
  const cookie = useCookie<T | undefined>(name, { maxAge: YEAR_S, sameSite: 'lax' })
  // прежде настройки жили в localStorage — переносятся один раз, после отрисовки страницы
  if (import.meta.client) {
    onNuxtReady(() => {
      const old = localStorage.getItem(name)
      if (old == null) return
      localStorage.removeItem(name)
      cookie.value = (typeof fallback === 'boolean' ? old === 'true' : old) as T
    })
  }
  return computed<T>({
    get: () => cookie.value ?? fallback,
    set: (value) => { cookie.value = value },
  })
}
