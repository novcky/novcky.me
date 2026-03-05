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

  if (activeComponent.value !== '')
    return

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
  margin-bottom: 160px;
  display: none;
  flex-direction: column;
  background: #fff;
  border: 1px solid rgb(0 0 0 / 20%);
  border-radius: 4px;
  box-shadow: rgb(0 0 0 / 20%) 0 0 10px;
}

.feature-tools-divider {
  width: 100%;
  height: 1px;
  background: rgb(0 0 0 / 10%);
}

:deep(.feature-tools-btn) {
  position: relative;
  padding: 10px 14px 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 2px;
  font-size: 14px;
  color: #5b5b5b;
  background: #ffffff;
  transition: all 0.3s;
  cursor: pointer;
  user-select: none;
}

:deep(.feature-tools-btn:hover):not(.feature-tools-btn-disabled),
:deep(.feature-tools-btn-active) {
  color: #409EFF;
}

:deep(.feature-tools-btn-disabled) {
  cursor: not-allowed;
  opacity: 0.5;
}

:deep(.tool-icon) {
  width: 22px;
  display: inline-flex;
  justify-content: center;
  font-size: 18px;
  line-height: 1;
}

:deep(.operation-panel) {
  position: absolute;
  top: 8%;
  right: 56px;
  padding: 0 12px;
  height: 84%;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgb(0 0 0 / 60%);
  border-radius: 8px 0 0 8px;
}

:deep(.operation-btn) {
  min-width: 76px;
  height: 30px;
  padding: 0 12px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  border: none;
  border-radius: 6px;
  color: #fff;
  white-space: nowrap;
  cursor: pointer;
}

:deep(.operation-btn:disabled) {
  cursor: not-allowed;
  opacity: 0.6;
}

:deep(.operation-btn-cancel) {
  background: rgb(255 255 255 / 25%);
}

:deep(.operation-btn-submit) {
  background: #409EFF;
}
</style>
