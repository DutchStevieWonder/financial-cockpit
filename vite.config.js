import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React — loads first
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Supabase client
          'vendor-supabase': ['@supabase/supabase-js'],
          // Charts — large, loaded lazily
          'vendor-recharts': ['recharts'],
          // CSV parser
          'vendor-papaparse': ['papaparse'],
        },
      },
    },
  },
})
