const path = require("path")
const crypto = require("crypto")
const ErrorResponse = require('../../utils/errorResponse')
const asyncHandler = require('../../middleware/async')

const User = require("./user.model")
const Product = require("../products/product.model")
const OrderConfig = require('../orderConfig/orderConfig.model')

const sendEmail = require("../../utils/sendEmail")
const Validation = require('../../utils/validation')
const validation = new Validation()
const ImageService = require('../../utils/imagesService')
const imagesService = new ImageService()

const gt = async () => {
  let gg = await User.updateMany({ role: "seller" }, {
    balance: 0
  })
  console.log(gg)
}


module.exports = class AuthService {

  unPublishSellerProducts = async (id) => {
    let updatedProduct = await Product.updateMany(
      { soldBy: id },
      { isPublish: false },
    )
  }

  sendTokenResponse = (user, statusCode, res) => {
    const token = user.getSignedJwtToken()
    let role = user.role

    res.status(statusCode).json({
      success: true,
      token,
      role,
    })
  }

  // @desc      Register user
  // @route     POST /api/v1/auth/register
  // @access    Public
  register = asyncHandler(async (req, res, next) => {
    let result = validation.validateBody(req.body, [
      { name: "email", type: "string" },
      { name: "name", type: "string" },
      { name: "password", type: "string" }
    ])

    if (!result.success) return next(new ErrorResponse(result.message, 400))
    const { email, name, password } = req.body

    let profile_image =
      req.files && req.files.profile_image
        ? await imagesService.uploadUserImage(req.files.profile_image, next)
        : process.env.USER_DEFAULT_PROFILE_IMAGE

    //Create user
    const user = await User.create({
      email,
      name,
      profile_image,
      password,
    })

    const token = user.getSignedJwtToken()
    res.status(200).json({
      success: true,
      token,
      data: user,
    })
  })

  // @desc      Register seller
  // @route     POST /api/v1/auth/register-seller
  // @access    Private (Admin only)
  registerSeller = asyncHandler(async (req, res, next) => {
    const result = validation.validateBody(req.body, [
      { name: "email", type: "string" },
      { name: "name", type: "string" },
      { name: "password", type: "string" },
      { name: "shopName", type: "string" },
      { name: "industryType", type: "string" },
      { name: "shopLocation", type: "string" },
      { name: "phonenumbers", type: "array" },
    ])

    if (!result.success) return next(new ErrorResponse(result.message, 400))
    const {
      email,
      name,
      password,
      shopName,
      industryType,
      shopLocation,
      phonenumbers
    } = req.body

    const profile_image =
      req.files && req.files.profile_image
        ? await imagesService.uploadUserImage(req.files.profile_image, next)
        : process.env.USER_DEFAULT_PROFILE_IMAGE

    //Create user
    const user = await User.create({
      email,
      name,
      profile_image,
      password,
      role: "seller",
      shopName,
      industryType,
      shopLocation,
      phonenumbers
    })

    res.status(201).json({ success: true, data: user })
  })

  // @desc      Login user
  // @route     POST /api/v1/auth/login
  // @access    Public
  login = asyncHandler(async (req, res, next) => {
    let result = validation.validateBody(req.body, [
      { name: "email", type: "string" },
      { name: "password", type: "string" },
    ])

    if (!result.success) return next(new ErrorResponse(result.message, 400))
    const { email, password } = req.body

    //Check for the user
    const user = await User.findOne({ email }).select("+password")

    if (!user) {
      return next(new ErrorResponse("Invalid email or password", 401))
    }

    // Check passwords
    const isMatch = await user.matchPassword(password)

    if (!isMatch) {
      return next(new ErrorResponse("Invalid email or password", 401))
    }

    if (!user.isActive) {
      return next(new ErrorResponse("Siz bloklangan foydalanuvchisiz", 401))
    }

    const token = user.getSignedJwtToken()
    res.status(200).json({
      success: true,
      token,
      data: user,
    })
  })

  // @desc      Get authorized user
  // @route     GET /api/v1/auth/me
  // @access    Private
  getMe = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id).lean()
    const { valute } = await OrderConfig.findOne()

    if (!user.address) user.address = {
      address: null,
      phonenumber: null,
      city: null,
      postalCode: null,
      country: null
    }

    let totalPrice = 0
    for (const item of user.cart) {
      const product = await Product.findById(item.product)
      if (product.purchaseValute == "usd") totalPrice += product.purchasePrice * valute.usd
        else totalPrice += product.purchasePrice
    }
    user.cartTotal = totalPrice

    res.status(200).json({
      success: true,
      data: user,
    })
  })

  // @desc      Edit user
  // @route     PUT /api/v1/auth/edit
  // @access    Private
  editUser = asyncHandler(async (req, res, next) => {
    if (!req.body) return res.status(400).json({
      success: false,
      message: "Nothing to update"
    })

    const user = await User.findById(req.user._id).select("+password")
    let updatingObj = {}
    const userField = ['email', 'name', 'shopName', 'industryType', 'shopLocation', 'cardNumber']

    for (let field of userField) {
      if (field in req.body) {
        updatingObj[field] = req.body[field]
      }
    }

    if (req.files && req.files.profile_image) {
      if (user.profile_image != process.env.USER_DEFAULT_PROFILE_IMAGE) imagesService.deleteImages([user.profile_image])
      updatingObj.profile_image = await imagesService.uploadUserImage(req.files.profile_image, next)
    }

    if (req.body.phonenumbers) {
      updatingObj["phonenumbers"] = JSON.parse(req.body.phonenumbers)
    }

    if (req.body.oldPassword && req.body.newPassword && req.body.newPassword !== req.body.oldPassword) {
      const isMatch = await user.matchPassword(req.body.oldPassword)
      if (!isMatch) return next(new ErrorResponse("Invalid password", 400))
      const salt = await bcrypt.genSalt(10)
      updatingObj.password = await bcrypt.hash(req.body.newPassword, salt)
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: req.user._id },
      updatingObj,
      { new: true, runValidators: true }
    )

    res.status(200).json({
      success: true,
      data: updatedUser
    })
  })

  // @desc      Edit user
  // @route     PUT /api/v1/auth/edit-address
  // @access    Private (Customer only)
  editCustomerAddress = asyncHandler(async (req, res, next) => {
    if (!req.body) return res.status(400).json({
      success: false,
      message: "Nothing to update"
    })

    let user = await User.findById(req.user._id)
    let updatingObj = {}
    const userField = ['address', 'phonenumber', 'city', 'postalCode', 'country']

    for (let field of userField) {
      if (field in req.body) {
        updatingObj[field] = req.body[field]
      }
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: req.user._id },
      { address: updatingObj },
      { new: true, runValidators: true }
    )

    res.status(200).json({
      success: true,
      data: updatedUser
    })
  })

  // @desc      Forgot password
  // @route     POST /api/v1/auth/forgot-password
  // @access    Public
  fortgotPassword = asyncHandler(async (req, res, next) => {
    let result = validation.validateBody(req.body, [{ name: "email", type: "string" }])
    if (!result.success) return next(new ErrorResponse(result.message, 400))
    const user = await User.findOne({ email: req.body.email })

    if (!user) return next(new ErrorResponse(`Пользователь с таким Email не существует в нашей базе`,404))

    // Get reset token
    const resetToken = user.getResetPasswordToken()

    await user.save({ validateBeforeSave: false })

    // Create reset url
    const resetUrl = `${req.protocol}://${req.get("host")}/api/v1/auth/resetpassword/${resetToken}`

    const message = `Вы получили эту сообщения так как вы или кто-то хотели восстановить пароль
      на ваш аккаунт. Если это были не вы просто игнорьте сообщения. Ну если это были вы
      переходите по ссылке ниже чтобы восстановит новый пароль \n\n ${resetUrl}`

    try {
      await sendEmail({
        email: user.email,
        subject: "Parolni qayta tiklash",
        message,
      })
      res.status(200).json({ success: true, data: "Email отправлен" })
    } catch (err) {
      console.log(err)
      user.resetPasswordToken = undefined
      user.resetPasswordExpire = undefined

      await user.save({ validateBeforeSave: false })

      return next(new ErrorResponse(`Email не может быть отправлен`, 500))
    }
  })

  // @desc      Reset password
  // @route     PUT /api/v1/auth/reset-password/:resettoken
  // @access    Public
  resetPassword = asyncHandler(async (req, res, next) => {
    let result = validation.validateBody(req.body, [{ name: "password", type: "string" }])
    if (!result.success) return next(new ErrorResponse(result.message, 400))

    // Get hashed token
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.resettoken)
      .digest("hex")

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    })

    if (!user) {
      return next(new ErrorResponse(`Invalid token`, 400))
    }

    // Set new password
    user.password = req.body.password
    user.resetPasswordToken = undefined
    user.resetPasswordExpire = undefined
    await user.save()

    this.sendTokenResponse(user, 200, res)
  })

  // @desc      Block seller
  // @route     PUT /api/v1/auth/block-seller/:id
  // @access    Private (Admin only)
  blockSeller = asyncHandler(async (req, res, next) => {
    let result = await validation.validateUserID(req.params.id, next)
    if (!result.success) return next(new ErrorResponse(result.message, 400))
    if (result.data.role !== "seller") return next(new ErrorResponse("Not an seller!", 400))
    await this.unPublishSellerProducts(req.params.id)

    res.status(200).json({
      success: true,
    })
  })

  // @desc      Authentication with google
  // @route     PUT /api/v1/auth/google/redirect
  // @access    Public 
  googleRedirect = asyncHandler(async (req, res, next) => {
    const user = await User.findOne({_id: req.user._id})
    const token = user.getSignedJwtToken()
    res.redirect(`https://shoppers.uz/auth?token=${token}`)
  })

  // @desc      Authentication with google
  // @route     PUT /api/v1/auth/facebook/redirect
  // @access    Public
  facebookRedirect = asyncHandler(async (req, res, next)=>{
    const user = await User.findOne({_id: req.user._id})
    const token = user.getSignedJwtToken()
    res.redirect(`https://shoppers.uz/auth?token=${token}`)
  })

}
