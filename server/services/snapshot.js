// Bundled fallback JSON in server/data/snapshots/<name>.json
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'data', 'snapshots');
const fileFor = (name) => path.join(DIR, `${name}.json`);

function read(name) {
  try {
    return JSON.parse(fs.readFileSync(fileFor(name), 'utf8')).data;
  } catch {
    return null;
  }
}

function write(name, data) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(fileFor(name), JSON.stringify({ savedAt: new Date().toISOString(), data }, null, 1));
}

const exists = (name) => fs.existsSync(fileFor(name));

module.exports = { read, write, exists };
