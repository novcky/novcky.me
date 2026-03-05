import type { MultiPolygon, Polygon } from 'geojson'
import type { Layer } from 'leaflet'
import * as turf from '@turf/turf'

import { extractPolygonFeatures } from './geojson'

export function mergePolygon(layers: Layer[]) {
  try {
    const layerPolygons = layers.flatMap((layer) => {
      if (!('toGeoJSON' in layer))
        return []

      const features = extractPolygonFeatures(layer.toGeoJSON())
      if (features.length < 1)
        return []

      // 同一个图层可能包含 MultiPolygon，先做内部合并再参与总合并，避免后续 union 结果不稳定。
      const unionResult = features.length > 1
        ? turf.union(turf.featureCollection(features))
        : features[0]

      return unionResult ? [unionResult] : []
    })

    if (layerPolygons.length < 2) {
      return {
        message: '请至少选择两个可合并的图斑',
      }
    }

    const mergeResult = turf.union(turf.featureCollection(layerPolygons))
    if (!mergeResult) {
      return {
        message: '要素无有效交集，无法合并',
      }
    }

    return {
      mergeResult: mergeResult as GeoJSON.Feature<Polygon | MultiPolygon>,
    }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : '未知异常'
    return {
      message: `合并失败：${message}`,
    }
  }
}
