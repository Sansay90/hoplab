<script setup lang="ts">
// «Сейчас» — текущий шаг варочного дня. Без пивоварни: шаг, что приготовить, что дальше, «Дальше» (запись «step»;
// на последнем шаге — «Дрожжи заданы», веха pitch; ошиблись — удалить запись в журнале); справа — таймер шага (если у
// шага есть время) и поля его замеров (не записаны — «Дальше» спрашивает: эти цифры потом не восстановить; кроме
// рекомендуемых — pH: прибор есть не у всех). Пивоварня ведёт шаги — под её карточками замеры её шага. Звук
// здесь же: время шага вышло — сигнал, не больше 4 раз (общее правило, useSound.ring); закладка на кипячении в свою
// минуту — сигнал закладки. Пока шаги ведёт пивоварня, своего отсчёта не звучит: её таймер идёт от выхода на
// температуру и стоит на паузе — звучат её события (плагин уведомлений).
// На подключённой пивоварне: до засыпи программа партии ещё не в ней — загрузить, загружена — запустить; позже
// загружать незачем (программа начнётся с нагрева) — шаги рукой. Программа идёт — «Сейчас» и «Дальше» самой
// пивоварни, шаги она ведёт сама.
import type { BrewDetail, BrewEntry } from '~/types'
import type { BrewDayView } from '~/utils/brewday'
import type { EntryKind } from '~/utils/brewlog'

// controlled — партия на пивоварне, которой управляет сайт: её снимок в сторе — это она
const props = defineProps<{ brew: BrewDetail; view: BrewDayView; connected: boolean; controlled?: boolean }>()
const emit = defineEmits<{ changed: [] }>()
const brewery = useBreweryStore()
const { $api } = useNuxtApp()
const { exec, pending } = useCommand()
const confirm = useConfirm()
const sound = useSound()
const now = useNow({ interval: 1000 })             // секунды нужны только таймеру — карточка живёт, пока идёт день

const step = computed(() => props.view.steps[props.view.current]!)
const next = computed(() => props.view.steps[props.view.current + 1] ?? null)
const measures = computed(() => lastMeasures(props.brew.entries))
// замеры шага, записанные только что, — партия освежится чуть позже, а «Дальше» могут нажать сразу
const recorded = ref(new Set<EntryKind>())
watch(() => props.view.current, () => { recorded.value = new Set() })
const flushes = new Set<() => Promise<unknown>>()
provide(MEASURE_FLUSH, flushes)
function measured(e: BrewEntry) {
  recorded.value.add(e.kind)
  emit('changed')
}
const loaded = computed(() => brewery.snapshot?.deviceRecipe?.brewId === props.brew.id)
// пивоварня партии на связи — на шагах, где сусло в котле, живая температура с её датчика (охлаждение чиллером и т. п.)
const IN_KETTLE = new Set(['heat', 'mash_in', 'rest', 'sparge', 'boil', 'chill'])
const liveTemp = computed(() => (props.controlled && brewery.online && IN_KETTLE.has(step.value.kind)
  ? brewery.snapshot?.temp ?? null
  : null))
const programActive = computed(() => brewery.phase.running || brewery.phase.paused)
// пивоварня: программа ещё не загружена или ждёт запуска — пока её шаги не идут, рукой доходим до старта; после
// засыпи загружать и запускать незачем: программа начнётся с нагрева
const breweryIdle = computed(() => props.connected && !props.view.byBrewery && ['prepare', 'heat'].includes(step.value.kind))
const hintOf = (m: EntryKind) => measureHint(m, props.brew.snapshot)
// справа есть что показать (таймер, замеры, «Дальше» пивоварни) — иначе карточка шага на всю ширину
const aside = computed(() => !!step.value.minutes || step.value.measures.length > 0 || (breweryIdle.value && loaded.value))

const remaining = computed(() => stepRemaining(step.value, now.value.getTime() / 1000))
const over = computed(() => remaining.value != null && remaining.value <= 0)
const progress = computed(() => (remaining.value != null && step.value.minutes
  ? Math.min(100, Math.max(0, 100 * (1 - remaining.value / (step.value.minutes * 60))))
  : null))

// время шага вышло — сигнал, не больше 4 раз; пивоварня ведёт шаги — не наш отсчёт, молчим
const ringing = computed(() => over.value && !props.view.byBrewery)
let silence: (() => void) | undefined
watch(ringing, (ring) => {
  silence?.()
  silence = ring ? sound.ring('end') : undefined
}, { immediate: true })
onBeforeUnmount(() => silence?.())
// закладки кипячения — по таймеру шага: пришла минута закладки — один сигнал (вернулись позже минуты — молча)
const sounded = new Set<number>()
watch(() => props.view.current, () => sounded.clear())
watch(remaining, (left) => {
  if (props.view.byBrewery || step.value.kind !== 'boil' || left == null || !step.value.minutes) return
  const elapsed = step.value.minutes * 60 - left
  for (const a of step.value.additions) {
    const at = (step.value.minutes - a.minutes) * 60
    if (sounded.has(a.minutes) || elapsed < at) continue
    sounded.add(a.minutes)
    if (elapsed < at + 60) sound.play('addition')
  }
})

// пока дописываются замеры и идёт запись — второй тап ничего не делает (иначе — две записи шага или дрожжей)
const advancing = ref(false)
async function advance() {
  if (advancing.value) return
  advancing.value = true
  try {
    await moveOn()
  } finally {
    advancing.value = false
  }
}
async function moveOn() {
  // ввели значение и сразу «Дальше» — сначала дописать его
  await Promise.all([...flushes].map(f => f()))
  const missing = step.value.measures.filter(m => !ENTRY_KINDS[m].optional && !measures.value.get(m) && !recorded.value.has(m))
  if (missing.length && !await confirm({
    title: 'Замеры не записаны',
    description: `${missing.map(m => ENTRY_KINDS[m].short ?? ENTRY_KINDS[m].label).join(', ')} — поля на этом шаге пустые. Идти дальше без записи?`,
    confirmLabel: 'Дальше без записи',
    confirmIcon: 'i-lucide-arrow-right',
  })) return
  const body = step.value.kind === 'pitch'
    ? { kind: 'pitch' as const }
    : { kind: 'step' as const, value: props.view.current + 1 }
  if (!await exec(() => $api('/api/brews/{bid}/entries', { method: 'POST', path: { bid: props.brew.id }, body }))) return
  emit('changed')
  await until(() => props.brew).changed({ timeout: 5000 })   // пока партия не обновилась, шаг на экране прежний
}
const uploadHint = computed(() => (!brewery.online ? 'Пивоварня не в сети' : programActive.value ? 'Программа идёт — заменить можно после её окончания' : 'Паузы, кипячение и закладки рецепта партии'))
async function upload() {
  await exec(() => $api('/api/brews/{bid}/upload', { method: 'POST', path: { bid: props.brew.id } }), 'Программа партии в пивоварне')
}
</script>

<template>
  <!-- пивоварня ведёт шаги: её «Сейчас» и «Дальше» -->
  <div v-if="view.byBrewery" class="grid gap-4 sm:gap-6 lg:grid-cols-2">
    <BrewNowCard />
    <!-- замеры шага пивоварни — в «Дальше», под таймером: места там хватает -->
    <BrewNextCard>
      <template v-if="step.measures.length" #default>
        <div class="text-xs font-medium tracking-wider text-dimmed uppercase">Замеры{{ SEP }}{{ step.name }}</div>
        <ul v-if="step.details.length" class="mt-2 space-y-1 text-base text-toned">
          <li v-for="d in step.details" :key="d">{{ d }}</li>
        </ul>
        <div class="mt-3 flex flex-wrap gap-x-8 gap-y-3">
          <BrewDayMeasureInput v-for="m in step.measures" :key="m" :brew-id="brew.id" :kind="m" :last="measures.get(m)" :hint="hintOf(m)" @saved="measured" />
        </div>
      </template>
    </BrewNextCard>
  </div>

  <!-- две карточки, как «Варка» и «Журнал» ниже: слева шаг, справа таймер или замеры -->
  <div v-else class="grid gap-4 sm:gap-6" :class="aside && 'xl:grid-cols-[minmax(0,1fr)_24rem]'">
    <UCard :ui="{ body: 'p-5 sm:p-6' }" class="ring-1 ring-primary/40">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-xl font-semibold text-highlighted">Сейчас</h2>
          <div class="flex flex-wrap items-center gap-2 text-sm text-muted">
            <UBadge :label="`шаг ${view.current + 1} из ${view.steps.length}`" color="primary" variant="subtle" />
            <span v-if="step.at != null">начат в {{ fmtTime(step.at) }}</span>
          </div>
        </div>
      </template>
      <div class="text-3xl font-semibold text-highlighted">
        {{ step.name }}<span v-if="stepLine(step)" class="ms-3 text-xl font-normal whitespace-nowrap text-muted">{{ stepLine(step) }}</span>
      </div>
      <div v-if="liveTemp != null" class="mt-1 flex items-baseline gap-2 text-xl">
        <span class="text-muted">сейчас</span>
        <span class="num font-semibold text-highlighted">{{ fmtTemp(liveTemp) }} °C</span>
      </div>
      <ul v-if="step.details.length" class="mt-2 space-y-1 text-base text-toned">
        <li v-for="d in step.details" :key="d">{{ d }}</li>
      </ul>
      <ol v-if="step.additions.length" class="mt-3 space-y-1">
        <li v-for="a in step.additions" :key="a.minutes" class="flex items-baseline gap-3 text-base">
          <span class="num w-16 shrink-0 font-semibold text-highlighted">{{ additionWhen(a.minutes, step.minutes) }}</span>
          <span class="text-toned">{{ a.label }}</span>
        </li>
      </ol>
      <div v-if="next" class="mt-3 text-base text-muted">
        дальше — <span class="text-highlighted">{{ next.name }}</span><template v-if="stepLine(next)">{{ ` ${stepLine(next)}` }}</template>
      </div>

      <!-- пивоварня: программу надо загрузить — пока она в простое, шаги до старта проходим рукой -->
      <div v-if="breweryIdle && !loaded" class="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-elevated/60 px-4 py-3">
        <UIcon name="i-lucide-plug" class="size-5 text-primary" />
        <span class="min-w-0 flex-1 text-base text-toned">Программа партии ещё не в пивоварне</span>
        <UBadge :color="brewery.status.tone" variant="soft" :label="brewery.status.label" />
        <UTooltip :text="uploadHint">
          <UButton label="Загрузить" icon="i-lucide-upload" size="lg" :loading="pending" :disabled="!brewery.online || programActive" @click="upload" />
        </UTooltip>
      </div>

      <UButton
        :label="step.kind === 'pitch' ? 'Дрожжи заданы' : next ? `Дальше: ${next.name}` : 'Готово'"
        :icon="step.kind === 'pitch' ? 'i-lucide-microscope' : 'i-lucide-check'"
        size="xl"
        class="mt-5"
        :class="(!step.minutes || over) && 'call-pulse'"
        :loading="pending || advancing"
        @click="advance"
      />
    </UCard>

    <div v-if="step.minutes || step.measures.length" class="flex flex-col gap-4 sm:gap-6">
      <UCard v-if="step.minutes" :ui="{ body: 'p-5 sm:p-6' }">
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="text-xl font-semibold text-highlighted">Таймер</h2>
            <span class="flex items-center gap-1.5 text-sm text-muted"><UIcon name="i-lucide-bell" class="size-4" />{{ over ? 'время вышло' : 'напомним' }}</span>
          </div>
        </template>
        <div class="num text-6xl font-semibold tracking-tight" :class="over ? 'text-warning' : 'text-highlighted'">
          {{ remaining != null ? (over ? '+' : '') + fmtDuration(Math.abs(remaining)) : fmtMinutes(step.minutes) }}
        </div>
        <UProgress v-if="progress != null" :model-value="Math.round(progress)" size="sm" :color="over ? 'warning' : 'primary'" class="mt-3" />
        <div v-if="step.at != null && step.ends != null" class="num mt-2 text-sm text-muted">
          {{ fmtTime(step.at) }} → {{ fmtTime(step.ends) }}
        </div>
      </UCard>
      <!-- замеры шага — и под таймером паузы (pH на первой паузе) -->
      <UCard v-if="step.measures.length" :ui="{ body: 'p-5 sm:p-6' }">
        <template #header>
          <h2 class="text-xl font-semibold text-highlighted">Замеры</h2>
        </template>
        <div class="flex flex-col gap-3">
          <BrewDayMeasureInput v-for="m in step.measures" :key="m" :brew-id="brew.id" :kind="m" :last="measures.get(m)" :hint="hintOf(m)" @saved="measured" />
        </div>
      </UCard>
    </div>
    <BrewNextCard v-else-if="breweryIdle && loaded" class="h-full" />
  </div>
</template>
