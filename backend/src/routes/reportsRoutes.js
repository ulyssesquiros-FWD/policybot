const express = require('express');
const reportsController = require('../controllers/reportsController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole('ADMIN_RRHH'));

router.get('/latest', reportsController.getLatestReportDashboard);
router.post('/generate', reportsController.generateReportNow);
router.patch('/escalations/:id', reportsController.resolveEscalation);

module.exports = router;
