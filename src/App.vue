<script setup lang="ts">
import CasesSection from '@/components/CasesSection.vue'
import ChallengesSection from '@/components/ChallengesSection.vue'
import HeroSection from '@/components/HeroSection.vue'
import MapDemoSection from '@/components/MapDemoSection.vue'
import MovingMarkerDemoSection from '@/components/MovingMarkerDemoSection.vue'
</script>

<template>
  <main class="container">
    <HeroSection />
    <section class="content-grid">
      <CasesSection />
      <ChallengesSection />
    </section>
    <MapDemoSection class="content-map" />
    <MovingMarkerDemoSection class="content-map" />
  </main>
</template>
