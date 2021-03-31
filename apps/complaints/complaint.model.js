const mongoose = require('mongoose');

const Schema = new mongoose.Schema({
	message: {
		type: String,
		maxlength: process.env.REVIEW_MESSAGE_MAX_LENGTH
	},
	image: {
		type: String,
	},
	user: {		
	    type: mongoose.Schema.Types.ObjectId,
	    required: true,
	    ref: 'User'
	},
	order: {
	    type: mongoose.Schema.Types.ObjectId,
	    required: true,
	    ref: 'Order'
	},
}, {
	timestamps: true,
});

module.exports = mongoose.model('Complaint', Schema);