// npm start: serves the built frontend (dist/, from npm run build) and the /api routes.
const path = require('path');
const fs = require('fs');
const express = require('express');
const config = require('./config');
const app = require('./app');

const DIST = path.join(__dirname, '..', 'dist');

if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, { maxAge: '1h', index: false }));
  app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile(path.join(DIST, 'index.html')));
} else {
  app.get('/', (req, res) => res.type('text').send('No build found. Run "npm run build" first, or use "npm run dev".'));
}

app.listen(config.PORT, () => {
  console.log(`Isekai server on http://localhost:${config.PORT}${config.SNAPSHOT_MODE ? ' (snapshot mode)' : ''}`);
  if (!config.REST_COUNTRIES.API_KEY) console.warn('COUNTRY_API is not set in .env: /api/countries will use the snapshot only');
});
