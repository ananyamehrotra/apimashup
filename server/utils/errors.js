class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || 500;
  const code = err.code || 'INTERNAL';
  if (status >= 500) console.error(err);
  res.status(status).json({ error: { status, code, message: status >= 500 ? 'Something went wrong.' : err.message } });
}

module.exports = { ApiError, asyncHandler, errorHandler };
