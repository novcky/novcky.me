import type { MultiPolygon, Polygon } from 'geojson'
import type { PathOptions } from 'leaflet'
import * as turf from '@turf/turf'
import * as L from 'leaflet'

export function drawPolygon(options: {
  geometry: Polygon | MultiPolygon
  styleOptions?: PathOptions
}) {
  const { geometry, styleOptions = {} } = options

  const polygons = geometry.type === 'MultiPolygon'
    ? geometry.coordinates.map(coords => turf.polygon(coords))
    : [turf.polygon(geometry.coordinates)]

  const unionResult = polygons.length > 1
    ? turf.union(turf.featureCollection(polygons))
    : polygons[0]

  if (!unionResult)
    throw new Error('无法生成图斑图层')

  return L.geoJSON(unionResult, {
    style: () => ({
      color: '#3A7AFE',
      fillColor: '#3A7AFE',
      fillOpacity: 0.24,
      weight: 2,
      ...styleOptions,
    }),
  })
}
