const path = require('path');
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const cfg = require('./config');
const { ApiError, errorHandler } = require('./utils/errors');

const app = express();
app.use(cors(), compression(), morgan('dev'));

app.use('/api', require('./routes/health'));
app.use('/api', require('./routes/locations'));
app.use('/api', (req, res, next) => next(new ApiError(404, 'NOT_FOUND', `No route ${req.method} ${req.originalUrl}`)));

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(errorHandler);

app.listen(cfg.PORT, () => {
  console.log(`Soulbound running on http://localhost:${cfg.PORT}${cfg.SNAPSHOT_MODE ? ' (snapshot mode)' : ''}`);
});
