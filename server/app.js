// The /api app. Mounted by server/index.js (npm start) and by the Vite dev
// server (npm run dev), so both run exactly the same backend.
const express = require('express');
const compression = require('compression');
const morgan = require('morgan');
const requestContext = require('./utils/requestContext');
const { apiNotFound, errorHandler } = require('./utils/errors');

const app = express();
app.disable('x-powered-by');
app.use(compression());
app.use('/api', morgan('dev'), requestContext.middleware, require('./routes/api'));
app.use('/api', apiNotFound);
app.use('/api', errorHandler);

module.exports = app;
