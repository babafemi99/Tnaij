const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../util/catchAsync');
const AppError = require('./../util/AppError');
const sendEmail = require('../util/email');

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(Date.now() + 90 * 24 * 60 * 60),
    httpOnly: true
  };
  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
  }
  res.cookie('jwt', token, cookieOptions);
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user }
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChange: req.body.passwordChange,
    role: req.body.role
  });
  createSendToken(newUser, 201, res);
  console.log('body');
  console.log(req.body);
});

exports.login = catchAsync(async (req, res, next) => {
  const { work, password } = req.body;

  // 1. check if email and password exists
  if (!work || !password) {
    return next(new AppError('please provide email and password', 400));
  }
  //2. check if user exists and password is correct

  const user = await User.findOne({
    email: {
      work
    }
  }).select('+password');
  console.log(user);
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 404));
  }

  // check if everything is okay send token to client
  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  //1) get the token and check if it exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return next(new AppError('You are not logged in', 401));
  }
  //2) validate / verify  the token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  //3) check if user exists
  const freshUser = await User.findById(decoded.id);
  if (!freshUser) {
    return next(new AppError('User does not exists again', 401));
  }
  //4) check if user changed password after token was issued
  if (freshUser.changePasswordAfter(decoded.iat)) {
    console.log('na here ?');
    return next(
      new AppError('User recently change password, please log-in again')
    );
  }
  // grant access
  req.user = freshUser;
  next();
});


exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide']. role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { work } = req.body;
  if (!work) next(new AppError('Pls enter a valid email addres', 404));
  // 1) get user based on POST-ed email
  // const user = await User.findOne({ work: req.body.email.work });
  const user = await User.findOne({ email: { work } });
  console.log('ths is the latest user ');
  console.log(user);
  if (!user) {
    return next(new AppError('No user with that email address', 404));
  }
  // 2) Generate a random request token
  const resetToken = user.createForgotPasswordToken();
  console.log(resetToken);
  await user.save({ validateBeforeSave: false });

  //3) send it to user email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/ap1/v1/users/users/reset-password/${resetToken}`;

  const message = `Forgot your password ? Submit a PATCH request with your new password and password confirm to: ${resetURL}.\nIf you didn't forget it, please kindly ignore this message `;

  try {
    await sendEmail({
      from: 'Fred Foo 👻 <foo@example.com>', // sender address
      to: 'bar@example.com, baz@example.com', // list of receivers
      subject: 'Hello ✔', // Subject line
      text: 'Hello world?', // plain text body
      message
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email'
    });
  } catch (err) {
    console.log(err);
    user.passwordResetToken = undefined;
    user.passWordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        'There was a problem sending the email, please try again letter',
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1 get user based on token
  const hashedToken = crypto.createHash('sha256').update(req.params.token);
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passWordResetExpires: { $get: Date.now }
  });
  //2 if token has not expired, ad there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  // update change password property for the user
  user.passWordResetExpires = undefined;
  user.passWordResetExpires = undefined;
  await user.save();
  // log the user in, send jwt
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // get user from collection
  const user = await User.findById(req.user.id).select('+password');
  // check id posted password is correct
  if (!user.correctPassword(req.body.password, user.password)) {
    return next(new AppError('Invalid password', 401));
  }

  // if password is correct, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // log in user, send jwt
  createSendToken(user, 200, res);
});
