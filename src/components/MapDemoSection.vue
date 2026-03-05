<script setup lang="ts">
import type * as L from 'leaflet'
import type { FeatureRepository, NoticeType } from '@/components/leaflet-feature-tools/context'

import * as Leaflet from 'leaflet'
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'

import FeatureTools from '@/components/leaflet-feature-tools/index.vue'
import { drawPolygon } from '@/components/leaflet-feature-tools/tools'
import { useLeafletFeatureStore } from '@/composables/useLeafletFeatureStore'
import { initialLeafletFeatures } from '@/constants/leafletFeatures'

interface Notice {
  id: number
  message: string
  type: NoticeType
}

interface ConfirmState {
  message: string
  visible: boolean
}

const mapElement = ref<HTMLDivElement | null>(null)
const mapInstance = shallowRef<L.Map | null>(null)
const featureLayerGroup = Leaflet.featureGroup()

const { addFeatures, deleteFeatures, features, queryByPoint, updateFeatureGeometry } = useLeafletFeatureStore(initialLeafletFeatures)

const notices = ref<Notice[]>([])
const noticeTimers = new Map<number, number>()
let noticeIdSeed = 0
const confirmState = ref<ConfirmState>({
  visible: false,
  message: '',
})
let confirmResolver: ((result: boolean) => void) | null = null

function notify(type: NoticeType, message: string) {
  const id = ++noticeIdSeed
  notices.value = [...notices.value, { id, message, type }]

  const timer = window.setTimeout(() => {
    removeNotice(id)
  }, 2600)

  noticeTimers.set(id, timer)
}

function removeNotice(id: number) {
  notices.value = notices.value.filter(item => item.id !== id)

  const timer = noticeTimers.get(id)
  if (timer) {
    clearTimeout(timer)
    noticeTimers.delete(id)
  }
}

function renderFeatureLayer() {
  featureLayerGroup.clearLayers()

  features.value.forEach((feature) => {
    const layer = drawPolygon({
      geometry: feature.geometry,
      styleOptions: {
        bubblingMouseEvents: false,
        color: '#6aa6ff',
        fillColor: '#6aa6ff',
        fillOpacity: 0.25,
      },
    })

    layer.on('click', (event) => {
      if (!mapInstance.value || !('latlng' in event))
        return

      mapInstance.value.fire('click', {
        latlng: event.latlng,
      })
    })

    layer.addTo(featureLayerGroup)
  })
}

const repository: FeatureRepository = {
  queryByPoint: async point => queryByPoint(point),
  addFeatures: async (items) => {
    const result = addFeatures(items)
    renderFeatureLayer()
    return result
  },
  updateFeatureGeometry: async (id, geometry) => {
    const result = updateFeatureGeometry(id, geometry)
    renderFeatureLayer()
    return result
  },
  deleteFeatures: async (ids) => {
    const result = deleteFeatures(ids)
    renderFeatureLayer()
    return result
  },
  reloadLayer: () => {
    renderFeatureLayer()
  },
}

async function confirmAction(message: string) {
  confirmState.value = {
    visible: true,
    message,
  }

  return new Promise((resolve) => {
    confirmResolver = resolve
  })
}

function resolveConfirm(result: boolean) {
  confirmState.value = {
    visible: false,
    message: '',
  }

  if (!confirmResolver)
    return

  confirmResolver(result)
  confirmResolver = null
}

onMounted(() => {
  if (!mapElement.value)
    return

  const map = Leaflet.map(mapElement.value, {
    zoomControl: false,
    preferCanvas: true,
  })

  Leaflet.control.zoom({ position: 'topright' }).addTo(map)
  Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)

  featureLayerGroup.addTo(map)
  renderFeatureLayer()

  const bounds = featureLayerGroup.getBounds()
  if (bounds.isValid())
    map.fitBounds(bounds.pad(0.18))

  mapInstance.value = map
  notify('info', '地图工具已就绪：先选中图斑，再执行编辑、切割、合并或删除')
})

onBeforeUnmount(() => {
  // 通知定时器如果不回收，会在组件卸载后继续写状态并引发内存泄漏。
  noticeTimers.forEach(timer => clearTimeout(timer))
  noticeTimers.clear()

  // 弹窗 Promise 如果不兜底结束，工具条会一直卡在等待状态。
  if (confirmResolver)
    confirmResolver(false)
  confirmResolver = null

  featureLayerGroup.clearLayers()
  mapInstance.value?.remove()
  mapInstance.value = null
})
</script>

<template>
  <section class="card section">
    <h2>地图要素编辑（Leaflet）</h2>
    <div class="map-wrap">
      <div
        ref="mapElement"
        class="map leaflet-map"
        aria-label="Leaflet featureTools demo"
      />
      <FeatureTools
        :map="mapInstance"
        :repository="repository"
        :notify="notify"
        :confirm="confirmAction"
      />
      <ul
        v-if="notices.length > 0"
        class="tool-notices"
      >
        <li
          v-for="item in notices"
          :key="item.id"
          class="tool-notice"
          :class="`tool-notice-${item.type}`"
        >
          {{ item.message }}
        </li>
      </ul>
      <p class="foot">
        <span class="note">提示</span>：可先选中图斑，再体验编辑、切割、合并、删除；新增可直接绘制后提交。
      </p>
    </div>

    <div
      v-if="confirmState.visible"
      class="confirm-mask"
      @click.self="resolveConfirm(false)"
    >
      <div class="confirm-panel">
        <p class="confirm-title">
          操作确认
        </p>
        <p class="confirm-message">
          {{ confirmState.message }}
        </p>
        <div class="confirm-actions">
          <button
            type="button"
            class="confirm-btn confirm-btn-cancel"
            @click="resolveConfirm(false)"
          >
            取 消
          </button>
          <button
            type="button"
            class="confirm-btn confirm-btn-submit"
            @click="resolveConfirm(true)"
          >
            确 定
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
