require('dotenv').config();

const HOUR = 3600e3;

module.exports = {
  PORT: Number(process.env.PORT) || 3000,
  SNAPSHOT_MODE: process.env.SNAPSHOT_MODE === '1',

  ELDEN_RING: {
    BASE_URL: process.env.ELDEN_RING_BASE_URL || 'https://eldenring.fanapis.com/api',
    COLLECTIONS: ['bosses', 'npcs', 'locations'],
    PAGE_SIZE: 100,
    TIMEOUT_MS: 10000,
    RETRIES: 3, // backoff 500ms × 2^n
    TTL: 24 * HOUR,
    RETRY_MERGE_MS: 60e3, // when the API and snapshot are both unavailable, try again after this
  },
};
