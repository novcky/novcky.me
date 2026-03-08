<script setup lang="ts">
import type * as L from 'leaflet'
import type { MovingMarker } from '@/lib/movingMarker'
import type { BaseTileLayerController } from '@/lib/tileLayer'

import * as Leaflet from 'leaflet'
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'

import MovingMarkerPlayerPanel from '@/components/moving-marker/MovingMarkerPlayerPanel.vue'
import { useMovingMarkerPlayer } from '@/composables/useMovingMarkerPlayer'
import { movingTrajectoryData } from '@/constants/movingTrajectory'
import { createMovingMarker } from '@/lib/movingMarker'
import { attachBaseTileLayer } from '@/lib/tileLayer'

const mapElement = ref<HTMLDivElement | null>(null)
const mapInstance = shallowRef<L.Map | null>(null)
const tileLayerController = shallowRef<BaseTileLayerController | null>(null)
const movingMarker = shallowRef<MovingMarker | null>(null)
const routePolyline = shallowRef<L.Polyline | null>(null)
const routePassedStaticPolyline = shallowRef<L.Polyline | null>(null)
const routePassedActivePolyline = shallowRef<L.Polyline | null>(null)
const endpointMarkers = shallowRef<[L.CircleMarker | null, L.CircleMarker | null]>([null, null])
const isSeeking = ref(false)
const lastPassedLineIndex = ref(-1)

let followAnimationFrameId = 0
let pendingFollowLatLng: L.LatLng | null = null

const trajectoryLatlngs = movingTrajectoryData.map(item => Leaflet.latLng(item.lat, item.lng))

const {
  clampSliderValue,
  createDurationsBySpeed,
  currentRecord,
  currentTimeText,
  endTimeText,
  getLatlngByProgress,
  handleSpeedSelect,
  hasTrajectory,
  lineNameText,
  normalizeSliderValue,
  player,
  resolveProgressMeta,
  setSliderValue,
  speedButtonText,
  speedDropdownOptions,
  speedText,
  userNameText,
  workAreaText,
} = useMovingMarkerPlayer({
  trajectoryData: movingTrajectoryData,
  trajectoryLatlngs,
})

watch(
  () => player.selectSpeed,
  (newSpeed, oldSpeed) => {
    const marker = movingMarker.value
    if (!marker)
      return

    marker.setDurations(createDurationsBySpeed(newSpeed))
    if (marker.isEnded() || !marker.isStarted())
      return

    if (player.speedCheckpoint === null)
      player.speedCheckpoint = oldSpeed

    const isPaused = marker.isPaused()
    if (!isPaused)
      marker.pause()

    // 调整倍速后，进行中分段需要按差值修正，否则恢复时会出现明显跳帧。
    player.speedOffset = newSpeed > player.speedCheckpoint
      ? newSpeed / player.speedCheckpoint
      : -(player.speedCheckpoint / newSpeed)

    if (!isPaused) {
      marker.resume(player.speedOffset)
      player.speedCheckpoint = null
      player.speedOffset = 0
    }
  },
)

watch(
  () => player.loopEnabled,
  (enabled) => {
    const marker = movingMarker.value
    if (!marker)
      return

    // 循环开关可能在播放中切换，需要直接同步到内部配置，避免出现“UI 已变更但行为延后”的错觉。
    marker.setLoopEnabled(enabled)
  },
)

watch(
  () => player.followViewEnabled,
  (enabled) => {
    if (!enabled) {
      pendingFollowLatLng = null
      if (followAnimationFrameId)
        window.cancelAnimationFrame(followAnimationFrameId)
      followAnimationFrameId = 0
      return
    }

    const markerLatLng = movingMarker.value?.getLatLng()
    if (markerLatLng)
      scheduleFollowView(markerLatLng)
  },
)

function scheduleFollowView(targetLatLng: L.LatLng) {
  if (!player.followViewEnabled)
    return

  pendingFollowLatLng = targetLatLng
  if (followAnimationFrameId)
    return

  followAnimationFrameId = window.requestAnimationFrame(() => {
    const nextLatLng = pendingFollowLatLng
    pendingFollowLatLng = null
    followAnimationFrameId = 0
    if (!nextLatLng)
      return

    mapInstance.value?.panTo(nextLatLng, { animate: false })
  })
}

function updatePassedPathByProgress(progress: number, forceStaticRefresh = false) {
  if (trajectoryLatlngs.length === 0)
    return

  const {
    clampedProgress,
    lineIndex,
    pointMaxIndex,
    segmentOffset,
  } = resolveProgressMeta(progress)

  if (clampedProgress <= player.sliderMin) {
    routePassedStaticPolyline.value?.setLatLngs([trajectoryLatlngs[0]])
    routePassedActivePolyline.value?.setLatLngs([])
    lastPassedLineIndex.value = 0
    return
  }

  if (clampedProgress >= pointMaxIndex) {
    routePassedStaticPolyline.value?.setLatLngs(trajectoryLatlngs)
    routePassedActivePolyline.value?.setLatLngs([])
    lastPassedLineIndex.value = Math.max(pointMaxIndex - 1, 0)
    return
  }

  if (forceStaticRefresh || lastPassedLineIndex.value !== lineIndex) {
    routePassedStaticPolyline.value?.setLatLngs(trajectoryLatlngs.slice(0, lineIndex + 1))
    lastPassedLineIndex.value = lineIndex
  }

  if (segmentOffset <= 0) {
    routePassedActivePolyline.value?.setLatLngs([])
    return
  }

  const startPoint = trajectoryLatlngs[lineIndex]
  const interpolatedPoint = getLatlngByProgress(clampedProgress)
  if (!startPoint || !interpolatedPoint) {
    routePassedActivePolyline.value?.setLatLngs([])
    return
  }

  // 已走轨迹拆为“稳定实线 + 当前段实时补线”，避免整段重绘导致视觉抖动。
  routePassedActivePolyline.value?.setLatLngs([startPoint, interpolatedPoint])
}

function updateMarkerTooltip() {
  const marker = movingMarker.value
  if (!marker)
    return

  const record = currentRecord.value
  const label = record
    ? `${record.userName} · ${record.speed} km/h`
    : '轨迹标记'

  marker.setTooltipContent(label)
}

function handleSliderUpdate(value: number | number[]) {
  const targetProgress = clampSliderValue(Number(normalizeSliderValue(value)))
  isSeeking.value = true
  setSliderValue(targetProgress)

  const marker = movingMarker.value
  if (!marker) {
    isSeeking.value = false
    return
  }

  if (!marker.isPaused())
    marker.pause()

  const nextLatlng = getLatlngByProgress(targetProgress)
  if (nextLatlng) {
    marker.setLatLng(nextLatlng)
    scheduleFollowView(nextLatlng)
  }

  updatePassedPathByProgress(targetProgress)
  updateMarkerTooltip()
}

function handleSliderSeekCommit() {
  const marker = movingMarker.value
  if (!marker) {
    isSeeking.value = false
    return
  }

  marker.playFromProgress(player.sliderValue)
  updatePassedPathByProgress(player.sliderValue, true)
  scheduleFollowView(marker.getLatLng())
  isSeeking.value = false
  if (player.status !== 'play') {
    // 拖拽定位会临时触发内部播放状态，这里需要立刻回退，避免暂停态被意外改成播放态。
    window.setTimeout(() => {
      marker.pause()
    }, 0)
  }
}

function togglePlay() {
  if (player.status === 'play') {
    pausePlayer()
    return
  }

  playPlayer()
}

function playPlayer() {
  const marker = movingMarker.value
  if (!marker)
    return

  if (player.status === 'stop') {
    if (player.sliderValue >= player.sliderMax)
      setSliderValue(0)

    marker.playFromProgress(player.sliderValue)
  }
  else if (marker.isPaused()) {
    marker.resume(player.speedOffset)
  }
  else if (!marker.isRunning()) {
    marker.start()
  }

  player.status = 'play'
  player.speedCheckpoint = null
  player.speedOffset = 0
  scheduleFollowView(marker.getLatLng())
}

function pausePlayer() {
  const marker = movingMarker.value
  if (!marker)
    return

  marker.pause()
  player.status = 'pause'
}

function stopPlayer() {
  const marker = movingMarker.value
  if (!marker)
    return

  marker.stop()
  player.status = 'stop'
  isSeeking.value = false
  setSliderValue(0)

  const firstLatLng = trajectoryLatlngs[0]
  if (firstLatLng)
    marker.setLatLng(firstLatLng)

  updatePassedPathByProgress(0, true)
  scheduleFollowView(marker.getLatLng())
  updateMarkerTooltip()
}

function initTrajectoryLayers(map: L.Map) {
  if (!hasTrajectory.value)
    return

  routePolyline.value = Leaflet.polyline(trajectoryLatlngs, {
    color: '#7d8ea8',
    weight: 3,
    opacity: 0.7,
    dashArray: '8 8',
  }).addTo(map)

  routePassedStaticPolyline.value = Leaflet.polyline([trajectoryLatlngs[0]], {
    color: '#409EFF',
    weight: 4,
    opacity: 0.9,
    lineCap: 'round',
    lineJoin: 'round',
  }).addTo(map)

  routePassedActivePolyline.value = Leaflet.polyline([], {
    color: '#66B1FF',
    weight: 5,
    opacity: 0.98,
    lineCap: 'round',
    lineJoin: 'round',
  }).addTo(map)
  lastPassedLineIndex.value = 0

  endpointMarkers.value[0] = Leaflet.circleMarker(trajectoryLatlngs[0], {
    radius: 6,
    color: '#67C23A',
    fillColor: '#67C23A',
    fillOpacity: 0.9,
    weight: 2,
  }).addTo(map)

  endpointMarkers.value[1] = Leaflet.circleMarker(trajectoryLatlngs.at(-1)!, {
    radius: 6,
    color: '#F56C6C',
    fillColor: '#F56C6C',
    fillOpacity: 0.9,
    weight: 2,
  }).addTo(map)

  map.fitBounds(routePolyline.value.getBounds().pad(0.24))
}

function destroyTrajectoryLayers() {
  const map = mapInstance.value
  if (!map)
    return

  if (routePolyline.value) {
    map.removeLayer(routePolyline.value)
    routePolyline.value = null
  }

  if (routePassedStaticPolyline.value) {
    map.removeLayer(routePassedStaticPolyline.value)
    routePassedStaticPolyline.value = null
  }

  if (routePassedActivePolyline.value) {
    map.removeLayer(routePassedActivePolyline.value)
    routePassedActivePolyline.value = null
  }

  lastPassedLineIndex.value = -1

  endpointMarkers.value.forEach((marker, index) => {
    if (!marker)
      return

    map.removeLayer(marker)
    endpointMarkers.value[index] = null
  })
}

function initMovingMarkerLayer(map: L.Map) {
  if (!hasTrajectory.value)
    return

  const marker = createMovingMarker(
    trajectoryLatlngs,
    createDurationsBySpeed(player.selectSpeed),
    {
      autostart: false,
      loop: player.loopEnabled,
      icon: Leaflet.divIcon({
        className: 'moving-dot-icon',
        html: '<span class="moving-dot-core"></span>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
      zIndexOffset: 500,
    },
  )

  marker
    .bindTooltip(userNameText.value, {
      className: 'moving-marker-tooltip',
      offset: Leaflet.point(0, -16),
      direction: 'top',
      permanent: true,
    })
    .addTo(map)

  marker.on('start', () => {
    player.status = 'play'
  })

  marker.on('updateProgress', (event: L.LeafletEvent & { progress?: number }) => {
    if (isSeeking.value || typeof event.progress !== 'number')
      return

    setSliderValue(event.progress)
    updatePassedPathByProgress(event.progress)
    scheduleFollowView(marker.getLatLng())
  })

  marker.on('updateLine', (event: L.LeafletEvent & { lineIndex?: number }) => {
    if (typeof event.lineIndex === 'number')
      updateMarkerTooltip()
  })

  marker.on('end', () => {
    player.status = 'stop'
    setSliderValue(player.sliderMax)
    updatePassedPathByProgress(player.sliderMax)
    scheduleFollowView(marker.getLatLng())
    updateMarkerTooltip()
  })

  marker.on('loop', () => {
    player.status = 'play'
    setSliderValue(0)
    updatePassedPathByProgress(0, true)
    scheduleFollowView(marker.getLatLng())
    updateMarkerTooltip()
  })

  movingMarker.value = marker
  updateMarkerTooltip()
  scheduleFollowView(marker.getLatLng())
}

function destroyMovingMarkerLayer() {
  const map = mapInstance.value
  const marker = movingMarker.value
  if (!map || !marker)
    return

  marker.off('start')
  marker.off('updateProgress')
  marker.off('updateLine')
  marker.off('end')
  marker.off('loop')
  marker.stop()
  map.removeLayer(marker)
  movingMarker.value = null
}

onMounted(() => {
  if (!mapElement.value)
    return

  const map = Leaflet.map(mapElement.value, {
    zoomControl: false,
    preferCanvas: true,
  })

  Leaflet.control.zoom({ position: 'topright' }).addTo(map)
  tileLayerController.value = attachBaseTileLayer(map)

  mapInstance.value = map
  initTrajectoryLayers(map)
  initMovingMarkerLayer(map)
})

onBeforeUnmount(() => {
  if (followAnimationFrameId)
    window.cancelAnimationFrame(followAnimationFrameId)
  followAnimationFrameId = 0
  pendingFollowLatLng = null
  destroyMovingMarkerLayer()
  destroyTrajectoryLayers()
  tileLayerController.value?.dispose()
  tileLayerController.value = null
  mapInstance.value?.remove()
  mapInstance.value = null
})
</script>

<template>
  <section
    id="case-moving-marker"
    class="card section"
  >
    <h2>轨迹回放引擎能力（MovingMarker）</h2>
    <p class="moving-player-intro">
      该案例基于开源库
      <a
        class="site-inline-link"
        href="https://github.com/ewoken/Leaflet.MovingMarker"
        target="_blank"
        rel="noreferrer"
      >
        Leaflet.MovingMarker
      </a>
      做源码级改造，补齐播放器级时间轴与事件控制，支持播放、暂停、停止、循环、进度跳转与倍速切换不中断。
      当前实现重点是连续、稳定的轨迹回放体验。
    </p>
    <ul class="moving-case-points">
      <li>时间轴状态改造：切换倍速保持播放连续，避免进度回退与重启。</li>
      <li>播放器级交互闭环：播放 / 暂停 / 停止 / 循环 / 拖拽定位。</li>
      <li>事件体系可外控：UI 与轨迹动画解耦，便于业务侧组合扩展。</li>
    </ul>

    <div class="moving-demo-layout">
      <div class="moving-map-stage">
        <div
          ref="mapElement"
          class="map moving-demo-map"
          aria-label="轨迹回放地图"
        />

        <div class="moving-player-meta">
          <strong class="moving-player-name">{{ userNameText }}</strong>
          <span class="moving-player-area">{{ workAreaText }}</span>
          <span class="moving-player-line">{{ lineNameText }} · {{ speedText }} km/h</span>
        </div>

        <MovingMarkerPlayerPanel
          :current-time-text="currentTimeText"
          :disabled="!hasTrajectory"
          :end-time-text="endTimeText"
          :follow-view-enabled="player.followViewEnabled"
          :loop-enabled="player.loopEnabled"
          :slider-max="player.sliderMax"
          :slider-min="player.sliderMin"
          :slider-value="player.sliderValue"
          :speed-button-text="speedButtonText"
          :speed-dropdown-options="speedDropdownOptions"
          :status="player.status"
          @follow-view-enabled-change="player.followViewEnabled = $event"
          @loop-enabled-change="player.loopEnabled = $event"
          @slider-commit="handleSliderSeekCommit"
          @slider-update="handleSliderUpdate"
          @speed-select="handleSpeedSelect"
          @stop="stopPlayer"
          @toggle-play="togglePlay"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.moving-player-intro {
  margin: -2px 2px 10px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.75;
}

.moving-case-points {
  margin: 0 2px 12px;
  padding-left: 18px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.68;
}

.moving-case-points li + li {
  margin-top: 3px;
}

.moving-demo-layout {
  padding: 10px 8px 8px;
}

.moving-map-stage {
  position: relative;
}

.moving-demo-map {
  height: 620px;
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  overflow: hidden;
}

.moving-player-meta {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 400;
  padding: 9px 11px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  background: rgb(255 255 255 / 84%);
  border: 1px solid rgb(23 26 31 / 14%);
  border-radius: 10px;
  box-shadow: 0 8px 18px rgb(14 19 28 / 12%);
  backdrop-filter: blur(6px);
}

.moving-player-name {
  font-size: 16px;
  line-height: 1.2;
}

.moving-player-area,
.moving-player-line {
  color: var(--muted);
  font-size: 12px;
}

@media (max-width: 860px) {
  .moving-case-points {
    margin-bottom: 10px;
    font-size: 12px;
    line-height: 1.62;
  }

  .moving-player-intro {
    margin-bottom: 8px;
    font-size: 12px;
  }

  .moving-demo-map {
    height: 560px;
  }

  .moving-player-meta {
    top: 8px;
    right: 8px;
    left: 8px;
  }
}

:deep(.moving-dot-icon) {
  display: flex;
  justify-content: center;
  align-items: center;
}

:deep(.moving-dot-core) {
  width: 14px;
  height: 14px;
  display: block;
  border-radius: 999px;
  border: 2px solid #409EFF;
  background: #fff;
  box-shadow: 0 0 0 6px rgb(64 158 255 / 25%);
}

:deep(.moving-marker-tooltip) {
  padding: 2px 8px;
  border-color: #409EFF;
  color: #409EFF;
  font-size: 12px;
}

:deep(.moving-marker-tooltip::before) {
  display: none;
}
</style>
