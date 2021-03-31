const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
	message: {
		type: String,
		maxlength: process.env.REVIEW_MESSAGE_MAX_LENGTH
	},
	image: {
		type: String,
	},
	rating: {
		type: Number,
		min: 0.0,
		max: 5.0,
		required: true
	},
	user: {		
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
	},
	product: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Product'
	},
	replies: [{
		user: {
	    type: mongoose.Schema.Types.ObjectId,
	    required: true,
	    ref: 'User'
		},
		message: {
			type: String,
			required: true
		}
	}]
}, {
	timestamps: true,
});

module.exports = mongoose.model('Review', ReviewSchema);