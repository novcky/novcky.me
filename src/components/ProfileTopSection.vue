<template>
  <section class="card section profile-top">
    <p class="profile-greeting">
      Hi, I&apos;m
    </p>
    <h1 class="profile-name">
      Novick Yuan
    </h1>
    <p class="profile-intro">专注 WebGIS 前端与地图交互工程化，这里聚焦两个核心案例：轨迹回放引擎源码改造、要素编辑工具能力沉淀。目标是验证复杂交互在真实业务场景中的可复用性与稳定性。</p>
    <div class="find-me">
      <p class="find-me-title">
        Find me on
      </p>
      <div class="find-me-links">
        <a
          class="find-me-link"
          href="https://github.com/novcky"
          target="_blank"
          rel="noreferrer"
        >
          <span class="find-me-label">GitHub</span>
          <span class="find-me-value">@novcky</span>
        </a>
        <a
          class="find-me-link"
          href="mailto:hi@novcky.me"
        >
          <span class="find-me-label">Email</span>
          <span class="find-me-value">hi@novcky.me</span>
        </a>
        <a
          class="find-me-link"
          href="https://novcky.me"
          target="_blank"
          rel="noreferrer"
        >
          <span class="find-me-label">Blog</span>
          <span class="find-me-value">novcky.me</span>
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.profile-top {
  position: relative;
  overflow: hidden;
}

.profile-top::after {
  content: '';
  position: absolute;
  top: -88px;
  right: -88px;
  width: 210px;
  height: 210px;
  background: radial-gradient(circle, rgb(106 166 255 / 30%) 0%, transparent 70%);
  pointer-events: none;
}

.profile-greeting {
  margin: 0;
  font-size: 13px;
  color: rgb(255 255 255 / 70%);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.profile-name {
  margin: 4px 0 8px;
  font-size: clamp(24px, 5vw, 34px);
  line-height: 1.1;
}

.profile-intro {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: rgb(255 255 255 / 78%);
}

.find-me {
  margin-top: 14px;
  padding: 10px 12px 12px;
  border: 1px solid rgb(255 255 255 / 15%);
  border-radius: 12px;
  background: rgb(255 255 255 / 4%);
  backdrop-filter: blur(6px);
}

.find-me-title {
  margin: 0;
  color: rgb(255 255 255 / 84%);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.find-me-links {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.find-me-link {
  padding: 8px 10px;
  display: inline-flex;
  flex-direction: column;
  gap: 3px;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 10px;
  background: rgb(255 255 255 / 3%);
  color: rgb(255 255 255 / 90%);
  text-decoration: none;
  transition: border-color 0.2s, background-color 0.2s, transform 0.2s;
}

.find-me-link:hover {
  border-color: rgb(106 166 255 / 58%);
  background: rgb(106 166 255 / 16%);
  transform: translateY(-1px);
}

.find-me-label {
  color: rgb(255 255 255 / 62%);
  font-size: 11px;
  line-height: 1.2;
}

.find-me-value {
  color: rgb(255 255 255 / 92%);
  font-size: 12px;
  line-height: 1.3;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 860px) {
  .profile-intro {
    font-size: 12px;
  }

  .find-me-links {
    grid-template-columns: 1fr;
  }
}
</style>
