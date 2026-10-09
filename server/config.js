const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3000,
  JIKAN: 'https://api.jikan.moe/v4',
  REST_COUNTRIES: 'https://restcountries.com/v3.1',
  REST_COUNTRIES_V5: 'https://api.restcountries.com/countries/v5',
  REST_COUNTRIES_KEY: process.env.REST_COUNTRIES_KEY || 'rc_live_bc5c80666edd44499c6b803f262ab917',
  SNAPSHOT_MODE: process.env.SNAPSHOT_MODE === '1',
  TTL: {
    countries: 24 * 3600e3,
    pool: 6 * 3600e3,
    characters: 6 * 3600e3,
  },
  JIKAN_GAP_MS: 350,          // ≈2.8 req/s (limit 3)
  JIKAN_PER_MIN: 58,          // limit 60
  JIKAN_TIMEOUT_MS: 8000,
  PARTY_SIZE: 4,
  ROUNDS_TO_WIN: 3,           // best of 5
  IMG_ALLOW: ['cdn.myanimelist.net', 'flagcdn.com', 'mainfacts.com', 'upload.wikimedia.org', 'flags.restcountries.com'],
  CACHE_DIR: path.join(__dirname, 'data', 'cache'),
  SNAPSHOT_DIR: path.join(__dirname, 'data', 'snapshots'),
};
