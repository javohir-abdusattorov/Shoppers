const { Router } = require('express');
const router = Router();
const CategoryService = require('./category.service');
const service = new CategoryService()

const { protect, authorize } = require('../../middleware/auth');

router.get('/all', service.getAllCategories);
router.get('/all/:name', service.getCategrories);
router.get('/sub-categories/:id', service.getSubCategories);
router.get('/last-categories/:id', service.getLastCategories);

router.get('/all-seperate', service.getAllCategoriesSeperate);
router.post('/create-main', protect, authorize('admin'), service.addMainCategory);
router.post('/create-sub/:id', protect, authorize('admin'), service.addSubCategory);
router.post('/create-last/:id', protect, authorize('admin'), service.addLastCategory);
router.put('/edit-main/:id', protect, authorize('admin'), service.editMainCategory);
router.put('/edit-sub/:id', protect, authorize('admin'), service.editSubCategory);
router.put('/edit-last/:id', protect, authorize('admin'), service.editLastCategory);

module.exports = router;
