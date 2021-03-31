const mongoose = require('mongoose')

const transactionSchema = new mongoose.Schema({
  order_id: String,
  status: String,
  pay_method: String,
  date_add: String,
  paycom_state: String,
  paycom_create_time: String,
  paycom_id: String,
  paycom_perform_time: { type: String, default: '0' },
  paycom_reason: { type: Number},
  paycom_cancel_time : { type: String, default: '0' },
  amount: String,
  click_prepare_confirm: {type: Number, default: undefined},
},{
  timestamps: true
})

module.exports = mongoose.model('Transaction', transactionSchema)