const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Readable } = require('stream');
const { google } = require('googleapis');
const pdfParse = require('pdf-parse');
const config = require('../../config/env');
const hrRepo = require('../db/hrRepository');
const tokenCrypto = require('../security/tokenCryptoService');

/**
 * Servicio de integración endurecida con Google Drive API v3.
 * - OAuth 2.0 con `state` criptográfico de un solo uso y expiración (10 min), vinculado al ADMIN_RRHH.
 * - Scope autorizado: https://www.googleapis.com/auth/drive (lectura, subida y modificación dentro de la carpeta autorizada)
 * - Almacenamiento persistente cifrado (AES-256-GCM) en MySQL (`google_drive_connections`).
 * - Sin archivos JSON de tokens; migra y elimina cualquier archivo heredado automáticamente.
 * - Restricción estricta a `folder_id` configurado y sus subcarpetas.
 */

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
const LEGACY_TOKENS_PATH = path.join(config.paths.dataDir, 'google_drive_tokens.json');
const DEFAULT_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutos

// Almacenamiento en memoria de estados OAuth pendientes y consumidos
const pendingStates = new Map();
const consumedStates = new Set();

let lastSyncMeta = {
  lastError: null,
  lastProcessedCount: 0,
  lastSyncSource: null
};

// Adaptador opcional exclusivamente para pruebas automatizadas controladas con mock
let testTransportAdapter = null;

function setTestTransportAdapter(adapter) {
  testTransportAdapter = adapter;
}

function isTestTransportActive() {
  return Boolean(testTransportAdapter);
}

function clearOAuthStatesForTest() {
  pendingStates.clear();
  consumedStates.clear();
}

function pruneExpiredStates() {
  const now = Date.now();
  for (const [key, entry] of pendingStates.entries()) {
    if (now > entry.expiresAt) {
      pendingStates.delete(key);
    }
  }
  if (consumedStates.size > 500) {
    consumedStates.clear();
  }
}

function createOAuth2Client() {
  if (!config.googleDrive.clientId || !config.googleDrive.clientSecret) {
    return null;
  }
  return new google.auth.OAuth2(
    config.googleDrive.clientId,
    config.googleDrive.clientSecret,
    config.googleDrive.redirectUri
  );
}

function isOAuth2ClientConfigured() {
  return Boolean(config.googleDrive.clientId && config.googleDrive.clientSecret);
}

function isServiceAccountConfigured() {
  const hasCreds = Boolean(config.googleDrive.serviceAccountEmail && config.googleDrive.privateKey);
  const hasJson = Boolean(config.googleDrive.credentialsPath && fs.existsSync(config.googleDrive.credentialsPath));
  return Boolean(hasCreds || hasJson);
}

/**
 * Migra de forma segura cualquier token heredado en `backend/data/google_drive_tokens.json`
 * hacia MySQL cifrado con AES-256-GCM y elimina físicamente el archivo JSON.
 */
async function migrateLegacyJsonTokensIfAny(adminUserId = 1) {
  if (!fs.existsSync(LEGACY_TOKENS_PATH)) {
    return { migrated: false };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(LEGACY_TOKENS_PATH, 'utf8'));
    const tokenToPersist = raw.refresh_token || raw.access_token;
    if (tokenToPersist) {
      const encrypted = tokenCrypto.encryptToken(tokenToPersist);
      await hrRepo.saveDriveConnection({
        connectedBy: adminUserId,
        googleEmail: raw.google_email || null,
        refreshTokenEncrypted: encrypted,
        scopes: DRIVE_SCOPE,
        folderId: config.googleDrive.folderId || null,
        connectionStatus: 'CONNECTED'
      });
    }
    fs.unlinkSync(LEGACY_TOKENS_PATH);
    return { migrated: true, deletedLegacyFile: true };
  } catch (err) {
    return { migrated: false, error: err.message };
  }
}

/**
 * Genera una URL OAuth 2.0 protegida con `state` criptográfico aleatorio de un solo uso,
 * vinculada al administrador RRHH que inició el flujo.
 */
function generateAuthorizationUrl(adminUser, { stateTtlMs = DEFAULT_STATE_TTL_MS } = {}) {
  if (!adminUser || adminUser.rol !== 'ADMIN_RRHH' || !adminUser.usuarioId) {
    throw new Error('AUTORIZACION_DENEGADA: Solo un ADMIN_RRHH autenticado puede iniciar la conexión OAuth.');
  }
  const oauth2Client = createOAuth2Client();
  if (!oauth2Client) {
    throw new Error('GOOGLE_OAUTH_NO_CONFIGURADO: Falta GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en backend/.env.');
  }

  pruneExpiredStates();
  const state = crypto.randomBytes(32).toString('hex');
  const now = Date.now();

  pendingStates.set(state, {
    state,
    usuarioId: Number(adminUser.usuarioId),
    colaboradorId: Number(adminUser.colaboradorId),
    email: adminUser.email,
    rol: adminUser.rol,
    createdAt: now,
    expiresAt: now + Number(stateTtlMs),
    used: false
  });

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [DRIVE_SCOPE],
    state
  });

  return {
    authUrl,
    state,
    expiresInSeconds: Math.round(stateTtlMs / 1000)
  };
}

function validateAndConsumeState(state) {
  if (!state || typeof state !== 'string') {
    const err = new Error('Parámetro state OAuth faltante o inválido.');
    err.code = 'STATE_INVALIDO';
    throw err;
  }
  if (consumedStates.has(state)) {
    const err = new Error('El parámetro state ya fue utilizado previamente (protección anti-replay).');
    err.code = 'STATE_USADO';
    throw err;
  }
  const entry = pendingStates.get(state);
  if (!entry) {
    const err = new Error('No existe una solicitud de autorización OAuth activa para este state.');
    err.code = 'STATE_INVALIDO';
    throw err;
  }
  if (entry.used) {
    pendingStates.delete(state);
    const err = new Error('El parámetro state ya fue utilizado.');
    err.code = 'STATE_USADO';
    throw err;
  }
  if (Date.now() > entry.expiresAt) {
    pendingStates.delete(state);
    const err = new Error('La solicitud OAuth ha expirado. Inicie el proceso nuevamente.');
    err.code = 'STATE_EXPIRADO';
    throw err;
  }
  if (entry.rol !== 'ADMIN_RRHH') {
    pendingStates.delete(state);
    const err = new Error('El iniciador de la sesión OAuth no posee el rol ADMIN_RRHH.');
    err.code = 'USUARIO_NO_AUTORIZADO';
    throw err;
  }

  entry.used = true;
  pendingStates.delete(state);
  consumedStates.add(state);
  return entry;
}

/**
 * Procesa el callback OAuth 2.0 validando state, usuario iniciador, cancelaciones,
 * obteniendo la identidad de Google y almacenando el refresh_token cifrado con AES-256-GCM en MySQL.
 */
async function handleOAuthCallback({ code, state, error }) {
  // Manejo explícito de cancelación o error reportado por Google
  if (error) {
    if (state && pendingStates.has(state)) {
      pendingStates.delete(state);
      consumedStates.add(state);
    }
    const cancelErr = new Error(`Autorización OAuth cancelada o rechazada por el proveedor (${error}).`);
    cancelErr.code = error === 'access_denied' ? 'OAUTH_CANCELADO' : 'OAUTH_ERROR';
    lastSyncMeta.lastError = cancelErr.message;
    throw cancelErr;
  }

  const stateEntry = validateAndConsumeState(state);

  if (!code || typeof code !== 'string') {
    const err = new Error('Código de autorización OAuth faltante.');
    err.code = 'CODIGO_FALTANTE';
    throw err;
  }

  let tokens;
  let googleEmail = null;

  if (testTransportAdapter?.exchangeCode) {
    tokens = await testTransportAdapter.exchangeCode(code);
    const aboutInfo = await testTransportAdapter.getAbout(tokens);
    googleEmail = aboutInfo?.user?.emailAddress || null;
  } else {
    const oauth2Client = createOAuth2Client();
    if (!oauth2Client) {
      throw new Error('Cliente OAuth 2.0 no configurado en el servidor.');
    }
    const tokenResponse = await oauth2Client.getToken(code);
    tokens = tokenResponse.tokens || {};
    oauth2Client.setCredentials(tokens);

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const about = await drive.about.get({ fields: 'user(emailAddress,displayName)' });
    googleEmail = about.data?.user?.emailAddress || null;
  }

  const refreshToken = tokens.refresh_token || tokens.access_token;
  if (!refreshToken) {
    const err = new Error('Google no devolvió un token válido. Revoque el acceso previo y reintente con prompt=consent.');
    err.code = 'TOKEN_NO_RECIBIDO';
    throw err;
  }

  const encryptedToken = tokenCrypto.encryptToken(refreshToken);
  const existing = await hrRepo.getActiveDriveConnection();
  const folderId = existing?.folder_id || config.googleDrive.folderId || null;

  const saved = await hrRepo.saveDriveConnection({
    connectedBy: stateEntry.usuarioId,
    googleEmail,
    refreshTokenEncrypted: encryptedToken,
    scopes: DRIVE_SCOPE,
    folderId,
    connectionStatus: 'CONNECTED'
  });

  lastSyncMeta.lastError = null;
  return {
    connected: true,
    connection: saved,
    initiatedBy: stateEntry.email
  };
}

async function isConfigured() {
  await migrateLegacyJsonTokensIfAny();
  if (isServiceAccountConfigured()) return true;
  if (!isOAuth2ClientConfigured()) return false;
  const conn = await hrRepo.getActiveDriveConnection();
  return Boolean(conn && conn.connection_status === 'CONNECTED' && conn.has_encrypted_token);
}

async function getDriveClient() {
  await migrateLegacyJsonTokensIfAny();

  const conn = await hrRepo.getActiveDriveConnection({ includeEncryptedToken: true });
  if (
    isOAuth2ClientConfigured() &&
    conn &&
    conn.connection_status === 'CONNECTED' &&
    conn.refresh_token_encrypted
  ) {
    const plainRefreshToken = tokenCrypto.decryptToken(conn.refresh_token_encrypted);

    if (testTransportAdapter?.createDriveClient) {
      return testTransportAdapter.createDriveClient(plainRefreshToken, conn);
    }

    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: plainRefreshToken });
    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  if (isServiceAccountConfigured()) {
    let auth;
    if (config.googleDrive.credentialsPath && fs.existsSync(config.googleDrive.credentialsPath)) {
      auth = new google.auth.GoogleAuth({
        keyFile: config.googleDrive.credentialsPath,
        scopes: [DRIVE_SCOPE]
      });
    } else {
      auth = new google.auth.JWT(
        config.googleDrive.serviceAccountEmail,
        null,
        config.googleDrive.privateKey,
        [DRIVE_SCOPE]
      );
    }
    return google.drive({ version: 'v3', auth });
  }

  return null;
}

async function getAuthorizedFolderId() {
  const conn = await hrRepo.getActiveDriveConnection();
  return (conn?.folder_id || config.googleDrive.folderId || '').trim() || null;
}

/**
 * Recorre únicamente el `folder_id` configurado y sus subcarpetas directas/anidadas (máx 4 niveles),
 * impidiendo que el sistema lea archivos ajenos al repositorio documental autorizado de RRHH.
 */
async function collectAuthorizedFolderIds(drive, rootFolderId, maxDepth = 4) {
  const visited = new Set([rootFolderId]);
  let frontier = [rootFolderId];

  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth += 1) {
    const nextFrontier = [];
    for (const parentId of frontier) {
      const res = await drive.files.list({
        q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        pageSize: 100
      });
      for (const folder of res.data?.files || []) {
        if (folder.id && !visited.has(folder.id)) {
          visited.add(folder.id);
          nextFrontier.push(folder.id);
        }
      }
    }
    frontier = nextFrontier;
  }

  return Array.from(visited);
}

async function listRemoteFiles() {
  const drive = await getDriveClient();
  if (!drive) {
    return { configured: false, files: [] };
  }

  const rootFolderId = await getAuthorizedFolderId();
  if (!rootFolderId) {
    const err = new Error(
      'CARPETA_NO_CONFIGURADA: Debe configurar el ID de carpeta autorizada de Google Drive antes de leer documentos.'
    );
    err.code = 'CARPETA_NO_CONFIGURADA';
    lastSyncMeta.lastError = err.message;
    throw err;
  }

  const folderIds = await collectAuthorizedFolderIds(drive, rootFolderId);
  const allFiles = [];
  const allowedMimeFilter = `(mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'application/pdf' or mimeType = 'text/plain' or mimeType = 'text/markdown')`;

  for (const fId of folderIds) {
    const res = await drive.files.list({
      q: `'${fId}' in parents and trashed = false and ${allowedMimeFilter}`,
      fields: 'files(id, name, mimeType, modifiedTime, webViewLink, md5Checksum, parents)',
      pageSize: 100
    });
    for (const file of res.data?.files || []) {
      allFiles.push(file);
    }
  }

  return {
    configured: true,
    folderId: rootFolderId,
    scannedFoldersCount: folderIds.length,
    files: allFiles
  };
}

async function extractTextFromDriveFile(file) {
  const drive = await getDriveClient();
  if (!drive) throw new Error('Google Drive no está conectado.');

  if (file.mimeType === 'application/vnd.google-apps.document') {
    const res = await drive.files.export(
      { fileId: file.id, mimeType: 'text/plain' },
      { responseType: 'text' }
    );
    return String(res.data || '');
  }

  if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
    const res = await drive.files.export(
      { fileId: file.id, mimeType: 'text/csv' },
      { responseType: 'text' }
    );
    return String(res.data || '');
  }

  if (file.mimeType === 'application/pdf') {
    const res = await drive.files.get(
      { fileId: file.id, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    const parsed = await pdfParse(Buffer.from(res.data));
    return parsed.text || '';
  }

  const res = await drive.files.get(
    { fileId: file.id, alt: 'media' },
    { responseType: 'text' }
  );
  return String(res.data || '');
}

async function uploadFileToDriveFolder({ fileName, mimeType = 'text/plain', contentBufferOrText }) {
  const drive = await getDriveClient();
  if (!drive) {
    throw new Error('Google Drive no está conectado.');
  }
  const rootFolderId = await getAuthorizedFolderId();
  if (!rootFolderId) {
    throw new Error('CARPETA_NO_CONFIGURADA: Configure el ID de carpeta autorizada de Google Drive.');
  }

  const buffer = Buffer.isBuffer(contentBufferOrText)
    ? contentBufferOrText
    : Buffer.from(String(contentBufferOrText || ''), 'utf8');

  try {
    const res = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [rootFolderId]
      },
      media: {
        mimeType,
        body: Readable.from(buffer)
      },
      fields: 'id, name, mimeType, webViewLink, modifiedTime'
    });
    return res.data;
  } catch (err) {
    if (err.code === 403 || /insufficient|permission|scope/i.test(err.message || '')) {
      const scopeErr = new Error(
        'La conexión actual solo tiene permiso de lectura. Haga clic en "Reconectar Cuenta" para otorgar permiso de subida y edición en Google Drive.'
      );
      scopeErr.code = 'DRIVE_WRITE_SCOPE_REQUIRED';
      throw scopeErr;
    }
    throw err;
  }
}

async function updateFileInDriveFolder({ driveFileId, fileName, mimeType = 'text/plain', contentBufferOrText }) {
  const drive = await getDriveClient();
  if (!drive) {
    throw new Error('Google Drive no está conectado.');
  }
  const rootFolderId = await getAuthorizedFolderId();
  if (!rootFolderId) {
    throw new Error('CARPETA_NO_CONFIGURADA: Configure el ID de carpeta autorizada de Google Drive.');
  }

  // Verificar que el archivo pertenezca a la carpeta autorizada o sus subcarpetas
  const authorizedFolders = await collectAuthorizedFolderIds(drive, rootFolderId);
  const metaRes = await drive.files.get({ fileId: driveFileId, fields: 'id, parents, mimeType' });
  const parents = metaRes.data?.parents || [];
  if (!parents.some((p) => authorizedFolders.includes(p))) {
    throw new Error('SEGURIDAD_DRIVE: No se permite modificar archivos fuera de la carpeta autorizada.');
  }

  const buffer = Buffer.isBuffer(contentBufferOrText)
    ? contentBufferOrText
    : Buffer.from(String(contentBufferOrText || ''), 'utf8');

  try {
    const res = await drive.files.update({
      fileId: driveFileId,
      requestBody: fileName ? { name: fileName } : undefined,
      media: {
        mimeType,
        body: Readable.from(buffer)
      },
      fields: 'id, name, mimeType, webViewLink, modifiedTime'
    });
    return res.data;
  } catch (err) {
    if (err.code === 403 || /insufficient|permission|scope/i.test(err.message || '')) {
      const scopeErr = new Error(
        'La conexión actual solo tiene permiso de lectura. Haga clic en "Reconectar Cuenta" para habilitar edición en Google Drive.'
      );
      scopeErr.code = 'DRIVE_WRITE_SCOPE_REQUIRED';
      throw scopeErr;
    }
    throw err;
  }
}

async function extractTextFromBuffer(buffer, mimeType = '', fileName = '') {
  const lower = String(fileName || '').toLowerCase();
  if (mimeType === 'application/pdf' || lower.endsWith('.pdf')) {
    const parsed = await pdfParse(buffer);
    return parsed.text || '';
  }
  return buffer.toString('utf8');
}

function listLocalPolicyFiles() {
  const dir = config.paths.policiesDir;
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') || f.endsWith('.txt'))
    .sort()
    .map((fileName) => {
      const fullPath = path.join(dir, fileName);
      const stat = fs.statSync(fullPath);
      return {
        fileName,
        fullPath,
        content: fs.readFileSync(fullPath, 'utf8'),
        modifiedTime: stat.mtime.toISOString()
      };
    });
}

async function disconnectAccount(userId) {
  lastSyncMeta.lastError = null;
  return hrRepo.disconnectDriveConnection(userId);
}

async function updateFolderId(folderId, userId) {
  lastSyncMeta.lastError = null;
  return hrRepo.updateDriveFolderConfig({ folderId, connectedBy: userId });
}

function recordSyncOutcome({ processedCount = 0, source = 'LOCAL_SEED', error = null }) {
  lastSyncMeta.lastProcessedCount = processedCount;
  lastSyncMeta.lastSyncSource = source;
  lastSyncMeta.lastError = error;
}

async function getDriveStatus() {
  await migrateLegacyJsonTokensIfAny();

  const oauthConfigured = isOAuth2ClientConfigured();
  const saActive = isServiceAccountConfigured();
  const conn = await hrRepo.getActiveDriveConnection();
  const oauthConnected = Boolean(
    oauthConfigured && conn && conn.connection_status === 'CONNECTED' && conn.has_encrypted_token
  );
  const configured = oauthConnected || saActive;
  const folderId = conn?.folder_id || config.googleDrive.folderId || null;

  let mode = 'local_mode_no_credentials';
  let connectionStatus = conn?.connection_status || 'DISCONNECTED';
  let message = 'Sin conexión activa de Google Drive. Operando en modo local demostrable.';

  if (oauthConnected) {
    mode = 'google_drive_oauth2';
    message = `Google Drive OAuth 2.0 conectado (${conn.google_email || 'cuenta verificada'}).`;
  } else if (oauthConfigured && !oauthConnected) {
    mode = 'google_drive_oauth2_pending_auth';
    if (connectionStatus === 'DISCONNECTED') connectionStatus = 'PENDING_AUTH';
    message = 'Cliente OAuth 2.0 configurado en backend. Pendiente autorización de una cuenta Google por un Admin RRHH.';
  } else if (saActive) {
    mode = 'google_drive_service_account';
    connectionStatus = 'CONNECTED';
    message = 'Google Drive API v3 conectado mediante Service Account.';
  }

  return {
    configured,
    connected: configured,
    mode,
    oauthConfigured,
    oauthConnected,
    connectionStatus,
    googleEmail: oauthConnected ? conn.google_email : null,
    connectedByEmail: conn?.admin_email || null,
    connectedAt: conn?.connected_at || null,
    lastSyncAt: conn?.last_sync_at || null,
    folderId,
    folderConfigured: Boolean(folderId),
    scopes: conn?.scopes || DRIVE_SCOPE,
    writeEnabled: Boolean(oauthConnected && conn?.scopes === DRIVE_SCOPE),
    lastProcessedCount: lastSyncMeta.lastProcessedCount,
    lastSyncSource: lastSyncMeta.lastSyncSource,
    lastError: lastSyncMeta.lastError,
    legacyJsonExists: fs.existsSync(LEGACY_TOKENS_PATH),
    localPoliciesDir: config.paths.policiesDir,
    message
  };
}

module.exports = {
  DRIVE_SCOPE,
  isConfigured,
  generateAuthorizationUrl,
  validateAndConsumeState,
  handleOAuthCallback,
  migrateLegacyJsonTokensIfAny,
  getDriveClient,
  listRemoteFiles,
  extractTextFromDriveFile,
  uploadFileToDriveFolder,
  updateFileInDriveFolder,
  extractTextFromBuffer,
  listLocalPolicyFiles,
  disconnectAccount,
  updateFolderId,
  recordSyncOutcome,
  getDriveStatus,
  setTestTransportAdapter,
  isTestTransportActive,
  clearOAuthStatesForTest
};
