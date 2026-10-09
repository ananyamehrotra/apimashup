const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const HOUR = 3600e3;

module.exports = {
  PORT: Number(process.env.PORT) || 3001,
  SNAPSHOT_MODE: process.env.SNAPSHOT_MODE === '1',

  REST_COUNTRIES: {
    BASE_URL: 'https://api.restcountries.com/countries/v5',
    FLAGS_URL: 'https://flags.restcountries.com/v5/svg',
    API_KEY: process.env.COUNTRY_API || '',
    PAGE_SIZE: 100, // free-plan maximum per request
    TIMEOUT_MS: 10000,
    RETRIES: 3,
    TTL: 7 * 24 * HOUR, // free tier is 1000 requests/month; one full load costs 3
  },
  FLAG_TTL: 30 * 24 * HOUR,

  JIKAN: {
    BASE_URL: 'https://api.jikan.moe/v4',
    GAP_MS: 350, // ≈2.8 req/s (limit 3)
    PER_MIN: 58, // limit 60
    TIMEOUT_MS: 6000,
    RETRIES: 2,
    DOWN_MS: 60e3, // after Jikan fails, answer 503 at once for this long
    TTL: 6 * HOUR,
  },
};
