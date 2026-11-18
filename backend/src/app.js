const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config/env');
const db = require('./config/database');
const deepseekService = require('./services/ai/deepseekService');
const qdrantService = require('./services/rag/qdrantService');
const embeddingService = require('./services/rag/embeddingService');
const googleDriveService = require('./services/rag/googleDriveService');
const reportScheduler = require('./services/cron/reportScheduler');
const { securityInputMiddleware } = require('./middleware/securityMiddleware');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const chatRoutes = require('./routes/chatRoutes');
const reportsRoutes = require('./routes/reportsRoutes');
const documentsRoutes = require('./routes/documentsRoutes');
const governanceRoutes = require('./routes/governanceRoutes');

const app = express();

app.use(helmet());

const allowedOrigins = config.corsOrigin.split(',').map((o) => o.trim());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origen bloqueado por política CORS de PolicyBot HR.'));
    },
    credentials: true
  })
);

app.use(
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Límite de solicitudes excedido. Intente nuevamente en unos minutos.' }
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(securityInputMiddleware);

app.get('/api/health', async (req, res) => {
  await db.ensureReady();
  res.json({
    status: 'OK',
    service: 'PolicyBot HR Backend',
    timestamp: new Date().toISOString(),
    integrations: {
      database: db.getDbStatus(),
      deepseek: deepseekService.getServiceStatus(),
      qdrant: await qdrantService.getQdrantStatus(),
      embeddings: embeddingService.getEmbeddingStatus(),
      googleDrive: await googleDriveService.getDriveStatus(),
      cron: reportScheduler.getSchedulerStatus()
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/governance', governanceRoutes);

app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

app.use(errorHandler);

module.exports = app;
