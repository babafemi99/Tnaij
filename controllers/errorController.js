const AppError = require('./../util/AppError');

const handleDuplicateFields = err => {
  const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
  const message = `Duplicate field value ${value} please use another value`;
  return new AppError(message, 400);
};
const handleCastErrorDB = err => {
  const message = `invalid ${err.path}: ${err.value}. `;
  console.log(message);
  return new AppError(message, 404);
};
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    err: err,
    stack: err.stack
  });
};
const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 404);
};

const sendErrorProd = (err, res) => {
  // Operational errors, trusted errors that you can leak
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
    // Programming errors you cant leak
  } else {
    // Log error
    console.error('Error', err);
    // send a generic message
    res.status(500).json({
      status: 'error',
      message: 'something went wrong'
    });
  }
};
const handleJwtError = () => new AppError('please log in again :)', 401);
const handleJwtExpired = () =>
  new AppError('Token has expired; please log in again :)', 401);

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  if (process.env.NODE_ENV === 'development') {
    console.log(err.name);
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    if (err.name === 'CastError') error = handleCastErrorDB(err);
    if (error.code === 11000) error = handleDuplicateFields(err);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
    if (err.name === 'JsonWebTokenError') error = handleJwtError();
    if (err.name === 'TokenExpiredError') error = handleJwtExpired();
    sendErrorProd(error, res);
  }
};
