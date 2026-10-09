const path = require('path');
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');
const requestContext = require('./utils/requestContext');
const locations = require('./services/locations'); // validates location JSON; a bad file stops boot here
const { apiNotFound, errorHandler } = require('./utils/errors');

const app = express();

app.use(compression());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use('/api', requestContext.middleware);

app.use('/api/health', require('./routes/health'));
app.use('/api/locations', require('./routes/locations'));

app.use('/api', apiNotFound);
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h' }));
app.use(errorHandler);

app.listen(config.PORT, () => {
  console.log(`\n  SOULBOUND server running on http://localhost:${config.PORT}`);
  console.log(`  snapshot mode: ${config.SNAPSHOT_MODE ? 'ON' : 'off'}\n`);
  locations
    .ensure()
    .then((s) => console.log(`[locations] ${s.list.length} locations ready (Elden Ring data: ${s.source}, ${s.report.matched.length} API matches)`))
    .catch((err) => console.error('[locations] preload failed:', err.message));
});
