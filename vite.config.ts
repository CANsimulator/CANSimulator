import { defineConfig } from 'vitest/config'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * Vite plugin to async-load CSS and inline critical above-the-fold styles.
 */
function asyncCssPlugin(): Plugin {
  const criticalCSS = `
    *,*::before,*::after{box-sizing:border-box}
    body{margin:0;font-family:Inter,system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased}
    :root,[data-theme="dark"]{color-scheme:dark}
    [data-theme="light"]{color-scheme:light}
    .min-h-screen{min-height:100vh}
    .flex{display:flex}.items-center{align-items:center}.justify-center{justify-content:center}
    .bg-dark-950{background-color:#020617}.text-cyan-500{color:#06b6d4}
    .font-mono{font-family:ui-monospace,SFMono-Regular,monospace}
  `.replace(/\n\s+/g, '');

  return {
    name: 'async-css',
    enforce: 'post',
    apply: 'build',
    transformIndexHtml(html) {
      html = html.replace(
        '</head>',
        `<style>${criticalCSS}</style></head>`
      );
      html = html.replace(
        /<link rel="stylesheet" crossorigin href="(\/assets\/[^"]+\.css)">/g,
        '<link rel="preload" as="style" crossorigin href="$1" onload="this.onload=null;this.rel=\'stylesheet\'">' +
        '<noscript><link rel="stylesheet" crossorigin href="$1"></noscript>'
      );
      return html;
    },
  };
}

export default defineConfig({
  base: '/CANSimulator/',
  plugins: [
    react(),
    asyncCssPlugin(),
    // ViteImageOptimizer — re-enable when vite-plugin-image-optimizer supports Vite 7
    // Sitemap — re-enable when vite-plugin-sitemap no longer imports node:module
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: [
      '@radix-ui/react-hover-card',
      'react-window',
      'react-virtualized-auto-sizer'
    ]
  },
  build: {
    modulePreload: {
      polyfill: false,
      resolveDependencies: (_filename, deps) => {
        return deps.filter(
          (dep) => !dep.includes('vendor-radix') && !dep.includes('jspdf') && !dep.includes('recharts') && !dep.includes('mermaid')
        );
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/react-router'))
            return 'vendor-react';
          if (id.includes('/framer-motion/'))
            return 'vendor-motion';
          if (id.includes('/@supabase/'))
            return 'vendor-supabase';
          if (id.includes('/@radix-ui/'))
            return 'vendor-radix';
          return undefined;
        },
      },
    },
  },
  server: {
    allowedHosts: true,
  },
})
