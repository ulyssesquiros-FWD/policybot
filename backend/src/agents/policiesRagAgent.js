const qdrantService = require('../services/rag/qdrantService');
const deepseekService = require('../services/ai/deepseekService');
const embeddingService = require('../services/rag/embeddingService');
const config = require('../config/env');

/**
 * Agente 2: Políticas RAG
 * - Consulta Qdrant (o espejo vectorial sincronizado)
 * - Recupera fragmentos con metadatos completos y enlaces a Drive
 * - Responde únicamente con evidencia recuperada
 * - Cuando no hay suficiente evidencia, reconoce explícitamente la ausencia y activa escalamiento
 */

const GENERIC_HR_TOKENS = new Set([
  'politica', 'politicas', 'reglamento', 'procedimiento', 'manual', 'catalogo',
  'ticotech', 'empresa', 'compania', 'corporativa', 'corporativo', 'colaborador',
  'colaboradores', 'trabajador', 'trabajadores', 'empleado', 'empleados', 'rrhh',
  'recursos', 'humanos', 'costa', 'rica', 'codigo', 'trabajo', 'articulo',
  'articulos', 'ley', 'dice', 'existe', 'tengo', 'puede', 'puedo', 'hacer',
  'cual', 'como', 'cuanto', 'cuantos', 'sobre', 'para', 'internal', 'interna',
  'interno', 'oficial', 'documento', 'pagos', 'pago', 'beneficio', 'beneficios',
  'pedir', 'pedirlas', 'pedirlo', 'solicitar', 'solicitarlas', 'dame', 'dime'
]);

function extractSubstantiveTokens(query) {
  return embeddingService.normalizeTextTokens(query).filter((t) => !GENERIC_HR_TOKENS.has(t));
}

function formatEvidenceFallbackAnswer(question, hits) {
  const primary = hits[0];
  const secondary = hits[1];
  const lines = [];
  const qTokens = extractSubstantiveTokens(question);

  lines.push(`Según la documentación oficial de **${primary.document_name}** (${primary.document_id}, v${primary.version}, ${primary.section}):`);
  lines.push('');
  const cleanBody = primary.text.replace(/^Sección\s+\d+:[^\n]*\n?/i, '').trim();
  const sentences = cleanBody.split(/(?<=[.!?])\s+|\r?\n+/).filter((s) => s.trim().length > 10);
  // Priorizar oraciones que responden directamente a los términos de la consulta
  const scoredSentences = sentences.map((s, idx) => {
    const norm = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const hitsCount = qTokens.filter((t) => norm.includes(t)).length;
    return { s, idx, hitsCount };
  });
  const topSentences =
    scoredSentences.some((x) => x.hitsCount > 0)
      ? scoredSentences
          .sort((a, b) => b.hitsCount - a.hitsCount || a.idx - b.idx)
          .slice(0, 6)
          .sort((a, b) => a.idx - b.idx)
          .map((x) => x.s)
      : sentences.slice(0, 6);

  lines.push(topSentences.join(' '));

  if (secondary && secondary.document_id !== primary.document_id) {
    lines.push('');
    lines.push(`Complementariamente, en **${secondary.document_name}** (${secondary.document_id}, ${secondary.section}):`);
    const secBody = secondary.text.replace(/^Sección\s+\d+:[^\n]*\n?/i, '').trim();
    lines.push(secBody.split(/(?<=[.!?])\s+/).slice(0, 3).join(' '));
  }

  return lines.join('\n');
}

async function queryPolicies(question) {
  const substantive = extractSubstantiveTokens(question);
  const searchRes = await qdrantService.searchSimilarChunks(question, {
    topK: config.rag.topK,
    threshold: config.rag.similarityThreshold
  });

  // Validar cobertura sustantiva de términos reales en los fragmentos recuperados
  const verifiedHits = (searchRes.hits || []).filter((hit) => {
    if (substantive.length === 0) return hit.score >= config.rag.similarityThreshold;
    const normContent = `${hit.document_name} ${hit.section} ${hit.text}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const matched = substantive.filter((tok) => {
      const stem = tok.length > 5 ? tok.slice(0, tok.length - 2) : tok;
      return normContent.includes(tok) || normContent.includes(stem);
    });
    hit._matchedTokensCount = matched.length;
    const minRequired = substantive.length <= 2 ? 1 : Math.ceil(substantive.length * 0.5);
    return matched.length >= minRequired;
  });

  // Priorizar fragmentos con mayor cobertura léxica de términos sustantivos y luego similitud coseno
  verifiedHits.sort((a, b) => (b._matchedTokensCount || 0) - (a._matchedTokensCount || 0) || b.score - a.score);

  if (verifiedHits.length === 0) {
    return {
      agent: 'Agente Políticas RAG',
      hasEvidence: false,
      confidence: Number((searchRes.topRawScore || 0.15).toFixed(2)),
      answerDraft:
        'No existe información confirmada sobre este tema en los documentos oficiales de políticas de RRHH indexados. Para evitar suposiciones, le recomiendo escalar esta consulta directamente con el equipo de Recursos Humanos.',
      citations: [],
      retrievedDocuments: [],
      shouldEscalate: true,
      escalationReason: 'Evidencia documental insuficiente en Qdrant (puntaje bajo umbral o tema no contemplado en políticas).',
      embeddingProvider: searchRes.embeddingProvider,
      vectorStore: searchRes.vectorStore,
      tokensUsed: 0
    };
  }

  const topHits = verifiedHits.slice(0, 3);
  const citations = [];
  const seenCites = new Set();
  for (const h of topHits) {
    const key = `${h.document_id}::${h.section}`;
    if (!seenCites.has(key)) {
      seenCites.add(key);
      citations.push({
        document_id: h.document_id,
        document_name: h.document_name,
        section: h.section,
        version: h.version,
        effective_date: h.effective_date,
        drive_url: h.drive_url,
        drive_file_id: h.drive_file_id || null,
        chunk_id: h.chunk_id,
        score: h.score
      });
    }
  }

  const contextBlock = topHits
    .map(
      (h, idx) =>
        `[Fuente ${idx + 1}] Documento: ${h.document_name} (${h.document_id}) | Versión: ${h.version} | Sección: ${h.section}\nContenido:\n${h.text}`
    )
    .join('\n\n---\n\n');

  const systemPrompt = `Eres el Agente de Políticas RAG de PolicyBot HR (TicoTech S.A., Costa Rica).
REGLAS ESTRICTAS:
1. Responde ÚNICAMENTE utilizando la evidencia documental proporcionada abajo.
2. Si la evidencia distingue entre Base Legal Costarricense y Política Interna de TicoTech, indícalo claramente.
3. Incluye citas explícitas indicando nombre del documento, código, sección y versión.
4. Si la evidencia no responde completamente la pregunta, dilo claramente y no inventes cifras, plazos ni artículos de ley.`;

  const aiRes = await deepseekService.generateCompletion({
    systemPrompt,
    userPrompt: `Pregunta del colaborador: "${question}"\n\nEvidencia recuperada:\n${contextBlock}`,
    temperature: 0.15,
    maxTokens: 700
  });

  const answerDraft = aiRes.ok && aiRes.content ? aiRes.content : formatEvidenceFallbackAnswer(question, topHits);
  const confidence = Number(Math.min(0.98, Math.max(0.65, topHits[0].score + 0.25)).toFixed(2));

  return {
    agent: 'Agente Políticas RAG',
    hasEvidence: true,
    confidence,
    answerDraft,
    citations,
    retrievedDocuments: [...new Set(topHits.map((h) => h.document_id))],
    shouldEscalate: false,
    escalationReason: null,
    embeddingProvider: searchRes.embeddingProvider,
    vectorStore: searchRes.vectorStore,
    modelUsed: aiRes.model,
    tokensUsed: aiRes.usage?.total_tokens || 0
  };
}

module.exports = {
  queryPolicies
};
