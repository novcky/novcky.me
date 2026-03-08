import naive from 'naive-ui'
import { createApp } from 'vue'
import { applyBrandFavicon } from '@/site/brand'

import App from './App.vue'
import '@geoman-io/leaflet-geoman-free'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'

import 'leaflet/dist/leaflet.css'
import './styles/main.css'

// favicon 也走统一品牌入口，避免站点入口和页面组件各自引用一份素材路径。
applyBrandFavicon()

createApp(App)
  .use(naive)
  .mount('#app')
