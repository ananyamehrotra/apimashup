class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const badRequest = (msg) => new ApiError(400, 'BAD_REQUEST', msg);
const notFound = (msg) => new ApiError(404, 'NOT_FOUND', msg);
const upstream = (msg) => new ApiError(503, 'UPSTREAM_UNAVAILABLE', msg);

// Lets async route handlers throw instead of calling next(err).
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function apiNotFound(req, res) {
  res.status(404).json({ error: { status: 404, code: 'NOT_FOUND', message: `No route ${req.method} ${req.originalUrl}` } });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL';
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({
    error: { status, code, message: status >= 500 && !err.code ? 'Something went wrong.' : err.message },
  });
}

module.exports = { ApiError, badRequest, notFound, upstream, asyncHandler, apiNotFound, errorHandler };
