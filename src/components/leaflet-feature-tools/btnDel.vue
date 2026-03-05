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
    <span class="tool-icon">🗑</span>
    <span>移除</span>
  </div>
</template>
