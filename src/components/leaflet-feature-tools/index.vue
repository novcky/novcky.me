<script setup lang="ts">
import type {
  DemoFeature,
  FeatureRepository,
  GeomanInstance,
  NoticeType,
} from './context'
import * as L from 'leaflet'

import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import BtnAdd from './btnAdd.vue'
import BtnDel from './btnDel.vue'
import BtnEdit from './btnEdit.vue'
import BtnMerge from './btnMerge.vue'
import BtnSplit from './btnSplit.vue'
import {
  FEATURE_TOOLS_INJECTION_KEY,
} from './context'
import {
  clearDrawLayers,
  drawPolygon,
  mergePolygon,
  splitPolygon,
} from './tools'

const props = withDefaults(defineProps<{
  show?: boolean
  position?: L.ControlPosition
  map: L.Map | null
  repository: FeatureRepository
  layerName?: string
  notify?: (type: NoticeType, message: string) => void
  confirm?: (message: string) => Promise<boolean>
}>(), {
  show: true,
  position: 'bottomright',
  layerName: 'demo-layer',
})

const emit = defineEmits<{
  close: []
}>()

const components = [
  { key: 'BtnAdd', component: BtnAdd },
  { key: 'BtnEdit', component: BtnEdit },
  { key: 'BtnSplit', component: BtnSplit },
  { key: 'BtnMerge', component: BtnMerge },
  { key: 'BtnDel', component: BtnDel },
]

const activeComponent = ref('')
const curFeatures = ref<DemoFeature[]>([])
const isMultipleMode = ref(false)
const enableMapClickEvents = ref(true)
const isControlMounted = ref(false)
const operationPanelPlacement = ref<'left' | 'right' | 'top' | 'bottom'>('left')
const featureToolsContainerRef = ref<HTMLDivElement | null>(null)
const polygonGroup = L.featureGroup()
const featureToolsControl = L.control({ position: props.position })
let placementAnimationFrameId = 0

const map = computed(() => props.map)
const pm = computed(() => (map.value as (L.Map & { pm?: GeomanInstance }) | null)?.pm ?? null)
const curLayerName = computed(() => props.layerName)

function setActiveComponent(componentName = '') {
  activeComponent.value = componentName
}

function setMultipleMode(newValue: boolean) {
  isMultipleMode.value = newValue
}

function setEnableMapClickEvents(newValue: boolean) {
  enableMapClickEvents.value = newValue
}

function notify(type: NoticeType, message: string) {
  if (props.notify)
    props.notify(type, message)
}

async function confirmAction(message: string) {
  if (props.confirm)
    return props.confirm(message)

  notify('warning', `${message}（当前环境未接入确认弹窗，默认取消）`)
  return false
}

function componentClass(componentName: string) {
  if (activeComponent.value === '')
    return ''

  return activeComponent.value === componentName
    ? 'feature-tools-btn-active'
    : 'feature-tools-btn-disabled'
}

function scheduleOperationPanelPlacement() {
  if (placementAnimationFrameId)
    window.cancelAnimationFrame(placementAnimationFrameId)

  placementAnimationFrameId = window.requestAnimationFrame(() => {
    placementAnimationFrameId = 0
    updateOperationPanelPlacement()
  })
}

function updateOperationPanelPlacement() {
  if (!activeComponent.value || !featureToolsContainerRef.value)
    return

  const activeButton = featureToolsContainerRef.value.querySelector('.feature-tools-btn-active') as HTMLElement | null
  const operationPanel = activeButton?.querySelector('.operation-panel') as HTMLElement | null
  const mapContainer = map.value?.getContainer()
  if (!activeButton || !operationPanel || !mapContainer)
    return

  const safeGap = 8
  const buttonRect = activeButton.getBoundingClientRect()
  const panelRect = operationPanel.getBoundingClientRect()
  const mapRect = mapContainer.getBoundingClientRect()
  const panelWidth = Math.max(panelRect.width, 136)
  const panelHeight = Math.max(panelRect.height, 42)

  const leftSpace = buttonRect.left - mapRect.left - safeGap
  const rightSpace = mapRect.right - buttonRect.right - safeGap
  const topSpace = buttonRect.top - mapRect.top - safeGap
  const bottomSpace = mapRect.bottom - buttonRect.bottom - safeGap

  // 优先沿水平方向展开，只有在左右都放不下时才切换到上下，减少鼠标移动距离。
  if (leftSpace >= panelWidth || rightSpace >= panelWidth) {
    operationPanelPlacement.value = rightSpace > leftSpace ? 'right' : 'left'
    return
  }

  if (topSpace >= panelHeight || bottomSpace >= panelHeight) {
    operationPanelPlacement.value = bottomSpace > topSpace ? 'bottom' : 'top'
    return
  }

  operationPanelPlacement.value = rightSpace >= leftSpace ? 'right' : 'left'
}

function drawFeature(feature: DemoFeature) {
  const polygon = drawPolygon({
    geometry: feature.geometry,
    styleOptions: {
      color: '#ffffff',
      fillColor: '#ffffff',
      fillOpacity: 0.3,
    },
  })

  if (isMultipleMode.value) {
    polygon.on('click', (event) => {
      L.DomEvent.stopPropagation(event)
      polygon.remove()
      polygonGroup.removeLayer(polygon)
      curFeatures.value = curFeatures.value.filter(item => item.id !== feature.id)
    })
  }

  polygon.addTo(polygonGroup)
}

function clearPolygonGroup() {
  polygonGroup.eachLayer((layer) => {
    layer.remove()
    polygonGroup.removeLayer(layer)
  })

  curFeatures.value = []
}

function handleClickComponent(componentName: string) {
  if (!curLayerName.value) {
    notify('warning', '请先选择图层')
    return
  }

  if (activeComponent.value !== '') {
    notify('info', '请先完成当前操作或点击取消')
    return
  }

  const restrictedComponents = ['BtnEdit', 'BtnSplit', 'BtnDel']
  if (restrictedComponents.includes(componentName) && polygonGroup.getLayers().length < 1) {
    notify('warning', '请先选择要操作的要素')
    return
  }

  setActiveComponent(componentName)
  scheduleOperationPanelPlacement()
}

function handleCloseComponent() {
  setActiveComponent('')
}

function reloadLayer() {
  clearPolygonGroup()
  props.repository.reloadLayer()
}

async function onMapClick(event: L.LeafletMouseEvent) {
  if (!enableMapClickEvents.value)
    return

  const feature = await props.repository.queryByPoint(event.latlng)
  if (!feature)
    return

  if (curFeatures.value.some(item => item.id === feature.id))
    return

  if (isMultipleMode.value) {
    curFeatures.value.push(feature)
  }
  else {
    clearPolygonGroup()
    curFeatures.value = [feature]
  }

  drawFeature(feature)
}

featureToolsControl.onAdd = () => {
  if (!map.value || !featureToolsContainerRef.value)
    return L.DomUtil.create('div')

  featureToolsContainerRef.value.style.display = 'flex'
  polygonGroup.addTo(map.value)
  map.value.on('click', onMapClick)
  map.value.getContainer().style.cursor = 'pointer'
  return featureToolsContainerRef.value
}

featureToolsControl.onRemove = () => {
  if (!map.value)
    return

  handleCloseComponent()
  polygonGroup.remove()
  clearPolygonGroup()
  clearDrawLayers(pm.value)

  map.value.off('click', onMapClick)
  map.value.getContainer().style.cursor = ''
}

async function mountControl() {
  if (!map.value || isControlMounted.value || !props.show)
    return

  await nextTick()
  if (!featureToolsContainerRef.value)
    return

  featureToolsControl.addTo(map.value)
  isControlMounted.value = true

  if (!pm.value)
    notify('warning', '当前地图未检测到 Geoman，工具条仅可进行要素选择')
}

function unmountControl() {
  if (!isControlMounted.value)
    return

  featureToolsControl.remove()
  isControlMounted.value = false
}

watch(
  () => [props.show, map.value] as const,
  async ([show]) => {
    if (show)
      await mountControl()
    else
      unmountControl()
  },
  { immediate: true },
)

watch(
  () => activeComponent.value,
  async (componentName) => {
    if (!componentName) {
      operationPanelPlacement.value = 'left'
      return
    }

    await nextTick()
    scheduleOperationPanelPlacement()
  },
)

function handleViewportResize() {
  if (!activeComponent.value)
    return

  scheduleOperationPanelPlacement()
}

provide(FEATURE_TOOLS_INJECTION_KEY, {
  activeComponent,
  clearPolygonGroup,
  confirm: confirmAction,
  curFeatures,
  curLayerName,
  drawFeature,
  map,
  mergePolygon,
  notify,
  pm,
  polygonGroup,
  repository: props.repository,
  reloadLayer,
  setActiveComponent,
  setEnableMapClickEvents,
  setMultipleMode,
  splitPolygon,
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleViewportResize)
  if (placementAnimationFrameId)
    window.cancelAnimationFrame(placementAnimationFrameId)
  placementAnimationFrameId = 0
  unmountControl()
  emit('close')
})

onMounted(() => {
  window.addEventListener('resize', handleViewportResize)
})
</script>

<template>
  <div
    ref="featureToolsContainerRef"
    class="feature-tools-container"
    @click.stop
    @mousedown.stop
  >
    <template
      v-for="(item, index) in components"
      :key="`feature-tools-btn-${item.key}`"
    >
      <div
        v-if="index !== 0"
        class="feature-tools-divider"
      />
      <component
        :is="item.component"
        class="feature-tools-btn"
        :class="[
          componentClass(item.key),
          activeComponent === item.key
            ? `operation-panel-placement-${operationPanelPlacement}`
            : '',
        ]"
        @click="handleClickComponent(item.key)"
        @close="handleCloseComponent"
      />
    </template>
  </div>
</template>

<style scoped>
.feature-tools-container {
  margin-bottom: 12px;
  display: none;
  flex-direction: row;
  align-items: stretch;
  overflow: visible;
  background: rgb(255 255 255 / 92%);
  border: 1px solid rgb(23 26 31 / 13%);
  border-radius: 14px;
  backdrop-filter: blur(6px);
  box-shadow: 0 8px 20px rgb(15 23 42 / 12%);
}

.feature-tools-divider {
  width: 1px;
  min-height: 44px;
  background: rgb(23 26 31 / 10%);
}

:deep(.feature-tools-btn) {
  position: relative;
  padding: 8px 9px 7px;
  min-width: 54px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  line-height: 1;
  color: var(--muted);
  background: transparent;
  transition: all 0.2s;
  cursor: pointer;
  user-select: none;
}

:deep(.feature-tools-btn > span:nth-child(2)) {
  line-height: 1.1;
}

:deep(.feature-tools-btn:hover):not(.feature-tools-btn-disabled),
:deep(.feature-tools-btn-active) {
  color: var(--accent);
  background: var(--accent-weak);
}

:deep(.feature-tools-btn-disabled) {
  cursor: not-allowed;
  opacity: 0.45;
}

:deep(.tool-icon) {
  width: 20px;
  display: inline-flex;
  justify-content: center;
  font-size: 15px;
  line-height: 1;
}

:deep(.operation-panel) {
  position: absolute;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgb(255 255 255 / 96%);
  border: 1px solid rgb(23 26 31 / 14%);
  border-radius: 10px;
  backdrop-filter: blur(6px);
  box-shadow: 0 8px 18px rgb(15 23 42 / 12%);
  z-index: 2;
}

:deep(.operation-panel-placement-left .operation-panel) {
  top: 50%;
  right: calc(100% + 8px);
  left: auto;
  transform: translateY(-50%);
}

:deep(.operation-panel-placement-right .operation-panel) {
  top: 50%;
  left: calc(100% + 8px);
  right: auto;
  transform: translateY(-50%);
}

:deep(.operation-panel-placement-top .operation-panel) {
  bottom: calc(100% + 8px);
  left: 50%;
  top: auto;
  right: auto;
  transform: translateX(-50%);
}

:deep(.operation-panel-placement-bottom .operation-panel) {
  top: calc(100% + 8px);
  left: 50%;
  bottom: auto;
  right: auto;
  transform: translateX(-50%);
}

:deep(.operation-btn) {
  min-width: 76px;
}

:deep(.operation-btn-submit) {
  --n-color: var(--accent);
  --n-color-hover: rgb(39 78 224);
  --n-color-pressed: rgb(35 70 202);
  --n-color-focus: rgb(39 78 224);
  --n-border: 1px solid var(--accent);
  --n-border-hover: 1px solid rgb(39 78 224);
  --n-border-pressed: 1px solid rgb(35 70 202);
  --n-border-focus: 1px solid rgb(39 78 224);
  --n-text-color: #fff;
}

:deep(.operation-btn-cancel) {
  --n-color: rgb(255 255 255 / 88%);
  --n-color-hover: #fff;
  --n-color-pressed: rgb(244 244 240);
  --n-color-focus: #fff;
  --n-border: 1px solid rgb(23 26 31 / 14%);
  --n-border-hover: 1px solid rgb(23 26 31 / 20%);
  --n-border-pressed: 1px solid rgb(23 26 31 / 20%);
  --n-border-focus: 1px solid rgb(23 26 31 / 20%);
  --n-text-color: var(--muted);
}

@media (max-width: 860px) {
  .feature-tools-container {
    margin-bottom: 8px;
  }

  :deep(.feature-tools-btn) {
    min-width: 40px;
    padding: 7px 8px;
    font-size: 12px;
  }

  :deep(.feature-tools-btn > span:nth-child(2)) {
    display: none;
  }

  :deep(.tool-icon) {
    font-size: 14px;
  }

  :deep(.operation-panel) {
    max-width: min(80vw, 240px);
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  :deep(.operation-panel-placement-left .operation-panel) {
    right: calc(100% + 6px);
  }

  :deep(.operation-panel-placement-right .operation-panel) {
    left: calc(100% + 6px);
  }

  :deep(.operation-panel-placement-top .operation-panel) {
    bottom: calc(100% + 6px);
  }

  :deep(.operation-panel-placement-bottom .operation-panel) {
    top: calc(100% + 6px);
  }

  :deep(.operation-btn) {
    min-width: 64px;
  }
}
</style>
