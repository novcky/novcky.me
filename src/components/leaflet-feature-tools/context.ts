import type { MultiPolygon, Polygon } from 'geojson'
import type * as L from 'leaflet'
import type { ComputedRef, InjectionKey, Ref } from 'vue'

export type NoticeType = 'success' | 'warning' | 'error' | 'info'

export interface DemoFeature {
  id: string
  properties: Record<string, unknown>
  geometry: Polygon | MultiPolygon
}

export interface OperationResult {
  status: number
  data: string
}

export interface NewFeatureInput {
  geometry: Polygon | MultiPolygon
  properties?: Record<string, unknown>
}

export interface FeatureRepository {
  queryByPoint: (point: L.LatLng) => Promise<DemoFeature | null>
  addFeatures: (items: NewFeatureInput[]) => Promise<OperationResult>
  updateFeatureGeometry: (id: string, geometry: Polygon | MultiPolygon) => Promise<OperationResult>
  deleteFeatures: (ids: string[]) => Promise<OperationResult>
  reloadLayer: () => void
}

export interface GeomanInstance {
  enableDraw?: (shape: string, options?: Record<string, unknown>) => void
  disableDraw?: () => void
  getGeomanDrawLayers?: () => L.Layer[]
  getGeomanLayers?: (...args: unknown[]) => L.Layer[]
  enableGlobalEditMode?: () => void
  disableGlobalEditMode?: () => void
}

export interface FeatureToolsContext {
  activeComponent: Ref<string>
  clearPolygonGroup: () => void
  curFeatures: Ref<DemoFeature[]>
  curLayerName: ComputedRef<string>
  drawFeature: (feature: DemoFeature) => void
  map: ComputedRef<L.Map | null>
  mergePolygon: (layers: L.Layer[]) => {
    mergeResult?: GeoJSON.Feature<Polygon | MultiPolygon>
    message?: string
  }
  notify: (type: NoticeType, message: string) => void
  pm: ComputedRef<GeomanInstance | null>
  polygonGroup: L.FeatureGroup
  repository: FeatureRepository
  reloadLayer: () => void
  setActiveComponent: (componentName?: string) => void
  setEnableMapClickEvents: (newValue: boolean) => void
  setMultipleMode: (newValue: boolean) => void
  splitPolygon: (feature: GeoJSON.Feature<Polygon | MultiPolygon>, clipLine: L.Polyline) => {
    resultLayers?: L.GeoJSON[]
    msg?: string
  }
  confirm: (message: string) => Promise<boolean>
}

export const FEATURE_TOOLS_INJECTION_KEY: InjectionKey<FeatureToolsContext> = Symbol('feature-tools')
