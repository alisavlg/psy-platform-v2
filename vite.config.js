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
                login: resolve(__dirname, 'pages/login.html'),
                register: resolve(__dirname, 'pages/register.html'),
                client: resolve(__dirname, 'pages/client.html'),
                dashboard: resolve(__dirname, 'pages/dashboard.html'),
                psychologist: resolve(__dirname, 'pages/psychologist.html'),
                admin: resolve(__dirname, 'pages/admin.html'),
                room: resolve(__dirname, 'pages/room.html'),
                become: resolve(__dirname, 'pages/become-psychologist.html'),
                history: resolve(__dirname, 'pages/application-history.html')
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