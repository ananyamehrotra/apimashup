const router = require('express').Router();
const config = require('../config');
const cache = require('../services/cache');
const locations = require('../services/locations');

router.get('/', (req, res) => {
  res.json({
    ok: true,
    uptime: Math.round(process.uptime() * 10) / 10,
    snapshotMode: config.SNAPSHOT_MODE,
    cache: cache.info(),
    locations: locations.info(),
  });
});

module.exports = router;
