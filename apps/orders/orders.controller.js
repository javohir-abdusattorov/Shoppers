const { Router } = require('express');
const router = Router();
const Order = require('./order.model');
const OrderService = require('./orders.service');
const service = new OrderService()

const advancedResults = require('../../middleware/advancedResults');
const { protect, authorize } = require('../../middleware/auth');

router.get('/all', advancedResults(Order), service.getAllOrders);
router.get('/status/:status', service.getOrdersByStatus);
router.get('/my-orders', protect, authorize('customer'), service.getAllCustomerOrders);
router.get('/my-last', protect, authorize('customer'), service.getLastOrder);
router.get('/seller-all', protect, authorize('seller'), service.getAllSellerOrders);

router.post('/create', protect, service.addNewOrder);
router.put('/accept-seller-share', protect, authorize('admin'), service.acceptSellerShare);
router.put('/accept/:id', protect, authorize('admin'), service.orderAccepted);
router.put('/receive/:id', protect, authorize('customer'), service.orderReceived);

module.exports = router;
