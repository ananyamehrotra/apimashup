// Vercel function for /api/countries. Same service as the Express backend.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { getCountries } = require('../server/services/restCountries.js');

export default async function handler(req, res) {
  try {
    const countries = await getCountries();
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json(countries);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message });
  }
}
