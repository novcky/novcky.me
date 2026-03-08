import type * as L from 'leaflet'
import type { TrajectoryRecord } from '@/constants/movingTrajectory'

import * as Leaflet from 'leaflet'
import { computed, reactive } from 'vue'

export type MovingPlayerStatus = 'stop' | 'play' | 'pause'

interface UseMovingMarkerPlayerOptions {
  trajectoryData: TrajectoryRecord[]
  trajectoryLatlngs: L.LatLng[]
}

export function useMovingMarkerPlayer(options: UseMovingMarkerPlayerOptions) {
  const { trajectoryData, trajectoryLatlngs } = options

  // 播放器的展示状态、时间插值和轨迹进度换算都只依赖当前轨迹数据，
  // 先从页面组件中拆出来，避免后续继续把地图生命周期和 UI 状态揉进同一个大文件。
  const player = reactive({
    status: 'stop' as MovingPlayerStatus,
    sliderValue: 0,
    sliderMin: 0,
    sliderMax: Math.max(trajectoryData.length - 1, 0),
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
    const maxIndex = Math.max(trajectoryData.length - 1, 0)
    return Math.min(Math.max(Math.floor(player.sliderValue), 0), maxIndex)
  })

  const currentRecord = computed<TrajectoryRecord | null>(() => {
    return trajectoryData[currentRecordIndex.value] ?? null
  })

  const currentTimeText = computed(() => {
    const startIndex = currentRecordIndex.value
    const endIndex = Math.min(startIndex + 1, trajectoryData.length - 1)
    const startTimeText = trajectoryData[startIndex]?.recordTime
    const endTimeTextValue = trajectoryData[endIndex]?.recordTime
    if (!startTimeText || !endTimeTextValue)
      return formatTime(startTimeText)

    const startTimestamp = new Date(startTimeText).getTime()
    const endTimestamp = new Date(endTimeTextValue).getTime()
    if (Number.isNaN(startTimestamp) || Number.isNaN(endTimestamp))
      return formatTime(startTimeText)

    // 进度条已经是连续值，这里同步按分段比例插值，避免时间显示重新退化成“逐点跳变”。
    const lineProgress = Math.min(Math.max(player.sliderValue - startIndex, 0), 1)
    const currentTimestamp = startTimestamp + (endTimestamp - startTimestamp) * lineProgress
    return new Date(currentTimestamp).toLocaleString('zh-CN', { hour12: false })
  })

  const endTimeText = computed(() => formatTime(trajectoryData.at(-1)?.recordTime))
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

  return {
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
  }
}

function formatTime(timeText?: string) {
  if (!timeText)
    return '-'

  const timeValue = new Date(timeText)
  if (Number.isNaN(timeValue.getTime()))
    return '-'

  return timeValue.toLocaleString('zh-CN', { hour12: false })
}
