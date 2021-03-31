const { Router } = require('express');
const router = Router();
const ComplaintsService = require('./complaints.service');
const Complaint = require('./complaint.model');
const service = new ComplaintsService()

const advancedResults = require('../../middleware/advancedResults');
const { protect, authorize } = require('../../middleware/auth');

router.get('/all', advancedResults(Complaint), service.allComplaints);
router.get('/my-complaints', protect, authorize('customer'), service.getAllUserComplaints);
router.post('/create', protect, authorize('customer'), service.postComplaint);
router.delete('/delete/:id', protect, authorize('customer'), service.removeComplaint);

module.exports = router;