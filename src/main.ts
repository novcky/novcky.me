import naive from 'naive-ui'
import { createApp } from 'vue'
import App from './App.vue'

import '@geoman-io/leaflet-geoman-free'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import 'leaflet/dist/leaflet.css'

import './styles/main.css'

createApp(App)
  .use(naive)
  .mount('#app')
