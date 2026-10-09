class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL';
  const message = status >= 500 ? 'Internal server error' : err.message;
  console.error(`[Error] ${code} (${status}): ${err.message}`);
  res.status(status).json({
    error: { status, code, message }
  });
};

module.exports = { ApiError, asyncHandler, errorHandler };
