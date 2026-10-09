const router = require('express').Router();
const locations = require('../services/locations');
const { asyncHandler, notFound } = require('../utils/errors');

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const list = await locations.list();
    res.json({ count: list.length, locations: list });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = String(req.params.id).toLowerCase();
    const loc = /^[a-z0-9-]{1,40}$/.test(id) ? await locations.get(id) : null;
    if (!loc) throw notFound(`Unknown location '${req.params.id}'.`);
    res.json(loc);
  })
);

module.exports = router;
