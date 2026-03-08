<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'

import { LEAFLET_FEATURE_TOOLS_INJECTION_KEY } from '../featureToolsContext'

const emit = defineEmits<{
  close: []
}>()

const featureToolsContext = inject(LEAFLET_FEATURE_TOOLS_INJECTION_KEY)
if (!featureToolsContext)
  throw new Error('LeafletFeatureToolsContext 未注入')

const toolKey = 'delete'
const isLoading = ref(false)
const isActive = computed(() => featureToolsContext.activeToolKey.value === toolKey)

watch(
  () => isActive.value,
  (newValue) => {
    if (newValue)
      handleActivate()
    else
      handleReset()
  },
)

async function handleActivate() {
  featureToolsContext.setMapSelectionEnabled(false)
  const confirmed = await featureToolsContext.confirm('是否移除该要素？移除后不可恢复。')
  if (!confirmed) {
    handleDeactivate()
    return
  }

  await handleSubmit()
}

function handleDeactivate() {
  featureToolsContext.setMapSelectionEnabled(true)
  emit('close')
}

function handleReset() {
  isLoading.value = false
}

async function handleSubmit() {
  const targetFeature = featureToolsContext.selectedFeatures.value[0]
  if (!targetFeature) {
    featureToolsContext.notify('warning', '请先选择要删除的图斑')
    handleDeactivate()
    return
  }

  isLoading.value = true
  const { status, data } = await featureToolsContext.repository.deleteFeatures([targetFeature.id])
  if (status === 200 && data.includes('wfs:SUCCESS')) {
    featureToolsContext.notify('success', '删除成功')
    featureToolsContext.reloadLayer()
  }
  else {
    featureToolsContext.notify('error', '删除失败')
  }

  handleDeactivate()
}
</script>

<template>
  <div>
    <span
      class="tool-icon"
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24">
        <path d="M4.5 7h15" />
        <path d="M9.5 4.75h5" />
        <path d="M8 7l.75 11.25A1.75 1.75 0 0 0 10.5 20h3A1.75 1.75 0 0 0 15.25 18.25L16 7" />
        <path d="M10 10.25v5.5" />
        <path d="M14 10.25v5.5" />
      </svg>
    </span>
    <span class="tool-label">移除</span>
  </div>
</template>
