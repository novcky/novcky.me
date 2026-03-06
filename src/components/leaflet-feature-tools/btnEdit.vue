<script setup lang="ts">
import type * as L from 'leaflet'
import { computed, inject, ref, watch } from 'vue'

import { FEATURE_TOOLS_INJECTION_KEY } from './context'
import { extractGeometry } from './tools/geojson'
import { ensureGeoman } from './tools/geoman'

const emit = defineEmits<{
  close: []
}>()

const featureTools = inject(FEATURE_TOOLS_INJECTION_KEY)
if (!featureTools)
  throw new Error('featureTools context 未注入')

const componentName = 'BtnEdit'
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

function handleActivate() {
  if (!ensureGeoman(featureTools.pm.value, featureTools.notify, '编辑'))
    return

  if (!featureTools.curFeatures.value[0]) {
    featureTools.notify('warning', '请先选择要编辑的图斑')
    handleDeactivate()
    return
  }

  featureTools.setEnableMapClickEvents(false)
  setSelectedLayersEditing(true)
}

function handleDeactivate() {
  featureTools.setEnableMapClickEvents(true)
  emit('close')
}

function handleReset() {
  setSelectedLayersEditing(false)
  featureTools.clearPolygonGroup()
  if (featureTools.curFeatures.value[0])
    featureTools.drawFeature(featureTools.curFeatures.value[0])
  isLoading.value = false
}

function setSelectedLayersEditing(enabled: boolean) {
  const layers = featureTools.polygonGroup.getLayers()
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
  const targetFeature = featureTools.curFeatures.value[0]
  if (!targetFeature) {
    featureTools.notify('warning', '请先选择要编辑的图斑')
    return
  }

  const layers = featureTools.polygonGroup.getLayers()
  if (layers.length < 1 || !('toGeoJSON' in layers[0])) {
    featureTools.notify('warning', '未检测到可提交的编辑结果')
    return
  }

  const geometry = extractGeometry(layers[0].toGeoJSON())
  if (!geometry) {
    featureTools.notify('error', '编辑结果不是有效多边形')
    return
  }

  isLoading.value = true
  const { status, data } = await featureTools.repository.updateFeatureGeometry(targetFeature.id, geometry)
  if (status === 200 && data.includes('wfs:SUCCESS')) {
    featureTools.notify('success', '编辑成功')
    featureTools.reloadLayer()
    handleDeactivate()
  }
  else {
    featureTools.notify('error', '编辑失败')
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
        <path
          fill="currentColor"
          d="m16.9 3.25 3.85 3.85a1.75 1.75 0 0 1 0 2.47l-9.66 9.66a2.5 2.5 0 0 1-1.1.63l-4.44 1.27a.75.75 0 0 1-.93-.93l1.27-4.44a2.5 2.5 0 0 1 .63-1.1l9.66-9.66a1.75 1.75 0 0 1 2.47 0Zm2.79 4.91-3.85-3.85a.25.25 0 0 0-.35 0l-1.81 1.81 4.2 4.2 1.81-1.81a.25.25 0 0 0 0-.35Zm-2.87 3.22-4.2-4.2-5.04 5.04a1 1 0 0 0-.26.45l-1 3.49 3.49-1a1 1 0 0 0 .45-.26l6.56-6.56Z"
        />
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
