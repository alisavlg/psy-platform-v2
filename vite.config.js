import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
    root: '.',
    publicDir: 'public',

    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                login: resolve(__dirname, 'public/pages/login.html'),
                register: resolve(__dirname, 'public/pages/register.html')
            }
        }
    },

    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    },

    server: {
        port: 5173,
        open: '/index.html',
        watch: {
            ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/docs/**']
        }
    }
});