const mongoose = require('mongoose');
const searchLimit = 20

const ProductSchema = new mongoose.Schema({
	images: {
		type: [ String ],
		minlength: process.env.MIN_IMAGE_PER_PRODUCT,
		maxlength: process.env.MAX_IMAGE_PER_PRODUCT,
	},
	title: {
		type: String,
		required: [true, 'Пожалуйста введите заглавление'],
	},
	description: {
		description_uz: {
		  type: String,
		  required: [true, 'Ma`lumotni kiriting']
		},
		description_ru: {
		  type: String,
		  required: [true, 'Пожалуйста введите информацию']
		},
		description_en: {
		  type: String,
		  required: [true, 'Please enter a description']
		},
	},
	ID: {
		type: String,
	},
	options: [
		{
			key: String,
			value: String,
		}
	],
	isPublish: {
		type: Boolean,
		default: false
	},
	lastIsPublish: {
		type: Boolean,
		default: false
	},
	isFavorit: {
		type: Boolean,
		default: false
	},
	sold: {
		type: Number,
		default: 0
	},
	soldBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
	},
	brand: {
		type: String,
		required: [true, 'Пожалуйста введите марку'],
	},
	retailPrice: {
		type: Number,
		required: [true, 'Пожалуйста введите розничную цену'],
	},
	retailValute: {
		type: String,
		required: [true, 'Пожалуйста введите розничную валюту'],
    	enum: JSON.parse(process.env.VALUTES),
	},
	purchasePrice: {
		type: Number,
		required: [true, 'Пожалуйста введите покупную цену'],
	},
	purchaseValute: {
		type: String,
		required: [true, 'Пожалуйста введите покупную валюту'],
    enum: JSON.parse(process.env.VALUTES),
	},
	category: {
		name: {
			name_uz: {
				type: String, 
				required: true 
			},
			name_ru: {
				type: String, 
				required: true 
			},
			name_en: {
				type: String, 
				required: true 
			},
		},
		category: {
			type: mongoose.Schema.Types.ObjectId, 
      required: true,
      ref: 'LastCategory'
		},
	},
	quantity: {
		type: Number,
		required: [true, 'Пожалуйста введите количество товара'],
	},
	rating: {
		type: Number,
		default: 0.0
	},
	shippingType: {
  	id: { type: String, required: true },
  	name: { type: String, required: true }
	},
	discount: {
		percent: Number,
		deadline: Date
	},
	unit: {
		type: String,
		required: [true, 'Пожалуйста введите unit'],
	},
	sizes: {
		type: [ String ],
		required: true
	},
	colors: {
		type: [ String ],
		required: true
	},
}, {
	timestamps: true,
});

//Creating indexes
ProductSchema.index({ 
  title: 'text', 
  brand: 'text', 
  description: 'text', 
});

//Custom partial search method
ProductSchema.statics = {
  searchPartial: function(q, skip, callback) {
    return this.find({
      $or: [
        { "title": new RegExp(q, "gi") },
        { "brand": new RegExp(q, "gi") },
        { "description": new RegExp(q, "gi") },
      ]
    }, [], { skip: skip * searchLimit, limit: searchLimit }, callback);
  },

  searchFull: function (q, callback) {
    return this.find({
      $text: { $search: q, $caseSensitive: false }
    }, callback);
  },

  search: function(q, callback) {
    this.searchFull(q, (err, data) => {
      if (err) return callback(err, data);
      if (!err && data.length) return callback(err, data);
      if (!err && data.length === 0) return this.searchPartial(q, callback);
    });
  },
};

module.exports = mongoose.model('Product', ProductSchema);