# Plan de Respuesta a Incidentes de IA y Privacidad

## 1. Clasificación de Severidad
- **P1 (Crítico):** Fuga de datos personales o salariales de terceros, elusión de autenticación JWT o ejecución autónoma prohibida por IA.
- **P2 (Alto):** Respuesta de política con información legal errónea sin cita verificable, falla reiterada de `validatorAgent.js`.
- **P3 (Medio):** Caída de proveedor externo (DeepSeek, Qdrant, Ollama o Google Drive) operando en modo degradado local.

## 2. Procedimiento de Contención
1. **Detección:** Monitoreo de `audit_logs` filtrando `BLOQUEADO_SEGURIDAD`, `BLOQUEADO_GOBERNANZA` y `ERROR` desde el módulo de Gobernanza.
2. **Contención Inmediata:**
   - En incidentes P1 de credenciales: rotar `JWT_SECRET` o `DEEPSEEK_API_KEY` en `backend/.env` y reiniciar el servidor.
   - En incidentes P2 de alucinación documental: desindexar o corregir la versión del documento en `DocumentAdmin`, elevar `RAG_SIMILARITY_THRESHOLD` (ej. de `0.35` a `0.50`) y re-sincronizar.
3. **Notificación Legal (Ley N° 8968):** Si ocurriera una vulneración real de datos personales, notificar a la Oficialía de Privacidad de TicoTech S.A. y a los titulares afectados conforme al protocolo de PRODHAB dentro de las 72 horas siguientes.
4. **Post-Mortem:** Agregar el caso al banco de evaluación (`governance/evaluations/evaluation_bank_45.json`) y a `tests/run_all_tests.js` para evitar regresión.
