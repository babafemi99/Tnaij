const mongoose = require('mongoose');
const slugify = require('slugify');
const User = require('./userModel');
// const validator = require('validator');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tours must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less or equal the 40 character'],
      minlength: [10, 'A tour name must have more or equal the 10 character']
      // validate: [validator.isAlpha, 'Tour name must only contain characters']
    },
    slug: String,
    ratingsAverage: {
      type: Number,
      min: [0.1, 'Zero ??, really '],
      max: 5,
      default: 4.5
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price']
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function(val) {
          return val < this.price;
        },
        message: 'invalid discount price ({VALUE})'
      }
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A summary must be specified ']
    },
    duration: {
      type: Number,
      required: [true, 'A duration must be specified ']
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size']
    },
    description: {
      type: String,
      trim: true
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either easy, medium or difficult'
      }
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image']
    },
    images: [String],
    CreatedAt: {
      type: Date,
      default: Date.now(),
      select: false
    },
    startDates: [Date],
    secretTours: {
      type: Boolean,
      default: false
    },
    startLocation: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    ]
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

tourSchema.virtual('durationWeeks').get(function() {
  return this.duration / 7;
});

// Virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id'
});

// DOCUMENT MIDDLEWARE : runs before .save() and .create()
tourSchema.pre('save', function(next) {
  console.log(this);
  this.slug = slugify(this.name, { lower: true });
  next();
});
tourSchema.post('save', function(doc, next) {
  console.log(doc);
  next();
});
//// QUERY MIDDLE-WEAR
tourSchema.pre('/^find/', function(next) {
  // tourSchema.pre('find', function(next) {
  this.find({
    secretTour: { $ne: true }
  });
  this.start = Date.now();
  next();
});
// tourSchema.pre('save', async function(next) {
//   const guidesPromises = this.guides.map(async id => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });
// tourSchema.pre('findOne', function(next) {
//   this.find({
//     secretTour: { $ne: true }
//   });
//   next();
// });
tourSchema.post(/^find/, function(docs, next) {
  console.log(`Query took ${Date.now() - this.start} ms`);
  // console.log(docs);
  next();
});

tourSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChanged'
  });
  next();
});

/// AGGREGATION MIDDLEWEAR

tourSchema.pre('aggregate', function(next) {
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  console.log(this.pipeline());
  next();
});

const Tour = mongoose.model('Tour', tourSchema);
module.exports = Tour;
