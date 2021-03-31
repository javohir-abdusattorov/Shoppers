const path = require('path')
const clock = require('date-events')()

const ErrorResponse = require('../../utils/errorResponse')
const asyncHandler = require('../../middleware/async')

const Order = require('./order.model')
const Product = require('../products/product.model')
const User = require('../auth/user.model')

const OrderConfig = require('../orderConfig/orderConfig.model')
const LastCategory = require('../categories/category.models/lastCategory.model')
const Validation = require('../../utils/validation')
const validation = new Validation()

const orderStatus = JSON.parse(process.env.ORDER_STATUS)
const orderDeleteHour = +process.env.ORDER_DELETING_HOURS
const merchantID = process.env.PAYME_MERCHANT_ID
const paymeRequestUrl = process.env.PAYME_REQUEST_URL

const ggBOI = async () => {
  const allOrders = await Order.findOne({ user: `5fe710be92cf2a1bd0ef12ae` }, {}, { sort: { 'createdAt': -1 } }).lean()
  console.log(allOrders)
  // 5fe710be92cf2a1bd0ef12ae
}


class OrderService {

  updateProductNumbers = async (orderItems) => {
    orderItems.forEach( async(item, i) => {
      let updatedProduct = await Product.updateOne(
        { _id: item.product },
        { $inc: { sold: item.qty, quantity: -item.qty } },
      )
    })
  }

  changeOrderStatus = async (id, status) => {
    let updatedOrder = await Order.findOneAndUpdate(
      { _id: id },
      { status: status },
      { new: true }
    )

    return updatedOrder
  }

  returnOrder = async (order) => {
    const orderItems = order.orderItems.filter(item => item.product)
    for (const item of orderItems) {
      await Product.findOneAndUpdate(
        { _id: item.product },
        { $inc: { quantity: item.qty } },
        { new: true }
      )
    }
    order.status = "canceled"
    return order
  }

  updateSellersBalance = async (sellers) => {
    for (const seller of sellers) {
      const updatedSeller = await User.findByIdAndUpdate(seller.seller, {
        $inc: { balance: seller.price }
      }, { new: true })
    }
  }


  // @desc      Get all orders
  // @route     GET /api/v1/orders/all
  // @access    Public
  getAllOrders = asyncHandler(async (req, res, next) => {
    res.status(200).json(res.advancedResults)
  })

  // @desc      Get all orders
  // @route     GET /api/v1/orders/my-orders
  // @access    Private (Customer only)
  getAllCustomerOrders = asyncHandler(async (req, res, next) => {
    const orders = await Order.find({ user: req.user._id }).lean()
    const data = []

    for (const order of orders) {
      data.push({
        address: order.shippingAdress,
        status: order.status,
        date: order.createdAt,
        _id: order._id
      })
    }

    res.status(200).json({
      success: true,
      data: data
    })
  })

  // @desc      Get all orders with given status
  // @route     GET /api/v1/orders/status/:status
  // @access    Private (Super-admin only)
  getOrdersByStatus = asyncHandler(async (req, res, next) => {
    const status =
        req.params.status == "neworder" ? ["confirm"]
      : req.params.status == "confirmorder" ? ["in progress"]
      : req.params.status == "finishorder" ? ["received"] : []

    const orders = await Order.find({ status: { $in: status } }).lean()

    for (let order of orders) {
      const user = await User.findById(order.user)
      order.user = { name: user.name, profile_image: user.profile_image }
      order.orderItems = order.orderItems.filter(item => item.product)

      const products = await Promise.all(order.orderItems.map(async (item) => {
        const product = await Product.findById(item.product).select({ soldBy: 1 })
        return product
      }))

      const shops = await Promise.all(products.map(async (product) => {
        const user = await User.findById(product.soldBy).select({ shopName: 1 })
        return user
      }))

      for (const item of order.shareOfSellers) {
        const seller = await User.findById(item.seller)
        item.user = seller
      }

      order.shops = shops
    }

    res.status(200).json({
      success: true,
      data: orders
    })
  })

  // @desc      Get all orders with orderProducts contains seller products
  // @route     GET /api/v1/orders/seller-all
  // @access    Private (Seller only)
  getAllSellerOrders = asyncHandler(async (req, res, next) => {
    let allOrders = await Order.find()
    let sellerProducts = await Product.find({ soldBy: req.user._id })
    let data = []
    let productIDs = []
    let readyData = []

    for (let product of sellerProducts) {
      productIDs.push(product._id.toString())
    }

    for (let order of allOrders) {
      let isSellerOrder = order.orderItems.filter(item => {
        if (item && item.product && productIDs.indexOf(item.product.toString())) return item
      })
      isSellerOrder.length && data.push(order)
    }

    for (let order of data) {
      let user = await User.findById(order.user)
      readyData.push({ _id: order._id, user: user.name, address: order.shippingAdress, createdAt: order.createdAt, orderItems: order.orderItems, totalPrice: order.totalPrice, status: order.status })
    }

    res
      .status(200)
      .json({
        success: true,
        data: readyData,
      })
  })

  // @desc      Get customers last order
  // @route     GET /api/v1/orders/my-last
  // @access    Private (Seller only)
  getLastOrder = asyncHandler(async (req, res, next) => {
    const order = await Order.findOne({ user: req.user._id }, {}, { sort: { 'createdAt': 1 } }).lean()

    if (!order) return res.status(200).json({
      success: true,
      data: null
    })

    for (const item of order.orderItems) {
      const product = await Product.findById(item.product).select({ description: 1, category: 1 })
      item.productDetail = product
    }

    res.status(200).json({
      success: true,
      data: order,
    })
  })

  // @desc      Create order
  // @route     POST /api/v1/orders/create
  // @access    Private (Seller only)
  addNewOrder = asyncHandler(async (req, res, next) => {
    let result = validation.validateBody(req.body, [
      { name: "region", type: "string" },
      { name: "paymentMethod", type: "string" },
    ])
    if (!result.success) return next(new ErrorResponse(result.message, 400))

    let {
      region,
      paymentMethod,
    } = req.body
    paymentMethod = paymentMethod.toLowerCase()
    if (!req.user.address) return next(new ErrorResponse(`Iltimos o'z manzilingizni kiriting.`, 400))
    let shippingAdress = req.user.address

    let totalPrice = 0
    const orderConfig = await OrderConfig.findOne()
    const orderRegion = orderConfig.regions.find(obj => obj.region === region)
    if (!orderRegion) return next(new ErrorResponse(`We can't ship to this region.`, 400))

    const shareOfSellers = []
    let profitPrice = 0
    const usdValute = orderConfig.valute.usd
    const orderItems = JSON.parse(JSON.stringify(req.user.cart))
    if (!orderItems.length) return next(new ErrorResponse(`Your cart is emtpy!`, 400))

    for (let item of orderItems) {
      const result = await validation.validateProductID(item.product.toString(), next)
      if (!result.success) return next(new ErrorResponse(result.message, 400))
      const product = result.data

      if (product.quantity < item.qty) return next(new ErrorResponse(`Not enough product: ${product.title}`, 400))
      if (product.sizes.indexOf(item.size) < -1) return next(new ErrorResponse(`Currently don't have this size: ${product.title}`, 400))
      if (product.colors.indexOf(item.color) < -1) return next(new ErrorResponse(`Currently don't have this color: ${product.title}`, 400))

      const price = product.purchaseValute == "usd"
        ? product.purchasePrice * usdValute
        : product.purchasePrice

      item.name = product.title
      item.shippingType = product.shippingType
      item.image = product.images[0]
      item.price = price

      const sellerIndex = shareOfSellers.findIndex(item => item.seller.toString() === product.soldBy.toString())
      const profit = (price / 100) * orderConfig.taxPrice
      if (sellerIndex >= 0) {
        shareOfSellers[sellerIndex].price += (price - profit)
      } else {
        shareOfSellers.push({
          seller: product.soldBy,
          price: price - profit,
          isPaid: false,
        })
      }
      profitPrice += profit
      totalPrice += price
    }

    totalPrice += orderRegion.shippingPrice
    const payment = paymentMethod == "payme" ? {
      payme: { paystate: 0 }
    } : {
      click: { paystate: 0 }
    }

    //Create order
    const order = await Order.create({
      user: req.user._id,
      orderItems,
      taxPrice: profitPrice,
      shippingPrice: orderRegion.shippingPrice,
      shippingAdress,
      totalPrice,
      shareOfSellers,
      payment: {
        method: paymentMethod,
        ...payment
      }
    })

    const redirectUrl = paymentMethod === "payme" ?
      paymeRequestUrl +
      Buffer.from(`m=${merchantID};ac.order_id=${order._id};a=${totalPrice * 100}`).toString("base64") :
      paymentMethod === 'click' ?
      `https://my.click.uz/services/pay?service_id=${process.env.CLICK_SERVICE_ID}&merchant_id=${process.env.CLICK_MERCHANT_ID}&amount=${totalPrice}&transaction_param=${order._id}` :
      ''

    await this.updateProductNumbers(orderItems)
    req.user.cart = []
    // await req.user.save()
    await this.updateSellersBalance(shareOfSellers)

    res
      .status(200)
      .json({
        success: true,
        data: {
          order: {
            address: order.shippingAdress,
            status: order.status,
            date: order.createdAt,
            _id: order._id
          },
          redirectUrl
        },
      })
  })

  // @desc      Admin accept order
  // @route     PUT /api/v1/orders/accept/:id
  // @access    Private (Admin only)
  orderAccepted = asyncHandler(async (req, res, next) => {
    const result = await validation.validateOrderID(req.params.id, next)
    if (!result.success) return next(new ErrorResponse(result.message, 400))
    const updatedOrder = await this.changeOrderStatus(req.params.id, "in progress")

    res
      .status(200)
      .json({
        success: true,
        data: updatedOrder,
      })
  })

  // @desc      User received order
  // @route     PUT /api/v1/orders/receive/:id
  // @access    Private (Admin only)
  orderReceived = asyncHandler(async (req, res, next)=>{
    const result = await validation.validateOrderID(req.params.id, next)
    if (!result.success) return next(new ErrorResponse(result.message, 400))
    const order = result.data
    if (order.user.toString() !== req.user._id.toString()) return next(new ErrorResponse(`Not an ordered user`))
    const updatedOrder = await this.changeOrderStatus(req.params.id, "received")

    res
      .status(200)
      .json({
        success: true,
        data: updatedOrder,
      })
  })

  // @desc      Accept sellers share price
  // @route     PUT /api/v1/orders/accept-seller-share
  // @access    Private (Customer only)
  acceptSellerShare = asyncHandler(async (req, res, next) => {
		const result = await validation.validateWaterfall(
			validation.validateBody(req.body, [
				{ name: "order", type: "string" },
				{ name: "seller", type: "string" },
			]),
			await validation.validateOrderID(req.body.order, next),
			await validation.validateUserID(req.body.seller, next),
		)
    if (!result.success) return next(new ErrorResponse(result.message, 400))
    const order = result.data[0]
    const sellerID = result.data[1]._id.toString()
    const sellerIndex = order.shareOfSellers.findIndex(item => item.seller.toString() === sellerID)
    if (sellerIndex < 0) return next(new ErrorResponse(`Xato so'rov yuborildi`, 400))
    order.shareOfSellers[sellerIndex].isPaid = true

    const updatedSeller = await User.findByIdAndUpdate(sellerID, {
      $inc: { balance: -order.shareOfSellers[sellerIndex].price }
    }, { new: true })

    await order.save()
    res.status(200).json({ success: true })
  })

}

const service = new OrderService()
module.exports = OrderService

clock.on('hour', async (hour) => {
  const date = new Date()
  const waitingOrders = await Order.find({ status: "waiting", "payment.isPaid": false }).lean()
  const after12HourOrders = waitingOrders.filter(order => (Math.abs(new Date(order.createdAt) - date) / 36e5) >= orderDeleteHour)

  for (order of after12HourOrders) {
    await service.returnOrder(order)
    await Order.deleteOne({ _id: order._id })
  }
})
