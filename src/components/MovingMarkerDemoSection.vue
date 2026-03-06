<script setup lang="ts">
import type * as L from 'leaflet'
import type { TrajectoryRecord } from '@/constants/movingTrajectory'
import type { MovingMarker } from '@/lib/movingMarker'
import type { BaseTileLayerController } from '@/lib/tileLayer'
import * as Leaflet from 'leaflet'

import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import { movingTrajectoryData } from '@/constants/movingTrajectory'
import { createMovingMarker } from '@/lib/movingMarker'
import { attachBaseTileLayer } from '@/lib/tileLayer'

type PlayerStatus = 'stop' | 'play' | 'pause'

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

const player = reactive({
  status: 'stop' as PlayerStatus,
  sliderValue: 0,
  sliderMin: 0,
  sliderMax: Math.max(movingTrajectoryData.length - 1, 0),
  segmentDuration: 1500,
  selectSpeed: 1,
  loopEnabled: true,
  followViewEnabled: true,
  speedCheckpoint: null as number | null,
  speedOffset: 0,
  speedOptions: [
    { label: '10.0x', value: 10 },
    { label: '5.0x', value: 5 },
    { label: '2.0x', value: 2 },
    { label: '1.0x', value: 1 },
    { label: '0.75x', value: 0.75 },
    { label: '0.5x', value: 0.5 },
    { label: '0.1x', value: 0.1 },
  ],
})

const speedButtonText = computed(() => {
  if (player.selectSpeed === 1)
    return '倍速'

  const option = player.speedOptions.find(item => item.value === player.selectSpeed)
  return option?.label ?? `${player.selectSpeed}x`
})

const speedDropdownOptions = computed(() => {
  return player.speedOptions.map(option => ({
    key: option.value,
    label: option.value === player.selectSpeed
      ? `✓ ${option.label}`
      : option.label,
  }))
})

const hasTrajectory = computed(() => trajectoryLatlngs.length > 1)

const currentRecordIndex = computed(() => {
  const maxIndex = Math.max(movingTrajectoryData.length - 1, 0)
  return Math.min(Math.max(Math.floor(player.sliderValue), 0), maxIndex)
})

const currentRecord = computed<TrajectoryRecord | null>(() => {
  return movingTrajectoryData[currentRecordIndex.value] ?? null
})

const currentTimeText = computed(() => {
  const startIndex = currentRecordIndex.value
  const endIndex = Math.min(startIndex + 1, movingTrajectoryData.length - 1)
  const startTimeText = movingTrajectoryData[startIndex]?.recordTime
  const endTimeTextValue = movingTrajectoryData[endIndex]?.recordTime
  if (!startTimeText || !endTimeTextValue)
    return formatTime(startTimeText)

  const startTimestamp = new Date(startTimeText).getTime()
  const endTimestamp = new Date(endTimeTextValue).getTime()
  if (Number.isNaN(startTimestamp) || Number.isNaN(endTimestamp))
    return formatTime(startTimeText)

  // 进度条改为连续值后，时间显示也需要按分段比例插值，否则会继续“一格一格跳”。
  const lineProgress = Math.min(Math.max(player.sliderValue - startIndex, 0), 1)
  const currentTimestamp = startTimestamp + (endTimestamp - startTimestamp) * lineProgress
  return new Date(currentTimestamp).toLocaleString('zh-CN', { hour12: false })
})

const endTimeText = computed(() => formatTime(movingTrajectoryData.at(-1)?.recordTime))
const userNameText = computed(() => currentRecord.value?.userName ?? '-')
const workAreaText = computed(() => currentRecord.value?.workArea ?? '-')
const lineNameText = computed(() => currentRecord.value?.lineName ?? '-')
const speedText = computed(() => currentRecord.value?.speed ?? 0)

function handleSpeedSelect(value: string | number) {
  const nextSpeed = Number(value)
  if (!Number.isFinite(nextSpeed))
    return

  player.selectSpeed = nextSpeed
}

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

function createDurationsBySpeed(speed: number) {
  return Array.from(
    { length: Math.max(trajectoryLatlngs.length - 1, 0) },
    () => player.segmentDuration / speed,
  )
}

function clampSliderValue(inputValue: number) {
  return Math.min(
    Math.max(inputValue, player.sliderMin),
    player.sliderMax,
  )
}

function setSliderValue(nextValue: number) {
  player.sliderValue = clampSliderValue(nextValue)
}

function normalizeSliderValue(value: number | number[]) {
  return Array.isArray(value)
    ? (value[0] ?? player.sliderMin)
    : value
}

function getLatlngByProgress(progress: number) {
  if (trajectoryLatlngs.length < 2)
    return trajectoryLatlngs[0]

  const pointMaxIndex = trajectoryLatlngs.length - 1
  const clampedProgress = Math.min(Math.max(progress, player.sliderMin), pointMaxIndex)
  const lineIndex = Math.min(Math.floor(clampedProgress), pointMaxIndex - 1)
  const lineProgress = Math.min(Math.max(clampedProgress - lineIndex, 0), 1)
  const startPoint = trajectoryLatlngs[lineIndex]
  const endPoint = trajectoryLatlngs[lineIndex + 1]
  return Leaflet.latLng(
    startPoint.lat + (endPoint.lat - startPoint.lat) * lineProgress,
    startPoint.lng + (endPoint.lng - startPoint.lng) * lineProgress,
  )
}

function resolveProgressMeta(progress: number) {
  const pointMaxIndex = Math.max(trajectoryLatlngs.length - 1, 0)
  const clampedProgress = Math.min(Math.max(progress, player.sliderMin), pointMaxIndex)
  const lineIndex = pointMaxIndex > 0
    ? Math.min(Math.floor(clampedProgress), pointMaxIndex - 1)
    : 0
  const segmentOffset = Math.min(Math.max(clampedProgress - lineIndex, 0), 1)
  return {
    clampedProgress,
    lineIndex,
    pointMaxIndex,
    segmentOffset,
  }
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
  marker.setLatLng(trajectoryLatlngs[0])
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

function formatTime(timeText?: string) {
  if (!timeText)
    return '-'

  const timeValue = new Date(timeText)
  if (Number.isNaN(timeValue.getTime()))
    return '-'

  return timeValue.toLocaleString('zh-CN', { hour12: false })
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
  <section class="card section">
    <h2>轨迹回放（MovingMarker）</h2>

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

        <div class="moving-player">
          <div
            v-if="!hasTrajectory"
            class="moving-player-mask"
          >
            暂无轨迹数据
          </div>

          <div class="moving-player-progress">
            <n-slider
              :value="player.sliderValue"
              :min="player.sliderMin"
              :max="player.sliderMax"
              :disabled="!hasTrajectory"
              :step="0.001"
              :tooltip="false"
              class="moving-slider"
              @update:value="handleSliderUpdate"
              @dragend="handleSliderSeekCommit"
              @change="handleSliderSeekCommit"
            />
          </div>

          <div class="moving-player-controls">
            <div class="moving-player-controls-main">
              <div class="moving-player-buttons">
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <n-button
                      :disabled="!hasTrajectory"
                      class="moving-control-btn moving-icon-btn"
                      round
                      size="small"
                      type="primary"
                      @click="togglePlay"
                    >
                      <span class="moving-control-icon">{{ player.status === 'play' ? '⏸' : '▶' }}</span>
                    </n-button>
                  </template>
                  {{ player.status === 'play' ? '暂停' : '播放' }}
                </n-tooltip>
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <n-button
                      :disabled="!hasTrajectory || player.status === 'stop'"
                      class="moving-control-btn moving-icon-btn"
                      round
                      size="small"
                      type="error"
                      @click="stopPlayer"
                    >
                      <span class="moving-control-icon">⏹</span>
                    </n-button>
                  </template>
                  停止
                </n-tooltip>
                <n-dropdown
                  :disabled="!hasTrajectory"
                  :options="speedDropdownOptions"
                  placement="top-start"
                  trigger="click"
                  @select="handleSpeedSelect"
                >
                  <n-button
                    class="moving-control-btn moving-speed-btn"
                    round
                    size="small"
                    type="info"
                  >
                    {{ speedButtonText }}
                  </n-button>
                </n-dropdown>
              </div>
              <div class="moving-player-time">
                <span>{{ currentTimeText }}</span>
                <span class="moving-player-time-separator">/</span>
                <span>{{ endTimeText }}</span>
              </div>
            </div>
            <div class="moving-player-switches">
              <div class="moving-loop-toggle">
                <n-switch
                  v-model:value="player.followViewEnabled"
                  :disabled="!hasTrajectory"
                  size="small"
                />
                <span>视角跟随</span>
              </div>
              <div class="moving-loop-toggle">
                <n-switch
                  v-model:value="player.loopEnabled"
                  :disabled="!hasTrajectory"
                  size="small"
                />
                <span>循环播放</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.moving-demo-layout {
  padding: 12px;
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
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: rgb(11 16 32 / 62%);
  border: 1px solid rgb(255 255 255 / 24%);
  border-radius: 10px;
  backdrop-filter: blur(8px);
}

.moving-player-name {
  font-size: 16px;
  line-height: 1.2;
}

.moving-player-area,
.moving-player-line {
  color: rgb(238 243 252 / 82%);
  font-size: 12px;
}

.moving-player {
  position: absolute;
  right: 14px;
  bottom: 14px;
  left: 14px;
  z-index: 410;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: linear-gradient(180deg, rgb(11 16 32 / 62%) 0%, rgb(11 16 32 / 86%) 100%);
  border: 1px solid rgb(255 255 255 / 24%);
  border-radius: 12px;
  backdrop-filter: blur(8px);
}

.moving-player-mask {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  justify-content: center;
  align-items: center;
  color: rgb(238 243 252 / 88%);
  background: rgb(11 16 32 / 70%);
  border-radius: 12px;
}

.moving-player-progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.moving-slider {
  width: 100%;
}

.moving-player-time {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  color: rgb(238 243 252 / 82%);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  background: rgb(255 255 255 / 8%);
  border: 1px solid rgb(255 255 255 / 20%);
  border-radius: 999px;
}

.moving-player-time-separator {
  color: rgb(238 243 252 / 55%);
}

.moving-player-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.moving-player-controls-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px 12px;
}

.moving-player-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.moving-control-btn {
  min-width: 70px;
}

.moving-icon-btn {
  min-width: 34px;
  width: 34px;
  padding-right: 0;
  padding-left: 0;
}

.moving-control-icon {
  font-size: 14px;
  line-height: 1;
}

.moving-speed-btn {
  min-width: 96px;
}

.moving-player-switches {
  display: flex;
  align-items: center;
  gap: 14px;
  color: rgb(238 243 252 / 82%);
}

.moving-loop-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  user-select: none;
}

:deep(.moving-slider .n-slider-rail) {
  background: rgb(255 255 255 / 20%);
}

:deep(.moving-slider .n-slider-rail__fill) {
  background: #409EFF;
}

@media (max-width: 860px) {
  .moving-demo-map {
    height: 560px;
  }

  .moving-player-meta {
    top: 8px;
    right: 8px;
    left: 8px;
  }

  .moving-player {
    right: 8px;
    bottom: 8px;
    left: 8px;
    padding: 10px;
  }

  .moving-player-buttons {
    width: 100%;
    gap: 6px;
  }

  .moving-player-time {
    margin-left: auto;
  }

  .moving-player-switches {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }

  .moving-loop-toggle {
    width: 100%;
    justify-content: space-between;
    padding: 0 2px;
    font-size: 12px;
  }

  .moving-player-controls-main {
    width: 100%;
    flex-wrap: wrap;
  }

  .moving-player-time {
    justify-content: flex-end;
  }

  .moving-speed-btn {
    min-width: 88px;
  }

  .moving-icon-btn {
    min-width: 32px;
    width: 32px;
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
