const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3000,
  ELDEN_RING_API: 'https://eldenring.fanapis.com/api',
  SNAPSHOT_MODE: process.env.SNAPSHOT_MODE === '1',
  TTL: { eldenRing: 24 * 3600e3 },
  FETCH_TIMEOUT_MS: 8000,
  FETCH_RETRIES: 3,
  PAGE_SIZE: 100,
  DATA_DIR: path.join(__dirname, 'data'),
  LOCATION_IDS: ['limgrave', 'yharnam', 'lothric'],
};
