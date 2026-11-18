const assert = require('assert');
const { QdrantClient } = require('../backend/node_modules/@qdrant/js-client-rest');
const config = require('../backend/src/config/env');
const qdrantService = require('../backend/src/services/rag/qdrantService');
const embeddingService = require('../backend/src/services/rag/embeddingService');

async function runQdrantLiveTests() {
  console.log('================================================================');
  console.log('SUITE DE PRUEBAS DE INTEGRACIÓN: QDRANT SERVER REAL (1024d)');
  console.log('================================================================');

  const client = new QdrantClient({
    url: config.rag.qdrantUrl,
    apiKey: config.rag.qdrantApiKey || undefined,
    timeout: 5000,
    checkCompatibility: false
  });

  let passed = 0;
  const total = 7;

  async function testCase(name, fn) {
    try {
      await fn();
      console.log(`✅ [PASS] [REAL] ${name}`);
      passed += 1;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
    }
  }

  // 1. Verificación del Servidor Qdrant y Colección Oficial
  await testCase('1. Servidor Qdrant disponible en puerto 6333 y colección 1024d Cosine', async () => {
    const health = await qdrantService.checkQdrantHealth();
    assert.strictEqual(health.healthy, true, 'Qdrant Server debe responder healthy: true');
    assert.strictEqual(health.collectionExists, true, 'La colección policybot_hr_docs debe existir');

    const info = await client.getCollection(config.rag.qdrantCollection);
    assert.strictEqual(info.status, 'green', 'El estado de la colección debe ser green');
    assert.strictEqual(info.config.params.vectors.size, 1024, 'Dimensión vectorial debe ser 1024 (BGE-M3)');
    assert.strictEqual(info.config.params.vectors.distance, 'Cosine', 'Distancia debe ser Cosine');
  });

  // 2. Conteo de Puntos y Metadatos Documentales Completos
  await testCase('2. Puntos almacenados y metadatos documentales completos en payload', async () => {
    const pointsCount = await qdrantService.getCollectionPointsCount();
    assert.ok(pointsCount >= 40, `Debe haber al menos 40 fragmentos reales indexados (actual: ${pointsCount})`);

    // Consultar una muestra usando scroll
    const scrollRes = await client.scroll(config.rag.qdrantCollection, {
      limit: 1,
      with_payload: true,
      with_vector: true
    });
    assert.ok(scrollRes.points.length > 0, 'Debe devolver al menos un punto');
    const pt = scrollRes.points[0];
    assert.strictEqual(pt.vector.length, 1024, 'Vector almacenado debe tener 1024 dimensiones');
    assert.ok(pt.payload.document_id, 'Payload debe contener document_id');
    assert.ok(pt.payload.document_name, 'Payload debe contener document_name');
    assert.ok(pt.payload.section, 'Payload debe contener section');
    assert.ok(pt.payload.drive_url, 'Payload debe contener drive_url');
  });

  // 3. Reindexación Idempotente sin duplicados (UUID deterministas)
  await testCase('3. Inserción e idempotencia sin duplicados con UUID determinista', async () => {
    const initialCount = await qdrantService.getCollectionPointsCount();

    const testChunkId = 'POL-IDEMP-TEST-CHK-001';
    const testDocId = 'POL-IDEMP-TEST';
    const dummyVector = new Array(1024).fill(0.02);

    const testItem = [{
      chunk_id: testChunkId,
      document_id: testDocId,
      document_name: 'Política de Prueba Idempotencia',
      section: 'Sección 1',
      version: '1.0',
      effective_date: '2026-01-01',
      drive_url: 'https://drive.google.com/file/d/test-idemp/view',
      drive_file_id: 'test-idemp-file-id',
      text: 'Texto de prueba de idempotencia en Qdrant Server.',
      token_count: 50,
      vector: dummyVector
    }];

    // Primera inserción
    await qdrantService.upsertDocumentChunks(testDocId, testItem);
    const countAfterFirst = await qdrantService.getCollectionPointsCount();
    assert.strictEqual(countAfterFirst, initialCount + 1, 'El conteo debe aumentar en 1');

    // Segunda inserción (mismo chunk_id)
    await qdrantService.upsertDocumentChunks(testDocId, testItem);
    const countAfterSecond = await qdrantService.getCollectionPointsCount();
    assert.strictEqual(countAfterSecond, countAfterFirst, 'Reindexación del mismo chunk no debe crear duplicados');

    // Limpieza
    await qdrantService.deleteDocumentChunks(testDocId);
    const countFinal = await qdrantService.getCollectionPointsCount();
    assert.strictEqual(countFinal, initialCount, 'Tras eliminar, el conteo debe volver al inicial');
  });

  // 4. Modificación y Actualización de Documento
  await testCase('4. Actualización de documento modificado en Qdrant Server', async () => {
    const testDocId = 'POL-UPDATE-TEST';
    const chunkId = 'POL-UPDATE-TEST-CHK-001';
    const vec1 = new Array(1024).fill(0.03);
    const vec2 = new Array(1024).fill(0.04);

    await qdrantService.upsertDocumentChunks(testDocId, [{
      chunk_id: chunkId,
      document_id: testDocId,
      document_name: 'Documento Original',
      section: 'Versión 1',
      version: '1.0',
      effective_date: '2026-01-01',
      drive_url: 'https://drive.google.com/original',
      text: 'Contenido original',
      token_count: 30,
      vector: vec1
    }]);

    // Modificar documento
    await qdrantService.upsertDocumentChunks(testDocId, [{
      chunk_id: chunkId,
      document_id: testDocId,
      document_name: 'Documento Modificado',
      section: 'Versión 2',
      version: '2.0',
      effective_date: '2026-02-01',
      drive_url: 'https://drive.google.com/updated',
      text: 'Contenido actualizado y modificado',
      token_count: 35,
      vector: vec2
    }]);

    const pointUuid = qdrantService.deterministicUuidFromChunkId(chunkId);
    const payload = await qdrantService.getPointPayload(pointUuid);
    assert.strictEqual(payload.document_name, 'Documento Modificado', 'El nombre debe haberse actualizado');
    assert.strictEqual(payload.version, '2.0', 'La versión debe ser 2.0');

    await qdrantService.deleteDocumentChunks(testDocId);
  });

  // 5. Eliminación de Chunks de Documento
  await testCase('5. Eliminación de chunks por document_id en Qdrant Server', async () => {
    const testDocId = 'POL-DELETE-TEST';
    const beforeCount = await qdrantService.getCollectionPointsCount();

    await qdrantService.upsertDocumentChunks(testDocId, [
      {
        chunk_id: 'POL-DEL-CHK-001',
        document_id: testDocId,
        document_name: 'Para Eliminar',
        section: 'Sec 1',
        version: '1.0',
        effective_date: '2026-01-01',
        drive_url: 'https://drive.google.com/del1',
        text: 'Texto 1',
        token_count: 20,
        vector: new Array(1024).fill(0.01)
      },
      {
        chunk_id: 'POL-DEL-CHK-002',
        document_id: testDocId,
        document_name: 'Para Eliminar',
        section: 'Sec 2',
        version: '1.0',
        effective_date: '2026-01-01',
        drive_url: 'https://drive.google.com/del2',
        text: 'Texto 2',
        token_count: 25,
        vector: new Array(1024).fill(0.01)
      }
    ]);

    const countWithItems = await qdrantService.getCollectionPointsCount();
    assert.strictEqual(countWithItems, beforeCount + 2);

    await qdrantService.deleteDocumentChunks(testDocId);
    const countAfterDelete = await qdrantService.getCollectionPointsCount();
    assert.strictEqual(countAfterDelete, beforeCount, 'Los 2 puntos deben haber sido eliminados');
  });

  // 6. Búsqueda Semántica Real con Ollama BGE-M3 (1024d) sobre Qdrant Server
  await testCase('6. Búsqueda semántica real (Ollama BGE-M3 1024d -> Qdrant Server)', async () => {
    const query = '¿Con cuántos días de anticipación debo solicitar mis vacaciones ordinarias según la política?';
    const res = await qdrantService.searchSimilarChunks(query, { topK: 5 });

    assert.strictEqual(res.vectorStore, 'qdrant_live', 'Debe utilizar qdrant_live como vector store');
    assert.strictEqual(res.embeddingProvider, 'ollama_bge_m3', 'Debe utilizar ollama_bge_m3 como generador de embeddings');
    assert.ok(res.hits.length > 0, 'Debe devolver fragmentos relevantes');

    const top = res.hits[0];
    assert.strictEqual(top.document_id, 'POL-VAC-001', 'Top hit debe ser la política de vacaciones POL-VAC-001');
    assert.ok(top.score >= 0.5, `Puntaje debe ser >= 0.5 (obtenido: ${top.score})`);
    assert.ok(top.drive_url.includes('drive.google.com'), 'Debe incluir enlace real de Google Drive');
  });

  // 7. Desactivación de Fallback Silencioso
  await testCase('7. Desactivación de fallback silencioso (RAG_ALLOW_LOCAL_VECTOR_FALLBACK=false)', async () => {
    assert.strictEqual(config.rag.allowLocalVectorFallback, false, 'allowLocalVectorFallback debe ser false');
    const status = await qdrantService.getQdrantStatus();
    assert.strictEqual(status.qdrantConnected, true, 'Qdrant Server debe reportar conectado');
    assert.strictEqual(status.serverStatus, 'green', 'Estado del servidor debe ser green');
    assert.strictEqual(status.vectorSize, 1024, 'Vector size debe ser 1024');
  });

  console.log('================================================================');
  console.log(`Resumen pruebas Qdrant Server Real: ${passed}/${total} aprobadas.`);
  console.log('================================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runQdrantLiveTests().catch((err) => {
  console.error('Error fatal en suite Qdrant:', err);
  process.exit(1);
});
