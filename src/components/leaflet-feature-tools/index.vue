<script setup lang="ts">
import type {
  DemoFeature,
  FeatureRepository,
  GeomanInstance,
  NoticeType,
} from './context'
import * as L from 'leaflet'

import { computed, nextTick, onBeforeUnmount, provide, ref, watch } from 'vue'
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
const featureToolsContainerRef = ref<HTMLDivElement | null>(null)
const polygonGroup = L.featureGroup()
const featureToolsControl = L.control({ position: props.position })

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
  unmountControl()
  emit('close')
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
        :class="componentClass(item.key)"
        @click="handleClickComponent(item.key)"
        @close="handleCloseComponent"
      />
    </template>
  </div>
</template>

<style scoped>
.feature-tools-container {
  position: relative;
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
  width: 17px;
  height: 17px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  color: currentColor;
}

:deep(.tool-icon svg) {
  width: 100%;
  height: 100%;
  display: block;
  transition: transform 0.2s;
}

:deep(.feature-tools-btn:hover .tool-icon svg),
:deep(.feature-tools-btn-active .tool-icon svg) {
  transform: scale(1.04);
}

:deep(.tool-label) {
  letter-spacing: 0.01em;
  line-height: 1;
}

:deep(.operation-panel) {
  /* 操作条固定在工具栏上方，避免随按钮位置跳变导致鼠标路径不稳定。 */
  position: absolute;
  left: 50%;
  bottom: calc(100% + 10px);
  transform: translateX(-50%);
  padding: 8px 9px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 7px;
  background: rgb(255 255 255 / 96%);
  border: 1px solid rgb(23 26 31 / 14%);
  border-radius: 11px;
  backdrop-filter: blur(6px);
  box-shadow: 0 8px 18px rgb(15 23 42 / 12%);
  z-index: 5;
}

:deep(.operation-btn) {
  min-width: 68px;
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
    width: 16px;
    height: 16px;
  }

  :deep(.operation-panel) {
    left: auto;
    right: 0;
    bottom: calc(100% + 8px);
    transform: none;
    max-width: min(80vw, 240px);
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  :deep(.operation-btn) {
    min-width: 64px;
  }
}
</style>
