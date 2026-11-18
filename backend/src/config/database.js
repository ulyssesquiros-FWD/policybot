const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('./env');

const SNAPSHOT_PATH = path.join(config.paths.dataDir, 'local_db_snapshot.json');

let pool = null;
let mode = 'uninitialized'; // 'mysql' | 'local_fallback'
let lastConnectionError = null;

function ensureDataDir() {
  if (!fs.existsSync(config.paths.dataDir)) {
    fs.mkdirSync(config.paths.dataDir, { recursive: true });
  }
}

function getEmptySnapshot() {
  return {
    roles: [],
    permisos: [],
    rol_permisos: [],
    colaboradores: [],
    usuarios: [],
    saldos_vacaciones: [],
    solicitudes: [],
    incapacidades: [],
    movimientos_personal: [],
    consultas_chat: [],
    reportes_diarios: [],
    audit_logs: [],
    document_sync_state: [],
    escalaciones_rrhh: [],
    google_drive_connections: [],
    _meta: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };
}

let memorySnapshot = null;

function loadSnapshot() {
  if (memorySnapshot) return memorySnapshot;
  ensureDataDir();
  if (fs.existsSync(SNAPSHOT_PATH)) {
    try {
      memorySnapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
      return memorySnapshot;
    } catch {
      memorySnapshot = getEmptySnapshot();
      return memorySnapshot;
    }
  }
  memorySnapshot = getEmptySnapshot();
  return memorySnapshot;
}

function saveSnapshot(data) {
  ensureDataDir();
  memorySnapshot = data;
  memorySnapshot._meta = {
    ...(memorySnapshot._meta || {}),
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(memorySnapshot, null, 2), 'utf8');
}

async function initDatabase({ forceSchema = false } = {}) {
  try {
    const conn = await mysql.createConnection({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      connectTimeout: 3000,
      multipleStatements: true
    });
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await conn.end();

    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true
    });

    await pool.execute('SELECT 1 AS ok');

    try {
      const models = require('../models');
      await models.sequelize.authenticate();
    } catch (seqErr) {
      console.warn('Sequelize authenticate warning:', seqErr.message);
    }

    if (forceSchema) {
      const schemaPath = path.join(config.paths.root, 'database', 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schemaSql);
      }
    } else {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS google_drive_connections (
          id INT AUTO_INCREMENT PRIMARY KEY,
          connected_by INT NOT NULL,
          google_email VARCHAR(150) NULL,
          refresh_token_encrypted TEXT NULL,
          scopes VARCHAR(500) NOT NULL,
          folder_id VARCHAR(150) NULL,
          connection_status ENUM('CONNECTED', 'DISCONNECTED', 'ERROR', 'EXPIRED') NOT NULL DEFAULT 'DISCONNECTED',
          connected_at TIMESTAMP NULL,
          last_sync_at TIMESTAMP NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_gdc_status (connection_status),
          CONSTRAINT fk_gdc_user FOREIGN KEY (connected_by) REFERENCES usuarios(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    }

    mode = 'mysql';
    lastConnectionError = null;
    return { mode, connected: true, database: config.db.database };
  } catch (err) {
    mode = 'local_fallback';
    lastConnectionError = err.message;
    pool = null;
    loadSnapshot();
    return {
      mode,
      connected: false,
      error: err.message,
      snapshotPath: SNAPSHOT_PATH
    };
  }
}

async function ensureReady() {
  if (mode === 'uninitialized') {
    await initDatabase();
  }
}

async function execute(sql, params = []) {
  await ensureReady();
  if (mode === 'mysql' && pool) {
    const [rows] = await pool.execute(sql, params);
    return rows;
  }
  throw new Error('execute() directo solo disponible en modo MySQL; use hrRepository.');
}

function isMysql() {
  return mode === 'mysql' && Boolean(pool);
}

function getDbStatus() {
  return {
    mode,
    mysqlConnected: mode === 'mysql',
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    lastConnectionError,
    fallbackActive: mode === 'local_fallback'
  };
}

module.exports = {
  initDatabase,
  ensureReady,
  execute,
  isMysql,
  getDbStatus,
  loadSnapshot,
  saveSnapshot,
  getEmptySnapshot,
  getPool: () => pool
};
