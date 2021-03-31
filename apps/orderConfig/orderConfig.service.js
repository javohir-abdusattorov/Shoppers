const path = require('path')
const ErrorResponse = require('../../utils/errorResponse')
const asyncHandler = require('../../middleware/async')

const OrderConfig = require('./orderConfig.model')

const Validation = require('../../utils/validation')
const validation = new Validation()


module.exports = class ReviewService {

	// @desc      Get order configuration
	// @route     GET /api/v1/order-config/all
	// @access    Public
	getConfig = asyncHandler(async (req, res, next) => {
		let config = await OrderConfig.findOne()

		res.status(200).json({
			success: true,
			data: config
		})
	})

	// @desc      Edit config
	// @route     PUT /api/v1/order-config/edit
	// @access    Private (Admin only)
	editConfig = asyncHandler(async (req, res, next) => {
	  const fields = ['regions', 'taxPrice', 'shippingTypes', 'valute']
    const updatingObj = {}

    for (const field of fields) if (field in req.body) updatingObj[field] = req.body[field]
    const updatedConfig = await OrderConfig.findOneAndUpdate({},
      updatingObj,
      { new: true, runValidators: true }
    )

		res
			.status(200)
			.json({
			  success: true,
			  data: updatedConfig,
			})
	})

}
