const { Router } = require('express');
const router = Router();
const UserService = require('./users.service');
const service = new UserService()
const { protect, authorize } = require('../../middleware/auth');

router.get('/all-sellers', protect, authorize('admin'), service.getAllSellers)
router.get('/all-customers', protect, authorize('admin'), service.getAllCustomers)
router.get('/seller/:id', protect, authorize('admin'), service.getSellerById)
router.get('/get-cart', protect, authorize('customer'), service.getUserCart)
router.get('/cart-total', protect, authorize('customer'), service.getCartTotal)
router.get('/get-statistics', protect, authorize('customer'), service.getUserStatistics)

router.post('/add-cart', protect, authorize('customer'), service.addToCart)
router.put('/toggle-active/:id', protect, authorize('admin'), service.toggleSellerActive)
router.put('/edit-user/:id', protect, authorize('admin'), service.editUser)
router.put('/edit-cart/:cartItemID', protect, authorize('customer'), service.editCartItemQuantity)
router.delete('/remove-cart/:cartItemID', protect, authorize('customer'), service.removeFromCart)

router.get('/get-wishlist', protect, authorize('customer'), service.getUserWishlist)
router.post('/add-wishlist', protect, authorize('customer'), service.addToWishlist)
router.delete('/delete-seller/:id', protect, authorize('admin'), service.deleteSeller)
router.delete('/remove-wishlist/:productID', protect, authorize('customer'), service.removeFromWishlist)
router.delete('/delete-customer/:id', protect, authorize('admin'), service.deleteCustomer)

module.exports = router;