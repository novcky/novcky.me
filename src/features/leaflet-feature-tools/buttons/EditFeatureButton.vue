<script setup lang="ts">
import type * as L from 'leaflet'
import { computed, inject, ref, watch } from 'vue'

import { LEAFLET_FEATURE_TOOLS_INJECTION_KEY } from '../featureToolsContext'
import { extractGeometry } from '../tools/geojson'
import { ensureGeoman } from '../tools/geoman'

const emit = defineEmits<{
  close: []
}>()

const featureToolsContext = inject(LEAFLET_FEATURE_TOOLS_INJECTION_KEY)
if (!featureToolsContext)
  throw new Error('LeafletFeatureToolsContext 未注入')

const toolKey = 'edit'
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
  if (!ensureGeoman(featureToolsContext.pm.value, featureToolsContext.notify, '编辑'))
    return

  if (!featureToolsContext.selectedFeatures.value[0]) {
    featureToolsContext.notify('warning', '请先选择要编辑的图斑')
    handleDeactivate()
    return
  }

  featureToolsContext.setMapSelectionEnabled(false)
  setSelectedLayersEditing(true)
}

function handleDeactivate() {
  featureToolsContext.setMapSelectionEnabled(true)
  emit('close')
}

function handleReset() {
  setSelectedLayersEditing(false)
  featureToolsContext.clearPolygonGroup()
  if (featureToolsContext.selectedFeatures.value[0])
    featureToolsContext.drawFeature(featureToolsContext.selectedFeatures.value[0])
  isLoading.value = false
}

function setSelectedLayersEditing(enabled: boolean) {
  const layers = featureToolsContext.polygonGroup.getLayers()
  if (layers.length < 1)
    return

  layers.forEach((layer) => {
    const geomanLayer = layer as L.Layer & {
      pm?: {
        disable?: () => void
        enable?: (options?: Record<string, unknown>) => void
      }
    }

    if (!geomanLayer.pm)
      return

    if (enabled) {
      // 编辑只作用于当前选中的要素，避免误触把整个图层都置为可编辑状态。
      geomanLayer.pm.enable?.({
        allowEditing: true,
        allowRotation: false,
        allowScale: false,
        draggable: false,
      })
      return
    }

    geomanLayer.pm.disable?.()
  })
}

async function handleSubmit() {
  const targetFeature = featureToolsContext.selectedFeatures.value[0]
  if (!targetFeature) {
    featureToolsContext.notify('warning', '请先选择要编辑的图斑')
    return
  }

  const layers = featureToolsContext.polygonGroup.getLayers()
  if (layers.length < 1 || !('toGeoJSON' in layers[0])) {
    featureToolsContext.notify('warning', '未检测到可提交的编辑结果')
    return
  }

  const geometry = extractGeometry(layers[0].toGeoJSON())
  if (!geometry) {
    featureToolsContext.notify('error', '编辑结果不是有效多边形')
    return
  }

  isLoading.value = true
  const { status, data } = await featureToolsContext.repository.updateFeatureGeometry(targetFeature.id, geometry)
  if (status === 200 && data.includes('wfs:SUCCESS')) {
    featureToolsContext.notify('success', '编辑成功')
    featureToolsContext.reloadLayer()
    handleDeactivate()
  }
  else {
    featureToolsContext.notify('error', '编辑失败')
    isLoading.value = false
  }
}
</script>

<template>
  <div>
    <span
      class="tool-icon"
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24">
        <path d="M4.75 19.25 8.5 18l8.25-8.25a2 2 0 0 0-2.83-2.83L5.68 15.18 4.75 19.25Z" />
        <path d="m12.75 8.25 3 3" />
      </svg>
    </span>
    <span class="tool-label">编辑</span>

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
