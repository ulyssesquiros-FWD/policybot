const path = require('path');
const app = require('./app');
const config = require('./config/env');
const db = require('./config/database');
const hrRepo = require('./services/db/hrRepository');
const reportScheduler = require('./services/cron/reportScheduler');

async function bootstrap() {
  const dbStatus = await db.initDatabase();
  console.log(`[DB] Modo: ${dbStatus.mode} | MySQL conectado: ${dbStatus.connected}`);

  // Verificar si ya existen colaboradores sembrados; si no, ejecutar seeder automáticamente
  const collabs = await hrRepo.listCollaboratorsSummary();
  if (collabs.length === 0) {
    console.log('[Seed] Base vacía detectada. Ejecutando seeder inicial...');
    const { seedDatabase } = require(path.resolve(__dirname, '../../database/seeders/seed'));
    const seedRes = await seedDatabase();
    console.log('[Seed] Completado:', seedRes);
  }

  reportScheduler.startReportScheduler();
  console.log(`[Cron] Programado (${config.cron.schedule} ${config.cron.timezone})`);

  app.listen(config.port, () => {
    console.log(`[Server] PolicyBot HR API escuchando en http://localhost:${config.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Error fatal al iniciar servidor PolicyBot HR:', err);
  process.exit(1);
});
