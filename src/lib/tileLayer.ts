import type * as L from 'leaflet'
import * as Leaflet from 'leaflet'

interface TileSource {
  name: string
  options: L.TileLayerOptions
  url: string
}

interface AttachBaseTileLayerOptions {
  onFallback?: (previousSourceName: string, nextSourceName: string) => void
}

export interface BaseTileLayerController {
  dispose: () => void
}

// 单个瓦片失败常见于瞬时网络抖动，使用连续失败阈值可避免错误切源导致的底图闪烁。
const TILE_ERROR_THRESHOLD = 6

const DEFAULT_TILE_SOURCES: TileSource[] = [
  {
    name: 'Amap',
    url: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}',
    options: {
      attribution: '&copy; 高德地图',
      maxZoom: 18,
      subdomains: ['1', '2', '3', '4'],
    },
  },
  {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    },
  },
]

function resolveTileSources() {
  const customTileUrl = import.meta.env.VITE_MAP_TILE_URL?.trim()
  if (!customTileUrl)
    return DEFAULT_TILE_SOURCES

  const customAttribution = import.meta.env.VITE_MAP_TILE_ATTRIBUTION?.trim()
  // 自定义底图用于生产配置；若不可达仍保留内置回退，避免页面出现空白地图。
  return [
    {
      name: 'Custom',
      url: customTileUrl,
      options: {
        attribution: customAttribution || '&copy; Custom Map Provider',
        maxZoom: 19,
      },
    },
    ...DEFAULT_TILE_SOURCES,
  ]
}

export function attachBaseTileLayer(
  map: L.Map,
  options: AttachBaseTileLayerOptions = {},
): BaseTileLayerController {
  const tileSources = resolveTileSources()
  let sourceIndex = 0
  let continuousErrorCount = 0
  let currentLayer: L.TileLayer

  function resetErrorCount() {
    continuousErrorCount = 0
  }

  function handleTileError() {
    continuousErrorCount += 1
    const nextSource = tileSources[sourceIndex + 1]
    if (continuousErrorCount < TILE_ERROR_THRESHOLD || !nextSource)
      return

    const previousSourceName = tileSources[sourceIndex].name
    sourceIndex += 1
    continuousErrorCount = 0

    unmountLayer(currentLayer)
    currentLayer = mountLayer(nextSource)
    options.onFallback?.(previousSourceName, nextSource.name)
  }

  function mountLayer(source: TileSource) {
    const layer = Leaflet.tileLayer(source.url, source.options)
    layer.on('load', resetErrorCount)
    layer.on('tileerror', handleTileError)
    layer.addTo(map)
    return layer
  }

  function unmountLayer(layer: L.TileLayer) {
    layer.off('load', resetErrorCount)
    layer.off('tileerror', handleTileError)
    if (map.hasLayer(layer))
      map.removeLayer(layer)
  }

  currentLayer = mountLayer(tileSources[sourceIndex])

  return {
    dispose() {
      unmountLayer(currentLayer)
    },
  }
}
