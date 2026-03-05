<script setup lang="ts">
import type * as L from 'leaflet'
import type { TrajectoryRecord } from '@/constants/movingTrajectory'

import type { MovingMarker } from '@/lib/movingMarker'
import * as Leaflet from 'leaflet'

import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import { movingTrajectoryData } from '@/constants/movingTrajectory'
import { createMovingMarker } from '@/lib/movingMarker'

type PlayerStatus = 'stop' | 'play' | 'pause'

const mapElement = ref<HTMLDivElement | null>(null)
const mapInstance = shallowRef<L.Map | null>(null)
const movingMarker = shallowRef<MovingMarker | null>(null)
const routePolyline = shallowRef<L.Polyline | null>(null)
const endpointMarkers = shallowRef<[L.CircleMarker | null, L.CircleMarker | null]>([null, null])

const trajectoryLatlngs = movingTrajectoryData.map(item => Leaflet.latLng(item.lat, item.lng))

const player = reactive({
  status: 'stop' as PlayerStatus,
  sliderValue: 0,
  sliderMin: 0,
  sliderMax: Math.max(movingTrajectoryData.length - 1, 0),
  segmentDuration: 1500,
  selectSpeed: 1,
  loopEnabled: true,
  speedCheckpoint: null as number | null,
  speedOffset: 0,
  speedOptions: [
    { label: '1.0x', value: 1 },
    { label: '1.5x', value: 1.5 },
    { label: '2.0x', value: 2 },
    { label: '5.0x', value: 5 },
    { label: '10.0x', value: 10 },
  ],
})

const hasTrajectory = computed(() => trajectoryLatlngs.length > 1)

const currentRecord = computed<TrajectoryRecord | null>(() => {
  return movingTrajectoryData[player.sliderValue] ?? null
})

const currentTimeText = computed(() => formatTime(currentRecord.value?.recordTime))
const endTimeText = computed(() => formatTime(movingTrajectoryData.at(-1)?.recordTime))
const userNameText = computed(() => currentRecord.value?.userName ?? '-')
const workAreaText = computed(() => currentRecord.value?.workArea ?? '-')
const lineNameText = computed(() => currentRecord.value?.lineName ?? '-')
const speedText = computed(() => currentRecord.value?.speed ?? 0)

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

function handleSliderInput(event: Event) {
  const marker = movingMarker.value
  if (!marker)
    return

  const target = event.target as HTMLInputElement
  const targetIndex = clampSliderValue(Number(target.value))
  setSliderValue(targetIndex)

  if (!marker.isPaused())
    marker.pause()

  marker.setLatLng(trajectoryLatlngs[targetIndex])
  updateMarkerTooltip()
}

function handleSliderChange(event: Event) {
  const marker = movingMarker.value
  if (!marker)
    return

  const target = event.target as HTMLInputElement
  const targetIndex = clampSliderValue(Number(target.value))
  setSliderValue(targetIndex)

  marker.playFromLine(targetIndex)
  if (player.status !== 'play') {
    // 进度条拖拽后需回到原状态，避免“停住时拖动却自动继续播放”。
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

    marker.playFromLine(player.sliderValue)
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
  setSliderValue(0)
  marker.setLatLng(trajectoryLatlngs[0])
  updateMarkerTooltip()
}

function initTrajectoryLayers(map: L.Map) {
  if (!hasTrajectory.value)
    return

  routePolyline.value = Leaflet.polyline(trajectoryLatlngs, {
    color: '#67C23A',
    weight: 3,
    opacity: 0.85,
    dashArray: '8 8',
  }).addTo(map)

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

  marker.on('updateLine', (event: L.LeafletEvent & { lineIndex?: number }) => {
    const lineIndex = typeof event.lineIndex === 'number'
      ? event.lineIndex
      : 0

    setSliderValue(lineIndex)
    updateMarkerTooltip()
  })

  marker.on('end', () => {
    player.status = 'stop'
    setSliderValue(player.sliderMax)
    updateMarkerTooltip()
  })

  marker.on('loop', () => {
    player.status = 'play'
    setSliderValue(0)
    updateMarkerTooltip()
  })

  movingMarker.value = marker
  updateMarkerTooltip()
}

function destroyMovingMarkerLayer() {
  const map = mapInstance.value
  const marker = movingMarker.value
  if (!map || !marker)
    return

  marker.off('start')
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
  Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)

  mapInstance.value = map
  initTrajectoryLayers(map)
  initMovingMarkerLayer(map)
})

onBeforeUnmount(() => {
  destroyMovingMarkerLayer()
  destroyTrajectoryLayers()
  mapInstance.value?.remove()
  mapInstance.value = null
})
</script>

<template>
  <section class="card section">
    <h2>轨迹回放（MovingMarker）</h2>

    <div class="moving-demo-layout">
      <div
        ref="mapElement"
        class="map moving-demo-map"
        aria-label="轨迹回放地图"
      />

      <div class="moving-player">
        <div
          v-if="!hasTrajectory"
          class="moving-player-mask"
        >
          暂无轨迹数据
        </div>

        <header class="moving-player-header">
          <strong class="moving-player-name">{{ userNameText }}</strong>
          <span class="moving-player-area">{{ workAreaText }}</span>
        </header>

        <div class="moving-player-progress">
          <input
            :value="player.sliderValue"
            :min="player.sliderMin"
            :max="player.sliderMax"
            class="moving-slider"
            type="range"
            @input="handleSliderInput"
            @change="handleSliderChange"
          >
          <div class="moving-player-time">
            <span>{{ currentTimeText }}</span>
            <span>{{ endTimeText }}</span>
          </div>
        </div>

        <div class="moving-player-controls">
          <div class="moving-player-buttons">
            <button
              class="moving-btn moving-btn-primary"
              type="button"
              @click="togglePlay"
            >
              {{ player.status === 'play' ? '暂停' : '播放' }}
            </button>
            <button
              class="moving-btn moving-btn-danger"
              type="button"
              :disabled="player.status === 'stop'"
              @click="stopPlayer"
            >
              停止
            </button>
            <select
              v-model.number="player.selectSpeed"
              class="moving-speed-select"
            >
              <option
                v-for="item in player.speedOptions"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </option>
            </select>
            <label class="moving-loop-toggle">
              <input
                v-model="player.loopEnabled"
                class="moving-loop-checkbox"
                type="checkbox"
              >
              循环播放
            </label>
          </div>

          <div class="moving-player-line">
            <span>{{ lineNameText }}</span>
            <span>{{ speedText }} km/h</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.moving-demo-layout {
  padding: 12px;
  display: grid;
  gap: 12px;
}

.moving-demo-map {
  height: 620px;
}

.moving-player {
  position: relative;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgb(255 255 255 / 4%);
  border: 1px solid var(--panel-border);
  border-radius: 14px;
}

.moving-player-mask {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--muted-2);
  background: rgb(11 16 32 / 70%);
  border-radius: 14px;
}

.moving-player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.moving-player-name {
  font-size: 18px;
}

.moving-player-area {
  color: var(--muted);
  font-size: 13px;
}

.moving-player-progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.moving-slider {
  width: 100%;
}

.moving-player-time {
  display: flex;
  justify-content: space-between;
  color: var(--muted);
  font-size: 12px;
}

.moving-player-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px 14px;
  flex-wrap: wrap;
}

.moving-player-buttons {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.moving-btn {
  min-width: 80px;
  height: 32px;
  padding: 0 12px;
  border: none;
  border-radius: 8px;
  color: #fff;
  white-space: nowrap;
  cursor: pointer;
}

.moving-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.moving-btn-primary {
  background: #409EFF;
}

.moving-btn-danger {
  background: #f56c6c;
}

.moving-speed-select {
  min-width: 90px;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--panel-border);
  border-radius: 8px;
  color: var(--text);
  background: rgb(255 255 255 / 8%);
}

.moving-speed-select option {
  color: #1f2937;
  background: #fff;
}

.moving-loop-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 13px;
  user-select: none;
}

.moving-loop-checkbox {
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: #409EFF;
  cursor: pointer;
}

.moving-player-line {
  display: flex;
  align-items: center;
  gap: 16px;
  color: var(--muted);
  font-size: 14px;
}

@media (max-width: 860px) {
  .moving-demo-map {
    height: 560px;
  }

  .moving-player-header {
    flex-wrap: wrap;
  }

  .moving-player-line {
    width: 100%;
    justify-content: space-between;
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
