<script setup lang="ts">
import type { EntryKind } from '@hoplab/core'
// Поле плотности замера: значение — только через калькулятор (ареометр с температурой пробы, рефрактометр с WCF),
// чтобы поправки не забывались; показывает плотность в единицах пивовара. picked — значение выбрано.

const props = defineProps<{ kind: EntryKind; placeholder?: string }>()
const value = defineModel<number | null>({ default: null })   // в единицах пивовара: °P или SG
const emit = defineEmits<{ picked: [] }>()
const prefs = usePreferencesStore()

const shown = computed(() => (value.value == null ? props.placeholder ?? '—' : fixed(value.value, prefs.gravityUnit === 'plato' ? 1 : 3)))

function picked(sg: number) {
  value.value = fromStored(props.kind, sg, prefs.gravityUnit)
  emit('picked')
}
</script>

<template>
  <BrewDayGravityHelper :kind="kind" @use="picked">
    <UButton
      color="neutral"
      variant="outline"
      size="lg"
      trailing-icon="i-lucide-calculator"
      class="w-32 justify-between"
      :class="value == null && 'text-dimmed'"
      :ui="{ label: 'num' }"
      :label="shown"
      :aria-label="`${ENTRY_KINDS[kind].label}: ввести показание прибора`"
    />
  </BrewDayGravityHelper>
</template>
