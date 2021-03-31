const path = require('path')
const ErrorResponse = require('../../utils/errorResponse')
const asyncHandler = require('../../middleware/async')

const Review = require('./review.model')
const Product = require('../products/product.model')
const User = require('../auth/user.model')

const Validation = require('../../utils/validation')
const validation = new Validation()
const ImageService = require('../../utils/imagesService')
const imagesService = new ImageService()


module.exports = class ReviewService {

	changeProductRating = async (id) => {
		let reviews = await Review.find({ product: id });
		let total = 0;

		for (let i = 0; i < reviews.length; i++) {
			total += reviews[i].rating;
		}
		let rating = Number((total / reviews.length).toFixed(1));
		let updatedProduct = await Product.findOneAndUpdate(
	    { _id: id },
	    { rating },
	    { new: true }
	  )
	}

	// @desc      Get all reviews
	// @route     GET /api/v1/reviews/all
	// @access    Public
	getAllReviews = asyncHandler(async (req, res, next) => {
		res.status(200).json(res.advancedResults)
	})

	// @desc      Get all reviews
	// @route     GET /api/v1/reviews/product/:id
	// @access    Public
	getProductReviews = asyncHandler(async (req, res, next) => {
	  const result = await validation.validateProductID(req.params.id, next)
	  if (!result.success) return next(new ErrorResponse(result.message, 404))

	 	const product = result.data
		const productReviews = await Review.find({ product: product._id }).lean()

		for (const review of productReviews) {
			review.userDetail = await User.findById(review.user).select({ name: 1, profile_image: 1 }).lean()
			for (const reply of review.replies) reply.userDetail = await User.findById(reply.user).select({ name: 1, profile_image: 1 }).lean()
		}

		res.status(200).json({
			success: true,
			data: productReviews
		})
	})

	// @desc      Get all reviews
	// @route     GET /api/v1/reviews/my-reviews
	// @access    Private (Customer only)
	getAllUserReviews = asyncHandler(async (req, res, next) => {
		const reviews = await Review.find({ user: req.user._id })
		res.status(200).json({
			success: true,
			data: reviews
		})
	})

	// @desc      Get all reviews of seller products
	// @route     GET /api/v1/reviews/all-user
	// @access    Private (Seller only)
	getAllReviewsOfSellerProducts = asyncHandler(async (req, res, next) => {
		let products = await Product.find({ soldBy: req.user._id })
		let reviews = []

		for (let product of products) {
			let prodcutReviews = await Review.find({ product: product._id })
			reviews = [...reviews, ...prodcutReviews]
		}

		let newReviews = []
		for (let review of reviews) {
			let product = await Product.findById(review.product)
			let user = await User.findById(review.user)

			newReviews.push({
				_id: review._id,
				message: review.message,
				image: review.image,
				rating: review.rating,
				yourReplies: review.replies.filter(obj => obj.user.toString() === req.user._id.toString()),
				product: { image: product.images[0], title: product.title, category: product.category },
				user: { name: user.name, email: user.email, image: user.image },
				updatedAt: review.updatedAt
			})
		}

	  res
	    .status(200)
	    .json({
	      success: true,
	      data: newReviews,
	    })
	})

	// @desc      Edit review message
	// @route     PUT /api/v1/reviews/edit-message/:id
	// @access    Private (Admin only)
	editReviewMessage = asyncHandler(async (req, res, next) => {
	  let result = await validation.validateReviewID(req.params.id, next)
	  if (!result.success) return next(new ErrorResponse(result.message, 404))
	  let updatedReview

	  if (!req.body.message) {
	    updatedReview = await Review.findOneAndUpdate(
	      { _id: req.params.id },
	      { $unset: { message: "" } },
	      { new: true }
	    )
	  } else {
	    updatedReview = await Review.findOneAndUpdate(
	      { _id: req.params.id },
	      { message: req.body.message },
	      { new: true }
	    )
	  }

	  res
	    .status(200)
	    .json({
	      success: true,
	      data: updatedReview,
	    })
	})

	// @desc      Remove review image
	// @route     DELETE /api/v1/reviews/remove-image/:id
	// @access    Private (Admin only)
	removeReviewImage = asyncHandler(async (req, res, next) => {
	  let result = await validation.validateReviewID(req.params.id, next)
	  if (!result.success) return next(new ErrorResponse(result.message, 404))
	  let review = review.data

	  let updatedReview = await Review.findOneAndUpdate(
	    { _id: req.params.id },
	    { $unset: { image: undefined } },
	    { new: true }
	  )

	  imagesService.deleteImages([review.image])

	  res
	    .status(200)
	    .json({
	      success: true,
	      data: updatedReview,
	    })
	})

	// @desc      Post review
	// @route     POST /api/v1/reviews/create
	// @access    Private (Customer only)
	postNewReview = asyncHandler(async (req, res, next) => {
		let result = await validation.validateWaterfall(
			validation.validateBody(req.body, [
				{ name: "rating", type: "number" },
				{ name: "product", type: "string" },
			]),
			await validation.validateProductID(req.body.product, next),
		)
		if (!result.success) return next(new ErrorResponse(result.message, 404))

	  const {
	    rating,
	    product,
	  } = req.body

	  const creatingObj = {
	  	rating,
	  	product,
	  	user: req.user._id,
	  }

		if (req.body.message) creatingObj.message = req.body.message

	  if (req.files && req.files.image) {
	  	creatingObj.image = await imagesService.uploadReviewImage(req.files.image, next)
	  }

	  const review = await Review.create(creatingObj)
	  await this.changeProductRating(product)

		res
			.status(200)
			.json({
			  success: true,
			  data: review,
			})
	})

	// @desc      Post reply
	// @route     POST /api/v1/reviews/create-reply/:id
	// @access    Private
	postReply = asyncHandler(async (req, res, next) => {
		const result = await validation.validateWaterfall( // 6014fdc9736651384ee3e8f7
			validation.validateBody(req.body, [
				{ name: "message", type: "string" },
			]),
			await validation.validateReviewID(req.params.id, next),
		)
		if (!result.success) return next(new ErrorResponse(result.message, 404))

		let review = result.data[0]
		const product = await Product.findById(review.product).lean()
		if (req.user.role == "seller" && product.soldBy.toString() !== req.user._id.toString()) return next(new ErrorResponse(`Siz tovarga yoki unga yozilgan izohlarga javob yozish huquqiga ega emassiz!`, 404))
		const { message } = req.body

		review.replies.unshift({
			user: req.user._id,
			message
		})

		await review.save()
		if (req.user.role == "seller") review.yourMessages = review.replies.filter(obj => obj.user.toString() === req.user._id.toString())

		res
			.status(200)
			.json({
			  success: true,
			  data: review,
			})
	})

}
