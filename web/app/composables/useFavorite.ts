import type { RecipeDetail, RecipeSummary } from '~/types'

/** Избранное: отметка меняется сразу — в загруженных каталоге и странице рецепта (данные Nuxt, без перезапроса),
 *  сервис не принял — возвращается обратно с тостом. Гостю — панель входа: избранное хранится у пользователя. */
export function useFavorite() {
  const nuxtApp = useNuxtApp()
  const { $api } = nuxtApp
  const auth = useAuthStore()
  const drawer = useAuthDrawer()
  const showError = useErrorToast()

  // данные Nuxt — shallowRef: меняется объект целиком, а не поле внутри
  function mark(rid: string, on: boolean) {
    // списки рецептов: каталог и страницы пивоваров
    for (const key of Object.keys(nuxtApp._asyncData).filter(k => k === 'recipes' || k.startsWith('brewer-recipes:'))) {
      const list = useNuxtData<RecipeSummary[]>(key).data
      if (list.value) list.value = list.value.map(r => (r.id === rid ? { ...r, favorite: on } : r))
    }
    const detail = useNuxtData<RecipeDetail | null>(recipeKey(rid)).data
    if (detail.value) detail.value = { ...detail.value, meta: { ...detail.value.meta, favorite: on } }
  }

  async function toggle(rid: string, on: boolean) {
    if (!auth.user) return drawer.show('login')
    mark(rid, on)
    try {
      await $api('/api/recipes/{rid}/favorite', { method: on ? 'PUT' : 'DELETE', path: { rid } })
    } catch (e) {
      mark(rid, !on)
      showError(e)
    }
  }

  return { toggle }
}
