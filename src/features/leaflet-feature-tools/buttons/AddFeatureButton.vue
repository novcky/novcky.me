<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'

import { LEAFLET_FEATURE_TOOLS_INJECTION_KEY } from '../featureToolsContext'
import { extractGeometry } from '../tools/geojson'
import {
  clearDrawLayers,
  ensureGeoman,
  getDrawLayers,
} from '../tools/geoman'

const emit = defineEmits<{
  close: []
}>()

const featureToolsContext = inject(LEAFLET_FEATURE_TOOLS_INJECTION_KEY)
if (!featureToolsContext)
  throw new Error('LeafletFeatureToolsContext 未注入')

const toolKey = 'add'
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
  if (!ensureGeoman(featureToolsContext.pm.value, featureToolsContext.notify, '新增'))
    return

  featureToolsContext.setMapSelectionEnabled(false)
  featureToolsContext.clearPolygonGroup()
  featureToolsContext.pm.value?.enableDraw?.('Polygon')
}

function handleDeactivate() {
  featureToolsContext.setMapSelectionEnabled(true)
  emit('close')
}

function handleReset() {
  featureToolsContext.pm.value?.disableDraw?.()
  clearDrawLayers(featureToolsContext.pm.value)
  isLoading.value = false
}

async function handleSubmit() {
  const layers = getDrawLayers(featureToolsContext.pm.value)
  if (layers.length < 1) {
    featureToolsContext.notify('warning', '请先绘制图形')
    return
  }

  const geometry = extractGeometry(layers[0].toGeoJSON())
  if (!geometry) {
    featureToolsContext.notify('error', '绘制结果不是有效多边形')
    return
  }

  isLoading.value = true
  const { status, data } = await featureToolsContext.repository.addFeatures([
    {
      geometry,
      properties: {
        QYMC: 'New Feature',
      },
    },
  ])

  if (status === 200 && data.includes('wfs:SUCCESS')) {
    featureToolsContext.notify('success', '新增成功')
    featureToolsContext.reloadLayer()
    handleDeactivate()
  }
  else {
    featureToolsContext.notify('error', '新增失败')
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
        <path d="M12 6v12" />
        <path d="M6 12h12" />
      </svg>
    </span>
    <span class="tool-label">新增</span>

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
