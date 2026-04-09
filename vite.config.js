import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  root: '.',
  base: process.env.GITHUB_ACTIONS ? '/vba-workflow-pro/' : './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['xlsx','jspdf','jspdf-autotable','chart.js'],
          email: ['nodemailer','imapflow','mailparser'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
      },
      manifest: {
        name: 'VBA BEAST V3',
        short_name: 'VBA BEAST',
        description: 'Offline Excel-Automation mit SELECT CASE, IF/ELSE, Makros, Mail-Merge und Batch-Pipeline.',
        theme_color: '#f0a500',
        background_color: '#000000',
        display: 'standalone',
        lang: 'de',
        categories: ['productivity', 'utilities', 'business'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-1024.png', sizes: '1024x1024', type: 'image/png' },
        ],
      },
    }),
  ],
});
