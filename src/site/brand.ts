import logoSvgMarkup from '@/assets/novcky-favicon-animated.svg?raw'
import faviconHref from '@/assets/novcky-favicon.svg?url'

export const brandLogoLabel = 'Novick Yuan @ novcky.me'
// 动画 logo 直接复用现成的 SVG 真源，组件层只负责承载和无障碍语义，
// 避免继续把素材内部 path/id 协议耦合到页面实现里。
export const brandLogoSvgMarkup = logoSvgMarkup
export const brandFaviconHref = faviconHref

const faviconRels = ['icon', 'shortcut icon'] as const

export function applyBrandFavicon(target: Document = document) {
  // favicon 入口统一收口到品牌模块里，避免 HTML 和组件各维护一份路径后逐步漂移。
  faviconRels.forEach((rel) => {
    const link = ensureHeadLink(target, rel)
    link.type = 'image/svg+xml'
    link.sizes = 'any'
    link.href = brandFaviconHref
  })
}

function ensureHeadLink(target: Document, rel: string) {
  const existing = target.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (existing)
    return existing

  const link = target.createElement('link')
  link.rel = rel
  target.head.appendChild(link)
  return link
}
