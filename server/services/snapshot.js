const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('../config');

const DIR = path.join(DATA_DIR, 'snapshots');
const file = (name) => path.join(DIR, `${name}.json`);

function read(name) {
  try { return JSON.parse(fs.readFileSync(file(name), 'utf8')); } catch { return null; }
}

function write(name, data) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(file(name), JSON.stringify(data));
}

module.exports = { read, write };
