const express = require('express');
const governanceController = require('../controllers/governanceController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole('ADMIN_RRHH', 'AUDITOR'));

router.get('/summary', governanceController.getGovernanceSummary);

module.exports = router;
