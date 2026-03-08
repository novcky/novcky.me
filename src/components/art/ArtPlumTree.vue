<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

type PendingBranchStep = () => void

interface BranchDepthCounter {
  value: number
}

const canvasRef = ref<HTMLCanvasElement | null>(null)

const FRAME_INTERVAL = 1000 / 40
const MIN_BRANCH_DEPTH = 30
const SEGMENT_LENGTH = 6
const HALF_TURN = Math.PI
const QUARTER_TURN = Math.PI / 2
const BRANCH_SPREAD = Math.PI / 12
const BRANCH_COLOR = 'rgba(136, 136, 136, 0.14)'

let context: CanvasRenderingContext2D | null = null
let canvasWidth = 0
let canvasHeight = 0
let animationFrameId = 0
let lastFrameTime = 0
let pendingSteps: PendingBranchStep[] = []
let motionQuery: MediaQueryList | null = null

function pickMiddleSeedRatio() {
  return Math.random() * 0.6 + 0.2
}

function polarToCartesian(x: number, y: number, radius: number, theta: number) {
  return {
    x: x + radius * Math.cos(theta),
    y: y + radius * Math.sin(theta),
  }
}

function isOutOfBounds(x: number, y: number) {
  return x < -100 || x > canvasWidth + 100 || y < -100 || y > canvasHeight + 100
}

function growBranch(x: number, y: number, radians: number, counter: BranchDepthCounter = { value: 0 }) {
  if (!context)
    return

  const segment = Math.random() * SEGMENT_LENGTH
  const next = polarToCartesian(x, y, segment, radians)
  counter.value += 1

  context.beginPath()
  context.moveTo(x, y)
  context.lineTo(next.x, next.y)
  context.stroke()

  if (isOutOfBounds(next.x, next.y))
    return

  const leftRadians = radians + Math.random() * BRANCH_SPREAD
  const rightRadians = radians - Math.random() * BRANCH_SPREAD
  // 共享计数器是这类生成树枝保留“先主干、后末梢”疏密节奏的关键：
  // 同一支系走得越深，后续分叉率越低，画面才不会太快糊成一片。
  const branchRate = counter.value <= MIN_BRANCH_DEPTH ? 0.8 : 0.5

  if (Math.random() < branchRate)
    pendingSteps.push(() => growBranch(next.x, next.y, leftRadians, counter))

  if (Math.random() < branchRate)
    pendingSteps.push(() => growBranch(next.x, next.y, rightRadians, counter))
}

function seedTreeEdges() {
  pendingSteps = [
    () => growBranch(pickMiddleSeedRatio() * canvasWidth, -5, QUARTER_TURN),
    () => growBranch(pickMiddleSeedRatio() * canvasWidth, canvasHeight + 5, -QUARTER_TURN),
    () => growBranch(-5, pickMiddleSeedRatio() * canvasHeight, 0),
    () => growBranch(canvasWidth + 5, pickMiddleSeedRatio() * canvasHeight, HALF_TURN),
  ]

  if (window.innerWidth < 500)
    pendingSteps = pendingSteps.slice(0, 2)
}

function stopAnimation() {
  if (!animationFrameId)
    return

  window.cancelAnimationFrame(animationFrameId)
  animationFrameId = 0
}

function drawAllImmediately() {
  let guard = 0

  while (pendingSteps.length > 0 && guard < 1200) {
    const steps = pendingSteps
    pendingSteps = []
    steps.forEach(step => step())
    guard += 1
  }
}

function tick(timestamp: number) {
  animationFrameId = window.requestAnimationFrame(tick)

  if (timestamp - lastFrameTime < FRAME_INTERVAL)
    return

  lastFrameTime = timestamp
  const steps = pendingSteps
  pendingSteps = []

  if (!steps.length) {
    stopAnimation()
    return
  }

  // 延后执行一部分分枝，避免每一帧所有枝条同步推进后瞬间糊成面。
  steps.forEach((step) => {
    if (Math.random() < 0.5)
      pendingSteps.push(step)
    else
      step()
  })
}

function resetCanvas() {
  if (!context)
    return

  context.clearRect(0, 0, canvasWidth, canvasHeight)
  context.lineWidth = 1
  context.strokeStyle = BRANCH_COLOR
  context.lineCap = 'round'
  context.lineJoin = 'round'
}

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas)
    return

  const dpr = window.devicePixelRatio || 1
  canvasWidth = window.innerWidth
  canvasHeight = window.innerHeight

  canvas.width = Math.floor(canvasWidth * dpr)
  canvas.height = Math.floor(canvasHeight * dpr)
  canvas.style.width = `${canvasWidth}px`
  canvas.style.height = `${canvasHeight}px`

  context = canvas.getContext('2d')
  if (!context)
    return

  // 先重置再按 DPR 缩放，避免 resize 多次后矩阵叠乘，导致细线越来越粗。
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.scale(dpr, dpr)
  start()
}

function start() {
  if (!context)
    return

  stopAnimation()
  resetCanvas()
  seedTreeEdges()
  lastFrameTime = 0

  // reduced motion 下直接一次性画完，保留构图而不制造持续运动。
  if (motionQuery?.matches) {
    drawAllImmediately()
    return
  }

  animationFrameId = window.requestAnimationFrame(tick)
}

function handleResize() {
  resizeCanvas()
}

function handleMotionChange() {
  start()
}

onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  resizeCanvas()
  window.addEventListener('resize', handleResize)
  motionQuery.addEventListener('change', handleMotionChange)
})

onBeforeUnmount(() => {
  stopAnimation()
  window.removeEventListener('resize', handleResize)
  motionQuery?.removeEventListener('change', handleMotionChange)
})
</script>

<template>
  <div
    class="art-plum-tree"
    aria-hidden="true"
  >
    <canvas ref="canvasRef" />
  </div>
</template>

<style scoped>
.art-plum-tree {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
  opacity: 0.92;
  mask-image: radial-gradient(circle at 50% 42%, transparent 12%, #000 70%);
}

.art-plum-tree canvas {
  width: 100%;
  height: 100%;
  display: block;
}

@media (max-width: 860px) {
  .art-plum-tree {
    opacity: 0.78;
    mask-image: radial-gradient(circle at 50% 48%, transparent 18%, #000 74%);
  }
}
</style>
