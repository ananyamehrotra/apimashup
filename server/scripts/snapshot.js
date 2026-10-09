const config = require('../config');
const jikan = require('../services/jikan');
const snapshot = require('../services/snapshot');

const CLASS_GENRES = {
  berserker: [1],
  paladin: [10, 38],
  archmage: [10, 37],
  rogue: [2],
  bard: [4, 22],
  hermit: [36]
};

async function runSnapshot() {
  console.log('=== Starting Snapshot Generation ===');

  for (const [classId, genres] of Object.entries(CLASS_GENRES)) {
    const genreKey = genres.join(',');
    console.log(`\nFetching pool for class [${classId}] (genres: ${genreKey})...`);

    try {
      const res = await jikan.callJikan(`/anime?genres=${genreKey}&min_score=7&order_by=members&sort=desc&sfw=true&limit=25`);
      if (res && res.data) {
        snapshot.savePoolSnapshot(genreKey, res.data);
        console.log(`Saved pool-${genreKey}.json (${res.data.data.length} items)`);

        const topAnime = res.data.data.slice(0, 5);
        for (const anime of topAnime) {
          console.log(`  Fetching characters for [${anime.title}] (ID: ${anime.mal_id})...`);
          try {
            const charRes = await jikan.callJikan(`/anime/${anime.mal_id}/characters`);
            if (charRes && charRes.data) {
              snapshot.saveCharactersSnapshot(anime.mal_id, charRes.data);
              console.log(`  Saved chars-${anime.mal_id}.json`);
            }
          } catch (e) {
            console.warn(`  Failed chars for anime ${anime.mal_id}: ${e.message}`);
          }
        }
      }
    } catch (e) {
      console.warn(`Failed pool for genres ${genreKey}: ${e.message}`);
    }
  }

  console.log('\n=== Snapshot Generation Complete ===');
}

if (require.main === module) {
  runSnapshot().catch(console.error);
}

module.exports = { runSnapshot };
