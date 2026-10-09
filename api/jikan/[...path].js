// Vercel function for /api/jikan/*. Same Jikan proxy as the Express backend.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const jikan = require('../../server/services/jikan.js');

export default async function handler(req, res) {
  const { path = [], ...query } = req.query;
  try {
    const body = await jikan.get(`/${[].concat(path).join('/')}`, query);
    res.setHeader('Cache-Control', 'public, s-maxage=21600');
    res.status(200).json(body);
  } catch (err) {
    res.status(err.status || 503).json({ error: err.message });
  }
}
