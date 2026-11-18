const express = require('express');
const multer = require('multer');
const documentsController = require('../controllers/documentsController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Callback OAuth 2.0 (validado estrictamente mediante state criptográfico de un solo uso vinculado al Admin RRHH)
router.get('/drive/callback', documentsController.handleDriveCallback);

// Rutas protegidas por JWT
router.use(authMiddleware);

router.get('/', documentsController.listDocuments);
router.get('/view/:documentId', documentsController.viewDocumentContent);

// Gestión documental y OAuth restringida a ADMIN_RRHH
router.get('/drive/auth-url', requireRole('ADMIN_RRHH'), documentsController.getDriveAuthUrl);
router.post('/drive/tokens', requireRole('ADMIN_RRHH'), documentsController.blockManualTokenInjection);
router.post('/drive/disconnect', requireRole('ADMIN_RRHH'), documentsController.disconnectDrive);
router.patch('/drive/folder', requireRole('ADMIN_RRHH'), documentsController.updateDriveFolder);
router.post('/drive/push-local', requireRole('ADMIN_RRHH'), documentsController.pushLocalPolicies);

router.post('/sync', requireRole('ADMIN_RRHH'), documentsController.syncDocuments);
router.post('/ingest', requireRole('ADMIN_RRHH'), upload.single('file'), documentsController.ingestManual);
router.put('/:documentId', requireRole('ADMIN_RRHH'), documentsController.updateDocument);
router.post('/search-test', requireRole('ADMIN_RRHH'), documentsController.searchTest);

module.exports = router;
