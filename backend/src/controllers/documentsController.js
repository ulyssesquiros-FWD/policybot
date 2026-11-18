const fs = require('fs');
const path = require('path');
const hrRepo = require('../services/db/hrRepository');
const ingestionSyncAgent = require('../agents/ingestionSyncAgent');
const googleDriveService = require('../services/rag/googleDriveService');
const qdrantService = require('../services/rag/qdrantService');
const embeddingService = require('../services/rag/embeddingService');
const auditService = require('../services/audit/auditService');
const config = require('../config/env');

async function listDocuments(req, res, next) {
  try {
    const documents = await hrRepo.listDocumentSyncStates();
    const qdrantStatus = await qdrantService.getQdrantStatus();
    const driveStatus = await googleDriveService.getDriveStatus();
    return res.json({
      documents,
      integrations: {
        googleDrive: driveStatus,
        qdrant: qdrantStatus,
        embeddings: embeddingService.getEmbeddingStatus()
      }
    });
  } catch (err) {
    return next(err);
  }
}

async function viewDocumentContent(req, res, next) {
  try {
    const { documentId } = req.params;
    const docs = await hrRepo.listDocumentSyncStates();
    const docMeta = docs.find((d) => d.document_id === documentId);
    if (!docMeta) {
      return res.status(404).json({ error: 'Documento no encontrado.' });
    }

    const files = googleDriveService.listLocalPolicyFiles();
    const matched = files.find((f) => f.content.includes(documentId));
    const storePath = path.join(config.paths.dataDir, 'qdrant_local_store.json');
    let chunksText = '';
    if (!matched && fs.existsSync(storePath)) {
      const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      chunksText = store.points
        .filter((p) => p.payload.document_id === documentId)
        .map((p) => `## ${p.payload.section}\n\n${p.payload.text}`)
        .join('\n\n---\n\n');
    }

    return res.json({
      document: docMeta,
      content: matched ? matched.content : chunksText
    });
  } catch (err) {
    return next(err);
  }
}

async function syncDocuments(req, res, next) {
  try {
    const start = Date.now();
    const result = await ingestionSyncAgent.syncDocuments({ forceLocalFallback: true });
    await auditService.logEvent({
      usuarioId: req.user.usuarioId,
      colaboradorId: req.user.colaboradorId,
      rol: req.user.rol,
      accion: 'SINCRONIZACION_DOCUMENTAL',
      recurso: '/api/documents/sync',
      agenteUtilizado: 'Agente Ingesta y Sincronización',
      tiempoRespuestaMs: Date.now() - start,
      resultado: result.driveWarning ? 'ESCALADO' : 'EXITO',
      detalle: `Sincronización (${result.sourceMode}): ${result.indexedDocuments} docs, ${result.totalChunks} fragmentos.${result.driveWarning ? ` Aviso: ${result.driveWarning}` : ''}`,
      ipAddress: req.ip
    });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function ingestManual(req, res, next) {
  try {
    const start = Date.now();
    let { title, code, version, effectiveDate, responsable, driveUrl, content, uploadToDrive } = req.body || {};

    if (req.file) {
      content = await googleDriveService.extractTextFromBuffer(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname
      );
      if (!title) title = req.file.originalname.replace(/\.[^.]+$/, '');
    }

    if (!title || !code || !content || String(content).trim().length < 20) {
      return res.status(400).json({
        error: 'Debe proporcionar título, código de documento y contenido (mínimo 20 caracteres).'
      });
    }

    const shouldUploadDrive = uploadToDrive === undefined || uploadToDrive === true || uploadToDrive === 'true';

    const result = await ingestionSyncAgent.ingestManualDocument({
      title,
      code: String(code).toUpperCase().trim(),
      version,
      effectiveDate,
      responsable,
      driveUrl,
      content,
      uploadToDrive: shouldUploadDrive,
      rawFileBuffer: req.file?.buffer || null,
      rawFileName: req.file?.originalname || null,
      rawMimeType: req.file?.mimetype || null
    });

    await auditService.logEvent({
      usuarioId: req.user.usuarioId,
      colaboradorId: req.user.colaboradorId,
      rol: req.user.rol,
      accion: 'INGESTA_MANUAL_DOCUMENTO',
      recurso: '/api/documents/ingest',
      agenteUtilizado: 'Agente Ingesta y Sincronización',
      documentosRecuperados: [result.document_id],
      tiempoRespuestaMs: Date.now() - start,
      resultado: 'EXITO',
      detalle: `Documento ${result.document_id} (${result.chunksCount} fragmentos) indexado.${result.uploadedToDrive ? ' Subido a Google Drive.' : ''}`,
      ipAddress: req.ip
    });

    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

async function updateDocument(req, res, next) {
  try {
    const start = Date.now();
    const { documentId } = req.params;
    const { title, version, content } = req.body || {};
    if (!content || String(content).trim().length < 20) {
      return res.status(400).json({ error: 'El contenido del documento debe tener al menos 20 caracteres.' });
    }

    const result = await ingestionSyncAgent.updateExistingDocument({
      documentId,
      title,
      version,
      content
    });

    await auditService.logEvent({
      usuarioId: req.user.usuarioId,
      colaboradorId: req.user.colaboradorId,
      rol: req.user.rol,
      accion: 'ACTUALIZAR_DOCUMENTO_DRIVE_RAG',
      recurso: req.originalUrl,
      agenteUtilizado: 'Agente Ingesta y Sincronización',
      documentosRecuperados: [documentId],
      tiempoRespuestaMs: Date.now() - start,
      resultado: 'EXITO',
      detalle: `Documento ${documentId} actualizado y re-indexado.${result.updatedInDrive ? ' Sincronizado en Google Drive.' : ''}`,
      ipAddress: req.ip
    });

    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function pushLocalPolicies(req, res, next) {
  try {
    const start = Date.now();
    const result = await ingestionSyncAgent.pushLocalPoliciesToDrive();
    await auditService.logEvent({
      usuarioId: req.user.usuarioId,
      colaboradorId: req.user.colaboradorId,
      rol: req.user.rol,
      accion: 'SUBIR_POLITICAS_A_DRIVE',
      recurso: '/api/documents/drive/push-local',
      agenteUtilizado: 'Agente Ingesta y Sincronización',
      tiempoRespuestaMs: Date.now() - start,
      resultado: 'EXITO',
      detalle: `${result.uploadedCount} políticas subidas a la carpeta autorizada de Google Drive.`,
      ipAddress: req.ip
    });
    return res.json(result);
  } catch (err) {
    return res.status(err.code === 'DRIVE_WRITE_SCOPE_REQUIRED' ? 403 : 400).json({
      error: err.message,
      code: err.code || 'DRIVE_PUSH_ERROR'
    });
  }
}

async function searchTest(req, res, next) {
  try {
    const { query } = req.body || {};
    if (!query) return res.status(400).json({ error: 'Debe indicar una consulta de prueba.' });
    const results = await qdrantService.searchSimilarChunks(query);
    return res.json(results);
  } catch (err) {
    return next(err);
  }
}

async function getDriveAuthUrl(req, res, next) {
  try {
    const { authUrl, expiresInSeconds } = googleDriveService.generateAuthorizationUrl(req.user);

    await auditService.logEvent({
      usuarioId: req.user.usuarioId,
      colaboradorId: req.user.colaboradorId,
      rol: req.user.rol,
      accion: 'DRIVE_OAUTH_INICIO',
      recurso: '/api/documents/drive/auth-url',
      resultado: 'EXITO',
      detalle: `Solicitud de autorización Google Drive OAuth iniciada por ${req.user.email} (state de un solo uso, TTL ${expiresInSeconds}s).`,
      ipAddress: req.ip
    });

    return res.json({
      authUrl,
      expiresInSeconds
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

async function handleDriveCallback(req, res) {
  const { code, state, error, responseMode } = req.query;
  const frontendUrl = `${config.corsOrigin.split(',')[0].trim()}/documents`;
  const wantsJson = responseMode === 'json' || (req.headers.accept || '').includes('application/json');

  try {
    const outcome = await googleDriveService.handleOAuthCallback({ code, state, error });

    await auditService.logEvent({
      usuarioId: outcome.connection?.connected_by || null,
      rol: 'ADMIN_RRHH',
      accion: 'DRIVE_OAUTH_CONECTADO',
      recurso: '/api/documents/drive/callback',
      resultado: 'EXITO',
      detalle: `Cuenta Google conectada (${outcome.connection?.google_email || 'verificada'}) por ${outcome.initiatedBy}. Refresh token cifrado AES-256-GCM en MySQL.`,
      ipAddress: req.ip
    });

    if (wantsJson) {
      return res.json({
        connected: true,
        googleEmail: outcome.connection?.google_email || null,
        connectionStatus: outcome.connection?.connection_status
      });
    }
    return res.redirect(`${frontendUrl}?drive_connected=true`);
  } catch (err) {
    await auditService.logEvent({
      rol: 'OAUTH_CALLBACK',
      accion: 'DRIVE_OAUTH_RECHAZADO',
      recurso: '/api/documents/drive/callback',
      resultado: 'BLOQUEADO_SEGURIDAD',
      detalle: `Callback OAuth rechazado (${err.code || 'ERROR'}): ${err.message}`,
      ipAddress: req.ip
    });

    if (wantsJson) {
      const status = err.code === 'OAUTH_CANCELADO' ? 400 : 403;
      return res.status(status).json({ error: err.message, code: err.code || 'OAUTH_ERROR' });
    }
    return res.redirect(`${frontendUrl}?drive_error=${encodeURIComponent(err.message)}`);
  }
}

/**
 * Deshabilitado por seguridad: no se permite inyección manual de refresh tokens arbitrarios.
 */
async function blockManualTokenInjection(req, res) {
  await auditService.logEvent({
    usuarioId: req.user?.usuarioId || null,
    colaboradorId: req.user?.colaboradorId || null,
    rol: req.user?.rol || 'ANONIMO',
    accion: 'DRIVE_TOKEN_MANUAL_BLOQUEADO',
    recurso: '/api/documents/drive/tokens',
    resultado: 'BLOQUEADO_SEGURIDAD',
    detalle: 'Intento de envío manual de refresh token rechazado. Solo se permite flujo OAuth 2.0 con state.',
    ipAddress: req.ip
  });

  return res.status(403).json({
    error: 'Operación deshabilitada por política de seguridad. Utilice exclusivamente el flujo OAuth 2.0 autorizado con state.'
  });
}

async function disconnectDrive(req, res, next) {
  try {
    const status = await googleDriveService.disconnectAccount(req.user.usuarioId);
    await auditService.logEvent({
      usuarioId: req.user.usuarioId,
      colaboradorId: req.user.colaboradorId,
      rol: req.user.rol,
      accion: 'DRIVE_OAUTH_DESCONECTADO',
      recurso: '/api/documents/drive/disconnect',
      resultado: 'EXITO',
      detalle: `Conexión Google Drive desconectada y token eliminado de MySQL por ${req.user.email}.`,
      ipAddress: req.ip
    });
    return res.json({ disconnected: true, connection: status, driveStatus: await googleDriveService.getDriveStatus() });
  } catch (err) {
    return next(err);
  }
}

async function updateDriveFolder(req, res, next) {
  try {
    const { folderId } = req.body || {};
    if (!folderId || String(folderId).trim().length < 5) {
      return res.status(400).json({ error: 'Debe proporcionar un ID de carpeta válido de Google Drive.' });
    }
    const cleanId = String(folderId).trim();
    if (!/^[a-zA-Z0-9_-]{5,120}$/.test(cleanId)) {
      return res.status(400).json({ error: 'Formato de ID de carpeta de Google Drive inválido.' });
    }

    await googleDriveService.updateFolderId(cleanId, req.user.usuarioId);
    await auditService.logEvent({
      usuarioId: req.user.usuarioId,
      colaboradorId: req.user.colaboradorId,
      rol: req.user.rol,
      accion: 'DRIVE_CARPETA_ACTUALIZADA',
      recurso: '/api/documents/drive/folder',
      resultado: 'EXITO',
      detalle: `Carpeta autorizada de Google Drive actualizada a ${cleanId}.`,
      ipAddress: req.ip
    });
    return res.json({ driveStatus: await googleDriveService.getDriveStatus() });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listDocuments,
  viewDocumentContent,
  syncDocuments,
  ingestManual,
  updateDocument,
  pushLocalPolicies,
  searchTest,
  getDriveAuthUrl,
  handleDriveCallback,
  blockManualTokenInjection,
  disconnectDrive,
  updateDriveFolder
};
