import type { MultiPolygon, Polygon } from 'geojson'
import type * as L from 'leaflet'
import type {
  DemoFeature,
  NewFeatureInput,
  OperationResult,
} from '@/components/leaflet-feature-tools/context'
import * as turf from '@turf/turf'

import { ref } from 'vue'

const successResult: OperationResult = {
  status: 200,
  data: 'wfs:SUCCESS',
}

export function useLeafletFeatureStore(initialFeatures: DemoFeature[]) {
  const features = ref<DemoFeature[]>(cloneFeatureList(initialFeatures))
  let idSeed = features.value.length + 1

  function queryByPoint(point: L.LatLng) {
    const targetPoint = turf.point([point.lng, point.lat])

    for (let index = features.value.length - 1; index >= 0; index -= 1) {
      const feature = features.value[index]
      const polygon = feature.geometry.type === 'Polygon'
        ? turf.polygon(feature.geometry.coordinates)
        : turf.multiPolygon(feature.geometry.coordinates)

      if (turf.booleanPointInPolygon(targetPoint, polygon))
        return feature
    }

    return null
  }

  function addFeatures(items: NewFeatureInput[]) {
    const newFeatures: DemoFeature[] = items.map(item => ({
      id: `demo.${idSeed++}`,
      properties: {
        ...(item.properties ?? {}),
      },
      geometry: cloneGeometry(item.geometry),
    }))

    features.value = [...features.value, ...newFeatures]
    return successResult
  }

  function updateFeatureGeometry(id: string, geometry: Polygon | MultiPolygon) {
    features.value = features.value.map((feature) => {
      if (feature.id !== id)
        return feature

      return {
        ...feature,
        geometry: cloneGeometry(geometry),
      }
    })

    return successResult
  }

  function deleteFeatures(ids: string[]) {
    const removeIds = new Set(ids)
    features.value = features.value.filter(feature => !removeIds.has(feature.id))
    return successResult
  }

  return {
    addFeatures,
    deleteFeatures,
    features,
    queryByPoint,
    updateFeatureGeometry,
  }
}

function cloneFeatureList(features: DemoFeature[]) {
  return features.map(feature => ({
    ...feature,
    properties: {
      ...feature.properties,
    },
    geometry: cloneGeometry(feature.geometry),
  }))
}

function cloneGeometry(geometry: Polygon | MultiPolygon) {
  // 图形编辑会原地修改坐标数组，这里必须深拷贝，否则会污染历史状态并导致回滚失效。
  return JSON.parse(JSON.stringify(geometry)) as Polygon | MultiPolygon
}
