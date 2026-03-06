<template>
  <section class="card section profile-top">
    <p class="profile-greeting">
      Hi, I&apos;m
    </p>
    <h1 class="profile-name">
      Novick Yuan
    </h1>
    <p class="profile-intro">专注 WebGIS 前端与地图交互工程化，这里聚焦两个核心案例：轨迹回放引擎源码改造、要素编辑工具能力沉淀。目标是验证复杂交互在真实业务场景中的可复用性与稳定性。</p>
    <div class="profile-links">
      <a
        class="profile-link"
        href="https://github.com/novcky"
        target="_blank"
        rel="noreferrer"
      >
        GitHub
      </a>
      <a
        class="profile-link"
        href="https://novcky.me"
        target="_blank"
        rel="noreferrer"
      >
        Blog
      </a>
      <!-- <a
        class="profile-link"
        href="mailto:hi@novcky.me"
      >
        Email
      </a> -->
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

.profile-links {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.profile-link {
  padding: 5px 10px;
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  line-height: 1;
  color: rgb(255 255 255 / 88%);
  text-decoration: none;
  border: 1px solid rgb(255 255 255 / 24%);
  border-radius: 999px;
  background: rgb(255 255 255 / 4%);
  transition: all 0.2s;
}

.profile-link:hover {
  color: #ffffff;
  border-color: rgb(106 166 255 / 58%);
  background: rgb(106 166 255 / 20%);
}

@media (max-width: 860px) {
  .profile-intro {
    font-size: 12px;
  }
}
</style>
