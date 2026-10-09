// npm run snapshot: save the Elden Ring API data for offline mode.
const eldenRing = require('../services/eldenRing');
const snapshot = require('../services/snapshot');

(async () => {
  for (const kind of ['bosses', 'npcs']) {
    const list = await eldenRing.fetchAll(kind);
    snapshot.write(`eldenring-${kind}`, list);
    console.log(`saved ${list.length} ${kind}`);
  }
})().catch((e) => { console.error('snapshot failed:', e.message); process.exit(1); });
