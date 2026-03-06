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
          <span
            class="find-me-icon"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.49v-1.73c-2.77.6-3.36-1.33-3.36-1.33-.45-1.14-1.1-1.44-1.1-1.44-.9-.61.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.33 1.09 2.89.83.09-.65.35-1.09.63-1.34-2.21-.25-4.54-1.11-4.54-4.93 0-1.09.39-1.98 1.03-2.68-.11-.25-.45-1.28.1-2.67 0 0 .85-.27 2.78 1.02A9.7 9.7 0 0 1 12 6.82c.86 0 1.73.12 2.54.36 1.93-1.3 2.77-1.02 2.77-1.02.56 1.39.22 2.42.11 2.67.64.7 1.03 1.59 1.03 2.68 0 3.83-2.33 4.68-4.55 4.92.36.32.67.95.67 1.92V21c0 .27.18.58.69.49A10 10 0 0 0 12 2Z"
              />
            </svg>
          </span>
          <span class="find-me-content">
            <span class="find-me-label">GitHub</span>
            <span class="find-me-value">@novcky</span>
          </span>
        </a>
        <a
          class="find-me-link"
          href="mailto:hi@novcky.me"
        >
          <span
            class="find-me-icon"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M3.5 6.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-11Zm2 .5v.2l6.5 4.86L18.5 7.2V7h-13Zm13 2.06-6.05 4.53a.75.75 0 0 1-.9 0L5.5 9.06v8.44h13V9.06Z"
              />
            </svg>
          </span>
          <span class="find-me-content">
            <span class="find-me-label">Email</span>
            <span class="find-me-value">hi@novcky.me</span>
          </span>
        </a>
        <a
          class="find-me-link"
          href="https://novcky.me"
          target="_blank"
          rel="noreferrer"
        >
          <span
            class="find-me-icon"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19Zm6.78 8.75h-3.03a15.7 15.7 0 0 0-1.08-5.2 8.03 8.03 0 0 1 4.11 5.2ZM12 4.03c.73 0 1.78 2.16 2.21 7.22H9.79C10.22 6.19 11.27 4.03 12 4.03Zm-2.96 2.02a15.7 15.7 0 0 0-1.08 5.2H4.93a8.03 8.03 0 0 1 4.11-5.2Zm-4.11 6.7h3.03c.11 1.87.48 3.67 1.08 5.2a8.03 8.03 0 0 1-4.11-5.2Zm5.05 0h4.04C13.78 17.81 12.73 19.97 12 19.97c-.73 0-1.78-2.16-2.02-7.22Zm5.98 5.2a15.7 15.7 0 0 0 1.08-5.2h3.03a8.03 8.03 0 0 1-4.11 5.2Z"
              />
            </svg>
          </span>
          <span class="find-me-content">
            <span class="find-me-label">Blog</span>
            <span class="find-me-value">novcky.me</span>
          </span>
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
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.find-me-link {
  min-height: 36px;
  padding: 6px 9px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgb(23 26 31 / 14%);
  border-radius: 9px;
  background: rgb(255 255 255 / 72%);
  color: var(--text);
  text-decoration: none;
  transition: border-color 0.2s, color 0.2s, background 0.2s, transform 0.2s;
}

.find-me-link:hover {
  border-color: var(--link-border-hover);
  background: rgb(23 26 31 / 4%);
  color: var(--link-hover);
  transform: translateY(-1px);
}

.find-me-icon {
  width: 15px;
  height: 15px;
  flex: 0 0 15px;
  color: currentColor;
}

.find-me-icon svg {
  width: 100%;
  height: 100%;
  display: block;
}

.find-me-content {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
}

.find-me-label {
  color: var(--muted-2);
  font-size: 11px;
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
