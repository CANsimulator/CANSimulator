'use client'

import { usePathname } from 'next/navigation'

interface ArticleSchemaProps {
  title: string
  description: string
  datePublished?: string
  dateModified?: string
}

export function ArticleSchema({
  title,
  description,
  datePublished = '2026-04-12',
  dateModified,
}: ArticleSchemaProps) {
  const pathname = usePathname()
  const siteUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com')
  const canonicalUrl = `${siteUrl.replace(/\/$/, '')}${pathname}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: title,
    description,
    url: canonicalUrl,
    datePublished,
    dateModified: dateModified ?? datePublished,
    author: {
      '@type': 'Organization',
      name: 'CAN Simulator',
    },
    publisher: {
      '@type': 'Organization',
      name: 'CAN Simulator',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: buildBreadcrumbs(pathname, siteUrl),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </>
  )
}

function buildBreadcrumbs(pathname: string, siteUrl: string) {
  const base = siteUrl.replace(/\/$/, '')
  const segments = pathname.split('/').filter(Boolean)
  const items = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: base },
  ]

  let path = ''
  segments.forEach((segment, index) => {
    path += `/${segment}`
    items.push({
      '@type': 'ListItem',
      position: index + 2,
      name: segment
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      item: `${base}${path}`,
    })
  })

  return items
}
