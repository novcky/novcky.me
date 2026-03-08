<script setup lang="ts">
import type { MovingPlayerStatus } from '@/composables/useMovingMarkerPlayer'

interface SpeedDropdownOption {
  key: string | number
  label: string
}

defineProps<{
  disabled: boolean
  speedButtonText: string
  speedDropdownOptions: SpeedDropdownOption[]
  status: MovingPlayerStatus
}>()

const emit = defineEmits<{
  speedSelect: [value: string | number]
  stop: []
  togglePlay: []
}>()

function handleSpeedSelect(value: string | number) {
  emit('speedSelect', value)
}
</script>

<template>
  <div class="moving-player-buttons">
    <n-tooltip trigger="hover">
      <template #trigger>
        <n-button
          :aria-label="status === 'play' ? '暂停' : '播放'"
          :disabled="disabled"
          class="moving-control-btn moving-icon-btn"
          round
          size="small"
          @click="emit('togglePlay')"
        >
          <span
            class="moving-control-icon"
            aria-hidden="true"
          >
            <svg
              v-if="status === 'play'"
              viewBox="0 0 20 20"
            >
              <rect
                x="4.5"
                y="4"
                width="4"
                height="12"
                rx="1.4"
                fill="currentColor"
              />
              <rect
                x="11.5"
                y="4"
                width="4"
                height="12"
                rx="1.4"
                fill="currentColor"
              />
            </svg>
            <svg
              v-else
              viewBox="0 0 20 20"
            >
              <path
                fill="currentColor"
                d="M6 4.75a1 1 0 0 1 1.53-.85l8.5 5.25a1 1 0 0 1 0 1.7L7.53 16.1A1 1 0 0 1 6 15.25V4.75Z"
              />
            </svg>
          </span>
        </n-button>
      </template>
      {{ status === 'play' ? '暂停' : '播放' }}
    </n-tooltip>

    <n-tooltip trigger="hover">
      <template #trigger>
        <n-button
          aria-label="停止"
          :disabled="disabled || status === 'stop'"
          class="moving-control-btn moving-icon-btn"
          round
          size="small"
          @click="emit('stop')"
        >
          <span
            class="moving-control-icon"
            aria-hidden="true"
          >
            <svg viewBox="0 0 20 20">
              <rect
                x="4.75"
                y="4.75"
                width="10.5"
                height="10.5"
                rx="2.2"
                fill="currentColor"
              />
            </svg>
          </span>
        </n-button>
      </template>
      停止
    </n-tooltip>

    <n-dropdown
      :disabled="disabled"
      :options="speedDropdownOptions"
      placement="top-start"
      trigger="click"
      @select="handleSpeedSelect"
    >
      <n-button
        class="moving-control-btn moving-speed-btn"
        round
        size="small"
      >
        <span class="moving-speed-btn-text">{{ speedButtonText }}</span>
        <span
          class="moving-speed-btn-caret"
          aria-hidden="true"
        >▾</span>
      </n-button>
    </n-dropdown>
  </div>
</template>

<style scoped>
.moving-player-buttons {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  min-width: 0;
}

.moving-control-btn {
  --n-color: rgb(255 255 255 / 88%);
  --n-color-hover: #fff;
  --n-color-pressed: rgb(244 244 240);
  --n-color-focus: #fff;
  --n-border: 1px solid rgb(23 26 31 / 12%);
  --n-border-hover: 1px solid rgb(23 26 31 / 16%);
  --n-border-pressed: 1px solid rgb(23 26 31 / 16%);
  --n-border-focus: 1px solid rgb(23 26 31 / 16%);
  --n-ripple-color: transparent;
  --n-text-color: var(--muted);
  --n-text-color-hover: var(--text);
  --n-text-color-pressed: var(--text);
  --n-text-color-focus: var(--text);
  min-width: 62px;
}

.moving-icon-btn {
  min-width: 31px;
  width: 31px;
  padding-right: 0;
  padding-left: 0;
}

:deep(.moving-control-btn .n-button__content) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.moving-control-icon {
  width: 13px;
  height: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.moving-control-icon svg {
  width: 100%;
  height: 100%;
  display: block;
}

.moving-speed-btn {
  min-width: 58px;
  padding-right: 9px;
  padding-left: 10px;
}

.moving-speed-btn-text {
  display: inline-block;
  min-width: 4.2ch;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.moving-speed-btn-caret {
  color: var(--muted-2);
  font-size: 11px;
  transform: translateY(1px);
}

@media (max-width: 860px) {
  .moving-player-buttons {
    width: 100%;
    gap: 6px;
  }

  .moving-speed-btn {
    min-width: 60px;
    padding-right: 10px;
    padding-left: 10px;
  }

  .moving-icon-btn {
    min-width: 32px;
    width: 32px;
  }
}
</style>
