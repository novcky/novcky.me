import type { DemoFeature } from '@/components/leaflet-feature-tools/context'

export const initialLeafletFeatures: DemoFeature[] = [
  {
    id: 'demo.1',
    properties: {
      QYMC: '示例地块 A',
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [108.305, 22.806],
        [108.329, 22.806],
        [108.329, 22.826],
        [108.305, 22.826],
        [108.305, 22.806],
      ]],
    },
  },
  {
    id: 'demo.2',
    properties: {
      QYMC: '示例地块 B',
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [108.329, 22.806],
        [108.352, 22.806],
        [108.352, 22.826],
        [108.329, 22.826],
        [108.329, 22.806],
      ]],
    },
  },
  {
    id: 'demo.3',
    properties: {
      QYMC: '示例地块 C',
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [108.312, 22.833],
        [108.344, 22.833],
        [108.344, 22.854],
        [108.312, 22.854],
        [108.312, 22.833],
      ]],
    },
  },
]
