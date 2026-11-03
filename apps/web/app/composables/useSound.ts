import type { BrewEvent } from '~/types'

// Файлы — public/sounds/*.mp3, генерирует scripts/sounds.py (маримба с реверберацией).
// Сигнал звучит один раз; повтор — ring: общее правило для всех напоминаний — не больше RING_TIMES раз, дальше тишина,
// даже если не подтвердили (подсказка пивоварни, закладка, конец шага).
const KINDS = ['alert', 'addition', 'end', 'problem'] as const
export type SoundKind = typeof KINDS[number]

const VOLUME = 0.8
export const RING_TIMES = 4
const RING_MS = 4_000

/** Звуковые сигналы. Браузер разрешает звук только после жеста пользователя — первый клик «будит» его. */
export const useSound = createSharedComposable(() => {
  const prefs = usePreferencesStore()
  const base = useRuntimeConfig().app.baseURL
  let ctx: AudioContext | null = null
  let loading: Promise<void> | null = null
  const buffers = new Map<SoundKind, AudioBuffer>()

  function context() {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  }

  /** Скачать и декодировать звуки один раз — дальше они играют без задержки. */
  function load(c: AudioContext) {
    loading ??= Promise.all(KINDS.map(async (kind) => {
      const data = await fetch(`${base}sounds/${kind}.mp3`).then(r => r.arrayBuffer())
      buffers.set(kind, await c.decodeAudioData(data))
    })).then(() => {}, () => { loading = null })   // не вышло — попробуем при следующем сигнале
    return loading
  }

  useEventListener('pointerdown', () => { if (prefs.sound) load(context()) })   // на window; на сервере — ничего

  async function play(kind: SoundKind) {
    if (!prefs.sound) return
    const c = context()
    if (c.state !== 'running') return                  // звук ещё не разрешён — пропустить, а не копить
    await load(c)
    const buffer = buffers.get(kind)
    if (!buffer) return
    const src = c.createBufferSource()
    const gain = c.createGain()
    gain.gain.value = VOLUME
    src.buffer = buffer
    src.connect(gain).connect(c.destination)
    src.start()
  }

  /** Сигнал с повтором раз в RING_MS, всего не больше RING_TIMES раз; played — сколько уже прозвучало (первый
   *  сигнал сыграл forEvent). Возвращает «хватит» — подтвердили или ушли со страницы. */
  function ring(kind: SoundKind, played = 0) {
    let left = RING_TIMES - played
    let timer: ReturnType<typeof setInterval> | undefined
    const tick = () => {
      if (left-- > 0) play(kind)
      if (left <= 0) clearInterval(timer)
    }
    if (!played) tick()
    if (left > 0) timer = setInterval(tick, RING_MS)
    return () => clearInterval(timer)
  }

  function forEvent(e: BrewEvent) {
    if (e.kind === 'alert') play('alert')
    else if (e.kind === 'addition') play('addition')
    else if (e.kind === 'end') play('end')
    else if (e.kind === 'error' || e.kind === 'offline') play('problem')
  }

  function toggle() {
    prefs.sound = !prefs.sound
    if (prefs.sound) play('addition')
  }

  return { enabled: computed(() => prefs.sound), play, ring, forEvent, toggle }
})
