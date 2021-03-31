const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
	name: {
		name_uz: {
      type: String,
      required: [true, 'Пожалуйста введите название']
    },
    name_ru: {
      type: String,
      required: [true, 'Пожалуйста введите название']
    },
    name_en: {
      type: String,
      required: [true, 'Пожалуйста введите название']
    }
	},
	parent: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'MainCategory'
	}
},{
	timestamps: true
});

module.exports = mongoose.model('SubCategory', categorySchema);