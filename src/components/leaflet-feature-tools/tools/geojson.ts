import type {
  Feature,
  FeatureCollection,
  GeoJsonObject,
  Geometry,
  MultiPolygon,
  Polygon,
} from 'geojson'

type PolygonFeature = Feature<Polygon | MultiPolygon>

function isPolygonGeometry(geometry: Geometry): geometry is Polygon | MultiPolygon {
  return geometry.type === 'Polygon' || geometry.type === 'MultiPolygon'
}

export function extractGeometry(
  geojson: GeoJsonObject | Feature | FeatureCollection,
): Polygon | MultiPolygon | null {
  if (geojson.type === 'Feature') {
    if (!geojson.geometry || !isPolygonGeometry(geojson.geometry))
      return null
    return geojson.geometry
  }

  if (geojson.type === 'FeatureCollection') {
    const targetFeature = geojson.features.find(
      (feature): feature is PolygonFeature => Boolean(feature.geometry && isPolygonGeometry(feature.geometry)),
    )
    return targetFeature?.geometry ?? null
  }

  if (isPolygonGeometry(geojson as Geometry))
    return geojson as Polygon | MultiPolygon

  return null
}

export function extractPolygonFeatures(
  geojson: GeoJsonObject | Feature | FeatureCollection,
): PolygonFeature[] {
  if (geojson.type === 'Feature') {
    if (geojson.geometry && isPolygonGeometry(geojson.geometry))
      return [geojson as PolygonFeature]
    return []
  }

  if (geojson.type === 'FeatureCollection') {
    return geojson.features.filter(
      (feature): feature is PolygonFeature => Boolean(feature.geometry && isPolygonGeometry(feature.geometry)),
    )
  }

  if (isPolygonGeometry(geojson as Geometry))
    return [{ type: 'Feature', geometry: geojson as Polygon | MultiPolygon, properties: {} }]

  return []
}
