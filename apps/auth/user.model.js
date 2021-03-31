const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const bcrypt = require('bcryptjs')

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Пожалуйста введите email'],
    match: [
      /^(([^<>()\[\]\\.,:\s@"]+(\.[^<>()\[\]\\.,:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      'Пожальюста введите корректный Email'
    ],
    unique: true
  },
  name: {
    type: String,
    required: [true, 'Пожалуйста введите ваше Ф.И.О']
  },
  profile_image: String,
  password: {
    type: String,
    required: [true, 'Пожалуйста введите пароль'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    default: 'customer',
    enum: ['customer', 'seller', 'admin'],
  },
  shopName: {
    type: String,
    unique: true
  },
  address: {
    address: String,
    phonenumber: String,
    city: String,
    postalCode: String,
    country: String
  },
  industryType: String,
  shopLocation: String,
  isActive: {
    type: Boolean,
    default: true
  },
  cart: [{
    product: mongoose.Schema.Types.ObjectId,
    qty: Number,
    color: String,
    size: String
  }],
  phonenumbers: [String],
  wishlist: [ mongoose.Schema.Types.ObjectId ],
  resetPasswordToken: String,
  resetPasswordExpire: Date,

  googleId: String,
  googleMail: String,
  googleName: String,
  googleImage: String,
  
  facebookId: String,
  facebookMail: String,
  facebookName: String,
  facebookImage: String
}, {
  timestamps: true
})

// Hashing password with bcrypt
UserSchema.pre('save', async function(next){
  if(!this.isModified('password')){
    next()
  }
  
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

// Sign & Get JWT token
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  })
}

// Match user entered password with hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword){
  return await bcrypt.compare(enteredPassword, this.password)
}

// Generate and hash password token
UserSchema.methods.getResetPasswordToken = function() {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex')

  // Hash token and set to resetPasswordToken
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex')

  // Set expire
  this.resetPasswordExpire = Date.now() +10 * 60 * 1000

  return resetToken
}

module.exports = mongoose.model('User', UserSchema)