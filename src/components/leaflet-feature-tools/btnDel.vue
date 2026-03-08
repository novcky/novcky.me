<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'

import { FEATURE_TOOLS_INJECTION_KEY } from './context'

const emit = defineEmits<{
  close: []
}>()

const featureTools = inject(FEATURE_TOOLS_INJECTION_KEY)
if (!featureTools)
  throw new Error('featureTools context 未注入')

const componentName = 'BtnDel'
const isLoading = ref(false)
const isActive = computed(() => featureTools.activeComponent.value === componentName)

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
  featureTools.setEnableMapClickEvents(false)
  const confirmed = await featureTools.confirm('是否移除该要素？移除后不可恢复。')
  if (!confirmed) {
    handleDeactivate()
    return
  }

  await handleSubmit()
}

function handleDeactivate() {
  featureTools.setEnableMapClickEvents(true)
  emit('close')
}

function handleReset() {
  isLoading.value = false
}

async function handleSubmit() {
  const targetFeature = featureTools.curFeatures.value[0]
  if (!targetFeature) {
    featureTools.notify('warning', '请先选择要删除的图斑')
    handleDeactivate()
    return
  }

  isLoading.value = true
  const { status, data } = await featureTools.repository.deleteFeatures([targetFeature.id])
  if (status === 200 && data.includes('wfs:SUCCESS')) {
    featureTools.notify('success', '删除成功')
    featureTools.reloadLayer()
  }
  else {
    featureTools.notify('error', '删除失败')
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
