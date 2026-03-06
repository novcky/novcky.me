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
  top: -140px;
  right: -96px;
  width: 320px;
  height: 320px;
  background: radial-gradient(circle, rgb(46 91 255 / 10%) 0%, transparent 70%);
  pointer-events: none;
}

.profile-greeting {
  margin: 0;
  color: var(--muted-2);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.profile-name {
  margin: 10px 0 12px;
  font-size: clamp(32px, 5.4vw, 52px);
  line-height: 1.08;
  letter-spacing: -0.02em;
  font-weight: 560;
  font-family:
    'Iowan Old Style',
    'Palatino Linotype',
    'Source Han Serif SC',
    'Noto Serif SC',
    serif;
}

.profile-intro {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.84;
}

.find-me {
  margin-top: 20px;
  padding-top: 10px;
  border-top: 1px dashed rgb(23 26 31 / 16%);
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 18px;
}

.find-me-title {
  margin: 0;
  color: var(--muted-2);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.find-me-links {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px 14px;
}

.find-me-link {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  border-bottom: 1px solid transparent;
  color: var(--text);
  text-decoration: none;
  transition: border-color 0.2s, color 0.2s;
}

.find-me-link:hover {
  border-color: rgb(46 91 255 / 45%);
  color: var(--accent);
}

.find-me-label {
  color: var(--muted-2);
  font-size: 12px;
  line-height: 1.2;
}

.find-me-value {
  color: var(--text);
  font-size: 13px;
  line-height: 1.3;
  letter-spacing: 0.01em;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 860px) {
  .profile-intro {
    font-size: 13px;
    line-height: 1.72;
  }

  .find-me-links {
    gap: 8px 12px;
  }
}
</style>
