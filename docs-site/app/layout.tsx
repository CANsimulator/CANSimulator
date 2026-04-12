import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, SIMULATOR_URL } from '@/lib/site'
import 'nextra-theme-docs/style.css'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: '%s | CAN Simulator Docs',
    default: 'CAN Simulator Docs — Learn the CAN Bus Protocol',
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'CAN protocol',
    'CAN bus',
    'Controller Area Network',
    'ISO 11898',
    'CAN frame format',
    'CAN arbitration',
    'CAN bit timing',
    'automotive diagnostics',
    'embedded systems',
    'vehicle networking',
  ],
  authors: [{ name: 'CAN Simulator Team' }],
  openGraph: {
    title: 'CAN Simulator Docs',
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CAN Simulator Docs',
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f7fb' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0f14' },
  ],
}

const bodyFont = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

const footer = (
  <Footer>
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full text-sm">
      <span>
        © {new Date().getFullYear()} CAN Simulator. Licensed under MIT.
      </span>
      <nav className="flex items-center gap-4" aria-label="Footer">
        <a href={SIMULATOR_URL} className="hover:underline">
          Open Simulator
        </a>
        <a
          href="https://github.com/suduli"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          GitHub
        </a>
      </nav>
    </div>
  </Footer>
)

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pageMap = await getPageMap()

  const navbar = (
    <Navbar
      logo={
        <span className="flex items-center gap-2 font-semibold">
          <span aria-hidden className="text-[color:var(--color-can-cyan,_#00e5ff)]">
            ◆
          </span>
          CAN Simulator Docs
        </span>
      }
    >
      <a
        href={SIMULATOR_URL}
        className="text-sm font-medium flex items-center gap-1 underline decoration-transparent hover:decoration-current transition-all"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 5l7 7-7 7M5 12h14"
          />
        </svg>
        Open Simulator
      </a>
    </Navbar>
  )

  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={`${bodyFont.variable} ${monoFont.variable}`}
    >
      <Head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#0a0f14" />
      </Head>
      <body suppressHydrationWarning>
        <Layout navbar={navbar} pageMap={pageMap} footer={footer}>
          {children}
        </Layout>
      </body>
    </html>
  )
}
