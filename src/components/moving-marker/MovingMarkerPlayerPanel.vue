<script setup lang="ts">
import type { MovingPlayerStatus } from '@/composables/useMovingMarkerPlayer'

import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import MovingMarkerPlayerButtons from '@/components/moving-marker/MovingMarkerPlayerButtons.vue'
import MovingMarkerPlayerSwitches from '@/components/moving-marker/MovingMarkerPlayerSwitches.vue'
import MovingMarkerPlayerTimeBadge from '@/components/moving-marker/MovingMarkerPlayerTimeBadge.vue'

type PlayerControlLayout = 'single' | 'double' | 'triple'

interface SpeedDropdownOption {
  key: string | number
  label: string
}

defineProps<{
  currentTimeText: string
  disabled: boolean
  endTimeText: string
  followViewEnabled: boolean
  loopEnabled: boolean
  sliderMax: number
  sliderMin: number
  sliderValue: number
  speedButtonText: string
  speedDropdownOptions: SpeedDropdownOption[]
  status: MovingPlayerStatus
}>()

const emit = defineEmits<{
  followViewEnabledChange: [value: boolean]
  loopEnabledChange: [value: boolean]
  sliderCommit: []
  sliderUpdate: [value: number | number[]]
  speedSelect: [value: string | number]
  stop: []
  togglePlay: []
}>()

const playerControlsRef = ref<HTMLDivElement | null>(null)
const playerButtonsRef = ref<HTMLDivElement | null>(null)
const playerSwitchesRef = ref<HTMLDivElement | null>(null)
const playerTimeRef = ref<HTMLDivElement | null>(null)
const playerControlLayout = ref<PlayerControlLayout>('single')

let controlsLayoutAnimationFrameId = 0
let controlsLayoutObserver: ResizeObserver | null = null

function schedulePlayerControlLayoutUpdate() {
  if (controlsLayoutAnimationFrameId)
    window.cancelAnimationFrame(controlsLayoutAnimationFrameId)

  controlsLayoutAnimationFrameId = window.requestAnimationFrame(() => {
    controlsLayoutAnimationFrameId = 0
    updatePlayerControlLayout()
  })
}

function updatePlayerControlLayout() {
  const controlsElement = playerControlsRef.value
  const buttonsElement = playerButtonsRef.value
  const switchesElement = playerSwitchesRef.value
  const timeElement = playerTimeRef.value
  if (!controlsElement || !buttonsElement || !switchesElement || !timeElement)
    return

  const containerWidth = controlsElement.clientWidth
  if (containerWidth <= 0)
    return

  const gap = 12
  const buttonsWidth = buttonsElement.scrollWidth
  const switchesWidth = switchesElement.scrollWidth
  const timeWidth = timeElement.scrollWidth

  const singleLineRequiredWidth = buttonsWidth + switchesWidth + timeWidth + gap * 2
  if (containerWidth >= singleLineRequiredWidth) {
    playerControlLayout.value = 'single'
    return
  }

  // 控件布局与真实 DOM 宽度强绑定，这部分留在面板内部，
  // 避免页面组件同时维护一组只为排版服务的 ref 和 observer。
  const doubleLineRequiredWidth = buttonsWidth + switchesWidth + gap
  if (containerWidth >= doubleLineRequiredWidth) {
    playerControlLayout.value = 'double'
    return
  }

  playerControlLayout.value = 'triple'
}

function bindPlayerControlLayoutObserver() {
  if (typeof window === 'undefined')
    return

  const observerTargets = [
    playerControlsRef.value,
    playerButtonsRef.value,
    playerSwitchesRef.value,
    playerTimeRef.value,
  ].filter(Boolean) as HTMLElement[]

  if (observerTargets.length === 0)
    return

  if ('ResizeObserver' in window) {
    controlsLayoutObserver = new ResizeObserver(() => {
      schedulePlayerControlLayoutUpdate()
    })
    observerTargets.forEach(target => controlsLayoutObserver?.observe(target))
    return
  }

  window.addEventListener('resize', schedulePlayerControlLayoutUpdate)
}

function unbindPlayerControlLayoutObserver() {
  controlsLayoutObserver?.disconnect()
  controlsLayoutObserver = null
  window.removeEventListener('resize', schedulePlayerControlLayoutUpdate)

  if (controlsLayoutAnimationFrameId)
    window.cancelAnimationFrame(controlsLayoutAnimationFrameId)
  controlsLayoutAnimationFrameId = 0
}

onMounted(() => {
  nextTick(() => {
    bindPlayerControlLayoutObserver()
    schedulePlayerControlLayoutUpdate()
  })
})

onBeforeUnmount(() => {
  unbindPlayerControlLayoutObserver()
})
</script>

<template>
  <div class="moving-player">
    <div
      v-if="disabled"
      class="moving-player-mask"
    >
      暂无轨迹数据
    </div>

    <div class="moving-player-progress">
      <n-slider
        :value="sliderValue"
        :min="sliderMin"
        :max="sliderMax"
        :disabled="disabled"
        :step="0.001"
        :tooltip="false"
        class="moving-slider"
        @update:value="emit('sliderUpdate', $event)"
        @dragend="emit('sliderCommit')"
        @change="emit('sliderCommit')"
      />
    </div>

    <div
      ref="playerControlsRef"
      class="moving-player-controls"
      :class="`moving-player-controls--${playerControlLayout}`"
    >
      <div class="moving-player-controls-main">
        <div
          ref="playerButtonsRef"
          class="moving-player-buttons-wrap"
        >
          <MovingMarkerPlayerButtons
            :disabled="disabled"
            :speed-button-text="speedButtonText"
            :speed-dropdown-options="speedDropdownOptions"
            :status="status"
            @speed-select="emit('speedSelect', $event)"
            @stop="emit('stop')"
            @toggle-play="emit('togglePlay')"
          />
        </div>
      </div>

      <div
        ref="playerSwitchesRef"
        class="moving-player-switches-wrap"
      >
        <MovingMarkerPlayerSwitches
          :disabled="disabled"
          :follow-view-enabled="followViewEnabled"
          :loop-enabled="loopEnabled"
          @follow-view-enabled-change="emit('followViewEnabledChange', $event)"
          @loop-enabled-change="emit('loopEnabledChange', $event)"
        />
      </div>

      <div
        ref="playerTimeRef"
        class="moving-player-time-wrap"
      >
        <MovingMarkerPlayerTimeBadge
          :current-time-text="currentTimeText"
          :end-time-text="endTimeText"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.moving-player {
  --moving-accent: var(--ui-accent);
  --moving-accent-soft: var(--ui-accent-weak-strong);
  --moving-accent-soft-strong: var(--ui-accent-soft);
  position: absolute;
  right: 14px;
  bottom: 14px;
  left: 14px;
  z-index: 410;
  padding: 8px 9px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  background: rgb(255 255 255 / 86%);
  border: 1px solid rgb(23 26 31 / 13%);
  border-radius: 12px;
  box-shadow: 0 10px 24px rgb(14 19 28 / 12%);
  backdrop-filter: blur(6px);
}

.moving-player-mask {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--muted);
  background: rgb(255 255 255 / 90%);
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

:deep(.moving-slider .n-slider-rail) {
  height: 4px;
  border-radius: 999px;
  background: rgb(23 26 31 / 9%);
}

:deep(.moving-slider .n-slider-rail__fill) {
  height: 4px;
  border-radius: 999px;
  background: var(--moving-accent) !important;
}

:deep(.moving-slider .n-slider-handle-indicator) {
  background: #fff !important;
  border: 2px solid var(--moving-accent) !important;
  box-shadow: 0 0 0 4px var(--moving-accent-soft) !important;
}

:deep(.moving-slider .n-slider-handle:hover .n-slider-handle-indicator),
:deep(.moving-slider .n-slider-handle.n-slider-handle--active .n-slider-handle-indicator) {
  border-color: var(--moving-accent) !important;
  box-shadow: 0 0 0 5px var(--moving-accent-soft-strong) !important;
}

:deep(.moving-slider .n-slider-dot--active) {
  border-color: var(--moving-accent) !important;
}

.moving-player-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px 9px;
}

.moving-player-controls-main {
  flex: 0 0 auto;
  min-width: 0;
}

.moving-player-buttons-wrap {
  min-width: 0;
}

.moving-player-switches-wrap {
  flex: 0 0 auto;
  min-width: max-content;
}

.moving-player-time-wrap {
  flex: 0 0 auto;
  margin-left: auto;
}

.moving-player-controls--double .moving-player-time-wrap {
  flex-basis: 100%;
  margin-left: 0;
}

.moving-player-controls--triple .moving-player-controls-main,
.moving-player-controls--triple .moving-player-switches-wrap,
.moving-player-controls--triple .moving-player-time-wrap {
  flex-basis: 100%;
}

.moving-player-controls--triple .moving-player-time-wrap {
  margin-left: 0;
}

@media (max-width: 860px) {
  .moving-player {
    right: 8px;
    bottom: 8px;
    left: 8px;
    padding: 10px;
  }
}
</style>
