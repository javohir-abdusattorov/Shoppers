const { Router } = require('express');
const router = Router();
const TransactionService = require('./transaction.service');
const Transaction = require('./transaction.model');
const service = new TransactionService()

router.post('/payme', service.payme);
router.post('/click/prepare', service.clickPrepare);
router.post('/click/complete', service.clickComplete);

module.exports = router;