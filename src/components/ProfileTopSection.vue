<template>
  <section class="card section profile-top">
    <div class="profile-copy">
      <p class="profile-greeting">
        Hi, I&apos;m
      </p>
      <h1 class="profile-name">
        Novick Yuan
      </h1>
      <p class="profile-paragraph">
        专注 WebGIS 前端与地图交互工程化，这里会围绕
        <a
          class="site-inline-link"
          href="#case-moving-marker"
        >轨迹回放引擎</a>
        与
        <a
          class="site-inline-link"
          href="#case-feature-tools"
        >地图要素编辑</a>
        两类案例展开，目标是验证复杂地图交互在真实业务场景中的可复用性与稳定性。
      </p>
      <p class="profile-paragraph">
        更关注连续交互、状态同步、工具抽象与长期维护，尽量把“能跑的 Demo”收敛成“可复用的工程能力”，而不是只停留在展示层效果。
      </p>

      <div class="profile-connect">
        <p class="profile-connect-inline">
          <span class="profile-connect-lead">Find me on</span>
          <a
            class="profile-contact-link"
            href="https://github.com/novcky"
            target="_blank"
            rel="noreferrer"
          >
            <span
              class="profile-contact-icon"
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.49v-1.73c-2.77.6-3.36-1.33-3.36-1.33-.45-1.14-1.1-1.44-1.1-1.44-.9-.61.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.33 1.09 2.89.83.09-.65.35-1.09.63-1.34-2.21-.25-4.54-1.11-4.54-4.93 0-1.09.39-1.98 1.03-2.68-.11-.25-.45-1.28.1-2.67 0 0 .85-.27 2.78 1.02A9.7 9.7 0 0 1 12 6.82c.86 0 1.73.12 2.54.36 1.93-1.3 2.77-1.02 2.77-1.02.56 1.39.22 2.42.11 2.67.64.7 1.03 1.59 1.03 2.68 0 3.83-2.33 4.68-4.55 4.92.36.32.67.95.67 1.92V21c0 .27.18.58.69.49A10 10 0 0 0 12 2Z"
                />
              </svg>
            </span>
            <span>GitHub</span>
          </a>
          <a
            class="profile-contact-link"
            href="mailto:hi@novcky.me"
          >
            <span
              class="profile-contact-icon"
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M3.5 6.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-11Zm2 .5v.2l6.5 4.86L18.5 7.2V7h-13Zm13 2.06-6.05 4.53a.75.75 0 0 1-.9 0L5.5 9.06v8.44h13V9.06Z"
                />
              </svg>
            </span>
            <span>hi@novcky.me</span>
          </a>
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.profile-top {
  position: relative;
  overflow: hidden;
}

.profile-top::before {
  content: '';
  position: absolute;
  top: 24px;
  right: 4%;
  width: 196px;
  height: 144px;
  background: radial-gradient(circle, rgb(23 26 31 / 5%) 0.9px, transparent 1px);
  background-size: 18px 18px;
  mask-image: radial-gradient(circle at 56% 46%, #000 16%, rgb(0 0 0 / 58%) 44%, transparent 82%);
  opacity: 0.11;
  pointer-events: none;
}

.profile-top::after {
  content: '';
  position: absolute;
  right: -120px;
  bottom: -150px;
  width: 340px;
  height: 340px;
  background: radial-gradient(circle, rgb(46 91 255 / 5.5%) 0%, transparent 68%);
  pointer-events: none;
}

.profile-copy {
  position: relative;
  z-index: 1;
  max-width: min(100%, 92ch);
}

.profile-greeting {
  margin: 0;
  color: var(--muted-2);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.profile-name {
  margin: 8px 0 18px;
  font-size: clamp(36px, 4.8vw, 50px);
  line-height: 1.08;
  letter-spacing: -0.025em;
  font-weight: 560;
  font-family:
    'Iowan Old Style',
    'Palatino Linotype',
    'Source Han Serif SC',
    'Noto Serif SC',
    serif;
}

.profile-paragraph {
  margin: 0;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.88;
}

.profile-paragraph + .profile-paragraph {
  margin-top: 10px;
}

.profile-connect {
  margin-top: 26px;
  padding-top: 18px;
  border-top: 1px solid rgb(23 26 31 / 10%);
}

.profile-connect-inline {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 12px;
  color: rgb(85 85 85);
  font-size: 16px;
  line-height: 28px;
}

.profile-connect-lead {
  color: rgb(85 85 85);
}

.profile-contact-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: rgb(0 0 0);
  text-decoration: none;
  border-bottom: 0;
  transition: color 0.2s ease, opacity 0.2s ease;
}

.profile-contact-link:hover {
  color: rgb(0 0 0 / 78%);
}

.profile-contact-link:focus-visible {
  outline: 2px solid rgb(23 26 31 / 14%);
  outline-offset: 2px;
  border-radius: 6px;
}

.profile-contact-icon {
  width: 11px;
  height: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgb(85 85 85 / 92%);
  flex: 0 0 auto;
  transform: translateY(0.5px);
}

.profile-contact-icon svg {
  width: 100%;
  height: 100%;
}

@media (max-width: 860px) {
  .profile-top::before {
    right: 2%;
    bottom: 18px;
    top: auto;
    width: 150px;
    height: 118px;
    opacity: 0.1;
  }

  .profile-top::after {
    right: -124px;
    bottom: -158px;
    width: 300px;
    height: 300px;
  }

  .profile-copy {
    max-width: none;
  }

  .profile-name {
    font-size: clamp(34px, 8vw, 44px);
  }

  .profile-paragraph {
    font-size: 14px;
    line-height: 1.82;
  }

  .profile-connect-inline {
    font-size: 15px;
    line-height: 26px;
  }
}
</style>
