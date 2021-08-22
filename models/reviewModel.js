const mongoose = require('mongoose');
const User = require('./userModel');
const Tour = require('./tourModel');

// review / rating/ created at/ refernece to the tour / and user
const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'A review must be provided']
    },
    rating: {
      type: Number,
      min: [1, 'ratings must range between 1 and 5'],
      max: [10, 'ratings must range between 1 and 5'],
      required: [true, 'A rating must have a review']
    },
    createdAt: {
      type: Date,
      default: Date.now()
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user']
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour']
    }
  },
  { toJson: { virtuals: true }, toObject: { virtuals: true } }
);

reviewSchema.pre(/^find/, function(next) {
  // this.populate({
  //   path: 'tour',
  //   select: 'name'
  // }).populate({
  //   path: 'user',
  //   select: 'firstName lastName photo'
  // });

  this.populate({
    path: 'user',
    select: 'firstName lastName photo'
  });
  next();
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
