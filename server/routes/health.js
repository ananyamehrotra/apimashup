const router = require('express').Router();
const cache = require('../services/cache');
const cfg = require('../config');

router.get('/health', (req, res) => {
  res.set('X-Cache', 'HIT').json({ ok: true, uptime: process.uptime(), snapshotMode: cfg.SNAPSHOT_MODE, cache: cache.info() });
});

module.exports = router;
