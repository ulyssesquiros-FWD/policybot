const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { QdrantClient } = require('@qdrant/js-client-rest');
const config = require('../../config/env');
const embeddingService = require('./embeddingService');

const LOCAL_STORE_PATH = path.join(config.paths.dataDir, 'qdrant_local_store.json');

let qdrantConnected = false;
let lastError = null;
let localVectorsCache = null;

function ensureDataDir() {
  if (!fs.existsSync(config.paths.dataDir)) {
    fs.mkdirSync(config.paths.dataDir, { recursive: true });
  }
}

function loadLocalStore() {
  if (localVectorsCache) return localVectorsCache;
  ensureDataDir();
  if (fs.existsSync(LOCAL_STORE_PATH)) {
    try {
      localVectorsCache = JSON.parse(fs.readFileSync(LOCAL_STORE_PATH, 'utf8'));
      return localVectorsCache;
    } catch {
      localVectorsCache = { collection: config.rag.qdrantCollection, points: [] };
      return localVectorsCache;
    }
  }
  localVectorsCache = { collection: config.rag.qdrantCollection, points: [] };
  return localVectorsCache;
}

function saveLocalStore(store) {
  ensureDataDir();
  localVectorsCache = store;
  fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function getClient() {
  return new QdrantClient({
    url: config.rag.qdrantUrl,
    apiKey: config.rag.qdrantApiKey || undefined,
    timeout: 5000,
    checkCompatibility: false
  });
}

/**
 * Genera un UUID v4 determinista válido según RFC 4122 a partir del chunk_id.
 * Garantiza idempotencia matemática en reindexaciones sin colisiones ni duplicados.
 */
function deterministicUuidFromChunkId(chunkId) {
  const hex = crypto.createHash('md5').update(String(chunkId)).digest('hex');
  const v4Hex = hex.slice(0, 12) + '4' + hex.slice(13, 16) + 'a' + hex.slice(17, 32);
  return `${v4Hex.slice(0, 8)}-${v4Hex.slice(8, 12)}-${v4Hex.slice(12, 16)}-${v4Hex.slice(16, 20)}-${v4Hex.slice(20, 32)}`;
}

async function ensureQdrantCollection(vectorSize = (config.rag.vectorSize || 1024)) {
  try {
    const client = getClient();
    const collections = await client.getCollections();
    const exists = (collections.collections || []).some((c) => c.name === config.rag.qdrantCollection);
    if (!exists) {
      await client.createCollection(config.rag.qdrantCollection, {
        vectors: { size: vectorSize, distance: config.rag.distance || 'Cosine' }
      });
    }
    qdrantConnected = true;
    lastError = null;
    return true;
  } catch (err) {
    qdrantConnected = false;
    lastError = err.message;
    return false;
  }
}

async function checkQdrantHealth() {
  try {
    const client = getClient();
    const cols = await client.getCollections();
    const exists = (cols.collections || []).some((c) => c.name === config.rag.qdrantCollection);
    let pointsCount = 0;
    let status = 'connected';
    if (exists) {
      const countRes = await client.count(config.rag.qdrantCollection, { exact: true });
      pointsCount = countRes.count;
    }
    qdrantConnected = true;
    lastError = null;
    return {
      healthy: true,
      url: config.rag.qdrantUrl,
      collectionExists: exists,
      collection: config.rag.qdrantCollection,
      pointsCount,
      status
    };
  } catch (err) {
    qdrantConnected = false;
    lastError = err.message;
    return {
      healthy: false,
      url: config.rag.qdrantUrl,
      collection: config.rag.qdrantCollection,
      error: err.message
    };
  }
}

async function getCollectionPointsCount() {
  try {
    const client = getClient();
    const res = await client.count(config.rag.qdrantCollection, { exact: true });
    return res.count;
  } catch {
    const store = loadLocalStore();
    return store.points.length;
  }
}

async function getPointPayload(pointId) {
  try {
    const client = getClient();
    const res = await client.retrieve(config.rag.qdrantCollection, {
      ids: [pointId],
      with_payload: true
    });
    if (res && res.length > 0) return res[0].payload;
  } catch {}
  const store = loadLocalStore();
  const found = store.points.find((p) => p.id === pointId);
  return found?.payload || null;
}

async function upsertDocumentChunks(documentId, chunksWithVectors) {
  // 1. Mantener sincronizado el espejo local de respaldo
  const store = loadLocalStore();
  store.points = store.points.filter((p) => p.payload.document_id !== documentId);

  const formattedPoints = chunksWithVectors.map((item) => ({
    id: deterministicUuidFromChunkId(item.chunk_id),
    vector: item.vector,
    payload: {
      chunk_id: item.chunk_id,
      document_id: item.document_id,
      document_name: item.document_name,
      section: item.section,
      version: item.version,
      effective_date: item.effective_date,
      drive_url: item.drive_url,
      drive_file_id: item.drive_file_id || null,
      modified_time: item.modified_time || null,
      text: item.text,
      token_count: item.token_count
    }
  }));

  store.points.push(...formattedPoints);
  saveLocalStore(store);

  // 2. Inserción en Qdrant Server Real
  let liveUpserted = 0;
  if (chunksWithVectors.length > 0) {
    const vectorDim = chunksWithVectors[0].vector.length;
    const ok = await ensureQdrantCollection(vectorDim);
    if (ok) {
      try {
        const client = getClient();
        // Eliminar puntos existentes del mismo documentId para garantizar idempotencia
        await client.delete(config.rag.qdrantCollection, {
          filter: { must: [{ key: 'document_id', match: { value: documentId } }] }
        });
        await client.upsert(config.rag.qdrantCollection, {
          wait: true,
          points: formattedPoints
        });
        qdrantConnected = true;
        liveUpserted = formattedPoints.length;
      } catch (err) {
        qdrantConnected = false;
        lastError = err.message;
        if (!config.rag.allowLocalVectorFallback) {
          throw new Error(`QDRANT_UPSERT_FAILED: Error al insertar fragmentos en Qdrant Server (${err.message}) y el fallback local está desactivado.`);
        }
      }
    } else if (!config.rag.allowLocalVectorFallback) {
      throw new Error(`QDRANT_COLLECTION_ERROR: No se pudo verificar o crear la colección en Qdrant Server (${lastError}).`);
    }
  }

  return {
    upserted: formattedPoints.length,
    liveUpserted,
    qdrantConnected
  };
}

async function deleteDocumentChunks(documentId) {
  const store = loadLocalStore();
  const before = store.points.length;
  store.points = store.points.filter((p) => p.payload.document_id !== documentId);
  saveLocalStore(store);

  try {
    const client = getClient();
    await client.delete(config.rag.qdrantCollection, {
      filter: { must: [{ key: 'document_id', match: { value: documentId } }] }
    });
    qdrantConnected = true;
    lastError = null;
  } catch (err) {
    qdrantConnected = false;
    lastError = err.message;
    if (!config.rag.allowLocalVectorFallback) {
      throw new Error(`QDRANT_DELETE_FAILED: Error al eliminar puntos en Qdrant Server (${err.message}).`);
    }
  }

  return { removed: before - store.points.length };
}

/**
 * Búsqueda semántica sobre Qdrant Server Real (Cosine Distance)
 * Sin fallback silencioso cuando RAG_ALLOW_LOCAL_VECTOR_FALLBACK=false.
 */
async function searchSimilarChunks(queryText, { topK = config.rag.topK, threshold = config.rag.similarityThreshold } = {}) {
  const { vector: queryVector, provider } = await embeddingService.generateEmbedding(queryText);

  // 1. Intentar Qdrant Server Real en vivo
  try {
    const client = getClient();
    let rawPoints = [];
    if (typeof client.query === 'function') {
      const res = await client.query(config.rag.qdrantCollection, {
        query: queryVector,
        limit: topK,
        with_payload: true
      });
      rawPoints = res?.points || [];
    } else if (typeof client.search === 'function') {
      rawPoints = (await client.search(config.rag.qdrantCollection, {
        vector: queryVector,
        limit: topK,
        with_payload: true
      })) || [];
    }
    qdrantConnected = true;
    lastError = null;

    const mapped = (rawPoints || [])
      .map((r) => ({
        ...r.payload,
        score: Number(r.score.toFixed(4)),
        vectorSource: 'qdrant_live'
      }))
      .filter((r) => r.score >= threshold);

    return {
      hits: mapped,
      topRawScore: rawPoints[0]?.score ? Number(rawPoints[0].score.toFixed(4)) : 0,
      embeddingProvider: provider,
      vectorStore: 'qdrant_live'
    };
  } catch (err) {
    qdrantConnected = false;
    lastError = err.message;
    if (!config.rag.allowLocalVectorFallback) {
      throw new Error(`QDRANT_SEARCH_FAILED: No se pudo consultar Qdrant Server en ${config.rag.qdrantUrl} (${err.message}) y el fallback local está desactivado.`);
    }
  }

  // 2. Búsqueda local de respaldo (solo si se permite explícitamente en desarrollo)
  const store = loadLocalStore();
  const queryTokens = embeddingService.normalizeTextTokens(queryText);

  const scored = store.points.map((pt) => {
    const vecSim =
      pt.vector && pt.vector.length === queryVector.length
        ? embeddingService.cosineSimilarity(queryVector, pt.vector)
        : 0;

    const hayStack = `${pt.payload.document_name} ${pt.payload.section} ${pt.payload.text}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    let matchedTerms = 0;
    for (const qt of queryTokens) {
      const stem = qt.length > 5 ? qt.slice(0, qt.length - 2) : qt;
      if (hayStack.includes(qt) || hayStack.includes(stem)) {
        matchedTerms += 1;
      }
    }
    const lexicalScore = queryTokens.length > 0 ? matchedTerms / queryTokens.length : 0;
    const combinedScore = Number((vecSim * 0.55 + lexicalScore * 0.45).toFixed(4));

    return {
      ...pt.payload,
      score: combinedScore,
      cosineScore: Number(vecSim.toFixed(4)),
      lexicalScore: Number(lexicalScore.toFixed(4)),
      vectorSource: 'qdrant_local_mirror'
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const hits = scored.filter((item) => item.score >= threshold).slice(0, topK);

  return {
    hits,
    topRawScore: scored[0]?.score || 0,
    embeddingProvider: provider,
    vectorStore: 'qdrant_local_mirror'
  };
}

async function getQdrantStatus() {
  const store = loadLocalStore();
  let livePointsCount = 0;
  let liveCollectionStatus = 'disconnected';

  try {
    const client = getClient();
    const info = await client.getCollection(config.rag.qdrantCollection);
    qdrantConnected = true;
    lastError = null;
    liveCollectionStatus = info.status;
    const countRes = await client.count(config.rag.qdrantCollection, { exact: true });
    livePointsCount = countRes.count;
  } catch (err) {
    qdrantConnected = false;
    lastError = err.message;
  }

  return {
    qdrantUrl: config.rag.qdrantUrl,
    collection: config.rag.qdrantCollection,
    qdrantConnected,
    serverStatus: liveCollectionStatus,
    livePointsCount,
    localMirrorPoints: store.points.length,
    vectorSize: config.rag.vectorSize || 1024,
    distance: config.rag.distance || 'Cosine',
    similarityThreshold: config.rag.similarityThreshold,
    allowLocalVectorFallback: config.rag.allowLocalVectorFallback,
    lastError
  };
}

module.exports = {
  deterministicUuidFromChunkId,
  ensureQdrantCollection,
  checkQdrantHealth,
  getCollectionPointsCount,
  getPointPayload,
  upsertDocumentChunks,
  deleteDocumentChunks,
  searchSimilarChunks,
  getQdrantStatus
};
