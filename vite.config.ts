import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — cached independently, changes rarely
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Supabase — largest single dependency, cache separately
          'vendor-supabase': ['@supabase/supabase-js'],
          // Icons — large but static; users benefit from long-term cache
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
})
