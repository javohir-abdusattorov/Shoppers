const path = require("path");
const ErrorResponse = require('../../utils/errorResponse')
const asyncHandler = require('../../middleware/async')

const User = require("../auth/user.model");
const Product = require("../products/product.model")
const Order = require("../orders/order.model")
const Review = require("../reviews/review.model")
const Complaint = require("../complaints/complaint.model")
const OrderConfig = require('../orderConfig/orderConfig.model')

const Validation = require('../../utils/validation')
const validation = new Validation()

const hh = async () => {
  const jj = await User.findOne({ role: "seller" })
  console.log(jj)
}


module.exports = class UsersService {

  updateProductPublish = async (sellerID, publish) => {
    let products = await Product.find({ soldBy: sellerID  })

    if (!publish) {
      for (let product of products) {
        product.lastIsPublish = product.isPublish
        product.isPublish = publish
        await product.save()
      }
    } else {
      for (let product of products) {
        product.isPublish = product.lastIsPublish
        await product.save()
      }
    }
  }

  checkIfSellerDeletable = async (seller) => {
    const allOrders = await Order.find()
    const products = await Product.find({ soldBy: seller._id })
    let productIDs = []

    for (const product of products) productIDs.push(product._id.toString())

    for (const order of allOrders) {
      if (order.status != "waiting" && order.status != "in progress") {
        const isSellerOrder = order.orderItems.filter(item => {
          if (item && item.product && productIDs.indexOf(item.product.toString()) > -1) return item
        })
        if (isSellerOrder.length) return false
      }
    }
    return true
  }

  checkIfCustomerDeletable = async (customer) => {
    const customerOrders = await Order.find({ user: customer._id })
    return customerOrders.some(item => item.status == "waiting" || item.status == "in progress")
  }

  // @desc      Get seller by id
  // @route     GET /api/v1/users/seller/:id
  // @access    Private (Super-admin only)
  getSellerById = asyncHandler(async (req, res, next) => {
    const result = await validation.validateUserID(req.params.id, next)
    if (!result.success) return next(new ErrorResponse(result.message, 404))

    res.status(200).json({
      success: true,
      data: result.data,
    })
  })

  // @desc      Get all sellers
  // @route     GET /api/v1/users/all-sellers
  // @access    Private (Admin only)
  getAllSellers = asyncHandler(async (req, res, next) => {
    const users = await User.find({ role: "seller" }).lean()
    for (const user of users) {
      const productsNum = await Product.find({ soldBy: user._id }).count()
      user.counts = productsNum
    }
    res.status(200).json({
      success: true,
      data: users,
    })
  })

  // @desc      Get all customers
  // @route     GET /api/v1/users/all-customers
  // @access    Private (Admin only)
  getAllCustomers = asyncHandler(async (req, res, next) => {
    const users = await User.find({ role: "customer" }).lean()
    res.status(200).json({
      success: true,
      data: users,
    })
  })

  // @desc      Get customer cart total price
  // @route     GET /api/v1/users/cart-total
  // @access    Private (Customer only)
  getCartTotal = asyncHandler(async (req, res, next) => {
    const { valute } = await OrderConfig.findOne()

    let totalPrice = 0
    for (const item of req.user.cart) {
      const product = await Product.findById(item.product)
      if (product.purchaseValute == "usd") totalPrice += product.purchasePrice * valute.usd
        else totalPrice += product.purchasePrice
    }
  
    res.status(200).json({
      success: true,
      data: totalPrice
    })
  })

  // @desc      Get user statistics
  // @route     GET /api/v1/users/get-statistics
  // @access    Private (Customer only)
  getUserStatistics = asyncHandler(async (req, res, next) => {
    const allOrders = await Order.find({ user: req.user._id })
    const shippedOrders = allOrders.filter(obj => obj.status === "received")
    const canceledOrders = allOrders.filter(obj => obj.status === "canceled")
    const totalReviews = await Review.find({ user: req.user._id }).sort({ rating: -1 })
    const totalComplaints = await Complaint.find({ user: req.user._id })
    const mostLikedProduct = totalReviews.length && await Product.findById(totalReviews[0].product)

    res.status(200).json({
      success: true,
      data: {
        allOrders: allOrders.length,
        shippedOrders: shippedOrders.length,
        canceledOrders: canceledOrders.length,
        totalReviews: totalReviews.length,
        totalComplaints: totalComplaints.length,
        mostLikedProduct: mostLikedProduct.length
      }
    })
  })

  // @desc      Get user cart
  // @route     GET /api/v1/users/get-cart
  // @access    Private (Customer only)
  getUserCart = asyncHandler(async (req, res, next) => {
    const cart = req.user.cart
    let data = []
    let cartProducts = []
    let deletableItems = []

    for (let item of cart) {
      const index = cartProducts.findIndex(obj => obj._id.toString() === item.product.toString())
      if (index > -1) {
        const product = cartProducts[index]
        if (!product.isPublish) deletableItems.push(item)
        data.push({
          _id: item._id,
          image: product.images[0],
          title: product.title,
          price: product.purchasePrice,
          valute: product.purchaseValute,
          publish: product.isPublish,
          qty: item.qty,
          totalPrice: product.purchasePrice * item.qty
        })
      } else {
        let product = await Product.findById(item.product)
        if (!product.isPublish) deletableItems.push(item)
        data.push({
          _id: item._id,
          image: product.images[0],
          title: product.title,
          price: product.purchasePrice,
          valute: product.purchaseValute,
          publish: product.isPublish,
          qty: item.qty,
          totalPrice: product.purchasePrice * item.qty
        })
        cartProducts.push(product)
      }
    }

    const readyData = data.filter(item => item.publish === true)

    if (deletableItems.length > 0) {
      for (let deletableItem of deletableItems) {
        let index = req.user.cart.findIndex(obj => obj._id.toString() === deletableItem._id.toString())
        req.user.cart.splice(index, 1)
      }
      await req.user.save()
    }

    res.status(200).json({
      success: true,
      data: readyData
    })
  })

  // @desc      Get user wishlist
  // @route     GET /api/v1/users/get-wishlist
  // @access    Private (Customer only)
  getUserWishlist = asyncHandler(async (req, res, next) => {
    const wishlist = req.user.wishlist
    let data = []
    let wishlistProducts = []

    for (const id of wishlist) {
      const index = wishlistProducts.findIndex(obj => obj._id.toString() === id.toString())
      if (index > -1) {
        const product = wishlistProducts[index]
        data.push({
          _id: product._id,
          image: product.images[0],
          title: product.title,
          price: product.purchasePrice,
          valute: product.purchaseValute,
          publish: product.isPublish,
          quantity: product.quantity,
        })
      } else {
        let product = await Product.findById(id)
        data.push({
          _id: product._id,
          image: product.images[0],
          title: product.title,
          price: product.purchasePrice,
          valute: product.purchaseValute,
          publish: product.isPublish,
          quantity: product.quantity,
        })
        wishlistProducts.push(product)
      }
    }

    res.status(200).json({
      success: true,
      data: wishlistProducts
    })
  })

  // @desc      Toggle seller active
  // @route     PUT /api/v1/users/toggle-active/:id
  // @access    Private (Super-admin only)
  toggleSellerActive = asyncHandler(async (req, res, next) => {
    const result = await validation.validateUserID(req.params.id, next)
    if (!result.success) return next(new ErrorResponse(result.message, 404))

    let user = result.data
    user.isActive = !user.isActive

    await this.updateProductPublish(req.params.id, user.isActive)
    await user.save()

    res.status(200).json({
      success: true,
      _id: user._id,
    })
  })

  // @desc      Edit user by admin
  // @route     PUT /api/v1/users/edit-user/:id
  // @access    Private (Super-admin only)
  editUser = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.params.id).select("+password")
    let updatingObj = {}
    const userField = ['email', 'name', 'isActive', 'shopName', 'industryType', 'shopLocation', 'cardNumber']

    for (let field of userField) {
      if (field in req.body) {
        updatingObj[field] = req.body[field]
      }
    }

    if (req.files && req.files.profile_image) {
      if (user.profile_image != process.env.USER_DEFAULT_PROFILE_IMAGE) imagesService.deleteImages([user.profile_image])
      updatingObj.profile_image = await imagesService.uploadUserImage(req.files.profile_image, next);
    }

    if (req.body.phonenumbers) {
      updatingObj["phonenumbers"] = JSON.parse(req.body.phonenumbers)
    }

    if (req.body.oldPassword && req.body.newPassword && req.body.newPassword !== req.body.oldPassword) {
      const isMatch = await user.matchPassword(req.body.oldPassword)
      if (!isMatch) return next(new ErrorResponse("Invalid password", 401))
      const salt = await bcrypt.genSalt(10)
      updatingObj.password = await bcrypt.hash(req.body.newPassword, salt)
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: req.params.id },
      updatingObj,
      { new: true, runValidators: true }
    )

    res.status(200).json({
      success: true,
      data: updatedUser
    })
  })

  // @desc      Add product to cart
  // @route     POST /api/v1/users/add-cart
  // @access    Private (Customer only)
  addToCart = asyncHandler(async (req, res, next) => {
    const result = await validation.validateWaterfall(
      validation.validateBody(req.body, [
        { name: "product", type: "string" },
        { name: "qty", type: "number" },
        { name: "color", type: "string" },
        { name: "size", type: "string" },
      ]),
      await validation.validateProductID(req.body.product, next),
    )
    if (!result.success) return next(new ErrorResponse(result.message, 404))

    const product = result.data[0]
    const { qty, color, size } = req.body

    if (product.quantity < qty) return next(new ErrorResponse(`Buncha tovar yo'q`, 400))
    req.user.cart.push({ product: product._id, qty, color, size })
    await req.user.save()

    res.status(200).json({
      success: true,
      data: { item: req.user.cart[req.user.cart.length - 1] }
    })
  })

  // @desc      Edit cart item quantity
  // @route     PUT /api/v1/users/edit-cart/:cartItemID
  // @access    Private (Customer only)
  editCartItemQuantity = asyncHandler(async (req, res, next) => {
		const result = validation.validateBody(req.body, [
			{ name: "action", type: "string" },
		])
		if (!result.success) return next(new ErrorResponse(result.message, 404))
  	const index = req.user.cart.findIndex(obj => obj._id.toString() === req.params.cartItemID)
  	if (index < 0) return next(new ErrorResponse(`Noto'g'ri ID`, 400))

  	const item = req.user.cart[index]
  	const action = req.body.action
  	const product = await Product.findById(item.product)

  	if (product.quantity < 1) return next(new ErrorResponse(`Tovar qolmagan!`, 400))

  	const itemQty = (action == "+") ? 1 : -1
  	if (itemQty == -1 && item.qty <= 1) return next(new ErrorResponse(`Tovarni 1 dan kam miqdorda olib bo'lmaydi`, 400))
  	req.user.cart[index].qty += itemQty

  	await req.user.save()

    res.status(200).json({
      success: true,
      data: {
        item: req.user.cart[index]
      }
    })
  })

  // @desc      Remove item form cart
  // @route     DELETE /api/v1/users/remove-cart/:cartItemID
  // @access    Private (Customer only)
  removeFromCart = asyncHandler(async (req, res, next) => {
  	if (!req.user.cart.length) return next(new ErrorResponse(`Sizni korzinangizda tovar yo'q!`, 400))
  	const index = req.user.cart.findIndex(obj => obj._id.toString() === req.params.cartItemID)
  	if (index < 0) return next(new ErrorResponse(`Noto'g'ri ID`, 400))
    const item = req.user.cart[index]
  	req.user.cart.splice(index, 1)
  	await req.user.save()

    res.status(200).json({
      success: true,
      data: { item }
    })
  })

  // @desc      Add product to wishlist
  // @route     POST /api/v1/users/add-wishlist
  // @access    Private (Customer only)
  addToWishlist = asyncHandler(async (req, res, next) => {
		const result = await validation.validateWaterfall(
			validation.validateBody(req.body, [
				{ name: "product", type: "string" },
			]),
			await validation.validateProductID(req.body.product, next),
		)
		if (!result.success) return next(new ErrorResponse(result.message, 404))

  	const index = req.user.wishlist.findIndex(id => id.toString() === result.data[0]._id.toString())
  	if (index < 0) {
  		req.user.wishlist.push(result.data[0]._id)
  		await req.user.save()
  	}

    res.status(200).json({
      success: true,
      data: {
      	product: { _id: result.data[0]._id }
      }
    })
  })

  // @desc      Remove product from wishlist
  // @route     DELETE /api/v1/user/remove-wishlist/:productID
  // @access    Private (Customer only)
  removeFromWishlist = asyncHandler(async (req, res, next) => {
  	if (!req.user.wishlist.length) return next(new ErrorResponse(`Sizni korzinangizda tovar yo'q!`, 400))
  	const index = req.user.wishlist.findIndex(obj => obj.toString() === req.params.productID)
  	if (index < 0) return next(new ErrorResponse(`Noto'g'ri ID`, 400))
    const productID = req.user.wishlist[index]

  	req.user.wishlist.splice(index, 1)
  	await req.user.save()

    res.status(200).json({
      success: true,
      data: {
        product: { _id: productID }
      }
    })
  })

  // @desc      Delete seller
  // @route     DELETE /api/v1/users/delete-seller/:id
  // @access    Private (Admin only)
  deleteSeller = asyncHandler(async (req, res, next) => {
    const result = await validation.validateUserID(req.params.id, next)
    if (!result.success) return next(new ErrorResponse(result.message, 404))

    const isDeletable = await this.checkIfSellerDeletable(result.data)
    if (!isDeletable) return next(new ErrorResponse(`Bu sotuvchini o'chirib bo'lmaydi!`, 400))

    await User.deleteOne({ _id: result.data._id })
    await Product.deleteMany({ soldBy: result.data._id })

    res.status(200).json({
      success: true,
      data: req.params.id
    })
  })

  // @desc      Delete customer
  // @route     DELETE /api/v1/users/delete-customer/:id
  // @access    Private (Admin only)
  deleteCustomer = asyncHandler(async (req, res, next) => {
    const result = await validation.validateUserID(req.params.id, next)
    if (!result.success) return next(new ErrorResponse(result.message, 404))

    const hasOrders = await this.checkIfCustomerDeletable(result.data)
    if (hasOrders) return next(new ErrorResponse(`Bu foydalanuvchini o'chirib bo'lmaydi!`, 400))

    // await User.deleteOne({ _id: req.params.id })

    res.status(200).json({
      success: true,
      data: req.params.id
    })
  })

}
