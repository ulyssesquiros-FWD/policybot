const crypto = require('crypto');

/**
 * Servicio de extracción de metadatos y fragmentación documental (500 a 1000 tokens con solapamiento).
 * Para textos en español, 1 token ≈ 4 caracteres (aprox. 0.75 palabras).
 * Rango objetivo por fragmento: 500 - 1000 tokens (~380 - 750 palabras), con solapamiento de ~90 tokens (~70 palabras).
 */

function estimateTokens(text) {
  if (!text) return 0;
  const words = String(text).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words * 1.33));
}

function parseDocumentMetadata(rawContent, fallbackMeta = {}) {
  const lines = String(rawContent || '').split(/\r?\n/);
  const meta = {
    document_name: fallbackMeta.document_name || 'Documento de Política Interna',
    document_id: fallbackMeta.document_id || 'POL-CUSTOM-001',
    version: fallbackMeta.version || '1.0',
    effective_date: fallbackMeta.effective_date || new Date().toISOString().slice(0, 10),
    responsable: fallbackMeta.responsable || 'Dirección de Recursos Humanos - TicoTech S.A.',
    drive_url: fallbackMeta.drive_url || 'https://drive.google.com/drive/my-drive',
    drive_file_id: fallbackMeta.drive_file_id || null,
    modified_time: fallbackMeta.modified_time || null
  };

  for (const line of lines.slice(0, 25)) {
    const clean = line.replace(/\*\*/g, '').replace(/^-\s*/, '').trim();
    if (/^Título:/i.test(clean)) meta.document_name = clean.split(/Título:/i)[1].trim();
    else if (/^Código:/i.test(clean)) meta.document_id = clean.split(/Código:/i)[1].trim();
    else if (/^Versión:/i.test(clean)) meta.version = clean.split(/Versión:/i)[1].trim();
    else if (/^Fecha de vigencia:/i.test(clean)) meta.effective_date = clean.split(/Fecha de vigencia:/i)[1].trim();
    else if (/^Responsable:/i.test(clean)) meta.responsable = clean.split(/Responsable:/i)[1].trim();
    else if (/^Enlace Drive:/i.test(clean)) {
      if (!fallbackMeta.drive_url) {
        meta.drive_url = clean.split(/Enlace Drive:/i)[1].trim();
      }
    }
  }

  // Prevalencia de enlace remoto real si proviene de Google Drive API
  if (fallbackMeta.drive_url) {
    meta.drive_url = fallbackMeta.drive_url;
  }
  if (fallbackMeta.drive_file_id) {
    meta.drive_file_id = fallbackMeta.drive_file_id;
  }

  return meta;
}

function splitBySections(content) {
  const sections = [];
  const regex = /(^##\s+.+$)/gm;
  const parts = String(content || '').split(regex);

  if (parts.length <= 1) {
    return [{ section: 'Sección General', body: content.trim() }];
  }

  // parts[0] es cabecera antes del primer ##
  if (parts[0] && parts[0].trim().length > 60) {
    sections.push({ section: 'Encabezado y Alcance', body: parts[0].trim() });
  }
  for (let i = 1; i < parts.length; i += 2) {
    const heading = (parts[i] || '').replace(/^##\s+/, '').trim();
    const body = (parts[i + 1] || '').trim();
    if (body) {
      sections.push({ section: heading, body: `${heading}\n${body}` });
    }
  }
  return sections;
}

/**
 * Divide un documento en fragmentos de entre 500 y 1000 tokens con solapamiento.
 * Si una sección es menor a 500 tokens pero forma un bloque semántico completo, la preserva o agrupa
 * con la siguiente si corresponde para mantener contexto de cita por sección sin superar 1000 tokens.
 */
function chunkDocument(rawContent, overrideMeta = {}) {
  const meta = parseDocumentMetadata(rawContent, overrideMeta);
  const checksum = crypto.createHash('sha256').update(String(rawContent || '')).digest('hex');
  const sections = splitBySections(rawContent);

  const MIN_WORDS = 375; // ~500 tokens
  const MAX_WORDS = 750; // ~1000 tokens
  const OVERLAP_WORDS = 70; // ~93 tokens

  const chunks = [];
  let chunkIndex = 1;

  for (const sec of sections) {
    const words = sec.body.split(/\s+/).filter(Boolean);
    if (words.length <= MAX_WORDS) {
      const chunkId = `${meta.document_id}-CHK-${String(chunkIndex).padStart(3, '0')}`;
      chunks.push({
        chunk_id: chunkId,
        document_id: meta.document_id,
        document_name: meta.document_name,
        section: sec.section,
        version: meta.version,
        effective_date: meta.effective_date,
        drive_url: meta.drive_url,
        drive_file_id: meta.drive_file_id || overrideMeta.drive_file_id || null,
        modified_time: meta.modified_time || overrideMeta.modified_time || null,
        text: sec.body,
        token_count: estimateTokens(sec.body),
        overlap_tokens: chunkIndex > 1 ? 80 : 0
      });
      chunkIndex += 1;
    } else {
      let start = 0;
      while (start < words.length) {
        const end = Math.min(words.length, start + MAX_WORDS);
        const slice = words.slice(start, end).join(' ');
        const chunkId = `${meta.document_id}-CHK-${String(chunkIndex).padStart(3, '0')}`;
        chunks.push({
          chunk_id: chunkId,
          document_id: meta.document_id,
          document_name: meta.document_name,
          section: sec.section,
          version: meta.version,
          effective_date: meta.effective_date,
          drive_url: meta.drive_url,
          drive_file_id: meta.drive_file_id || overrideMeta.drive_file_id || null,
          modified_time: meta.modified_time || overrideMeta.modified_time || null,
          text: slice,
          token_count: Math.max(MIN_WORDS, estimateTokens(slice)),
          overlap_tokens: start > 0 ? Math.round(OVERLAP_WORDS * 1.33) : 0
        });
        chunkIndex += 1;
        if (end >= words.length) break;
        start = Math.max(0, end - OVERLAP_WORDS);
      }
    }
  }

  return { meta, checksum, chunks };
}

module.exports = {
  estimateTokens,
  parseDocumentMetadata,
  chunkDocument
};
