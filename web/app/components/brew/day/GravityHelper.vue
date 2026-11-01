<script setup lang="ts">
// Пересчёт показания прибора в плотность для записи: ареометр — с поправкой на температуру пробы (откалиброван на
// 20 °C), рефрактометр — Brix с поправкой на сусло (WCF; только несброженное — в пиве спирт искажает показание).
// «Подставить» — значение уходит в поле замера и записывается. Прибор запоминается. Кнопка, которая открывает
// калькулятор, — слот (по умолчанию — значок калькулятора).
import type { EntryKind } from '~/utils/brewlog'

const props = defineProps<{ kind: EntryKind }>()
const emit = defineEmits<{ use: [sg: number] }>()
const prefs = usePreferencesStore()

const open = ref(false)
const canRefract = computed(() => UNFERMENTED.has(props.kind))
type Instrument = 'hydrometer' | 'refractometer'
const mode = ref<Instrument>('hydrometer')
const MODES = [{ label: 'Ареометр', value: 'hydrometer' }, { label: 'Рефрактометр', value: 'refractometer' }]
// поля — текстом: результат пересчитывается на каждый символ (числовое поле отдаёт значение только на blur)
const readingText = ref('')
const sampleText = ref('20')
const wcfText = ref(String(Number(prefs.wcf) || DEFAULT_WCF).replace('.', ','))
const num = (t: string) => {
  const n = Number(t.trim().replace(',', '.'))
  return t.trim() === '' || !Number.isFinite(n) ? null : n
}
const reading = computed(() => num(readingText.value))
const sampleC = computed(() => num(sampleText.value))
const wcf = computed(() => num(wcfText.value))
const plato = computed(() => prefs.gravityUnit === 'plato')

const result = computed(() => {
  const r = reading.value
  if (r == null) return null
  if (mode.value === 'refractometer') {
    return wcf.value && wcf.value >= 0.9 && wcf.value <= 1.2 && r > 0 && r < 40 ? sgFromPlato(refractometerPlato(r, wcf.value)) : null
  }
  const sg = plato.value ? sgFromPlato(r) : r
  const t = sampleC.value
  return sg > 0.98 && sg < 1.2 && t != null && t >= 0 && t <= 80 ? hydrometerSg(sg, t) : null
})

watch(open, (on) => {
  if (!on) return
  readingText.value = ''
  mode.value = canRefract.value && prefs.gravityInstrument === 'refractometer' ? 'refractometer' : 'hydrometer'
})

function use() {
  if (result.value == null) return
  if (mode.value === 'refractometer' && wcf.value) prefs.wcf = String(wcf.value)
  if (canRefract.value) prefs.gravityInstrument = mode.value
  emit('use', result.value)
  open.value = false
}
</script>

<template>
  <UPopover v-model:open="open">
    <slot>
      <UButton icon="i-lucide-calculator" color="neutral" variant="ghost" size="lg" aria-label="Пересчитать показание прибора" />
    </slot>
    <template #content>
      <form class="w-72 space-y-3 p-4" @submit.prevent="use">
        <UTabs v-if="canRefract" v-model="mode" :items="MODES" :content="false" size="sm" class="w-full" />
        <UFormField :label="mode === 'refractometer' ? 'Показание, Brix' : `Показание, ${plato ? '°P' : 'SG'}`">
          <UInput v-model="readingText" inputmode="decimal" placeholder="—" size="lg" class="w-full" :ui="{ base: 'num' }" autofocus />
        </UFormField>
        <UFormField v-if="mode === 'hydrometer'" label="Температура пробы, °C">
          <UInput v-model="sampleText" inputmode="decimal" size="lg" class="w-full" :ui="{ base: 'num' }" />
        </UFormField>
        <UFormField v-else label="Поправка на сусло (WCF)" hint="обычно 1,04">
          <UInput v-model="wcfText" inputmode="decimal" size="lg" class="w-full" :ui="{ base: 'num' }" />
        </UFormField>
        <div class="num text-lg" :class="result == null ? 'text-dimmed' : 'text-highlighted'">
          = {{ result == null ? '—' : fmtGravity(result, prefs.gravityUnit) }}
        </div>
        <UButton type="submit" label="Подставить" icon="i-lucide-check" size="lg" block :disabled="result == null" />
      </form>
    </template>
  </UPopover>
</template>
