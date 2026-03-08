<script setup lang="ts">
import { brandLogoLabel, brandLogoSvgMarkup } from '@/site/brand'

// 当前动画细节已经封装在 SVG 真源里，组件只负责站点级展示容器和无障碍语义，
// 避免再用 JS 解析路径数据，把素材结构的变化放大成组件实现变更。
</script>

<template>
  <span
    class="logo-mark"
    role="img"
    :aria-label="brandLogoLabel"
    v-html="brandLogoSvgMarkup"
  />
</template>

<style scoped>
.logo-mark {
  width: 100%;
  height: 100%;
  display: block;
  line-height: 0;
}

.logo-mark :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}
</style>
