const { Router } = require('express');
const router = Router();
const ConfigService = require('./orderConfig.service');
const service = new ConfigService()

const { protect, authorize } = require('../../middleware/auth');

router.get('/get', service.getConfig);
router.put('/edit', protect, authorize('admin'), service.editConfig);

module.exports = router;
