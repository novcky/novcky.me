<script setup lang="ts">
import * as L from 'leaflet'
import { computed, inject, ref, watch } from 'vue'

import { LEAFLET_FEATURE_TOOLS_INJECTION_KEY } from '../featureToolsContext'

const emit = defineEmits<{
  close: []
}>()

const featureToolsContext = inject(LEAFLET_FEATURE_TOOLS_INJECTION_KEY)
if (!featureToolsContext)
  throw new Error('LeafletFeatureToolsContext 未注入')

const toolKey = 'merge'
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

function handleActivate() {
  featureToolsContext.setMultiSelectMode(true)

  if (featureToolsContext.selectedFeatures.value[0]) {
    const { id } = featureToolsContext.selectedFeatures.value[0]
    const polygon = featureToolsContext.polygonGroup.getLayers()[0]
    if (polygon) {
      polygon.on('click', (event) => {
        L.DomEvent.stopPropagation(event)
        polygon.remove()
        featureToolsContext.polygonGroup.removeLayer(polygon)
        featureToolsContext.selectedFeatures.value = featureToolsContext.selectedFeatures.value.filter(item => item.id !== id)
      })
    }
  }
}

function handleDeactivate() {
  featureToolsContext.setMultiSelectMode(false)
  emit('close')
}

function handleReset() {
  featureToolsContext.clearPolygonGroup()
  isLoading.value = false
}

async function handleSubmit() {
  const layers = featureToolsContext.polygonGroup.getLayers()
  if (layers.length < 2) {
    featureToolsContext.notify('warning', '请至少选择两个要素')
    return
  }

  isLoading.value = true
  const { mergeResult, message } = featureToolsContext.mergePolygon(layers)
  if (!mergeResult) {
    featureToolsContext.notify('error', message ?? '合并失败')
    isLoading.value = false
    return
  }

  const mainFeatureId = featureToolsContext.selectedFeatures.value[0]?.id
  if (!mainFeatureId) {
    featureToolsContext.notify('error', '缺少主要素，无法提交')
    isLoading.value = false
    return
  }

  // 先更新保留要素，再删除其他要素，避免中途失败时出现整批要素被删空的风险。
  const updateResult = await featureToolsContext.repository.updateFeatureGeometry(mainFeatureId, mergeResult.geometry)
  if (updateResult.status !== 200 || !updateResult.data.includes('wfs:SUCCESS')) {
    featureToolsContext.notify('error', '合并失败')
    isLoading.value = false
    return
  }

  const otherIds = featureToolsContext.selectedFeatures.value.slice(1).map(item => item.id)
  if (otherIds.length > 0) {
    const deleteResult = await featureToolsContext.repository.deleteFeatures(otherIds)
    if (deleteResult.status !== 200 || !deleteResult.data.includes('wfs:SUCCESS'))
      featureToolsContext.notify('warning', '合并成功，但清理旧要素失败')
  }

  featureToolsContext.notify('success', '合并成功')
  featureToolsContext.reloadLayer()
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
        <circle cx="9.25" cy="12" r="4" />
        <circle cx="14.75" cy="12" r="4" />
        <path d="M9.75 8.75c.92.94 1.38 2.02 1.38 3.25s-.46 2.31-1.38 3.25" />
      </svg>
    </span>
    <span class="tool-label">合并</span>

    <div
      v-show="isActive"
      class="operation-panel"
      @click.stop
    >
      <n-button
        class="operation-btn operation-btn-cancel"
        :disabled="isLoading"
        size="small"
        @click="handleDeactivate"
      >
        取消
      </n-button>
      <n-button
        class="operation-btn operation-btn-submit"
        :loading="isLoading"
        size="small"
        type="primary"
        @click="handleSubmit"
      >
        提交
      </n-button>
    </div>
  </div>
</template>
