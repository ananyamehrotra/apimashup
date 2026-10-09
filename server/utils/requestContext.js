// Per-request context so any service can report where its data came from,
// which ends up in the X-Cache response header.
const { AsyncLocalStorage } = require('async_hooks');

const als = new AsyncLocalStorage();
const RANK = { HIT: 0, MISS: 1, STALE: 2, SNAPSHOT: 3 };

function middleware(req, res, next) {
  const ctx = { cache: null };
  als.run(ctx, () => {
    const json = res.json.bind(res);
    res.json = (body) => {
      if (!res.headersSent) res.set('X-Cache', ctx.cache || 'HIT');
      return json(body);
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
