<script setup lang="ts">
import * as L from 'leaflet'
import { computed, inject, ref, watch } from 'vue'

import { LEAFLET_FEATURE_TOOLS_INJECTION_KEY } from '../featureToolsContext'
import { extractGeometry } from '../tools/geojson'
import {
  clearDrawLayers,
  ensureGeoman,
} from '../tools/geoman'

const emit = defineEmits<{
  close: []
}>()

const featureToolsContext = inject(LEAFLET_FEATURE_TOOLS_INJECTION_KEY)
if (!featureToolsContext)
  throw new Error('LeafletFeatureToolsContext 未注入')

const toolKey = 'split'
const clipResultLayer = ref<L.GeoJSON | null>(null)
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
  if (!featureToolsContext.map.value)
    return
  if (!ensureGeoman(featureToolsContext.pm.value, featureToolsContext.notify, '切割'))
    return

  featureToolsContext.setMapSelectionEnabled(false)
  clipResultLayer.value = clipResultLayer.value ?? L.geoJSON(null).addTo(featureToolsContext.map.value)

  featureToolsContext.pm.value?.enableDraw?.('Line', {
    snappable: true,
    snapDistance: 10,
    allowSelfIntersection: false,
    templineStyle: {
      dashArray: [5, 5],
    },
    pathOptions: {
      dashArray: [5, 5],
    },
  })

  featureToolsContext.map.value.on('pm:create', splitFeatures)
}

function handleDeactivate() {
  featureToolsContext.setMapSelectionEnabled(true)
  emit('close')
}

function handleReset() {
  clipResultLayer.value?.clearLayers()
  featureToolsContext.pm.value?.disableDraw?.()
  clearDrawLayers(featureToolsContext.pm.value)
  featureToolsContext.map.value?.off('pm:create', splitFeatures)
  featureToolsContext.clearPolygonGroup()
  isLoading.value = false
}

function splitFeatures(event: L.LeafletEvent) {
  if (!clipResultLayer.value)
    return

  const targetFeature = featureToolsContext.selectedFeatures.value[0]
  if (!targetFeature) {
    featureToolsContext.notify('warning', '请先选择待切割图斑')
    return
  }

  clipResultLayer.value.clearLayers()
  const clipLine = (event as L.LeafletEvent & { layer: L.Polyline }).layer
  const { resultLayers, msg } = featureToolsContext.splitPolygon(
    {
      type: 'Feature',
      geometry: targetFeature.geometry,
      properties: targetFeature.properties,
    },
    clipLine,
  )

  if (msg) {
    featureToolsContext.notify('error', msg)
    return
  }

  resultLayers?.forEach((resultLayer) => {
    clipResultLayer.value?.addLayer(resultLayer)
  })
}

async function handleSubmit() {
  if (!clipResultLayer.value) {
    featureToolsContext.notify('warning', '请先执行切割')
    return
  }

  isLoading.value = true
  const geometries = clipResultLayer.value.getLayers()
    .flatMap((layer) => {
      if (!('toGeoJSON' in layer))
        return []
      const geometry = extractGeometry(layer.toGeoJSON())
      return geometry ? [geometry] : []
    })

  if (geometries.length < 2) {
    featureToolsContext.notify('warning', '请先完成有效切割')
    isLoading.value = false
    return
  }

  const mainFeatureId = featureToolsContext.selectedFeatures.value[0]?.id
  if (!mainFeatureId) {
    featureToolsContext.notify('error', '缺少主图斑，无法提交')
    isLoading.value = false
    return
  }

  // 先新增其余切割片段，再更新主图斑，失败时至少可以保持原图斑可回滚。
  const appendPayload = geometries.slice(1).map(geometry => ({
    geometry,
    properties: featureToolsContext.selectedFeatures.value[0]?.properties,
  }))

  if (appendPayload.length > 0) {
    const addResult = await featureToolsContext.repository.addFeatures(appendPayload)
    if (addResult.status !== 200 || !addResult.data.includes('wfs:SUCCESS')) {
      featureToolsContext.notify('error', '切割提交失败（新增片段失败）')
      isLoading.value = false
      return
    }
  }

  const updateResult = await featureToolsContext.repository.updateFeatureGeometry(mainFeatureId, geometries[0])
  if (updateResult.status === 200 && updateResult.data.includes('wfs:SUCCESS')) {
    featureToolsContext.notify('success', '切割成功')
    featureToolsContext.reloadLayer()
    handleDeactivate()
  }
  else {
    featureToolsContext.notify('warning', '切割片段已新增，但主图斑更新失败')
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
        <circle cx="7.25" cy="7.5" r="2.25" />
        <circle cx="7.25" cy="16.5" r="2.25" />
        <path d="M20 5.5 9.2 11.2" />
        <path d="M20 18.5 9.2 12.8" />
      </svg>
    </span>
    <span class="tool-label">切割</span>

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
