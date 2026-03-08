<script setup lang="ts">
defineProps<{
  currentTimeText: string
  endTimeText: string
}>()
</script>

<template>
  <div class="moving-player-time">
    <span>{{ currentTimeText }}</span>
    <span class="moving-player-time-separator">/</span>
    <span>{{ endTimeText }}</span>
  </div>
</template>

<style scoped>
.moving-player-time {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 27px;
  padding: 0 8px;
  color: var(--muted);
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  background: rgb(255 255 255 / 78%);
  border: 1px solid rgb(23 26 31 / 14%);
  border-radius: 999px;
}

.moving-player-time-separator {
  color: var(--muted-2);
}
</style>
