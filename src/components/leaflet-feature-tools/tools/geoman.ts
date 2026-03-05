import type * as L from 'leaflet'

import type {
  GeomanInstance,
  NoticeType,
} from '../context'

type Notify = (type: NoticeType, message: string) => void

export function ensureGeoman(
  pm: GeomanInstance | null,
  notify: Notify,
  actionName: string,
) {
  if (pm)
    return true

  notify('error', `当前地图未初始化 Geoman，无法执行${actionName}`)
  return false
}

export function getDrawLayers(pm: GeomanInstance | null) {
  if (!pm)
    return [] as L.Layer[]

  if (typeof pm.getGeomanDrawLayers === 'function')
    return pm.getGeomanDrawLayers()

  if (typeof pm.getGeomanLayers === 'function') {
    const layers = pm.getGeomanLayers()
    return Array.isArray(layers) ? layers : []
  }

  return [] as L.Layer[]
}

export function clearDrawLayers(pm: GeomanInstance | null) {
  getDrawLayers(pm).forEach(layer => layer.remove())
}
