const config = require('../../config/env');

/**
 * Servicio de Embeddings usando Ollama con BGE-M3 (http://localhost:11434/api/embeddings).
 * Si Ollama no está ejecutándose en el host o no tiene el modelo bge-m3 descargado,
 * utiliza un vectorizador denso determinista local (384 dims) basado en hash de palabras y bigramas
 * normalizado L2 para permitir búsqueda semántica/vectorial demostrable sin bloquear la aplicación.
 */

const LOCAL_DIM = 384;

const STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'a', 'en', 'con', 'por', 'para',
  'que', 'y', 'o', 'se', 'su', 'sus', 'mi', 'mis', 'es', 'son', 'como', 'cual', 'cuales', 'cuanto', 'cuantos',
  'cuanta', 'cuantas', 'sobre', 'si', 'no', 'me', 'te', 'le', 'nos', 'lo', 'mas', 'pero', 'cuando', 'donde',
  'tengo', 'tiene', 'tienen', 'debo', 'debe', 'deben', 'puedo', 'puede', 'pueden', 'hay', 'ser', 'esta', 'estan',
  'segun', 'suficientes', 'suficiente', 'actualmente', 'disponibles', 'disponible', 'existen', 'existe'
]);

let lastProviderState = {
  provider: 'uninitialized',
  model: config.rag.ollamaEmbeddingModel,
  ollamaReachable: false,
  dimensions: LOCAL_DIM,
  lastChecked: null
};

function normalizeTextTokens(text) {
  const clean = String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');
  const tokens = clean.split(/\s+/).filter((t) => t.length > 2 && !STOPWORDS.has(t));
  return tokens;
}

function hashTokenToIndex(token, salt = 0) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % LOCAL_DIM;
}

function computeLocalDeterministicEmbedding(text) {
  const vec = new Array(LOCAL_DIM).fill(0);
  const tokens = normalizeTextTokens(text);

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    // Raíz aproximada para mejorar recall morfológico en español (ej. vacaciones/vacacion, incapacidad/incapacidades)
    const stem = tok.length > 5 ? tok.slice(0, tok.length - 2) : tok;
    vec[hashTokenToIndex(tok, 1)] += 1.0;
    vec[hashTokenToIndex(stem, 7)] += 0.85;
    if (i < tokens.length - 1) {
      const bigram = `${tok}_${tokens[i + 1]}`;
      vec[hashTokenToIndex(bigram, 13)] += 0.7;
    }
  }

  let norm = 0;
  for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  return vec.map((v) => Number((v / norm).toFixed(6)));
}

async function embedWithOllama(text) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(`${config.rag.ollamaBaseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.rag.ollamaEmbeddingModel,
        prompt: text
      }),
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.embedding) || data.embedding.length === 0) {
      throw new Error('Vector vacío desde Ollama');
    }
    lastProviderState = {
      provider: 'ollama_bge_m3',
      model: config.rag.ollamaEmbeddingModel,
      ollamaReachable: true,
      dimensions: data.embedding.length,
      lastChecked: new Date().toISOString()
    };
    return data.embedding;
  } catch (err) {
    clearTimeout(timer);
    lastProviderState = {
      provider: 'local_deterministic_fallback',
      model: `${config.rag.ollamaEmbeddingModel} (fallback-local-384d)`,
      ollamaReachable: false,
      dimensions: LOCAL_DIM,
      lastError: err.message,
      lastChecked: new Date().toISOString()
    };
    return null;
  }
}

async function generateEmbedding(text) {
  const live = await embedWithOllama(text);
  if (live) {
    return { vector: live, provider: 'ollama_bge_m3', dimensions: live.length };
  }
  const fallback = computeLocalDeterministicEmbedding(text);
  return { vector: fallback, provider: 'local_deterministic_fallback', dimensions: LOCAL_DIM };
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function getEmbeddingStatus() {
  return { ...lastProviderState, ollamaUrl: config.rag.ollamaBaseUrl };
}

module.exports = {
  generateEmbedding,
  cosineSimilarity,
  normalizeTextTokens,
  getEmbeddingStatus
};
