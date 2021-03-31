const path = require('path')
const ErrorResponse = require('../../utils/errorResponse')
const asyncHandler = require('../../middleware/async')

const Complaint = require('./complaint.model')
const User = require('../auth/user.model')

const Validation = require('../../utils/validation')
const validation = new Validation()
const ImageService = require('../../utils/imagesService')
const imagesService = new ImageService()


module.exports = class ComplaintsService {

	// @desc      All complaints
	// @route     GET /api/v1/complaints/all
	// @access    Private (Admin only)
	allComplaints = asyncHandler(async (req, res, next)=>{
		res.status(200).json(res.advancedResults)
	})

	// @desc      Get all complaints
	// @route     GET /api/v1/complaints/my-complaints
	// @access    Private (Customer only)
	getAllUserComplaints = asyncHandler(async (req, res, next) => {
		const complaints = await Complaint.find({ user: req.user._id })
		res.status(200).json({
			success: true,
			data: complaints
		})
	})

	// @desc      Post complaint
	// @route     POST /api/v1/complaints/create
	// @access    Private (Customer only)
	postComplaint = asyncHandler(async (req, res, next) => {
		const result = await validation.validateWaterfall(
			validation.validateBody(req.body, [
				{ name: "message", type: "string" },
				{ name: "order", type: "string" },
			]),
			await validation.validateOrderID(req.body.order, next),
		)
		if (!result.success) return next(new ErrorResponse(result.message, 404))

	  const {
	    message,
	    order,
	  } = req.body;

		let complaintOrder = result.data[0]
		if (complaintOrder.user.toString() !== req.user._id.toString()) return next(new ErrorResponse('Not an user who ordered!', 400));
		if (complaintOrder.status !== "received") return next(new ErrorResponse('Order not received yet!', 400));

	  const creatingObj = {
	  	message,
	  	order,
	  	user: req.user._id,
	  }

	  if (req.files && req.files.image) {
	  	let image = await imagesService.uploadReviewImage(req.files.image, next);
	  	creatingObj.image = image;
	  }

	  const complaint = await Complaint.create(creatingObj)

		res
		.status(200)
		.json({
		  success: true,
		  data: complaint,
		})
	})

	// @desc      Delete
	// @route     DELETE /api/v1/complaints/delete/:id
	// @access    Private (Customer only)
	removeComplaint = asyncHandler(async (req, res, next)=>{
	  let result = await validation.validateComplaintID(req.params.id, next)
	  if (!result.success) return next(new ErrorResponse(result.message, 404))
	  let complaint = result.data

		if (complaint.user.toString() !== req.user._id.toString()) return next(new ErrorResponse('Invalid user!', 400));
	  await Complaint.deleteOne({ _id: req.params.id })
	  imagesService.deleteImages([complaint.image])

	  res
		  .status(200)
		  .json({
		    success: true,
		  })
	})
}