import type { MetadataRoute } from 'next'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://example.com'

const routes = [
  { path: '/', priority: 1.0, changeFrequency: 'weekly' as const },
  { path: '/docs', priority: 0.9, changeFrequency: 'weekly' as const },
  { path: '/docs/introduction', priority: 0.9, changeFrequency: 'monthly' as const },
  { path: '/docs/physical-layer', priority: 0.9, changeFrequency: 'monthly' as const },
  { path: '/docs/frame-format', priority: 0.9, changeFrequency: 'monthly' as const },
  { path: '/docs/arbitration', priority: 0.7, changeFrequency: 'monthly' as const },
  { path: '/docs/bit-timing', priority: 0.7, changeFrequency: 'monthly' as const },
  { path: '/docs/error-handling', priority: 0.7, changeFrequency: 'monthly' as const },
  { path: '/docs/higher-layers', priority: 0.7, changeFrequency: 'monthly' as const },
  { path: '/docs/faq', priority: 0.6, changeFrequency: 'monthly' as const },
]

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))
}
