<script setup lang="ts">
import type * as L from 'leaflet'
import type { FeatureRepository, NoticeType } from '@/features/leaflet-feature-tools/featureToolsContext'
import type { BaseTileLayerController } from '@/lib/tileLayer'

import * as Leaflet from 'leaflet'
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'

import { initialLeafletFeatures } from '@/features/leaflet-feature-tools/leafletFeatureSeed'
import LeafletFeatureToolsPanel from '@/features/leaflet-feature-tools/LeafletFeatureToolsPanel.vue'
import { drawPolygon } from '@/features/leaflet-feature-tools/tools'
import { useLeafletFeatureStore } from '@/features/leaflet-feature-tools/useLeafletFeatureStore'
import { attachBaseTileLayer } from '@/lib/tileLayer'

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
const tileLayerController = shallowRef<BaseTileLayerController | null>(null)
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
  }, 3400)

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
  tileLayerController.value = attachBaseTileLayer(map, {
    onFallback: (previousSourceName, nextSourceName) => {
      notify('warning', `底图源「${previousSourceName}」不可达，已切换到「${nextSourceName}」`)
    },
  })

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

  tileLayerController.value?.dispose()
  tileLayerController.value = null
  featureLayerGroup.clearLayers()
  mapInstance.value?.remove()
  mapInstance.value = null
})
</script>

<template>
  <section
    id="case-feature-tools"
    class="card section"
  >
    <h2>地图要素编辑能力（Leaflet）</h2>
    <p class="feature-tools-intro">
      该工具并非简单绘制示例，而是对
      <a
        class="site-inline-link geoman-link"
        href="https://geoman.io"
        target="_blank"
        rel="noreferrer"
      >
        <img
          class="geoman-link-logo"
          src="https://geoman.io/favicon.ico"
          alt=""
          aria-hidden="true"
        >
        <span>Geoman</span>
      </a>
      部分付费能力（重点为图斑切割）做过源码级复刻与工程化封装，目标是提供稳定、连续的地图编辑体验。
      当前 Demo 覆盖新增、调整、切割、合并、删除等核心要素编辑链路。
    </p>
    <ul class="feature-tools-points">
      <li>核心编辑链路：新增 / 调整 / 切割 / 合并 / 删除一体化操作。</li>
      <li>付费能力复刻：围绕图斑切割场景补齐可用的交互与算法流程。</li>
      <li>仓储契约解耦：通过 repository 约定隔离地图渲染层与业务数据层。</li>
    </ul>
    <div class="map-wrap">
      <div
        ref="mapElement"
        class="map leaflet-map"
        aria-label="Leaflet featureTools demo"
      />
      <LeafletFeatureToolsPanel
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
          <n-button
            class="confirm-btn confirm-btn-cancel"
            @click="resolveConfirm(false)"
          >
            取消
          </n-button>
          <n-button
            class="confirm-btn confirm-btn-submit"
            @click="resolveConfirm(true)"
          >
            确定
          </n-button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.feature-tools-intro {
  margin: -2px 2px 10px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.75;
}

.feature-tools-points {
  margin: 0 2px 12px;
  padding-left: 18px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.68;
}

.feature-tools-points li + li {
  margin-top: 3px;
}

.geoman-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.geoman-link-logo {
  width: 14px;
  height: 14px;
  border-radius: 3px;
}

.confirm-btn-submit {
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

.confirm-btn-cancel {
  --n-color: rgb(255 255 255 / 95%);
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
  .feature-tools-intro {
    margin-bottom: 8px;
    font-size: 12px;
  }

  .feature-tools-points {
    margin-bottom: 10px;
    font-size: 12px;
    line-height: 1.62;
  }
}
</style>
