const express = require('express');
const employeeController = require('../controllers/employeeController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Rutas del colaborador autenticado (identidad exclusivamente desde JWT)
router.get('/me', employeeController.getMyProfile);
router.post('/requests', employeeController.createMyRequest);

// Rutas administrativas humanas (solo ADMIN_RRHH)
router.get('/admin/requests', requireRole('ADMIN_RRHH'), employeeController.listAdminRequests);
router.patch('/admin/requests/:id', requireRole('ADMIN_RRHH'), employeeController.resolveAdminRequest);
router.get('/admin/collaborators', requireRole('ADMIN_RRHH'), employeeController.listCollaborators);

module.exports = router;
