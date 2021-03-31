const { Router } = require('express');
const router = Router();
const ProductsService = require('./products.service');
const Product = require('./product.model');
const service = new ProductsService()

const advancedResults = require('../../middleware/advancedResults');
const { protect, authorize } = require('../../middleware/auth');

router.get('/all', advancedResults(Product), service.getAllProducts);
router.get('/product/:id', service.getOneProduct);
router.get('/all-favorits', service.getAllFavoritProducts);
router.get('/all-related/:id', service.getAllRelateProducts);
router.get('/all-rating', service.getAllRatingProducts);
router.get('/seller-rating', protect, authorize('seller'), service.getAllSellerRatingProducts);
router.get('/last-selled', protect, authorize('seller'), service.getSellerLastSelledProducts);
router.get('/bestsellers', service.getBestellerProducts);
router.get('/highest-discount', service.getHighestDiscountProduct);
router.get('/search', service.searchProducts);
router.post('/create', protect, authorize('seller'), service.addNewProduct);
router.put('/edit/:id', protect, authorize('seller', 'admin'), service.editProdcut);
router.put('/edit-publish/:id', protect, authorize('seller', 'admin'), service.togglePublish);
router.put('/buy/:id', protect, authorize('seller'), service.buyProduct);
router.delete('/delete/:id', protect, authorize('seller', 'admin'), service.deleteProduct);

module.exports = router;