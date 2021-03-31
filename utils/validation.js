
const Product = require('../apps/products/product.model');
const User = require('../apps/auth/user.model');
const Order = require('../apps/orders/order.model');
const OrderConfig = require('../apps/orderConfig/orderConfig.model');
const Review = require('../apps/reviews/review.model');
const Complaint = require('../apps/complaints/complaint.model');
const MainCategory = require('../apps/categories/category.models/mainCategory.model');
const SubCategory = require('../apps/categories/category.models/subCategory.model');
const LastCategory = require('../apps/categories/category.models/lastCategory.model');


module.exports = class Validation {

	validateWaterfall = async (...validations) => {
		let lastResult = []
		for (let result of validations) {
			if (!result.success) {
				return {
					success: false,
					message: result.message
				}
			} else {
				if (result.data) lastResult.push(result.data)
			}
		}
		return { success: true, data: lastResult }
	}

	validateID = async (Model, id, next) => {
	  if(!id || typeof(id) !== "string" || id.length !== 24) return { success: false, message: `Invalid ID` }
	  let item = await Model.findById(id)
	  if (!item) return { success: false, message: `Document not found with this ID` }
	  return { success: true, data: item }
	}

	validateProductID = async (id, next) => await this.validateID(Product, id, next)

	validateUserID = async (id, next) => await this.validateID(User, id, next)

	validateOrderID = async (id, next) => await this.validateID(Order, id, next)

	validateReviewID = async (id, next) => await this.validateID(Review, id, next)

	validateComplaintID = async (id, next) => await this.validateID(Complaint, id, next)

	validateMainCategoryID = async (id, next) => await this.validateID(MainCategory, id, next)

	validateSubCategoryID = async (id, next) => await this.validateID(SubCategory, id, next)

	validateLastCategoryID = async (id, next) => await this.validateID(LastCategory, id, next)

	validateType = (item, type) => {
		if (type == "string") {
			if (typeof(item) !== "string") return false
		}
		else if (type == "number") {
			if (typeof(item) !== "number") return false
		}
		else if (type == "boolean") {
			if (typeof(item) !== "boolean") return false
		}
		else if (type == "object") {
			if (typeof(item) !== "object") return false
		}
		else if (type == "array") {
			if (!Array.isArray(item)) return false
		}

		return true
	}

	validateBody = (body, requirements) => {
		if (!body) return { success: false, message: `Invalid data: Don't have body!` }

		for  (let item of requirements) {
			if (!body[item.name]) return { success: false, message: `Invalid data: '${item.name}' is required` }

			if (item.type == "number" && !this.validateType(body[item.name], item.type)) body[item.name] = +body[item.name]
			if (item.type == "array" && !this.validateType(body[item.name], item.type)) body[item.name] = JSON.parse(body[item.name])
			if (item.type == "object" && !this.validateType(body[item.name], item.type)) body[item.name] = JSON.parse(body[item.name])

			if (!body[item.name] || !this.validateType(body[item.name], item.type)) return { success: false, message: `Invalid data: '${item.name}' must be ${item.type}` }
		}

		return { success: true }
	}

	validateProduct = async (req, next) => {
	  const { category, shippingType } = req.body
	  const productCategory = await LastCategory.findById(category)
	  if (!productCategory) return { success: false, message: `Такая категория не найдено!` }

	  if (!req.files || !req.files.images) return { success: false, message: `Don't have images!` }

	  const totalImages = req.files.images.length
	  if (totalImages <= process.env.MIN_IMAGE_PER_PRODUCT || totalImages > process.env.MAX_IMAGE_PER_PRODUCT)
	  	return { success: false, message: `Изображений должно быть как минимум две и не больше восьми!` }

	  const config = await OrderConfig.findOne()
	  const i = config.shippingTypes.findIndex(obj => obj.id === shippingType)
	  if (i < 0) return { success: false, message: `Invalid shipping type` }

	  return { success: true, data: { productCategory, totalImages, shippingType: config.shippingTypes[i] } }
	}

	validateProductImages = (images, next) => {		
	  const totalImages = images.length
	  if (totalImages <= process.env.MIN_IMAGE_PER_PRODUCT || totalImages > process.env.MAX_IMAGE_PER_PRODUCT)
	    return { success: false, message: `Изображений должно быть больше двух и меньше восьми!` }

	  return { success: true, data: totalImages }
	}

}