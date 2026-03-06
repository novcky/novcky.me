<script setup lang="ts">
import MapDemoSection from '@/components/MapDemoSection.vue'
import MovingMarkerDemoSection from '@/components/MovingMarkerDemoSection.vue'
import ProfileTopSection from '@/components/ProfileTopSection.vue'
</script>

<template>
  <main class="container">
    <ProfileTopSection class="content-map" />
    <MovingMarkerDemoSection class="content-map" />
    <MapDemoSection class="content-map" />
  </main>
</template>
