const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

const app = express();
const tourRouter = require('./routes/toursRoute');
const userRouter = require('./routes/userRoute');
const reviewRoute = require('./routes/reviewRoute');
const AppError = require('./util/AppError');
// SET security headers
app.use(helmet());

app.use(express.static(`${__dirname}/public/`));
const globalErrorHandler = require('./controllers/errorController');

//middle wear
app.use(mongoSanitize());
app.use(xss());
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'price'
    ]
  })
);
app.use(express.json({ limit: '10kb' }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

const limiter = rateLimit({
  max: 1000,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, try again in one hour'
});
app.use('/api', limiter);
// DATA SANITIZATION

// DATA SANITIZATION AGAINST SQL

//callbacks

////

// app.post('/api/v1/tours', createTour );

// app.get('/api/v1/tours', getAllTours);

// app.get('/api/v1/tours/:id', getTour);

// app.patch('/api/v1/tours/:id', editTour)

// app.delete('/api/v1/tours/:id',deleteTour);`

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRoute);

app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `Cant find ${req.originalUrl} on this server`
  // });
  // const err = new Error(`Cant find ${req.originalUrl} on this server`);
  // err.status = 'fail';
  // err.statusCode = 404;
  next(new AppError(`Cant find ${req.originalUrl} on this server`, 400));
});

app.use(globalErrorHandler);

module.exports = app;
