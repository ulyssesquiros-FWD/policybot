const express = require('express');
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/query', chatController.queryChat);
router.get('/history', chatController.getHistory);
router.post('/escalate', chatController.manualEscalate);

module.exports = router;
