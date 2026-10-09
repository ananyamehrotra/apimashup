import { createRequire } from 'node:module';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const require = createRequire(import.meta.url);

// Serves the Express /api app (server/app.js) inside `npm run dev`, so dev runs
// exactly the backend that `npm start` runs in production.
function devApi() {
  return {
    name: 'dev-api',
    configureServer(server) {
      const api = require('./server/app.js');
      server.middlewares.use((req, res, next) => (req.url.startsWith('/api/') ? api(req, res, next) : next()));
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), devApi()],
});
