const path = require('path')
const clock = require('date-events')()
const ErrorResponse = require('../../utils/errorResponse')
const asyncHandler = require('../../middleware/async')

const Product = require('./product.model')
const User = require('../auth/user.model')
const Order = require('../orders/order.model')
const Review = require('../reviews/review.model')
const LastCategory = require('../categories/category.models/lastCategory.model')

const Validation = require('../../utils/validation')
const validation = new Validation()
const ImageService = require('../../utils/imagesService')
const imagesService = new ImageService()

const gg = async () => {
	let gh = await Product.find()
	for (let hh of gh) {
		hh.isFavorit = hh.isPublish
		await hh.save()
		console.log(hh);
	}
}

module.exports = class ProductsService {

	deleteProductReviews = async (id) => {
		await Review.deleteMany({ product: id })
	}

	updateDeletedProductsOrder = async (id) => {
		let orders = await Order.find()
		let updatingOrders = []

		for (let i = 0; i < orders.length; i++) {
			let order = orders[i];
			let items = order.orderItems.filter(item => {
				if (item.product) return item.product.toString() === id
			})
			await Order.findOneAndUpdate(
		    { _id: order._id, 'orderItems.product': id },
		    { $set: { 'orderItems.$.product' : null } },
		    { new: true }
		  )
		}
	}

	updateUsersInfo = async (id) => {
		let allUsers = await User.find()

		for (let user of allUsers) {

			// Checking if users cart has deleted product
			for (let item of user.cart) {
				if (item.product.toString() === id) {
					let index = user.cart.indexOf(item)
					user.cart.splice(index, 1)
				}
			}

			// Checking if users wishlist has deleted product
			for (let id of user.wishlist) {
				if (id.toString() === id) {
					let index = user.cart.indexOf(id)
					user.wishlist.splice(index, 1)
				}
			}

		}
	}

	// @desc      Get all products
	// @route     GET /api/v1/products/all
	// @access    Public
	getAllProducts = asyncHandler(async (req, res, next) => {
		res.status(200).json(res.advancedResults)
	})

	// @desc      Get all products
	// @route     GET /api/v1/products/product/:id
	// @access    Public
	getOneProduct = asyncHandler(async (req, res, next) => {
	  let product = await Product.findOne({ _id: req.params.id }).lean()
	  if (!product) return next(new ErrorResponse(`Bunday tovar mavjuda emas yoki tovar barcha uchun korinmaydi!`, 404))
		const user = await User.findById(product.soldBy).select({ _id: 1, name: 1 })
		product.soldBy = user

		res.status(200).json({
			success: true,
			data: product
		})
	})

	// @desc      Get all favorit products
	// @route     GET /api/v1/products/all-favorits
	// @access    Public
	getAllFavoritProducts = asyncHandler(async (req, res, next) => {
		const products = await Product.find({ isPublish: true, isFavorit: true }).sort({ rating: -1 }).limit(20).select({
			_id: 1,
			images: 1,
			title: 1,
			purchasePrice: 1,
			purchaseValute: 1,
			category: 1
		})
		res.status(200).json({
			success: true,
			data: products
		})
	})

	// @desc      Get all related products
	// @route     GET /api/v1/products/all-related/:id
	// @access    Public
	getAllRelateProducts = asyncHandler(async (req, res, next) => {
	  const result = await validation.validateLastCategoryID(req.params.id, next)
	  if (!result.success) return next(new ErrorResponse(result.message, 404))
	  const category = result.data
		const products = await Product.find({ isPublish: true, "category.category": category._id }).sort({ rating: -1 }).limit(20).select({
			_id: 1,
			images: 1,
			title: 1,
			rating: 1,
			purchasePrice: 1,
			purchaseValute: 1,
			category: 1,
			discount: 1
		})
		res.status(200).json({
			success: true,
			data: products
		})
	})

	// @desc      Get all most rating products
	// @route     GET /api/v1/products/all-rating
	// @access    Public
	getAllRatingProducts = asyncHandler(async (req, res, next) => {
		const products = await Product.find({ isPublish: true }).sort({ rating: -1 }).limit(20).select({
			_id: 1,
			images: 1,
			title: 1,
			rating: 1,
			purchasePrice: 1,
			purchaseValute: 1,
			category: 1
		})
		res.status(200).json({
			success: true,
			data: products
		})
	})

	// @desc      Get all most rating products
	// @route     GET /api/v1/products/seller-rating
	// @access    Private (Seller-admin only)
	getAllSellerRatingProducts = asyncHandler(async (req, res, next) => {
		const products = await Product.find({ soldBy: req.user._id }).sort({ rating: -1 }).limit(10).select({
			_id: 1,
			title: 1,
			rating: 1,
		})
		res.status(200).json({
			success: true,
			data: products
		})
	})

	// @desc      Get all most rating products
	// @route     GET /api/v1/products/bestsellers
	// @access    Public
	getBestellerProducts = asyncHandler(async (req, res, next) => {
		const products = await Product.find({ isPublish: true }).sort({ sold: -1 }).limit(5)
		res.status(200).json({
			success: true,
			data: products
		})
	})

	// @desc      Get product with the highest discount
	// @route     GET /api/v1/products/get-highest-discount
	// @access    Public
	getHighestDiscountProduct = asyncHandler(async (req, res, next) => {
		const products = await Product.find({ isPublish: true, discount: { $exists: true, $ne: null } }).sort({ "discount.percent": -1 }).select({
			_id: 1,
			images: 1,
			title: 1,
			purchasePrice: 1,
			purchaseValute: 1,
			category: 1,
			discount: 1
		})
		res.status(200).json({
			success: true,
			data: products.length ? products[0] : null
		})
	})

	// @desc      Get last selled products
	// @route     GET /api/v1/products/last-selled
	// @access    Private (Seller-only)
	getSellerLastSelledProducts = asyncHandler(async (req, res, next) => {
		const allOrders = await Order.find().sort({ createdAt: -1 })
		const sellerProducts = await Product.find({ soldBy: req.user._id })
		let sellerProductIDs = []
		let products = []

		for (let product of sellerProducts) sellerProductIDs.push(product._id.toString())

		for (const order of allOrders) {
			const hasProduct = order.orderItems.filter(product => {
				if (product.product && sellerProductIDs.indexOf(product.product.toString())) return product
			})

			for (const product of hasProduct) {
				const isAviable = products.findIndex(obj => obj.product.toString() === product.product.toString())
				if (isAviable < 0) {
					products.push({
						image: product.image,
						name: product.name,
						price: product.price,
						product: product.product,
						qty: product.qty,
						date: order.createdAt,
					})
				}
			}
		}

		res.status(200).json({
			success: true,
			data: products
		})
	})

	// @desc      Search products
	// @route     GET /api/v1/products/search?q=str&skip=number
	// @access    Public
	searchProducts = asyncHandler(async (req, res, next) => {
	  const search = req.query.q
	  const skip = req.query.skip ? +req.query.skip : 0
	  if (search === "") return res.send([])

	  Product.searchPartial(search, skip, function(err, data) {
	    if (err) console.log(err)
	    res.status(200).json(data)
	  })
	})

	// @desc      Create product
	// @route     POST /api/v1/products/create
	// @access    Private (Seller only)
	addNewProduct = asyncHandler(async (req, res, next) => {
		const result = await validation.validateWaterfall(
			validation.validateBody(req.body, [
				{ name: "title", type: "string" },
				{ name: "brand", type: "string" },
				{ name: "description_uz", type: "string" },
				{ name: "description_ru", type: "string" },
				{ name: "description_en", type: "string" },
				{ name: "retailPrice", type: "number" },
				{ name: "retailValute", type: "string" },
				{ name: "purchasePrice", type: "number" },
				{ name: "purchaseValute", type: "string" },
				{ name: "options", type: "array" },
				{ name: "quantity", type: "number" },
				{ name: "unit", type: "string" },
				{ name: "shippingType", type: "string" },
				{ name: "sizes", type: "array" },
				{ name: "colors", type: "array" },
				{ name: "category", type: "string" },
			]),
			await validation.validateProduct(req, next),
		)
		if (!result.success) return next(new ErrorResponse(result.message, 404))

	  const {
	    title,
	    brand,
	    description_uz,
	    description_ru,
	    description_en,
	    retailPrice,
	    retailValute,
	    purchasePrice,
	    purchaseValute,
	    options,
	    quantity,
	    unit,
	    sizes,
	    colors,
	    category
	  } = req.body

	  const { totalImages, productCategory, shippingType } = result.data[0]
	  const images = await imagesService.uploadProductImages(totalImages, req.files.images, next)
	  const ID = req.body.ID ? req.body.ID : undefined

	  //Create product
	  const product = await Product.create({
	  	images,
	    title,
	    brand,
	    description: {
	      description_uz,
	      description_ru,
	      description_en,
	    },
	    retailPrice,
	    retailValute,
	    purchasePrice,
	    purchaseValute,
	    options,
	    ID,
	    soldBy: req.user._id,
	    shippingType: {
	    	id: shippingType.id,
	    	name: shippingType.name,
	    },
	    category: {
	    	name: {
	        name_uz: productCategory.name.name_uz,
	        name_ru: productCategory.name.name_ru,
	        name_en: productCategory.name.name_en,
	      },
	    	category: productCategory._id,
	    },
	    quantity,
	    unit,
	    sizes,
	    colors,
	  })

		res
	    .status(200)
	    .json({
	      success: true,
	      data: product,
	    })
	})

	// @desc      Edit product
	// @route     PUT /api/v1/products/edit/:id
	// @access    Private (Seller only)
	editProdcut = asyncHandler(async (req, res, next) => {
	  let result = await validation.validateProductID(req.params.id, next)
	  if (!result.success) return next(new ErrorResponse(result.message, 404))
	  let product = result.data
	  if (req.user._id.toString() !== product.soldBy.toString()) return next(new ErrorResponse('Not an valid seller!', 404))
	  const productField = ['title', 'brand', 'retailPrice', 'retailValute', 'discount', 'purchasePrice', 'purchaseValute', 'options', 'quantity', 'unit', 'sizes', 'colors']

	  let updatingObj = {}
	  for (let i = 0; i < productField.length; i++) {
	    if (productField[i] in req.body) {
	      updatingObj[productField[i]] = req.body[productField[i]]
	    }
	  }

	  if ('description_uz' in req.body && 'description_ru' in req.body && 'description_en' in req.body) {
	    updatingObj.description = {
        description_uz: req.body.description_uz,
        description_ru: req.body.description_ru,
        description_en: req.body.description_en,
	    }
	  }

	  if (req.body.category) {
	    let result = await validation.validateLastCategoryID(req.body.category, next)
			if (!result.success) return next(new ErrorResponse(result.message, 404))
	    let productCategory = result.data

	    updatingObj.category = {
        name: {
          name_uz: productCategory.name.name_uz,
          name_ru: productCategory.name.name_ru,
          name_en: productCategory.name.name_en,
        },
        category: productCategory._id,
	    }
	  }

	  if (req.files && req.files.images) {
			let result = validation.validateProductImages(req.files.images, next)
			if (!result.success) return next(new ErrorResponse(result.message, 404))

	    let totalImages = result.data
			let images = await imagesService.uploadProductImages(totalImages, req.files.images, next)
	    updatingObj.images = images
	  }

	  let updatedProduct = await Product.findOneAndUpdate(
	    { _id: req.params.id },
	    updatingObj,
	    { new: true }
	  )

	  res
	    .status(200)
	    .json({
	      success: true,
	      data: updatedProduct,
	    })
	})

	// @desc      Buy product via seller
	// @route     PUT /api/v1/products/buy/:id
	// @access    Private (Seller only)
	buyProduct = asyncHandler(async (req, res, next) => {
	  let product = await Product.findOne({ ID: req.params.id })
	  if (!product) return next(new ErrorResponse('Not found!', 404))
	  let result = validation.validateBody(req.body, [{ name: "qty", type: "number" }])
		if (!result.success) return next(new ErrorResponse(result.message, 400))

	  if (req.user._id.toString() !== product.soldBy.toString()) return next(new ErrorResponse('Not an valid seller!', 404))
	  if (req.body.qty < 1) return next(new ErrorResponse('Invalid data! ', 404))

	  product.quantity -= req.body.qty
	  product.sold += req.body.qty
	  await product.save()

	  res
	    .status(200)
	    .json({
	      success: true,
	      data: product
	    })
	})

	// @desc      Delete product
	// @route     DELETE /api/v1/products/delete/:id
	// @access    Private (Seller only)
	deleteProduct = asyncHandler(async (req, res, next) => {
    let result = await validation.validateProductID(req.params.id, next)
		if (!result.success) return next(new ErrorResponse(result.message, 404))
    let product = result.data
	  if (req.user._id.toString() !== product.soldBy.toString()) return next(new ErrorResponse('Not an valid seller!', 404))

	  // Deleting product
	  await Product.deleteOne({ _id: req.params.id })
	  await this.deleteProductReviews(product._id)
	  await this.updateDeletedProductsOrder(product._id.toString())
	  await this.updateUsersInfo(product._id.toString())
	  imagesService.deleteImages(product.images)

	  res
	    .status(200)
	    .json({
	      success: true,
	      product: { _id: product._id }
	    })
	})

	// @desc      Toggle product publish
	// @route     PUT /api/v1/products/edit-publish/:id
	// @access    Private/Seller only
	togglePublish = asyncHandler(async (req, res, next) => {
    let result = await validation.validateProductID(req.params.id, next)
		if (!result.success) return next(new ErrorResponse(result.message, 404))
    let product = result.data

	  if (req.user.role == "seller" && req.user._id.toString() !== product.soldBy.toString()) return next(new ErrorResponse('Not an valid seller!', 404))
		product.isPublish = !product.isPublish
		await product.save()

	  res
	    .status(200)
	    .json({
	      success: true,
	      data: { isPublish: product.isPublish, _id: product._id }
	    })
	})
}

clock.on('date', async (day) => {
	const allProducts = await Product.find({ discount: { $exists: true, $ne: null } })
	const date = new Date()
	let discountEndingProducts = []
	for (let product of allProducts) date >= product.discount.deadline && discountEndingProducts.push(product._id)

	const result = await Product.updateMany(
		{ _id: { $in: discountEndingProducts } },
		{ $unset: { discount: 1 } }
	)
	console.log(result)
})
