const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');

const config = require('../backend/src/config/env');
const app = require('../backend/src/app');
const db = require('../backend/src/config/database');
const hrRepo = require('../backend/src/services/db/hrRepository');
const tokenCrypto = require('../backend/src/services/security/tokenCryptoService');
const googleDriveService = require('../backend/src/services/rag/googleDriveService');
const qdrantService = require('../backend/src/services/rag/qdrantService');
const { seedDatabase } = require('../database/seeders/seed');

async function reqJson(server, method, urlPath, { token = null, body = null } = {}) {
  const addr = server.address();
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`http://127.0.0.1:${addr.port}${urlPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = {};
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, data: json };
}

function scanDirectoryForSecrets(dirPath, patterns, results = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', '.git', 'dist', 'data', 'qdrant_server', 'qdrant_storage'].includes(entry.name)) continue;
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      scanDirectoryForSecrets(full, patterns, results);
    } else if (!entry.name.startsWith('.env') || entry.name === '.env.example') {
      const content = fs.readFileSync(full, 'utf8');
      for (const rx of patterns) {
        if (rx.test(content)) {
          results.push({ file: full, pattern: rx.toString() });
        }
      }
    }
  }
  return results;
}

async function runDriveHardeningTests() {
  await db.initDatabase();
  const collabs = await hrRepo.listCollaboratorsSummary();
  if (collabs.length < 50) {
    await seedDatabase();
  }

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  const results = [];
  const runCase = async (name, fn) => {
    try {
      await fn();
      results.push({ name, status: 'PASS' });
      console.log(`✅ [PASS] ${name}`);
    } catch (err) {
      results.push({ name, status: 'FAIL', error: err.message });
      console.error(`❌ [FAIL] ${name}: ${err.message}`);
    }
  };

  let adminToken = '';
  let colabToken = '';
  let priorConnection = null;

  try {
    priorConnection = await hrRepo.getActiveDriveConnection({ includeEncryptedToken: true });

    const adminLogin = await reqJson(server, 'POST', '/api/auth/login', {
      body: { email: 'ana.mora@policybot.cr', password: 'AdminRRHH2026!' }
    });
    adminToken = adminLogin.data.token;

    const colabLogin = await reqJson(server, 'POST', '/api/auth/login', {
      body: { email: 'carlos.rojas@policybot.cr', password: 'Colab2026!' }
    });
    colabToken = colabLogin.data.token;

    await runCase('[REAL] 1. Cero credenciales reales en archivos versionados ni respuestas API', async () => {
      const rootDir = path.resolve(__dirname, '..');
      const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const patterns = [new RegExp('GOCSPX-[A-Za-z0-9_-]{10,}')];
      if (config.googleDrive.clientId) patterns.push(new RegExp(escapeRx(config.googleDrive.clientId)));
      if (config.googleDrive.clientSecret) patterns.push(new RegExp(escapeRx(config.googleDrive.clientSecret)));
      if (config.deepseek.apiKey) patterns.push(new RegExp(escapeRx(config.deepseek.apiKey)));
      if (config.deepseek.secondaryApiKey) patterns.push(new RegExp(escapeRx(config.deepseek.secondaryApiKey)));

      const leaks = scanDirectoryForSecrets(rootDir, patterns);
      assert.strictEqual(leaks.length, 0, `Credenciales encontradas en archivos: ${JSON.stringify(leaks)}`);

      const health = await reqJson(server, 'GET', '/api/health');
      const docs = await reqJson(server, 'GET', '/api/documents', { token: adminToken });
      const rawResponses = JSON.stringify({ health: health.data, docs: docs.data });
      if (config.googleDrive.clientSecret) {
        assert.ok(!rawResponses.includes(config.googleDrive.clientSecret), 'No debe devolver clientSecret');
      }
      if (config.googleDrive.clientId) {
        assert.ok(!rawResponses.includes(config.googleDrive.clientId), 'No debe devolver clientId al frontend');
      }
      assert.ok(!rawResponses.includes('refresh_token_encrypted'), 'No debe devolver token cifrado');
    });

    await runCase('[REAL] 2. Cifrado AES-256-GCM (IV único + verificación de integridad)', async () => {
      const sample = '1//0g_SAMPLE_REFRESH_TOKEN_SECRET_VALUE';
      const enc1 = tokenCrypto.encryptToken(sample);
      const enc2 = tokenCrypto.encryptToken(sample);
      assert.notStrictEqual(enc1, enc2, 'Cada cifrado debe usar un IV aleatorio único');
      assert.strictEqual(tokenCrypto.decryptToken(enc1), sample);
      assert.strictEqual(tokenCrypto.decryptToken(enc2), sample);

      // Adulterar payload cifrado debe fallar por authTag
      const parts = enc1.split(':');
      const tampered = `${parts[0]}:${parts[1]}:${parts[2].slice(0, -2)}ff`;
      assert.throws(() => tokenCrypto.decryptToken(tampered));
    });

    await runCase('[REAL] 3. Migración segura de google_drive_tokens.json a MySQL cifrado y borrado del JSON', async () => {
      const legacyPath = path.resolve(__dirname, '../backend/data/google_drive_tokens.json');
      fs.mkdirSync(path.dirname(legacyPath), { recursive: true });
      fs.writeFileSync(
        legacyPath,
        JSON.stringify({ refresh_token: '1//LEGACY_JSON_TOKEN_TO_MIGRATE', google_email: 'legacy@ticotech.cr' }),
        'utf8'
      );

      const migRes = await googleDriveService.migrateLegacyJsonTokensIfAny(1);
      assert.strictEqual(migRes.migrated, true);
      assert.strictEqual(migRes.deletedLegacyFile, true);
      assert.strictEqual(fs.existsSync(legacyPath), false, 'El archivo JSON plano debe eliminarse');

      const conn = await hrRepo.getActiveDriveConnection({ includeEncryptedToken: true });
      assert.ok(conn.refresh_token_encrypted.includes(':'));
      assert.strictEqual(tokenCrypto.decryptToken(conn.refresh_token_encrypted), '1//LEGACY_JSON_TOKEN_TO_MIGRATE');

      await googleDriveService.disconnectAccount(1);
    });

    await runCase('[REAL HTTP] 4. Deshabilitación de ingreso manual POST /api/documents/drive/tokens (403)', async () => {
      const r = await reqJson(server, 'POST', '/api/documents/drive/tokens', {
        token: adminToken,
        body: { refreshToken: '1//FAKE_MANUAL_TOKEN' }
      });
      assert.strictEqual(r.status, 403);
    });

    await runCase('[REAL HTTP] 5. Protección OAuth: RBAC, state único, replay, expiración y cancelación', async () => {
      // Colaborador no puede iniciar flujo OAuth
      const colabAuth = await reqJson(server, 'GET', '/api/documents/drive/auth-url', { token: colabToken });
      assert.strictEqual(colabAuth.status, 403);

      // Admin inicia flujo OAuth
      const authRes = await reqJson(server, 'GET', '/api/documents/drive/auth-url', { token: adminToken });
      assert.strictEqual(authRes.status, 200);
      const parsed = new URL(authRes.data.authUrl);
      assert.strictEqual(parsed.searchParams.get('scope'), 'https://www.googleapis.com/auth/drive');
      const validState = parsed.searchParams.get('state');
      assert.ok(validState && validState.length === 64, 'State debe ser criptográfico de 32 bytes (64 hex)');

      // Callback sin state -> rechazado 403
      const noState = await reqJson(server, 'GET', '/api/documents/drive/callback?code=abc&responseMode=json');
      assert.strictEqual(noState.status, 403);

      // Callback con state inventado -> rechazado 403
      const fakeState = await reqJson(
        server,
        'GET',
        '/api/documents/drive/callback?code=abc&state=deadbeef1234&responseMode=json'
      );
      assert.strictEqual(fakeState.status, 403);

      // Callback con error=access_denied (cancelación usuario) -> rechazado 400 y consume state
      const cancelRes = await reqJson(
        server,
        'GET',
        `/api/documents/drive/callback?error=access_denied&state=${validState}&responseMode=json`
      );
      assert.strictEqual(cancelRes.status, 400);

      // Reintentar el mismo state después de cancelación -> rechazado 403 (un solo uso)
      const replayAfterCancel = await reqJson(
        server,
        'GET',
        `/api/documents/drive/callback?code=abc&state=${validState}&responseMode=json`
      );
      assert.strictEqual(replayAfterCancel.status, 403);

      // State expirado -> rechazado
      const exp = googleDriveService.generateAuthorizationUrl(
        { usuarioId: 1, colaboradorId: 1, email: 'ana.mora@policybot.cr', rol: 'ADMIN_RRHH' },
        { stateTtlMs: -10 }
      );
      const expRes = await reqJson(
        server,
        'GET',
        `/api/documents/drive/callback?code=abc&state=${exp.state}&responseMode=json`
      );
      assert.strictEqual(expRes.status, 403);
    });

    await runCase('[MOCK DRIVE + REAL MYSQL/RAG] 6. Flujo E2E completo de los 14 pasos', async () => {
      googleDriveService.clearOAuthStatesForTest();

      const DRIVE_DOC_TEXT = `# Política de Teletrabajo Transfronterizo
- **Título:** Política de Teletrabajo Transfronterizo
- **Código:** POL-DRIVE-TEST-01
- **Versión:** 1.2
- **Fecha de vigencia:** 2026-03-01
- **Responsable:** Dirección de RRHH - TicoTech S.A.
- **Enlace Drive:** https://drive.google.com/file/d/GDRIVE_FILE_01/view

## Sección 1: Alcance Internacional Temporal
TicoTech S.A. autoriza a colaboradores con más de 12 meses de antigüedad a realizar teletrabajo transfronterizo temporal hasta por 30 días calendario al año, previa autorización escrita de Jefatura y Dirección de RRHH, manteniendo la cobertura laboral en Costa Rica.`;

      const folderQueries = [];

      // Mock controlado ÚNICAMENTE del transporte de red hacia Google OAuth / Drive v3
      googleDriveService.setTestTransportAdapter({
        async exchangeCode(code) {
          assert.strictEqual(code, 'MOCK_GOOGLE_AUTH_CODE_2026');
          return {
            access_token: 'ya29.mock_access_token',
            refresh_token: '1//0g_MOCK_DRIVE_REFRESH_TOKEN_XYZ'
          };
        },
        async getAbout() {
          return {
            user: {
              emailAddress: 'rrhh.drive@ticotech.cr',
              displayName: 'RRHH Oficial TicoTech'
            }
          };
        },
        createDriveClient(plainRefreshToken) {
          assert.strictEqual(plainRefreshToken, '1//0g_MOCK_DRIVE_REFRESH_TOKEN_XYZ');
          return {
            files: {
              async list({ q }) {
                folderQueries.push(q);
                // Simular carpeta raíz con una subcarpeta autorizada y un archivo oficial
                if (q.includes("mimeType = 'application/vnd.google-apps.folder'")) {
                  if (q.includes("'FOLDER_RRHH_OFICIAL' in parents")) {
                    return { data: { files: [{ id: 'SUBFOLDER_BENEFICIOS', name: 'Beneficios' }] } };
                  }
                  return { data: { files: [] } };
                }
                if (q.includes("'SUBFOLDER_BENEFICIOS' in parents")) {
                  return {
                    data: {
                      files: [
                        {
                          id: 'GDRIVE_FILE_01',
                          name: 'Politica_Teletrabajo_Transfronterizo.gdoc',
                          mimeType: 'application/vnd.google-apps.document',
                          webViewLink: 'https://drive.google.com/file/d/GDRIVE_FILE_01/view',
                          parents: ['SUBFOLDER_BENEFICIOS']
                        }
                      ]
                    }
                  };
                }
                return { data: { files: [] } };
              },
              async export({ fileId }) {
                assert.strictEqual(fileId, 'GDRIVE_FILE_01');
                return { data: DRIVE_DOC_TEXT };
              }
            }
          };
        }
      });

      if (db.isMysql()) {
        await db.execute("DELETE FROM document_sync_state WHERE document_id = 'POL-DRIVE-TEST-01'");
      }

      // Paso 1: Generar URL OAuth
      const authUrlRes = await reqJson(server, 'GET', '/api/documents/drive/auth-url', { token: adminToken });
      assert.strictEqual(authUrlRes.status, 200);
      const state = new URL(authUrlRes.data.authUrl).searchParams.get('state');

      // Paso 2 y 3: Simular autorización y recibir callback válido
      const cbRes = await reqJson(
        server,
        'GET',
        `/api/documents/drive/callback?code=MOCK_GOOGLE_AUTH_CODE_2026&state=${state}&responseMode=json`
      );
      assert.strictEqual(cbRes.status, 200);
      assert.strictEqual(cbRes.data.connected, true);
      assert.strictEqual(cbRes.data.googleEmail, 'rrhh.drive@ticotech.cr');

      // Confirmar que el mismo state NO puede reutilizarse
      const replayRes = await reqJson(
        server,
        'GET',
        `/api/documents/drive/callback?code=MOCK_GOOGLE_AUTH_CODE_2026&state=${state}&responseMode=json`
      );
      assert.strictEqual(replayRes.status, 403);

      // Paso 4: Verificar refresh token cifrado en MySQL
      const dbConn = await hrRepo.getActiveDriveConnection({ includeEncryptedToken: true });
      assert.strictEqual(dbConn.connection_status, 'CONNECTED');
      assert.notStrictEqual(dbConn.refresh_token_encrypted, '1//0g_MOCK_DRIVE_REFRESH_TOKEN_XYZ');
      assert.strictEqual(tokenCrypto.decryptToken(dbConn.refresh_token_encrypted), '1//0g_MOCK_DRIVE_REFRESH_TOKEN_XYZ');

      // Paso 5, 6 y 7: Recuperar sesión OAuth, comprobar estado e identidad; sin folder_id bloquea lectura general
      const originalConfiguredFolder = config.googleDrive.folderId;
      config.googleDrive.folderId = '';
      if (db.isMysql()) {
        await db.execute('UPDATE google_drive_connections SET folder_id = NULL WHERE id > 0');
      }

      const docsStatusBeforeFolder = await reqJson(server, 'GET', '/api/documents', { token: adminToken });
      assert.strictEqual(docsStatusBeforeFolder.data.integrations.googleDrive.connected, true);
      assert.strictEqual(docsStatusBeforeFolder.data.integrations.googleDrive.googleEmail, 'rrhh.drive@ticotech.cr');

      await assert.rejects(() => googleDriveService.listRemoteFiles(), /CARPETA_NO_CONFIGURADA/);

      // Paso 8: Configurar carpeta autorizada y ejecutar sincronización (Pasos 9, 10, 11, 12)
      const folderSet = await reqJson(server, 'PATCH', '/api/documents/drive/folder', {
        token: adminToken,
        body: { folderId: 'FOLDER_RRHH_OFICIAL' }
      });
      assert.strictEqual(folderSet.status, 200);

      const syncRes = await reqJson(server, 'POST', '/api/documents/sync', { token: adminToken });
      assert.strictEqual(syncRes.status, 200);
      assert.strictEqual(syncRes.data.sourceMode, 'GOOGLE_DRIVE_API_V3');
      assert.ok(syncRes.data.processedDocuments >= 1, 'Debe procesar al menos 1 documento');
      assert.ok(syncRes.data.details.some((d) => d.document_id === 'POL-DRIVE-TEST-01'), 'Debe incluir POL-DRIVE-TEST-01');
      assert.ok(folderQueries.every((q) => q.includes('FOLDER_RRHH_OFICIAL') || q.includes('SUBFOLDER_BENEFICIOS')));

      // Paso 13 y 14: Consultar documento indexado desde el chatbot y verificar cita real
      const chatRes = await reqJson(server, 'POST', '/api/chat/query', {
        token: colabToken,
        body: { question: '¿Cuántos días al año permite la política de teletrabajo transfronterizo?' }
      });
      assert.strictEqual(chatRes.status, 200);
      assert.ok(chatRes.data.answer.includes('30 días'), 'La respuesta debe contener la regla del documento de Drive');
      assert.ok(
        chatRes.data.citations.some((c) => c.document_id === 'POL-DRIVE-TEST-01' && c.drive_url.includes('GDRIVE_FILE_01')),
        'La cita debe corresponder al archivo extraído de Google Drive'
      );

      // Limpieza: desconectar sesión simulada, limpiar doc de prueba y restaurar folderId configurado
      googleDriveService.setTestTransportAdapter(null);
      config.googleDrive.folderId = originalConfiguredFolder;
      await reqJson(server, 'POST', '/api/documents/drive/disconnect', { token: adminToken });
      await qdrantService.deleteDocumentChunks('POL-DRIVE-TEST-01');
      if (db.isMysql()) {
        await db.execute("DELETE FROM document_sync_state WHERE document_id = 'POL-DRIVE-TEST-01'");
        await db.execute("UPDATE document_sync_state SET estado_indexacion = 'INDEXADO' WHERE estado_indexacion = 'ELIMINADO' AND document_id != 'POL-DRIVE-TEST-01'");
        await db.execute('UPDATE google_drive_connections SET folder_id = ?, google_email = NULL WHERE id > 0', [
          originalConfiguredFolder || null
        ]);
      }
    });
  } finally {
    if (priorConnection && db.isMysql()) {
      await db.execute(
        'UPDATE google_drive_connections SET connected_by = ?, google_email = ?, refresh_token_encrypted = ?, scopes = ?, folder_id = ?, connection_status = ?, connected_at = ?, last_sync_at = ? WHERE id = ?',
        [
          priorConnection.connected_by || 1,
          priorConnection.google_email || null,
          priorConnection.refresh_token_encrypted || null,
          priorConnection.scopes || 'https://www.googleapis.com/auth/drive',
          priorConnection.folder_id || config.googleDrive.folderId || null,
          priorConnection.connection_status || 'DISCONNECTED',
          priorConnection.connected_at || null,
          priorConnection.last_sync_at || null,
          priorConnection.id || 1
        ]
      );
    }
    googleDriveService.setTestTransportAdapter(null);
    server.close();
  }

  const passed = results.filter((r) => r.status === 'PASS').length;
  console.log(`\nResumen pruebas hardening Google Drive: ${passed}/${results.length} aprobadas.`);
  if (passed !== results.length) process.exit(1);
}

runDriveHardeningTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error fatal en drive_hardening_tests:', err);
    process.exit(1);
  });
