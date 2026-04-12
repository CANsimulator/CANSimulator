import { resolve } from 'node:path'
import nextra from 'nextra'

const withNextra = nextra({})

export default withNextra({
  turbopack: {
    root: resolve(import.meta.dirname),
    resolveAlias: {
      'next-mdx-import-source-file': './mdx-components.tsx',
    },
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
})
