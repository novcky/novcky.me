import type * as LeafletTypes from 'leaflet'
import * as Leaflet from 'leaflet'

enum MovingMarkerState {
  NotStarted = 0,
  Ended = 1,
  Paused = 2,
  Running = 3,
}

interface InternalMovingMarkerOptions extends Leaflet.MarkerOptions {
  autostart?: boolean
  loop?: boolean
}

type StationDurationMap = Record<number, number>

function interpolatePosition(
  startPosition: LeafletTypes.LatLng,
  endPosition: LeafletTypes.LatLng,
  duration: number,
  elapsedTime: number,
) {
  const progress = Math.min(Math.max(elapsedTime / duration, 0), 1)
  return Leaflet.latLng(
    startPosition.lat + progress * (endPosition.lat - startPosition.lat),
    startPosition.lng + progress * (endPosition.lng - startPosition.lng),
  )
}

export class MovingMarker extends Leaflet.Marker {
  private latlngs: LeafletTypes.LatLng[]
  private durations: number[]
  private currentDuration = 0
  private currentIndex = 0
  private currentLine: LeafletTypes.LatLng[] = []
  private lineProgressOffset = 0
  private stations: StationDurationMap = {}
  private state = MovingMarkerState.NotStarted
  private startTime = 0
  private startTimestamp = 0
  private pauseStartTime = 0
  private animationFrameId = 0
  private animationRequested = false

  constructor(
    latlngs: LeafletTypes.LatLngExpression[],
    durations: number[] | number,
    options: InternalMovingMarkerOptions = {},
  ) {
    if (!latlngs.length)
      throw new Error('MovingMarker 初始化失败：latlngs 不能为空')

    super(latlngs[0], options)

    this.latlngs = latlngs.map(item => Leaflet.latLng(item))
    this.durations = Array.isArray(durations)
      ? [...durations]
      : this.createDurationsByTotalDuration(this.latlngs, durations)

    if (this.durations.length !== this.latlngs.length - 1) {
      throw new Error('MovingMarker 初始化失败：durations 长度需等于轨迹段数')
    }

    this.loadLine(0)
  }

  public isRunning() {
    return this.state === MovingMarkerState.Running
  }

  public isEnded() {
    return this.state === MovingMarkerState.Ended
  }

  public isStarted() {
    return this.state !== MovingMarkerState.NotStarted
  }

  public isPaused() {
    return this.state === MovingMarkerState.Paused
  }

  public override onAdd(map: LeafletTypes.Map) {
    super.onAdd(map)

    const options = this.options as InternalMovingMarkerOptions
    if (options.autostart && !this.isStarted()) {
      this.start()
      return this
    }

    if (this.isRunning())
      this.resumeAnimation()

    return this
  }

  public override onRemove(map: LeafletTypes.Map) {
    super.onRemove(map)
    this.stopAnimation()
    return this
  }

  public start() {
    if (this.isRunning())
      return

    if (this.isPaused()) {
      this.resume()
      return
    }

    this.loadLine(Math.min(this.currentIndex, this.latlngs.length - 2))
    this.startAnimation()
    this.fire('start')
  }

  public resume(speedOffset = 0) {
    if (!this.isPaused())
      return

    const currentLatLng = this.getLatLng()
    const lineStart = this.currentLine[0]
    const lineEnd = this.currentLine[1]

    // 恢复播放时会把当前段起点重置到“当前位置”；若不保留已走比例，外部进度会被回退到整点索引。
    const lineDistance = lineStart?.distanceTo(lineEnd) ?? 0
    const passedDistance = lineStart?.distanceTo(currentLatLng) ?? 0
    const relativeConsumedProgress = lineDistance > 0
      ? Math.min(Math.max(passedDistance / lineDistance, 0), 1)
      : 0
    // currentLine[0] 可能已是上次恢复时的“中间点”，需要叠加历史偏移，避免连续调速时进度再次回退。
    const consumedProgress = Math.min(
      Math.max(
        this.lineProgressOffset + relativeConsumedProgress * (1 - this.lineProgressOffset),
        0,
      ),
      1,
    )

    this.currentLine[0] = currentLatLng
    this.currentDuration *= (1 - relativeConsumedProgress)
    this.lineProgressOffset = consumedProgress

    // 调速后必须重算当前分段剩余时长，否则会出现“瞬移”或“卡死”的体验问题。
    if (speedOffset > 0) {
      this.currentDuration = this.currentDuration / speedOffset
    }
    else if (speedOffset < 0) {
      this.currentDuration = this.currentDuration * Math.abs(speedOffset)
    }

    this.startAnimation()
  }

  public pause() {
    if (!this.isRunning())
      return

    this.pauseStartTime = Date.now()
    this.state = MovingMarkerState.Paused
    this.stopAnimation()
    this.updatePositionByTime()
  }

  public stop(elapsedTime = 0) {
    if (this.isEnded())
      return

    this.stopAnimation()

    if (elapsedTime === 0)
      this.updatePositionByTime()

    this.state = MovingMarkerState.Ended
    this.fire('end', { elapsedTime })
  }

  public addLatLng(latlng: LeafletTypes.LatLngExpression, duration: number) {
    this.latlngs.push(Leaflet.latLng(latlng))
    this.durations.push(duration)
  }

  public moveTo(latlng: LeafletTypes.LatLngExpression, duration: number) {
    this.stopAnimation()
    this.latlngs = [this.getLatLng(), Leaflet.latLng(latlng)]
    this.durations = [duration]
    this.state = MovingMarkerState.NotStarted
    this.start()
    const options = this.options as InternalMovingMarkerOptions
    options.loop = false
  }

  public addStation(pointIndex: number, duration: number) {
    if (pointIndex > this.latlngs.length - 2 || pointIndex < 1)
      return

    this.stations[pointIndex] = duration
  }

  public setDurations(nextDurations: number[]) {
    if (nextDurations.length !== this.latlngs.length - 1)
      return

    this.durations = [...nextDurations]
  }

  public setLoopEnabled(loopEnabled: boolean) {
    const options = this.options as InternalMovingMarkerOptions
    options.loop = loopEnabled
  }

  public playFromLine(lineIndex: number) {
    const maxLineIndex = Math.max(this.latlngs.length - 2, 0)
    const safeIndex = Math.min(Math.max(lineIndex, 0), maxLineIndex)
    this.stopAnimation()
    this.loadLine(safeIndex)
    this.startAnimation()
  }

  public playFromProgress(progress: number) {
    const maxPointIndex = Math.max(this.latlngs.length - 1, 0)
    const clampedProgress = Math.min(Math.max(progress, 0), maxPointIndex)
    const maxLineIndex = Math.max(this.latlngs.length - 2, 0)
    const lineIndex = Math.min(Math.floor(clampedProgress), maxLineIndex)
    const lineProgress = Math.min(Math.max(clampedProgress - lineIndex, 0), 1)

    this.stopAnimation()
    this.loadLine(lineIndex)

    // 从拖拽定位的进度恢复时，需要把分段已走时长带入动画起点，否则会回跳到分段起点。
    this.startAnimation(this.currentDuration * lineProgress)
  }

  private createDurationsByTotalDuration(latlngs: LeafletTypes.LatLng[], totalDuration: number) {
    const lastIndex = latlngs.length - 1
    const distances: number[] = []
    let totalDistance = 0

    for (let index = 0; index < lastIndex; index += 1) {
      const distance = latlngs[index + 1].distanceTo(latlngs[index])
      distances.push(distance)
      totalDistance += distance
    }

    const durationRatio = totalDuration / totalDistance
    return distances.map(distance => distance * durationRatio)
  }

  private startAnimation(initialElapsedTime = 0) {
    this.state = MovingMarkerState.Running
    this.animationFrameId = Leaflet.Util.requestAnimFrame((frameTimestamp) => {
      this.startTime = Date.now() - initialElapsedTime
      this.startTimestamp = frameTimestamp - initialElapsedTime
      this.animate(frameTimestamp)
    }, this, true)
    this.animationRequested = true
  }

  private resumeAnimation() {
    if (this.animationRequested)
      return

    this.animationRequested = true
    this.animationFrameId = Leaflet.Util.requestAnimFrame((frameTimestamp) => {
      this.animate(frameTimestamp)
    }, this, true)
  }

  private stopAnimation() {
    if (!this.animationRequested)
      return

    Leaflet.Util.cancelAnimFrame(this.animationFrameId)
    this.animationRequested = false
  }

  private updatePositionByTime() {
    const elapsedTime = Date.now() - this.startTime
    this.animate(this.startTimestamp + elapsedTime, true)
  }

  private loadLine(index: number) {
    this.currentIndex = index
    this.currentDuration = this.durations[index]
    this.currentLine = this.latlngs.slice(index, index + 2)
    this.lineProgressOffset = 0
  }

  private updateLine(frameTimestamp: number) {
    let elapsedTime = frameTimestamp - this.startTimestamp
    if (elapsedTime <= this.currentDuration)
      return elapsedTime

    let lineIndex = this.currentIndex
    let lineDuration = this.currentDuration

    while (elapsedTime > lineDuration) {
      elapsedTime -= lineDuration
      const stationDuration = this.stations[lineIndex + 1]

      if (stationDuration !== undefined) {
        if (elapsedTime < stationDuration) {
          this.setLatLng(this.latlngs[lineIndex + 1])
          return null
        }
        elapsedTime -= stationDuration
      }

      lineIndex += 1
      this.fire('updateLine', { lineIndex })

      if (lineIndex >= this.latlngs.length - 1) {
        const options = this.options as InternalMovingMarkerOptions
        if (options.loop) {
          lineIndex = 0
          this.fire('loop', { elapsedTime })
        }
        else {
          this.setLatLng(this.latlngs[this.latlngs.length - 1])
          this.stop(elapsedTime)
          return null
        }
      }

      lineDuration = this.durations[lineIndex]
    }

    this.loadLine(lineIndex)
    this.startTimestamp = frameTimestamp - elapsedTime
    this.startTime = Date.now() - elapsedTime
    return elapsedTime
  }

  private animate(frameTimestamp: number, skipRequestNextFrame = false) {
    this.animationRequested = false
    const elapsedTime = this.updateLine(frameTimestamp)

    if (this.isEnded())
      return

    if (elapsedTime !== null) {
      const nextPosition = interpolatePosition(
        this.currentLine[0],
        this.currentLine[1],
        this.currentDuration,
        elapsedTime,
      )
      this.setLatLng(nextPosition)
      const rawLineProgress = this.currentDuration > 0
        ? Math.min(Math.max(elapsedTime / this.currentDuration, 0), 1)
        : 0
      const lineProgress = Math.min(
        Math.max(this.lineProgressOffset + rawLineProgress * (1 - this.lineProgressOffset), 0),
        1,
      )
      this.fire('updateProgress', {
        lineIndex: this.currentIndex,
        lineProgress,
        progress: this.currentIndex + lineProgress,
      })
    }
    else {
      this.fire('updateProgress', {
        lineIndex: this.currentIndex,
        lineProgress: 1,
        progress: this.currentIndex + 1,
      })
    }

    if (skipRequestNextFrame || !this.isRunning())
      return

    this.animationFrameId = Leaflet.Util.requestAnimFrame(
      this.animate,
      this,
      false,
    )
    this.animationRequested = true
  }
}

export function createMovingMarker(
  latlngs: LeafletTypes.LatLngExpression[],
  durations: number[] | number,
  options?: InternalMovingMarkerOptions,
) {
  return new MovingMarker(latlngs, durations, options)
}
