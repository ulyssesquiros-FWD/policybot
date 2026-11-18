const crypto = require('crypto');
const hrRepo = require('../services/db/hrRepository');
const chunker = require('../services/rag/chunkerService');
const embeddingService = require('../services/rag/embeddingService');
const qdrantService = require('../services/rag/qdrantService');
const googleDriveService = require('../services/rag/googleDriveService');

/**
 * Agente 5: Ingesta y Sincronización Documental
 * - Detecta documentos nuevos, modificados (checksum SHA-256) y eliminados
 * - Extrae texto (Google Docs, Sheets, PDF, Markdown/TXT)
 * - Fragmenta (500-1000 tokens con solapamiento)
 * - Genera embeddings (Ollama BGE-M3 o fallback local)
 * - Persiste en Qdrant y actualiza document_sync_state
 */

async function indexSingleDocument({ rawContent, overrideMeta = {}, origen = 'MANUAL_UPLOAD', driveFileId = null }) {
  const { meta, checksum, chunks } = chunker.chunkDocument(rawContent, overrideMeta);

  const existingStates = await hrRepo.listDocumentSyncStates();
  const prev = existingStates.find((d) => d.document_id === meta.document_id);

  if (prev && prev.checksum_hash === checksum && prev.estado_indexacion === 'INDEXADO') {
    return {
      document_id: meta.document_id,
      document_name: meta.document_name,
      status: 'SIN_CAMBIOS',
      chunksCount: prev.chunks_count
    };
  }

  const chunksWithVectors = [];
  for (const chk of chunks) {
    const { vector } = await embeddingService.generateEmbedding(`${chk.document_name} ${chk.section}\n${chk.text}`);
    chunksWithVectors.push({ ...chk, vector });
  }

  const upsertRes = await qdrantService.upsertDocumentChunks(meta.document_id, chunksWithVectors);

  await hrRepo.upsertDocumentSyncState({
    document_id: meta.document_id,
    document_name: meta.document_name,
    codigo_documento: meta.document_id,
    version: meta.version,
    effective_date: /^\d{4}-\d{2}-\d{2}$/.test(meta.effective_date) ? meta.effective_date : new Date().toISOString().slice(0, 10),
    responsable: meta.responsable,
    drive_file_id: driveFileId,
    drive_url: meta.drive_url,
    checksum_hash: checksum,
    chunks_count: chunks.length,
    estado_indexacion: 'INDEXADO',
    origen
  });

  return {
    document_id: meta.document_id,
    document_name: meta.document_name,
    version: meta.version,
    status: prev ? 'ACTUALIZADO' : 'NUEVO_INDEXADO',
    chunksCount: chunks.length,
    qdrantConnected: upsertRes.qdrantConnected
  };
}

async function syncFromPoliciesFolder({ origen = 'LOCAL_SEED' } = {}) {
  const files = googleDriveService.listLocalPolicyFiles();
  const existingStates = await hrRepo.listDocumentSyncStates();
  const seenDocIds = new Set();
  const details = [];
  let totalChunks = 0;

  for (const f of files) {
    const res = await indexSingleDocument({
      rawContent: f.content,
      origen,
      driveFileId: null
    });
    seenDocIds.add(res.document_id);
    totalChunks += Number(res.chunksCount || 0);
    details.push(res);
  }

  let deletedCount = 0;
  for (const prev of existingStates) {
    if (prev.origen === 'LOCAL_SEED' && prev.estado_indexacion !== 'ELIMINADO' && !seenDocIds.has(prev.document_id)) {
      await qdrantService.deleteDocumentChunks(prev.document_id);
      await hrRepo.upsertDocumentSyncState({
        ...prev,
        chunks_count: 0,
        estado_indexacion: 'ELIMINADO'
      });
      deletedCount += 1;
      details.push({ document_id: prev.document_id, document_name: prev.document_name, status: 'ELIMINADO', chunksCount: 0 });
    }
  }

  googleDriveService.recordSyncOutcome({
    processedCount: details.length,
    source: origen,
    error: null
  });

  return {
    agent: 'Agente Ingesta y Sincronización',
    sourceMode: origen,
    indexedDocuments: details.length,
    processedDocuments: details.length,
    totalChunks,
    deletedCount,
    details,
    qdrantStatus: await qdrantService.getQdrantStatus(),
    embeddingStatus: embeddingService.getEmbeddingStatus()
  };
}

async function syncDocuments({ forceLocalFallback = true } = {}) {
  if (await googleDriveService.isConfigured()) {
    try {
      const remote = await googleDriveService.listRemoteFiles();
      const existingStates = await hrRepo.listDocumentSyncStates();
      const seenDocIds = new Set();
      const details = [];
      const errors = [];
      let totalChunks = 0;

      for (const file of remote.files) {
        try {
          const text = await googleDriveService.extractTextFromDriveFile(file);
          if (!text || text.trim().length < 20) continue;
          const fallbackDocId = `GDRIVE-${String(file.id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16)}`;
          const res = await indexSingleDocument({
            rawContent: text,
            overrideMeta: {
              document_id: fallbackDocId,
              document_name: file.name.replace(/\.[^.]+$/, ''),
              drive_url: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
              drive_file_id: file.id,
              modified_time: file.modifiedTime || null
            },
            origen: 'GOOGLE_DRIVE',
            driveFileId: file.id
          });
          seenDocIds.add(res.document_id);
          totalChunks += Number(res.chunksCount || 0);
          details.push(res);
        } catch (fileErr) {
          errors.push({ fileId: file.id, fileName: file.name, error: fileErr.message });
        }
      }

      if (!googleDriveService.isTestTransportActive()) {
        for (const prev of existingStates) {
          if (prev.origen === 'GOOGLE_DRIVE' && prev.estado_indexacion !== 'ELIMINADO' && !seenDocIds.has(prev.document_id)) {
            await qdrantService.deleteDocumentChunks(prev.document_id);
            await hrRepo.upsertDocumentSyncState({ ...prev, chunks_count: 0, estado_indexacion: 'ELIMINADO' });
            details.push({ document_id: prev.document_id, document_name: prev.document_name, status: 'ELIMINADO', chunksCount: 0 });
          }
        }
      }

      await hrRepo.updateDriveSyncStatus({ connectionStatus: 'CONNECTED', updateSyncTimestamp: true });
      googleDriveService.recordSyncOutcome({
        processedCount: details.length,
        source: 'GOOGLE_DRIVE_API_V3',
        error: errors.length ? `${errors.length} archivo(s) con error de lectura` : null
      });

      return {
        agent: 'Agente Ingesta y Sincronización',
        sourceMode: 'GOOGLE_DRIVE_API_V3',
        folderId: remote.folderId,
        scannedFoldersCount: remote.scannedFoldersCount,
        indexedDocuments: details.length,
        processedDocuments: details.length,
        totalChunks,
        errors,
        details,
        driveStatus: await googleDriveService.getDriveStatus()
      };
    } catch (err) {
      await hrRepo.updateDriveSyncStatus({ connectionStatus: 'ERROR', updateSyncTimestamp: false });
      googleDriveService.recordSyncOutcome({
        processedCount: 0,
        source: 'GOOGLE_DRIVE_ERROR',
        error: err.message
      });

      if (!forceLocalFallback) throw err;
      const localRes = await syncFromPoliciesFolder({ origen: 'LOCAL_SEED' });
      googleDriveService.recordSyncOutcome({
        processedCount: localRes.processedDocuments,
        source: 'LOCAL_SEED',
        error: `Google Drive: ${err.message}`
      });
      return {
        ...localRes,
        driveWarning: `No se pudo leer desde Google Drive (${err.message}); sincronizado desde repositorio local.`,
        driveStatus: await googleDriveService.getDriveStatus()
      };
    }
  }

  const localRes = await syncFromPoliciesFolder({ origen: 'LOCAL_SEED' });
  return {
    ...localRes,
    driveStatus: await googleDriveService.getDriveStatus()
  };
}

async function ingestManualDocument({
  title,
  code,
  version,
  effectiveDate,
  responsable,
  driveUrl,
  content,
  uploadToDrive = true,
  rawFileBuffer = null,
  rawFileName = null,
  rawMimeType = null
}) {
  let finalDriveUrl = driveUrl || `https://drive.google.com/file/d/${code}/view`;
  let driveFileId = null;
  let origen = 'MANUAL_UPLOAD';
  let driveWarning = null;

  const formattedContent = `# ${title}

- **Título:** ${title}
- **Código:** ${code}
- **Versión:** ${version || '1.0'}
- **Fecha de vigencia:** ${effectiveDate || new Date().toISOString().slice(0, 10)}
- **Responsable:** ${responsable || 'Dirección de Recursos Humanos - TicoTech S.A.'}
- **Enlace Drive:** ${finalDriveUrl}

---

${content}`;

  if (uploadToDrive && (await googleDriveService.isConfigured())) {
    try {
      const targetName = rawFileName || `${code}_${title.replace(/[^a-zA-Z0-9_-]+/g, '_')}.md`;
      const uploaded = await googleDriveService.uploadFileToDriveFolder({
        fileName: targetName,
        mimeType: rawMimeType || 'text/plain',
        contentBufferOrText: rawFileBuffer || formattedContent
      });
      driveFileId = uploaded.id;
      finalDriveUrl = uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`;
      origen = 'GOOGLE_DRIVE';
    } catch (err) {
      driveWarning = err.message;
    }
  }

  const contentWithFinalUrl = formattedContent.replace(
    /\*\*Enlace Drive:\*\* .*/,
    `**Enlace Drive:** ${finalDriveUrl}`
  );

  const result = await indexSingleDocument({
    rawContent: contentWithFinalUrl,
    overrideMeta: {
      document_id: code,
      document_name: title,
      version: version || '1.0',
      effective_date: effectiveDate || new Date().toISOString().slice(0, 10),
      responsable: responsable || 'Dirección de Recursos Humanos - TicoTech S.A.',
      drive_url: finalDriveUrl
    },
    origen,
    driveFileId
  });

  return {
    agent: 'Agente Ingesta y Sincronización',
    ...result,
    driveFileId,
    driveUrl: finalDriveUrl,
    uploadedToDrive: Boolean(driveFileId),
    driveWarning,
    checksumPreview: crypto.createHash('sha256').update(contentWithFinalUrl).digest('hex').slice(0, 16)
  };
}

async function updateExistingDocument({ documentId, title, version, content }) {
  const docs = await hrRepo.listDocumentSyncStates();
  const prev = docs.find((d) => d.document_id === documentId);
  if (!prev) {
    throw new Error('Documento no encontrado en el catálogo.');
  }

  const nextTitle = title || prev.document_name;
  const nextVersion = version || prev.version;
  let nextDriveUrl = prev.drive_url;
  let nextDriveFileId = prev.drive_file_id || null;
  let nextOrigen = prev.origen;
  let updatedInDrive = false;
  let driveWarning = null;

  const hasHeader = /^#\s+/m.test(content) && /\*\*Código:\*\*/i.test(content);
  const fullMarkdown = hasHeader
    ? content
        .replace(/\*\*Título:\*\* .*/i, `**Título:** ${nextTitle}`)
        .replace(/\*\*Versión:\*\* .*/i, `**Versión:** ${nextVersion}`)
    : `# ${nextTitle}\n\n- **Título:** ${nextTitle}\n- **Código:** ${documentId}\n- **Versión:** ${nextVersion}\n- **Fecha de vigencia:** ${String(prev.effective_date).slice(0, 10)}\n- **Responsable:** ${prev.responsable}\n- **Enlace Drive:** ${nextDriveUrl}\n\n---\n\n${content}`;

  if (await googleDriveService.isConfigured()) {
    try {
      if (nextDriveFileId) {
        const upd = await googleDriveService.updateFileInDriveFolder({
          driveFileId: nextDriveFileId,
          fileName: `${documentId}_${nextTitle.replace(/[^a-zA-Z0-9_-]+/g, '_')}.md`,
          mimeType: 'text/plain',
          contentBufferOrText: fullMarkdown
        });
        nextDriveUrl = upd.webViewLink || nextDriveUrl;
        updatedInDrive = true;
      } else {
        const created = await googleDriveService.uploadFileToDriveFolder({
          fileName: `${documentId}_${nextTitle.replace(/[^a-zA-Z0-9_-]+/g, '_')}.md`,
          mimeType: 'text/plain',
          contentBufferOrText: fullMarkdown
        });
        nextDriveFileId = created.id;
        nextDriveUrl = created.webViewLink || `https://drive.google.com/file/d/${created.id}/view`;
        nextOrigen = 'GOOGLE_DRIVE';
        updatedInDrive = true;
      }
    } catch (err) {
      driveWarning = err.message;
    }
  }

  // Si corresponde a un archivo local en database/policies/, mantenerlo sincronizado en disco también
  const localFiles = googleDriveService.listLocalPolicyFiles();
  const localMatch = localFiles.find((f) => f.content.includes(documentId));
  if (localMatch) {
    const fs = require('fs');
    fs.writeFileSync(localMatch.fullPath, fullMarkdown, 'utf8');
  }

  const res = await indexSingleDocument({
    rawContent: fullMarkdown,
    overrideMeta: {
      document_id: documentId,
      document_name: nextTitle,
      version: nextVersion,
      effective_date: String(prev.effective_date).slice(0, 10),
      responsable: prev.responsable,
      drive_url: nextDriveUrl
    },
    origen: nextOrigen,
    driveFileId: nextDriveFileId
  });

  return {
    agent: 'Agente Ingesta y Sincronización',
    ...res,
    updatedInDrive,
    driveFileId: nextDriveFileId,
    driveUrl: nextDriveUrl,
    driveWarning
  };
}

async function pushLocalPoliciesToDrive() {
  if (!(await googleDriveService.isConfigured())) {
    throw new Error('Google Drive no está conectado. Autorice primero una cuenta Google.');
  }

  const localFiles = googleDriveService.listLocalPolicyFiles();
  const existingStates = await hrRepo.listDocumentSyncStates();
  const remote = await googleDriveService.listRemoteFiles();
  const remoteNames = new Set((remote.files || []).map((f) => f.name));

  const uploaded = [];
  for (const file of localFiles) {
    if (remoteNames.has(file.fileName)) continue;
    const res = await googleDriveService.uploadFileToDriveFolder({
      fileName: file.fileName,
      mimeType: 'text/plain',
      contentBufferOrText: file.content
    });
    const matchedState = existingStates.find((s) => file.content.includes(s.document_id));
    if (matchedState) {
      await hrRepo.upsertDocumentSyncState({
        ...matchedState,
        effective_date: String(matchedState.effective_date).slice(0, 10),
        drive_file_id: res.id,
        drive_url: res.webViewLink || `https://drive.google.com/file/d/${res.id}/view`,
        origen: 'GOOGLE_DRIVE'
      });
    }
    uploaded.push({ fileName: file.fileName, id: res.id, webViewLink: res.webViewLink });
  }

  await hrRepo.updateDriveSyncStatus({ connectionStatus: 'CONNECTED', updateSyncTimestamp: true });
  return {
    uploadedCount: uploaded.length,
    skippedExisting: localFiles.length - uploaded.length,
    uploaded
  };
}

module.exports = {
  indexSingleDocument,
  syncFromPoliciesFolder,
  syncDocuments,
  ingestManualDocument,
  updateExistingDocument,
  pushLocalPoliciesToDrive
};
