const mongoose = require('mongoose');

const crypto = require('crypto');
require('mongoose-type-email');
const bcrypt = require('bcryptjs');
//name email photo- string, password, password confirm
const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, ' A user must have a name '],
    trim: true,
    maxlength: [40, 'name must have less or equal the 40 character']
  },
  lastName: {
    type: String,
    required: [true, ' A user must have a name '],
    trim: true,
    maxlength: [40, 'name must have less or equal the 40 character']
  },
  email: {
    work: {
      type: mongoose.SchemaTypes.Email,
      allowBlank: false,
      unique: true,
      lowercase: true,
      message: 'a valid email must be provided'
    }
  },
  photo: {
    type: String,
    required: [false],
    trim: true,
    default: 'img-1.jpg'
  },
  role: {
    type: String,
    default: 'user',
    enum: ['user', 'guide', 'lead-guide', 'admin']
  },
  passwordChange: Date,
  password: {
    type: String,
    required: [true, 'Provide a password'],
    minlength: [8, 'Password must be 8 characters and above'],
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Enter a valid password'],
    validate: {
      // This only works on save !
      validator: function(el) {
        return el === this.password;
      },
      message: 'Password are not the same'
    }
  },
  passwordResetToken: String,
  passWordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});

userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChange = Date.now() - 1000;
  next();
});

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

userSchema.pre('save', async function(next) {
  // Only run if password is modified;
  if (!this.isModified('password')) return next();
  // has password with a cost of  12
  this.password = await bcrypt.hash(this.password, 12);
  // delete password confirm
  this.passwordConfirm = undefined;
  next();
});

userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changePasswordAfter = function(JWTTimestamp) {
  if (this.passwordChange) {
    const changedTimeStamp = parseInt(this.passwordChange.getTime() / 1000, 10);
    console.log(changedTimeStamp, JWTTimestamp);
    return JWTTimestamp < changedTimeStamp;
  }
  return false;
};
userSchema.methods.createForgotPasswordToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  console.log({ resetToken }, this.passwordResetToken);
  this.passWordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};
userSchema.pre(/^find/, function(next) {
  this.find({ active: { $ne: false } });
  next();
});
const User = mongoose.model('User', userSchema);
module.exports = User;
