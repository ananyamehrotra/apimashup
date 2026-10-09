// npm run snapshot: download every Elden Ring API collection into
// server/data/snapshots/ so the app works offline (SNAPSHOT_MODE=1).
const eldenRing = require('../services/eldenRing');
const snapshot = require('../services/snapshot');

(async () => {
  let failed = false;
  for (const name of eldenRing.COLLECTIONS) {
    try {
      const data = await eldenRing.fetchCollection(name);
      snapshot.write(`eldenring-${name}`, data);
      console.log(`saved eldenring-${name}.json (${data.length} entries)`);
    } catch (err) {
      failed = true;
      console.error(`failed ${name}: ${err.message}`);
    }
  }
  process.exit(failed ? 1 : 0);
})();
