import type {
  Feature,
  LineString,
  MultiPolygon,
  Polygon,
} from 'geojson'
import type { Polyline } from 'leaflet'
import * as turf from '@turf/turf'
import * as L from 'leaflet'

type PolygonFeature = Feature<Polygon | MultiPolygon>

const colorList = ['#00FF66', '#66CCFF', '#FF0066', '#6600FF', '#FFCC00']

export function splitPolygon(feature: PolygonFeature, clipLine: Polyline) {
  const clipLineGeoJSON = clipLine.toGeoJSON() as Feature<LineString>

  try {
    const output = polygonCut(feature, clipLineGeoJSON)
    if (!output) {
      return {
        msg: '没有生成切割结果，请检查切割线是否与图斑正确相交',
      }
    }

    const resultLayers = output.features.map((cutPolygon, index) => {
      const color = colorList[index % colorList.length]
      return L.geoJSON(cutPolygon, {
        style: {
          color,
          fillColor: color,
          fillOpacity: 0.26,
        },
      })
    })

    return {
      resultLayers,
    }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : '未知异常'
    return {
      msg: `切割失败：${message}`,
    }
  }
}

function polygonCut(feature: PolygonFeature, line: Feature<LineString>) {
  if (!hasIntersections(feature, line) || isEndpointInsidePolygon(line, feature))
    return null

  const offsetLines = generateOffsetLines(line, 1)
  const cutPolygons = getCutPolygons(feature, line, offsetLines)

  return cutPolygons.length > 0
    ? turf.featureCollection(cutPolygons)
    : null
}

function hasIntersections(
  polygon: PolygonFeature,
  line: Feature<LineString>,
) {
  const intersectPoints = turf.lineIntersect(polygon, line)
  return intersectPoints.features.length > 0
}

function isEndpointInsidePolygon(
  line: Feature<LineString>,
  polygon: PolygonFeature,
) {
  const lineCoords = turf.getCoords(line)
  const startInside = turf.booleanWithin(turf.point(lineCoords[0]), polygon)
  const endInside = turf.booleanWithin(turf.point(lineCoords[lineCoords.length - 1]), polygon)
  return startInside || endInside
}

function generateOffsetLines(
  line: Feature<LineString>,
  distance: number,
  units: turf.Units = 'meters',
) {
  const options = { units }
  return [
    turf.lineOffset(line, distance, options),
    turf.lineOffset(line, -distance, options),
  ]
}

function getCutPolygons(
  feature: PolygonFeature,
  line: Feature<LineString>,
  offsetLines: Feature<LineString>[],
) {
  const polygons = feature.geometry.type === 'MultiPolygon'
    ? feature.geometry.coordinates.map(coords => turf.polygon(coords))
    : [feature as Feature<Polygon>]

  const cutPolygons: Feature<Polygon>[] = []
  const untouchedPolygons: Feature<Polygon>[] = []

  polygons.forEach((polygon) => {
    if (!hasIntersections(polygon, line) || isEndpointInsidePolygon(line, polygon)) {
      untouchedPolygons.push(polygon)
      return
    }

    offsetLines.forEach((offsetLine, index) => {
      const thickLinePolygon = createThickLinePolygon(line, offsetLine)
      const clipped = turf.difference(turf.featureCollection([polygon, thickLinePolygon]))
      if (!clipped)
        return

      const clippedPolygons = clipped.geometry.type === 'MultiPolygon'
        ? clipped.geometry.coordinates.map(coords => turf.polygon(coords))
        : [clipped as Feature<Polygon>]

      clippedPolygons.forEach((polygonFragment) => {
        const intersects = turf.lineIntersect(
          polygonFragment,
          offsetLines[(index + 1) % 2],
        )
        if (intersects.features.length > 0)
          cutPolygons.push(polygonFragment)
      })
    })
  })

  if (feature.geometry.type === 'MultiPolygon' && untouchedPolygons.length > 0 && cutPolygons[0]) {
    untouchedPolygons.forEach((polygon) => {
      const unionResult = turf.union(turf.featureCollection([cutPolygons[0], polygon]))
      if (unionResult)
        cutPolygons[0] = unionResult as Feature<Polygon>
    })
  }

  return cutPolygons
}

function createThickLinePolygon(
  line: Feature<LineString>,
  offsetLine: Feature<LineString>,
) {
  const polygonCoords = [
    ...line.geometry.coordinates,
    ...offsetLine.geometry.coordinates.reverse(),
    line.geometry.coordinates[0],
  ]

  return turf.lineToPolygon(turf.lineString(polygonCoords))
}
