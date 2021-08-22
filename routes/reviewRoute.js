const express = require('express');
const { restrictTo, protect } = require('../controllers/authController');

const router = express.Router({ mergeParams: true });
const {
  getAllReviews,
  createNewReview,
  deleteReview,
  updateReview,
  setParams
} = require('../controllers/reviewController');
// Loading DATA

router
  .route('/')
  .get(getAllReviews)
  .post(protect, restrictTo('user', 'admin'), setParams, createNewReview);

router
  .route('/:id')
  .patch(updateReview)
  .delete(deleteReview);

module.exports = router;
