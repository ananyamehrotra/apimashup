const router = require('express').Router();
const locations = require('../services/locations');
const { asyncHandler } = require('../utils/errors');

router.get('/locations', (req, res) => {
  const list = locations.list();
  res.set('X-Cache', 'HIT').json({ count: list.length, locations: list });
});

router.get('/locations/:id', asyncHandler(async (req, res) => {
  const { data, cache } = await locations.get(req.params.id);
  res.set('X-Cache', cache).json(data);
}));

router.get('/weapons', (req, res) => {
  res.set('X-Cache', 'HIT').json(locations.weapons());
});

module.exports = router;
