// Vercel function for /api/flag. Same service as the Express backend.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { getFlagSvg } = require('../server/services/restCountries.js');

export default async function handler(req, res) {
  const svg = await getFlagSvg(req.query.code).catch(() => null);
  if (!svg) return res.status(404).end();
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=2592000');
  res.status(200).send(svg);
}
