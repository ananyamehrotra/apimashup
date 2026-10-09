const router = require('express').Router();
const config = require('../config');
const cache = require('../services/cache');
const restCountries = require('../services/restCountries');
const jikan = require('../services/jikan');
const { asyncHandler, notFound } = require('../utils/errors');

// Every country, as an array (the shape src/lib/countries.js reads).
router.get('/countries', asyncHandler(async (req, res) => {
  const countries = await restCountries.getCountries();
  res.set('Cache-Control', 'public, max-age=3600');
  res.json(countries);
}));

// Flag SVG for the downloadable character sheet.
router.get('/flag', asyncHandler(async (req, res) => {
  const svg = await restCountries.getFlagSvg(req.query.code);
  if (!svg) throw notFound(`No flag for code '${req.query.code ?? ''}'`);
  res.set({ 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' });
  res.send(svg);
}));

// Jikan proxy: /api/jikan/anime?genres=10 -> https://api.jikan.moe/v4/anime?genres=10
router.get(/^\/jikan(\/.*)$/, asyncHandler(async (req, res) => {
  const body = await jikan.get(req.params[0], req.query);
  res.json(body);
}));

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    uptime: Math.round(process.uptime()),
    snapshotMode: config.SNAPSHOT_MODE,
    countryKeySet: Boolean(config.REST_COUNTRIES.API_KEY),
    jikan: jikan.info(),
    cache: cache.info(),
  });
});

module.exports = router;
