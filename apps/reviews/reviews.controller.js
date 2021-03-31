const { Router } = require('express');
const router = Router();
const ReviewService = require('./reviews.service');
const Review = require('./review.model');
const service = new ReviewService()

const advancedResults = require('../../middleware/advancedResults');
const { protect, authorize } = require('../../middleware/auth');

router.get('/all', advancedResults(Review), service.getAllReviews);
router.get('/my-reviews', protect, authorize('customer'), service.getAllUserReviews);
router.get('/all-user', protect, authorize('seller'), service.getAllReviewsOfSellerProducts);
router.get('/product/:id', protect, service.getProductReviews);

router.post('/create', protect, authorize('customer'), service.postNewReview);
router.post('/create-reply/:id', protect, service.postReply);
router.put('/edit-message/:id', service.editReviewMessage);
router.delete('/remove-image/:id', protect, authorize('admin'), service.removeReviewImage);

module.exports = router;