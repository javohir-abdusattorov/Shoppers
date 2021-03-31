const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  orderItems: [
    {
      name: { type: String, required: true },
      qty: { type: Number, required: true },
      image: { type: String, required: true },
      price: { type: Number, required: true },
      size: { type: String, required: true },
      color: { type: String, required: true },
      shippingType: {
        id: { type: String, required: true },
        name: { type: String, required: true }
      },
      product: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Product'
      }
    }
  ],
  shippingAdress: {
    address: { type: String, required: true },
    phonenumber: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, default: 'Uzbekistan' }
  },
  shareOfSellers: [{
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    price: Number,
    isPaid: { type: Boolean, default: false },
  }],
  payment: {
    method: {
      type: String,
      required: true,
      enum: ["payme", "click"]
    },
    isPaid: {
      type: Boolean,
      default: false
    },
    payme: {
      paystate: {
        type: Number,
        enum: [-2, -1, 0, 1, 2],
        default: undefined
      },
      create_time:{
        type: Date,
        default: undefined
      }
    },
    click: {
      paystate: {
        type: Number,
        enum: [-2, -1, 0, 1, 2],
        default: undefined
      }
    },
  },
  taxPrice: {
    type: Number,
    required: true,
  },
  shippingPrice: {
    type: Number,
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true,
    default: 0.0
  },
  status: {
    type: String,
    default: 'waiting',
    enum: JSON.parse(process.env.ORDER_STATUS),
  },
  deliveredAt: {
    type: Date
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('Order', orderSchema);
