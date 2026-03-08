<script setup lang="ts">
defineProps<{
  disabled: boolean
  followViewEnabled: boolean
  loopEnabled: boolean
}>()

const emit = defineEmits<{
  followViewEnabledChange: [value: boolean]
  loopEnabledChange: [value: boolean]
}>()

// 开关样式是播放器内部共识的一部分，和具体页面无关，
// 收在独立子组件里后，后续迁移到其他轨迹播放器也不用再次复制这套皮肤配置。
const playerSwitchThemeOverrides = {
  railColor: 'rgba(23, 26, 31, 0.12)',
  railColorActive: 'var(--ui-accent)',
  buttonColor: '#fff',
  boxShadowFocus: '0 0 0 2px var(--ui-accent-soft)',
  loadingColor: 'var(--ui-accent)',
}
</script>

<template>
  <div class="moving-player-switches">
    <div class="moving-loop-toggle">
      <n-switch
        :value="followViewEnabled"
        :theme-overrides="playerSwitchThemeOverrides"
        :disabled="disabled"
        size="small"
        @update:value="emit('followViewEnabledChange', $event)"
      />
      <span>视角跟随</span>
    </div>

    <div class="moving-loop-toggle">
      <n-switch
        :value="loopEnabled"
        :theme-overrides="playerSwitchThemeOverrides"
        :disabled="disabled"
        size="small"
        @update:value="emit('loopEnabledChange', $event)"
      />
      <span>循环播放</span>
    </div>
  </div>
</template>

<style scoped>
.moving-player-switches {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--muted);
  flex-wrap: nowrap;
  min-width: max-content;
}

.moving-loop-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  user-select: none;
}

:deep(.moving-player-switches .n-switch) {
  --n-rail-color: rgb(23 26 31 / 12%);
  --n-rail-color-active: var(--ui-accent);
  --n-button-color: #fff;
  --n-button-box-shadow: 0 1px 3px rgb(17 23 38 / 14%);
  --n-box-shadow-focus: 0 0 0 2px var(--ui-accent-soft);
  --n-loading-color: var(--ui-accent);
}
</style>
