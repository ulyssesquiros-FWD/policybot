import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
  Upload,
  Search,
  FileText,
  ExternalLink,
  X,
  FolderLock,
  Link2,
  Unlink,
  AlertCircle,
  Edit3,
  CloudUpload,
  CheckCircle2,
  Database,
  Layers,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../Services/api';

export default function DocumentAdmin() {
  const [docs, setDocs] = useState([]);
  const [integrations, setIntegrations] = useState({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [docModal, setDocModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [folderInput, setFolderInput] = useState('');
  const [processedDocsCount, setProcessedDocsCount] = useState(0);

  const [manualForm, setManualForm] = useState({
    title: '',
    code: '',
    version: '1.0',
    effectiveDate: new Date().toISOString().slice(0, 10),
    content: '',
    uploadToDrive: true
  });
  const [uploadFile, setUploadFile] = useState(null);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/documents');
      const loadedDocs = res.data.documents || [];
      setDocs(loadedDocs);
      setIntegrations(res.data.integrations || {});
      setFolderInput(res.data.integrations?.googleDrive?.folderId || '');
      if (res.data.integrations?.googleDrive?.lastProcessedCount) {
        setProcessedDocsCount(res.data.integrations.googleDrive.lastProcessedCount);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Error cargando documentos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('drive_connected') === 'true') {
      setFeedback('¡Cuenta Google Drive autorizada y refresh token cifrado en MySQL correctamente!');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('drive_error')) {
      setErrorMsg(`Error OAuth Google Drive: ${params.get('drive_error')}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    loadDocuments();
  }, []);

  const handleConnectDrive = async () => {
    setConnecting(true);
    setErrorMsg('');
    setFeedback('');
    try {
      const res = await api.get('/documents/drive/auth-url');
      if (res.data.authUrl) {
        window.location.href = res.data.authUrl;
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'No se pudo iniciar el flujo OAuth 2.0.');
      setConnecting(false);
    }
  };

  const handleDisconnectDrive = async () => {
    setErrorMsg('');
    setFeedback('');
    try {
      await api.post('/documents/drive/disconnect');
      setFeedback('Cuenta Google Drive desconectada y refresh token revocado de MySQL.');
      await loadDocuments();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Error desconectando Google Drive.');
    }
  };

  const handleSaveFolder = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setFeedback('');
    try {
      await api.patch('/documents/drive/folder', { folderId: folderInput });
      setFeedback(`Carpeta autorizada actualizada: ${folderInput}`);
      await loadDocuments();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'No se pudo guardar el ID de carpeta.');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setFeedback('');
    setErrorMsg('');
    try {
      const res = await api.post('/documents/sync');
      setProcessedDocsCount(res.data.processedDocuments ?? res.data.indexedDocuments ?? 0);
      setFeedback(
        `Sincronización finalizada (${res.data.sourceMode}): ${res.data.indexedDocuments} documentos procesados, ${res.data.totalChunks} fragmentos activos en Qdrant.`
      );
      if (res.data.driveWarning) {
        setErrorMsg(res.data.driveWarning);
      }
      await loadDocuments();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Error al sincronizar.');
    } finally {
      setSyncing(false);
    }
  };

  const handlePushPoliciesToDrive = async () => {
    setPushing(true);
    setFeedback('');
    setErrorMsg('');
    try {
      const res = await api.post('/documents/drive/push-local');
      setFeedback(
        `Subida a Google Drive completada: ${res.data.uploadedCount} documentos subidos (${res.data.skippedExisting} ya existían en la carpeta).`
      );
      await loadDocuments();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Error subiendo políticas a Google Drive.');
    } finally {
      setPushing(false);
    }
  };

  const handleManualIngest = async (e) => {
    e.preventDefault();
    setFeedback('');
    setErrorMsg('');
    try {
      let res;
      if (uploadFile) {
        const fd = new FormData();
        fd.append('file', uploadFile);
        fd.append('title', manualForm.title);
        fd.append('code', manualForm.code);
        fd.append('version', manualForm.version);
        fd.append('effectiveDate', manualForm.effectiveDate);
        fd.append('uploadToDrive', String(manualForm.uploadToDrive));
        if (manualForm.content) fd.append('content', manualForm.content);
        res = await api.post('/documents/ingest', fd);
      } else {
        res = await api.post('/documents/ingest', manualForm);
      }
      setFeedback(
        `Documento ${res.data.document_id} indexado (${res.data.chunksCount} fragmentos).${
          res.data.uploadedToDrive ? ' ¡Subido también a Google Drive!' : ''
        }`
      );
      if (res.data.driveWarning) {
        setErrorMsg(`Indexado localmente, aviso de Drive: ${res.data.driveWarning}`);
      }
      setManualForm({
        title: '',
        code: '',
        version: '1.0',
        effectiveDate: new Date().toISOString().slice(0, 10),
        content: '',
        uploadToDrive: true
      });
      setUploadFile(null);
      await loadDocuments();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Error en ingesta manual.');
    }
  };

  const handleSearchTest = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      const res = await api.post('/documents/search-test', { query: searchQuery });
      setSearchResults(res.data);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Error ejecutando prueba semántica.');
    }
  };

  const openDocument = async (documentId) => {
    const res = await api.get(`/documents/view/${documentId}`);
    setDocModal(res.data);
  };

  const openEditDocument = async (documentId) => {
    setErrorMsg('');
    try {
      const res = await api.get(`/documents/view/${documentId}`);
      setEditModal({
        documentId,
        title: res.data.document.document_name,
        version: res.data.document.version,
        content: res.data.content || ''
      });
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'No se pudo cargar el documento para editar.');
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editModal) return;
    setSavingEdit(true);
    setFeedback('');
    setErrorMsg('');
    try {
      const res = await api.put(`/documents/${editModal.documentId}`, {
        title: editModal.title,
        version: editModal.version,
        content: editModal.content
      });
      setFeedback(
        `Documento ${editModal.documentId} actualizado (${res.data.chunksCount} fragmentos).${
          res.data.updatedInDrive ? ' ¡Actualizado en Google Drive!' : ''
        }`
      );
      if (res.data.driveWarning) {
        setErrorMsg(`Actualizado en RAG local, aviso Drive: ${res.data.driveWarning}`);
      }
      setEditModal(null);
      await loadDocuments();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Error actualizando documento.');
    } finally {
      setSavingEdit(false);
    }
  };

  const drive = integrations.googleDrive || {};
  const displayedError = errorMsg || drive.lastError;
  const totalChunks = docs.reduce((acc, d) => acc + (d.chunks_count || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: 1440, margin: '0 auto' }}>
      {/* Editorial Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span style={{ fontSize: '0.78rem', color: '#2878FF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Enterprise Knowledge Base
          </span>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 700, color: '#101114', letterSpacing: '-0.03em', margin: '0.2rem 0' }}>
            Catálogo de Políticas &amp; Google Drive
          </h1>
          <p style={{ fontSize: '0.92rem', color: '#86868B', margin: 0, maxWidth: 700 }}>
            Sincronización bidireccional entre la carpeta compartida de Google Drive, el motor de embeddings BGE-M3 (1024d) y la base vectorial Qdrant Server.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-apple-primary"
            onClick={handleSync}
            disabled={syncing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.84rem' }}
          >
            <RefreshCw size={15} className={syncing ? 'spin-anim' : ''} />
            {syncing ? 'Sincronizando...' : 'Sincronizar Repositorio'}
          </button>
        </div>
      </div>

      {/* Grand Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 18,
            padding: '1.35rem',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
          }}
        >
          <span style={{ fontSize: '0.76rem', color: '#86868B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Políticas Indexadas
          </span>
          <div style={{ fontSize: '2.4rem', fontWeight: 700, color: '#101114', letterSpacing: '-0.04em', margin: '0.2rem 0' }}>
            {docs.length}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#34C759', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <CheckCircle2 size={13} /> {processedDocsCount} procesadas en catálogo
          </span>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 18,
            padding: '1.35rem',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
          }}
        >
          <span style={{ fontSize: '0.76rem', color: '#86868B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Fragmentos Vectoriales
          </span>
          <div style={{ fontSize: '2.4rem', fontWeight: 700, color: '#101114', letterSpacing: '-0.04em', margin: '0.2rem 0' }}>
            {totalChunks}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#86868B' }}>
            Dimensión 1024d · BGE-M3
          </span>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 18,
            padding: '1.35rem',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
          }}
        >
          <span style={{ fontSize: '0.76rem', color: '#86868B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Google Drive OAuth
          </span>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#101114', letterSpacing: '-0.02em', margin: '0.5rem 0' }}>
            {drive.connected ? 'Conectado Live' : 'Pendiente'}
          </div>
          <span style={{ fontSize: '0.74rem', color: drive.connected ? '#34C759' : '#FF9500', fontWeight: 600 }}>
            {drive.googleEmail || 'Requiere autorización OAuth'}
          </span>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 18,
            padding: '1.35rem',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
          }}
        >
          <span style={{ fontSize: '0.76rem', color: '#86868B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Qdrant Vector Server
          </span>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#101114', letterSpacing: '-0.02em', margin: '0.5rem 0' }}>
            {integrations.qdrant?.qdrantConnected ? 'Server Live 1.20' : 'Espejo Local'}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#86868B' }}>
            Colección: <code>{integrations.qdrant?.collection || 'policybot_hr_docs'}</code>
          </span>
        </div>
      </div>

      {/* Notifications */}
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: 14,
            background: 'rgba(52, 199, 89, 0.1)',
            border: '1px solid rgba(52, 199, 89, 0.25)',
            color: '#1b7d36',
            fontSize: '0.84rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <CheckCircle2 size={16} /> {feedback}
        </motion.div>
      )}

      {displayedError && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: 14,
            background: 'rgba(255, 59, 48, 0.1)',
            border: '1px solid rgba(255, 59, 48, 0.25)',
            color: '#d7261e',
            fontSize: '0.84rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <AlertCircle size={16} /> {displayedError}
        </motion.div>
      )}

      {/* Google Drive Connection Hub Card */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 20,
          padding: '1.75rem',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#F5F5F7',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2878FF'
              }}
            >
              <FolderLock size={22} />
            </span>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#101114', margin: 0 }}>
                Conexión Segura Google Drive API v3 (OAuth 2.0)
              </h2>
              <span style={{ fontSize: '0.78rem', color: '#86868B' }}>
                Restricción perimetral a carpeta empresarial única con refresh token cifrado AES-256 en MySQL.
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-apple-primary"
              onClick={handleConnectDrive}
              disabled={connecting}
              style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Link2 size={14} />
              {drive.connected
                ? drive.writeEnabled
                  ? 'Reconectar Cuenta'
                  : 'Reconectar (Activar Subida/Edición)'
                : 'Conectar con Google Drive'}
            </button>
            {drive.connected && (
              <>
                <button
                  type="button"
                  className="btn-apple-secondary-light"
                  onClick={handlePushPoliciesToDrive}
                  disabled={pushing}
                  style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <CloudUpload size={14} /> {pushing ? 'Subiendo...' : 'Subir Políticas a Drive'}
                </button>
                <button
                  type="button"
                  className="btn-apple-secondary-light"
                  onClick={handleDisconnectDrive}
                  style={{ fontSize: '0.78rem', color: '#FF3B30', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Unlink size={14} /> Desconectar
                </button>
              </>
            )}
          </div>
        </div>

        {drive.connected && !drive.writeEnabled && (
          <div
            style={{
              background: 'rgba(255, 149, 0, 0.08)',
              border: '1px solid rgba(255, 149, 0, 0.25)',
              color: '#b26500',
              padding: '0.75rem 1rem',
              borderRadius: 12,
              fontSize: '0.82rem',
              lineHeight: 1.45
            }}
          >
            Tu sesión actual de <strong>{drive.googleEmail}</strong> está conectada en modo solo lectura (<code>drive.readonly</code>). Para subir y modificar archivos directamente en Google Drive desde este portal, pulsa <strong>"Reconectar (Activar Subida/Edición)"</strong> y acepta el alcance completo en la ventana de Google.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
          <div style={{ background: '#F5F5F7', padding: '0.85rem 1.1rem', borderRadius: 12 }}>
            <div style={{ color: '#86868B', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Cuenta Google Conectada
            </div>
            <strong style={{ fontSize: '0.88rem', color: '#101114' }}>{drive.googleEmail || 'Ninguna cuenta conectada'}</strong>
            {drive.connectedByEmail && (
              <div style={{ fontSize: '0.72rem', color: '#86868B', marginTop: '0.15rem' }}>Autorizó: {drive.connectedByEmail}</div>
            )}
          </div>

          <div style={{ background: '#F5F5F7', padding: '0.85rem 1.1rem', borderRadius: 12 }}>
            <div style={{ color: '#86868B', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Estado &amp; Permisos
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
              <span
                style={{
                  padding: '0.15rem 0.5rem',
                  borderRadius: 999,
                  background: drive.connectionStatus === 'CONNECTED' ? 'rgba(52, 199, 89, 0.12)' : 'rgba(255, 149, 0, 0.12)',
                  color: drive.connectionStatus === 'CONNECTED' ? '#1b7d36' : '#b26500',
                  fontSize: '0.72rem',
                  fontWeight: 600
                }}
              >
                {drive.connectionStatus || 'PENDING_AUTH'}
              </span>
              <span style={{ fontSize: '0.72rem', color: '#86868B' }}>
                {drive.writeEnabled ? 'Lectura y Escritura' : 'Solo Lectura'}
              </span>
            </div>
          </div>

          <div style={{ background: '#F5F5F7', padding: '0.85rem 1.1rem', borderRadius: 12 }}>
            <div style={{ color: '#86868B', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Última Sincronización
            </div>
            <strong style={{ fontSize: '0.88rem', color: '#101114' }}>
              {drive.lastSyncAt ? String(drive.lastSyncAt).slice(0, 19).replace('T', ' ') : 'Sin sincronización registrada'}
            </strong>
          </div>
        </div>

        {/* Folder restriction form */}
        <form onSubmit={handleSaveFolder} style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#101114' }}>Carpeta autorizada (Folder ID):</label>
          <input
            className="apple-input"
            style={{ maxWidth: 360, padding: '0.5rem 0.85rem', fontSize: '0.84rem' }}
            placeholder="ID de carpeta de Drive (ej. 1ZGIZtMz7Keh_5jUNvycwyHtJiizsZJhV)"
            value={folderInput}
            onChange={(e) => setFolderInput(e.target.value)}
          />
          <button type="submit" className="btn-apple-secondary-light" style={{ padding: '0.5rem 0.95rem', fontSize: '0.8rem' }}>
            Guardar Carpeta
          </button>
          <span style={{ fontSize: '0.75rem', color: '#86868B' }}>
            Carpeta activa: <code>{drive.folderId || 'No configurada'}</code>
          </span>
        </form>
      </div>

      {/* Editorial Policies Catalogue Table */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 20,
          padding: '1.75rem',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#101114', margin: 0 }}>
              Documentos Normativos Activos ({docs.length})
            </h2>
            <span style={{ fontSize: '0.78rem', color: '#86868B' }}>
              Textos normativos de TicoTech S.A. y Código de Trabajo de Costa Rica indexados en Qdrant.
            </span>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#86868B', fontSize: '0.9rem' }}>
            Cargando catálogo documental...
          </div>
        ) : (
          <div className="table-wrap">
            <table className="apple-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Documento</th>
                  <th>Versión</th>
                  <th>Vigencia</th>
                  <th>Fragmentos</th>
                  <th>Estado RAG</th>
                  <th>Origen</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.document_id}>
                    <td>
                      <code style={{ fontSize: '0.76rem', color: '#2878FF', fontWeight: 600 }}>{d.codigo_documento}</code>
                    </td>
                    <td>
                      <strong style={{ color: '#101114', fontSize: '0.86rem' }}>{d.document_name}</strong>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: 999,
                          background: '#F5F5F7',
                          color: '#101114',
                          fontSize: '0.72rem',
                          fontWeight: 600
                        }}
                      >
                        v{d.version}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#86868B' }}>{String(d.effective_date).slice(0, 10)}</td>
                    <td style={{ fontSize: '0.84rem', fontWeight: 600, color: '#101114' }}>{d.chunks_count}</td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.2rem 0.6rem',
                          borderRadius: 999,
                          background: d.estado_indexacion === 'INDEXADO' ? 'rgba(52, 199, 89, 0.12)' : 'rgba(255, 149, 0, 0.12)',
                          color: d.estado_indexacion === 'INDEXADO' ? '#1b7d36' : '#b26500',
                          fontSize: '0.72rem',
                          fontWeight: 600
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: d.estado_indexacion === 'INDEXADO' ? '#34C759' : '#FF9500'
                          }}
                        />
                        {d.estado_indexacion}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: 999,
                          background: '#F5F5F7',
                          color: '#48484A',
                          fontSize: '0.7rem',
                          fontWeight: 500
                        }}
                      >
                        {d.origen}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn-apple-secondary-light"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.74rem', borderRadius: 6 }}
                          onClick={() => openDocument(d.document_id)}
                        >
                          <FileText size={12} /> Ver
                        </button>
                        <button
                          type="button"
                          className="btn-apple-secondary-light"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.74rem', borderRadius: 6 }}
                          onClick={() => openEditDocument(d.document_id)}
                        >
                          <Edit3 size={12} /> Editar
                        </button>
                        {d.drive_url && (
                          <a
                            href={d.drive_url}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-apple-secondary-light"
                            style={{ padding: '0.25rem 0.5rem', borderRadius: 6, display: 'inline-flex', alignItems: 'center' }}
                            title="Abrir en Google Drive"
                          >
                            <ExternalLink size={12} color="#2878FF" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Two Column Grid: Ingest & Semantic Search */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '1.25rem' }}>
        {/* Ingest Form */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 20,
            padding: '1.75rem',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
          }}
        >
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#101114', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Upload size={18} color="#2878FF" /> Subir o Crear Documento (Drive + RAG)
            </h2>
            <span style={{ fontSize: '0.78rem', color: '#86868B' }}>
              Indexación instantánea en Qdrant y respaldo sincronizado en Google Drive.
            </span>
          </div>

          <form onSubmit={handleManualIngest} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#101114', display: 'block', marginBottom: '0.25rem' }}>
                  Título de la Política
                </label>
                <input
                  className="apple-input"
                  placeholder="Ej. Política de Viáticos y Gastos"
                  value={manualForm.title}
                  onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#101114', display: 'block', marginBottom: '0.25rem' }}>
                  Código Normativo
                </label>
                <input
                  className="apple-input"
                  placeholder="Ej. POL-VIA-011"
                  value={manualForm.code}
                  onChange={(e) => setManualForm({ ...manualForm, code: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#101114', display: 'block', marginBottom: '0.25rem' }}>
                  Versión
                </label>
                <input
                  className="apple-input"
                  placeholder="1.0"
                  value={manualForm.version}
                  onChange={(e) => setManualForm({ ...manualForm, version: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#101114', display: 'block', marginBottom: '0.25rem' }}>
                  Fecha de Vigencia
                </label>
                <input
                  type="date"
                  className="apple-input"
                  value={manualForm.effectiveDate}
                  onChange={(e) => setManualForm({ ...manualForm, effectiveDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#101114', display: 'block', marginBottom: '0.35rem' }}>
                Archivo adjunto (.md, .txt, .pdf, .csv):
              </label>
              <input
                type="file"
                accept=".md,.txt,.pdf,.csv"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                style={{ fontSize: '0.8rem', color: '#86868B' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#101114', display: 'block', marginBottom: '0.35rem' }}>
                Cuerpo del documento (Markdown):
              </label>
              <textarea
                className="apple-input"
                rows="6"
                placeholder="## Sección 1: Propósito&#10;Contenido detallado de la normativa empresarial..."
                value={manualForm.content}
                onChange={(e) => setManualForm({ ...manualForm, content: e.target.value })}
                required={!uploadFile}
                style={{ resize: 'vertical' }}
              />
            </div>

            {drive.connected && (
              <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#101114' }}>
                <input
                  type="checkbox"
                  checked={manualForm.uploadToDrive}
                  onChange={(e) => setManualForm({ ...manualForm, uploadToDrive: e.target.checked })}
                />
                Subir y guardar copia automática en Google Drive ({drive.folderId})
              </label>
            )}

            <button type="submit" className="btn-apple-primary" style={{ padding: '0.65rem 1.25rem', fontSize: '0.84rem' }}>
              <Upload size={15} /> Subir e Indexar en RAG
            </button>
          </form>
        </div>

        {/* Semantic Search Test */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 20,
            padding: '1.75rem',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#101114', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Search size={18} color="#2878FF" /> Prueba de Recuperación Semántica
            </h2>
            <span style={{ fontSize: '0.78rem', color: '#86868B' }}>
              Verifica el ranking de similitud en Qdrant Server con el vectorizador BGE-M3.
            </span>
          </div>

          <form onSubmit={handleSearchTest} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              className="apple-input"
              placeholder="Ej: incapacidad por enfermedad, aguinaldo proporcional, cesantía..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn-apple-primary" style={{ padding: '0.5rem 1.15rem', fontSize: '0.82rem' }}>
              Buscar
            </button>
          </form>

          {searchResults && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: 380, overflowY: 'auto', flex: 1 }}>
              <div style={{ fontSize: '0.75rem', color: '#86868B', marginBottom: '0.2rem' }}>
                Motor: <strong>{searchResults.vectorStore}</strong> · Hits sobre umbral: {searchResults.hits?.length || 0}
              </div>

              {(searchResults.hits || []).length === 0 ? (
                <div style={{ padding: '1rem', background: '#F5F5F7', borderRadius: 12, textAlign: 'center', fontSize: '0.8rem', color: '#86868B' }}>
                  Sin fragmentos que superen el umbral configurado.
                </div>
              ) : (
                searchResults.hits.map((h) => (
                  <div
                    key={h.chunk_id}
                    style={{
                      padding: '0.85rem',
                      background: '#F5F5F7',
                      borderRadius: 12,
                      border: '1px solid rgba(0, 0, 0, 0.05)',
                      fontSize: '0.82rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <strong style={{ color: '#101114' }}>
                        {h.document_name} <span style={{ fontSize: '0.72rem', color: '#86868B', fontWeight: 400 }}>({h.document_id})</span>
                      </strong>
                      <span
                        style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: 999,
                          background: 'rgba(52, 199, 89, 0.12)',
                          color: '#1b7d36',
                          fontSize: '0.7rem',
                          fontWeight: 600
                        }}
                      >
                        Score: {h.score}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#2878FF', fontWeight: 500, marginBottom: '0.3rem' }}>
                      {h.section}
                    </div>
                    <div style={{ color: '#48484A', fontSize: '0.78rem', lineHeight: 1.45 }}>
                      {h.text.slice(0, 240)}...
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* View Document Modal */}
      <AnimatePresence>
        {docModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem'
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              style={{
                background: '#FFFFFF',
                borderRadius: 24,
                width: '100%',
                maxWidth: 720,
                maxHeight: '85vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(0, 0, 0, 0.08)'
              }}
            >
              <div
                style={{
                  padding: '1.25rem 1.75rem',
                  borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#FAFAFC'
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#101114' }}>
                    {docModal.document.document_name}
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#86868B' }}>
                    Código: <code>{docModal.document.document_id}</code> · Versión {docModal.document.version || '1.0'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDocModal(null)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#F5F5F7',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#101114'
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ padding: '1.75rem', overflowY: 'auto', flex: 1, background: '#FFFFFF' }}>
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'inherit',
                    fontSize: '0.86rem',
                    lineHeight: 1.65,
                    color: '#101114',
                    margin: 0,
                    background: '#F5F5F7',
                    padding: '1.25rem',
                    borderRadius: 14,
                    border: '1px solid rgba(0, 0, 0, 0.06)'
                  }}
                >
                  {docModal.content}
                </pre>
              </div>

              <div
                style={{
                  padding: '1rem 1.75rem',
                  borderTop: '1px solid rgba(0, 0, 0, 0.06)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  background: '#FAFAFC'
                }}
              >
                <button
                  type="button"
                  className="btn-apple-primary"
                  onClick={() => setDocModal(null)}
                  style={{ padding: '0.5rem 1.25rem', fontSize: '0.84rem' }}
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Document Modal */}
      <AnimatePresence>
        {editModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem'
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              style={{
                background: '#FFFFFF',
                borderRadius: 24,
                width: '100%',
                maxWidth: 780,
                maxHeight: '90vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(0, 0, 0, 0.08)'
              }}
            >
              <div
                style={{
                  padding: '1.25rem 1.75rem',
                  borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#FAFAFC'
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#101114' }}>
                    Editar Documento ({editModal.documentId})
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#86868B' }}>
                    Los cambios se sincronizarán con Google Drive y regenerarán los vectores en Qdrant.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditModal(null)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#F5F5F7',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#101114'
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} style={{ padding: '1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#101114', display: 'block', marginBottom: '0.25rem' }}>
                      Título
                    </label>
                    <input
                      className="apple-input"
                      value={editModal.title}
                      onChange={(e) => setEditModal({ ...editModal, title: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#101114', display: 'block', marginBottom: '0.25rem' }}>
                      Versión
                    </label>
                    <input
                      className="apple-input"
                      value={editModal.version}
                      onChange={(e) => setEditModal({ ...editModal, version: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#101114', display: 'block', marginBottom: '0.35rem' }}>
                    Contenido Normativo (Markdown)
                  </label>
                  <textarea
                    className="apple-input"
                    rows="14"
                    value={editModal.content}
                    onChange={(e) => setEditModal({ ...editModal, content: e.target.value })}
                    required
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '0.6rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid rgba(0, 0, 0, 0.06)'
                  }}
                >
                  <button type="button" className="btn-apple-secondary-light" onClick={() => setEditModal(null)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-apple-primary" disabled={savingEdit}>
                    {savingEdit ? 'Guardando...' : 'Guardar en Drive y Re-indexar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
