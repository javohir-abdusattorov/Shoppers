const path = require('path')
const ErrorResponse = require('../../utils/errorResponse')
const asyncHandler = require('../../middleware/async')

const MainCategory = require('./category.models/mainCategory.model');
const SubCategory = require('./category.models/subCategory.model');
const LastCategory = require('./category.models/lastCategory.model');

const Validation = require('../../utils/validation')
const validation = new Validation()

module.exports = class CategoryService {

	// @desc      Get all main category
	// @route     GET /api/v1/category/all
	// @access    Public
	getAllCategories = asyncHandler(async (req, res, next) => {
	  let maincategories = await MainCategory.find().lean()
	  let data = []

	  for (let maincategory of maincategories) {
	  	let subCategories = await SubCategory.find({ parent: maincategory._id }).lean()
	  	for (let subCategory of subCategories) {
	  		const lastcategories = await LastCategory.find({ parent: subCategory._id }).lean()
	  		subCategory.childs = lastcategories
	  	}
	  	maincategory.childs = subCategories
	  }

	  res.status(200).json({
	    success: true,
	    data: maincategories
	  });
	})

	// @desc      Get all main category
	// @route     GET /api/v1/category/all-seperate
	// @access    Public
	getAllCategoriesSeperate = asyncHandler(async (req, res, next) => {
	  const maincategories = await MainCategory.find()
	  const subcategories = await SubCategory.find()
	  const lastategories = await LastCategory.find()

	  res.status(200).json({
	    success: true,
	    data: {
	    	maincategories,
	    	subcategories,
	    	lastategories
	    }
	  });
	})

	// @desc      Get all category (main, sub, last)
	// @route     GET /api/v1/category/all/:name
	// @access    Public
	getCategrories = asyncHandler(async (req, res, next) => {
		const p = req.params.name
		const Model =
					 p == "main" ? MainCategory
         : p == "sub" ? SubCategory
         : LastCategory

	  const category = await Model.find()

	  res.status(200).json({
	    success: true,
	    data: category
	  });
	})

	// @desc      Get sub category
	// @route     GET /api/v1/category/sub-categories/:id
	// @access    Public
	getSubCategories = asyncHandler(async (req, res, next) => {
		const result = await validation.validateMainCategoryID(req.params.id)
		if (!result.success) return next(new ErrorResponse(result.message, 404))

		const categories = await SubCategory.find({ parent: req.params.id })		
	  res.status(200).json({
	    success: true,
	    data: categories
	  })
	})

	// @desc      Get last category
	// @route     GET /api/v1/category/last-categories/:id
	// @access    Public
	getLastCategories = asyncHandler(async (req, res, next) => {
		const result = await validation.validateSubCategoryID(req.params.id)
		if (!result.success) return next(new ErrorResponse(result.message, 404))

		const categories = await LastCategory.find({ parent: req.params.id })		
	  res.status(200).json({
	    success: true,
	    data: categories
	  })
	})

	// @desc      Create main category
	// @route     POST /api/v1/category/create-main
	// @access    Private (Admin only)
	addMainCategory = asyncHandler(async (req, res, next)=>{
		let result = validation.validateBody(req.body, [
			{ name: "name_uz", type: "string" },
			{ name: "name_ru", type: "string" },
			{ name: "name_en", type: "string" },
		])
		if (!result.success) return next(new ErrorResponse(result.message, 404))
	  const { name_uz, name_ru, name_en } = req.body;

	  const mainCategory = await MainCategory.create({
	    name: {
	      name_uz,
	      name_ru,
	      name_en,
	    },
	  })

	  res.status(201).json({
	    success: true,
	    data: mainCategory
	  })
	})

	// @desc      Create main category
	// @route     POST /api/v1/category/create-sub/:id
	// @access    Private (Admin only)
	addSubCategory = asyncHandler(async (req, res, next)=>{
		let result = await validation.validateWaterfall(
			await validation.validateMainCategoryID(req.params.id, next),
			validation.validateBody(req.body, [
				{ name: "name_uz", type: "string" },
				{ name: "name_ru", type: "string" },
				{ name: "name_en", type: "string" },
			]),
		)
		if (!result.success) return next(new ErrorResponse(result.message, 404))
	  const { name_uz, name_ru, name_en } = req.body;

	  const subCategory = await SubCategory.create({
	    name: {
	      name_uz,
	      name_ru,
	      name_en,
	    },
	    parent: req.params.id
	  })

	  res.status(201).json({
	    success: true,
	    data: subCategory
	  })
	})

	// @desc      Create main category
	// @route     POST /api/v1/category/create-last/:id
	// @access    Private (Admin only)
	addLastCategory = asyncHandler(async (req, res, next) => {
		let result = await validation.validateWaterfall(
			await validation.validateSubCategoryID(req.params.id, next),
			validation.validateBody(req.body, [
				{ name: "name_uz", type: "string" },
				{ name: "name_ru", type: "string" },
				{ name: "name_en", type: "string" },
			]),
		)
		if (!result.success) return next(new ErrorResponse(result.message, 404))
	  const { name_uz, name_ru, name_en } = req.body

	  const lastCategory = await LastCategory.create({
	    name: {
	      name_uz,
	      name_ru,
	      name_en,
	    },
	    parent: req.params.id
	  })

	  res.status(201).json({
	    success: true,
	    data: lastCategory
	  })
	})

	// @desc      Edit mainCategory
	// @route     POST /api/v1/category/edit-main/:id
	// @access    Private (Admin only)
	editMainCategory = asyncHandler(async (req, res, next) => {
		let result = await validation.validateWaterfall(
			await validation.validateMainCategoryID(req.params.id, next),
			validation.validateBody(req.body, [
				{ name: "name_uz", type: "string" },
				{ name: "name_ru", type: "string" },
				{ name: "name_en", type: "string" },
			]),
		)
		if (!result.success) return next(new ErrorResponse(result.message, 404))
	  const { name_uz, name_ru, name_en } = req.body;

	  let updatedCategory = await MainCategory.findOneAndUpdate(
	    { _id: req.params.id },
	    {
	      name: {
	        name_uz,
	        name_ru,
	        name_en,
	      }
	    },
	    { new: true }
	  );

	  res.status(201).json({
	    success: true,
	    data: updatedCategory
	  });
	});

	// @desc      Edit subCategory
	// @route     POST /api/v1/category/edit-sub/:id
	// @access    Private (Admin only)
	editSubCategory = asyncHandler(async (req, res, next)=>{
		let result = await validation.validateWaterfall(
			await validation.validateSubCategoryID(req.params.id, next),
			validation.validateBody(req.body, [
				{ name: "name_uz", type: "string" },
				{ name: "name_ru", type: "string" },
				{ name: "name_en", type: "string" },
			]),
		)
		if (!result.success) return next(new ErrorResponse(result.message, 404))
	  const { name_uz, name_ru, name_en } = req.body;

	  let updatedCategory = await SubCategory.findOneAndUpdate(
	    { _id: req.params.id },
	    {
	      name: {
	        name_uz,
	        name_ru,
	        name_en,
	      }
	    },
	    { new: true }
	  );

	  res.status(201).json({
	    success: true,
	    data: updatedCategory
	  });
	})

	// @desc      Edit lastCategory
	// @route     POST /api/v1/category/edit-last/:id
	// @access    Private (Admin only)
	editLastCategory = asyncHandler(async (req, res, next) => {
		let result = await validation.validateWaterfall(
			await validation.validateLastCategoryID(req.params.id, next),
			validation.validateBody(req.body, [
				{ name: "name_uz", type: "string" },
				{ name: "name_ru", type: "string" },
				{ name: "name_en", type: "string" },
			]),
		)
		if (!result.success) return next(new ErrorResponse(result.message, 404))
	  const { name_uz, name_ru, name_en } = req.body;

	  let updatedCategory = await LastCategory.findOneAndUpdate(
	    { _id: req.params.id },
	    {
	      name: {
	        name_uz,
	        name_ru,
	        name_en,
	      }
	    },
	    { new: true }
	  );

	  res.status(201).json({
	    success: true,
	    data: updatedCategory
	  });
	})

}
