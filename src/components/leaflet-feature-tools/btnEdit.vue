<script setup lang="ts">
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

  featureTools.setEnableMapClickEvents(false)
  featureTools.pm.value?.enableGlobalEditMode?.()
}

function handleDeactivate() {
  featureTools.setEnableMapClickEvents(true)
  emit('close')
}

function handleReset() {
  featureTools.pm.value?.disableGlobalEditMode?.()
  featureTools.clearPolygonGroup()
  if (featureTools.curFeatures.value[0])
    featureTools.drawFeature(featureTools.curFeatures.value[0])
  isLoading.value = false
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
    <span class="tool-icon">✎</span>
    <span>编辑</span>

    <div
      v-show="isActive"
      class="operation-panel"
      @click.stop
    >
      <button
        type="button"
        class="operation-btn operation-btn-cancel"
        :disabled="isLoading"
        @click="handleDeactivate"
      >
        取 消
      </button>
      <button
        type="button"
        class="operation-btn operation-btn-submit"
        :disabled="isLoading"
        @click="handleSubmit"
      >
        {{ isLoading ? '提交中...' : '提 交' }}
      </button>
    </div>
  </div>
</template>
