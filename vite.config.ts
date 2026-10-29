import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],

    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },

    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) return undefined;
                    if (id.includes('@supabase')) return 'supabase';
                    if (id.includes('lucide-react')) return 'icons';
                    if (id.includes('react') || id.includes('scheduler')) return 'react';
                    return 'vendor';
                },
            },
        },
    },

    optimizeDeps: {
        exclude: ['lucide-react'],
    },

    server: {
        watch: {
            ignored: ['**/.vs/**'],
        },
    },
});
