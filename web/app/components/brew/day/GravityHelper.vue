<script setup lang="ts">
// Пересчёт показания прибора в плотность для записи: ареометр — с поправкой на температуру пробы (откалиброван на
// 20 °C), рефрактометр — Brix с поправкой на сусло (WCF; только несброженное — в пиве спирт искажает показание).
// «Подставить» — значение уходит в поле замера и записывается.
import type { EntryKind } from '~/utils/brewlog'

const props = defineProps<{ kind: EntryKind }>()
const emit = defineEmits<{ use: [sg: number] }>()
const prefs = usePreferencesStore()

const open = ref(false)
const canRefract = computed(() => UNFERMENTED.has(props.kind))
const mode = ref<'hydrometer' | 'refractometer'>('hydrometer')
const MODES = [{ label: 'Ареометр', value: 'hydrometer' }, { label: 'Рефрактометр', value: 'refractometer' }]
const reading = ref<number | null>(null)
const sampleC = ref<number | null>(20)
const wcf = ref<number | null>(Number(prefs.wcf) || DEFAULT_WCF)
const plato = computed(() => prefs.gravityUnit === 'plato')

const result = computed(() => {
  const r = reading.value
  if (r == null) return null
  if (mode.value === 'refractometer') return wcf.value ? sgFromPlato(refractometerPlato(r, wcf.value)) : null
  const sg = plato.value ? sgFromPlato(r) : r
  return sg > 0.98 && sampleC.value != null ? hydrometerSg(sg, sampleC.value) : null
})

watch(open, (on) => {
  if (!on) return
  reading.value = null
  if (!canRefract.value) mode.value = 'hydrometer'
})

function use() {
  if (result.value == null) return
  if (mode.value === 'refractometer' && wcf.value) prefs.wcf = String(wcf.value)
  emit('use', result.value)
  open.value = false
}
</script>

<template>
  <UPopover v-model:open="open">
    <UButton icon="i-lucide-calculator" color="neutral" variant="ghost" size="lg" aria-label="Пересчитать показание прибора" />
    <template #content>
      <form class="w-72 space-y-3 p-4" @submit.prevent="use">
        <UTabs v-if="canRefract" v-model="mode" :items="MODES" :content="false" size="sm" class="w-full" />
        <UFormField :label="mode === 'refractometer' ? 'Показание, Brix' : `Показание, ${plato ? '°P' : 'SG'}`">
          <UInputNumber
            v-model="reading"
            :min="mode === 'refractometer' || plato ? 0 : 0.98"
            :max="mode === 'refractometer' || plato ? 40 : 1.2"
            :step="mode === 'refractometer' || plato ? 0.1 : 0.001"
            :step-snapping="false"
            :format-options="{ maximumFractionDigits: mode === 'refractometer' || plato ? 1 : 3 }"
            :increment="false"
            :decrement="false"
            placeholder="—"
            size="lg"
            class="w-full"
            autofocus
          />
        </UFormField>
        <UFormField v-if="mode === 'hydrometer'" label="Температура пробы, °C">
          <UInputNumber v-model="sampleC" :min="0" :max="80" :step="0.5" :step-snapping="false" :increment="false" :decrement="false" size="lg" class="w-full" />
        </UFormField>
        <UFormField v-else label="Поправка на сусло (WCF)" hint="обычно 1,04">
          <UInputNumber v-model="wcf" :min="0.9" :max="1.2" :step="0.01" :step-snapping="false" :format-options="{ maximumFractionDigits: 2 }" :increment="false" :decrement="false" size="lg" class="w-full" />
        </UFormField>
        <div class="num text-lg" :class="result == null ? 'text-dimmed' : 'text-highlighted'">
          = {{ result == null ? '—' : fmtGravity(result, prefs.gravityUnit) }}
        </div>
        <UButton type="submit" label="Подставить" icon="i-lucide-check" size="lg" block :disabled="result == null" />
      </form>
    </template>
  </UPopover>
</template>
