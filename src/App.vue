<script setup lang="ts">
import ArtPlumTree from '@/components/art/ArtPlumTree.vue'
import Logo from '@/components/Logo.vue'
import MapDemoSection from '@/components/MapDemoSection.vue'
import MovingMarkerDemoSection from '@/components/MovingMarkerDemoSection.vue'
import ProfileTopSection from '@/components/ProfileTopSection.vue'
</script>

<template>
  <main
    id="top"
    class="site-stage"
  >
    <a
      class="site-brand-link"
      href="/"
      aria-label="Novick Yuan @ novcky.me"
    >
      <Logo class="site-brand-logo" />
    </a>

    <ArtPlumTree />

    <div class="container site-shell">
      <ProfileTopSection class="site-block" />

      <section class="site-separator">
        <p class="site-separator-kicker">
          Case Collection
        </p>
        <h2 class="site-separator-title">
          精选案例
        </h2>
        <p class="site-separator-note">
          以真实业务场景为背景，聚焦轨迹回放与要素编辑两类高频地图交互能力，强调可复用与可维护的工程落地。
        </p>
        <div class="site-case-glance">
          <article class="site-case-card">
            <p class="site-case-card-kicker">
              Case 01
            </p>
            <h3 class="site-case-card-title">
              轨迹回放引擎
            </h3>
            <p class="site-case-card-desc">
              开源能力源码级改造，补齐时间轴状态与外部事件体系，稳定支撑连续倍速与进度跳转。
            </p>
            <div class="site-case-card-links">
              <a
                class="site-case-card-link"
                href="#case-moving-marker"
              >
                查看案例
              </a>
            </div>
          </article>
          <article class="site-case-card">
            <p class="site-case-card-kicker">
              Case 02
            </p>
            <h3 class="site-case-card-title">
              地图要素编辑
            </h3>
            <p class="site-case-card-desc">
              复刻并封装 Geoman 核心付费编辑链路，面向业务场景沉淀新增、切割、合并、删除能力。
            </p>
            <div class="site-case-card-links">
              <a
                class="site-case-card-link"
                href="#case-feature-tools"
              >
                查看案例
              </a>
            </div>
          </article>
        </div>
      </section>

      <MovingMarkerDemoSection class="site-block" />
      <MapDemoSection class="site-block" />

      <footer class="site-footer">
        <p class="site-footer-license">
          <a
            href="https://github.com/novcky/novcky.me/blob/main/LICENSE"
            target="_blank"
            rel="noreferrer"
          >
            MIT License
          </a>
          <span>2026-PRESENT © Novick Yuan</span>
        </p>
      </footer>
    </div>
  </main>
</template>
