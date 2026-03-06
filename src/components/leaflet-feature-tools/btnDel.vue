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
        <path
          fill="currentColor"
          d="M10 3.75a1.75 1.75 0 0 0-1.75 1.75v.75H6a.75.75 0 0 0 0 1.5h.32l.8 11.08A2.25 2.25 0 0 0 9.37 21h5.26a2.25 2.25 0 0 0 2.25-2.17l.8-11.08H18a.75.75 0 0 0 0-1.5h-2.25V5.5A1.75 1.75 0 0 0 14 3.75h-4Zm4.25 2.5h-4.5V5.5a.25.25 0 0 1 .25-.25h4a.25.25 0 0 1 .25.25v.75Zm-5.93 1.5.8 11.01a.75.75 0 0 0 .75.74h5.26a.75.75 0 0 0 .75-.74l.8-11.01H8.32Zm2.93 1.75c.41 0 .75.34.75.75v6a.75.75 0 1 1-1.5 0v-6c0-.41.34-.75.75-.75Zm2.75 0c.41 0 .75.34.75.75v6a.75.75 0 0 1-1.5 0v-6c0-.41.34-.75.75-.75Z"
        />
      </svg>
    </span>
    <span class="tool-label">移除</span>
  </div>
</template>
