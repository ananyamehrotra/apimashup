// Per-request context so any service can report where its data came from,
// which ends up in the X-Cache response header.
const { AsyncLocalStorage } = require('async_hooks');

const als = new AsyncLocalStorage();
const RANK = { HIT: 0, MISS: 1, STALE: 2, SNAPSHOT: 3 };

function middleware(req, res, next) {
  const ctx = { cache: null };
  als.run(ctx, () => {
    const send = res.send.bind(res); // res.json and res.sendStatus also end up here
    res.send = (body) => {
      if (!res.headersSent && !res.get('X-Cache')) res.set('X-Cache', ctx.cache || 'HIT');
      return send(body);
    };
    next();
  });
}

// Keeps the "worst" source seen during the request: SNAPSHOT > STALE > MISS > HIT.
function markCache(source) {
  const ctx = als.getStore();
  if (!ctx) return;
  if (ctx.cache == null || RANK[source] > RANK[ctx.cache]) ctx.cache = source;
}

module.exports = { middleware, markCache };
