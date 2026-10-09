// npm run snapshot: save everything the app fetches so it runs offline
// (SNAPSHOT_MODE=1, or automatically whenever an upstream API is down).
// Countries (3 REST Countries requests), every flag, and Jikan's first anime
// page for every genre the worlds use.
const fs = require('fs');
const path = require('path');
const restCountries = require('../services/restCountries');
const snapshot = require('../services/snapshot');
const jikan = require('../services/jikan');

const WORLDS_FILE = path.join(__dirname, '..', '..', 'src', 'lib', 'worlds.js');

(async () => {
  const countries = await restCountries.fetchAll();
  snapshot.write('countries', countries);
  console.log(`saved ${countries.length} countries`);

  let flags = 0;
  for (const c of countries) {
    const svg = await restCountries.getFlagSvg(c.code2).catch(() => null);
    if (svg) { snapshot.write(`flag-${c.code2.toLowerCase()}`, svg); flags++; }
  }
  console.log(`saved ${flags} flags`);

  // genre ids straight from src/lib/worlds.js, so the two never drift apart
  const ids = [...new Set([...fs.readFileSync(WORLDS_FILE, 'utf8').matchAll(/\{ id: (\d+), name:/g)].map((m) => m[1]))];
  let pages = 0;
  for (const id of ids) {
    for (const page of ['1', '2', '3']) {
      try {
        await jikan.get('/anime', { genres: id, sfw: 'true', order_by: 'members', sort: 'desc', min_score: '7', limit: '25', page });
        pages++;
      } catch (err) {
        console.warn(`Jikan genre ${id} page ${page}: ${err.message}`);
        if (err.status === 503) { console.warn('Jikan is unreachable; skipping the rest of the anime pages'); break; }
      }
    }
  }
  console.log(`saved ${pages} Jikan pages (${ids.length} genres)`);
  process.exit(0);
})().catch((err) => {
  console.error('snapshot failed:', err.message);
  process.exit(1);
});
