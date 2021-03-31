const mongoose = require('mongoose');

const ConfigSchema = new mongoose.Schema({
  regions: [{
    region: { type: String, required: true },
    shippingPrice: { type: Number, required: true },
  }],
  taxPrice: { type: Number, required: true },
  shippingTypes: [{
  	id: String,
  	name: String
  }],
  valute: {
    usd: { type: Number, required: true }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('OrderConfig', ConfigSchema)