<script setup lang="ts">
import * as L from 'leaflet'
import { computed, inject, ref, watch } from 'vue'

import { FEATURE_TOOLS_INJECTION_KEY } from './context'
import { extractGeometry } from './tools/geojson'
import {
  clearDrawLayers,
  ensureGeoman,
} from './tools/geoman'

const emit = defineEmits<{
  close: []
}>()

const featureTools = inject(FEATURE_TOOLS_INJECTION_KEY)
if (!featureTools)
  throw new Error('featureTools context 未注入')

const componentName = 'BtnSplit'
const clipResultLayer = ref<L.GeoJSON | null>(null)
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
  if (!featureTools.map.value)
    return
  if (!ensureGeoman(featureTools.pm.value, featureTools.notify, '切割'))
    return

  featureTools.setEnableMapClickEvents(false)
  clipResultLayer.value = clipResultLayer.value ?? L.geoJSON(null).addTo(featureTools.map.value)

  featureTools.pm.value?.enableDraw?.('Line', {
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

  featureTools.map.value.on('pm:create', splitFeatures)
}

function handleDeactivate() {
  featureTools.setEnableMapClickEvents(true)
  emit('close')
}

function handleReset() {
  clipResultLayer.value?.clearLayers()
  featureTools.pm.value?.disableDraw?.()
  clearDrawLayers(featureTools.pm.value)
  featureTools.map.value?.off('pm:create', splitFeatures)
  featureTools.clearPolygonGroup()
  isLoading.value = false
}

function splitFeatures(event: L.LeafletEvent) {
  if (!clipResultLayer.value)
    return

  const targetFeature = featureTools.curFeatures.value[0]
  if (!targetFeature) {
    featureTools.notify('warning', '请先选择待切割图斑')
    return
  }

  clipResultLayer.value.clearLayers()
  const clipLine = (event as L.LeafletEvent & { layer: L.Polyline }).layer
  const { resultLayers, msg } = featureTools.splitPolygon(
    {
      type: 'Feature',
      geometry: targetFeature.geometry,
      properties: targetFeature.properties,
    },
    clipLine,
  )

  if (msg) {
    featureTools.notify('error', msg)
    return
  }

  resultLayers?.forEach((resultLayer) => {
    clipResultLayer.value?.addLayer(resultLayer)
  })
}

async function handleSubmit() {
  if (!clipResultLayer.value) {
    featureTools.notify('warning', '请先执行切割')
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
    featureTools.notify('warning', '请先完成有效切割')
    isLoading.value = false
    return
  }

  const mainFeatureId = featureTools.curFeatures.value[0]?.id
  if (!mainFeatureId) {
    featureTools.notify('error', '缺少主图斑，无法提交')
    isLoading.value = false
    return
  }

  // 先新增其余切割片段，再更新主图斑，失败时至少可以保持原图斑可回滚。
  const appendPayload = geometries.slice(1).map(geometry => ({
    geometry,
    properties: featureTools.curFeatures.value[0]?.properties,
  }))

  if (appendPayload.length > 0) {
    const addResult = await featureTools.repository.addFeatures(appendPayload)
    if (addResult.status !== 200 || !addResult.data.includes('wfs:SUCCESS')) {
      featureTools.notify('error', '切割提交失败（新增片段失败）')
      isLoading.value = false
      return
    }
  }

  const updateResult = await featureTools.repository.updateFeatureGeometry(mainFeatureId, geometries[0])
  if (updateResult.status === 200 && updateResult.data.includes('wfs:SUCCESS')) {
    featureTools.notify('success', '切割成功')
    featureTools.reloadLayer()
    handleDeactivate()
  }
  else {
    featureTools.notify('warning', '切割片段已新增，但主图斑更新失败')
    isLoading.value = false
  }
}
</script>

<template>
  <div>
    <span class="tool-icon">✂</span>
    <span>切割</span>

    <div
      v-show="isActive"
      class="operation-panel"
      @click.stop
    >
      <n-button
        class="operation-btn operation-btn-cancel"
        :disabled="isLoading"
        quaternary
        size="small"
        @click="handleDeactivate"
      >
        取 消
      </n-button>
      <n-button
        class="operation-btn operation-btn-submit"
        :loading="isLoading"
        size="small"
        type="primary"
        @click="handleSubmit"
      >
        提 交
      </n-button>
    </div>
  </div>
</template>
