const fs = require('fs');
const path = require('path');
const config = require('../config');

function ensureSnapshotDir() {
  if (!fs.existsSync(config.SNAPSHOT_DIR)) {
    fs.mkdirSync(config.SNAPSHOT_DIR, { recursive: true });
  }
}

function getPoolSnapshot(genreKey) {
  const filePath = path.join(config.SNAPSHOT_DIR, `pool-${genreKey}.json`);
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      console.warn(`[Snapshot] Read failed for pool-${genreKey}.json`);
    }
  }
  return null;
}

function savePoolSnapshot(genreKey, data) {
  ensureSnapshotDir();
  const filePath = path.join(config.SNAPSHOT_DIR, `pool-${genreKey}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function getCharactersSnapshot(animeId) {
  const filePath = path.join(config.SNAPSHOT_DIR, `chars-${animeId}.json`);
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      console.warn(`[Snapshot] Read failed for chars-${animeId}.json`);
    }
  }
  return null;
}

function saveCharactersSnapshot(animeId, data) {
  ensureSnapshotDir();
  const filePath = path.join(config.SNAPSHOT_DIR, `chars-${animeId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function getCountriesSnapshot() {
  const filePath = path.join(config.SNAPSHOT_DIR, `countries.json`);
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      console.warn(`[Snapshot] Read failed for countries.json`);
    }
  }
  return null;
}

function saveCountriesSnapshot(data) {
  ensureSnapshotDir();
  const filePath = path.join(config.SNAPSHOT_DIR, `countries.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
  getPoolSnapshot,
  savePoolSnapshot,
  getCharactersSnapshot,
  saveCharactersSnapshot,
  getCountriesSnapshot,
  saveCountriesSnapshot,
};
