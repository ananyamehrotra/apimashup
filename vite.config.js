import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fetchAllCountries, fetchFlagSvg } from './server/upstream.js';

// Serves the same /api routes in `npm run dev` that Vercel serves in production.
function devApi(key) {
  let countries;
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use('/api/countries', async (req, res) => {
        try {
          countries ??= await fetchAllCountries(key);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(countries));
        } catch (err) {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      server.middlewares.use('/api/flag', async (req, res) => {
        const code = new URL(req.url, 'http://localhost').searchParams.get('code');
        const svg = await fetchFlagSvg(code).catch(() => null);
        if (!svg) {
          res.statusCode = 404;
          return res.end();
        }
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.end(svg);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return { plugins: [react(), tailwindcss(), devApi(env.COUNTRY_API)] };
});
