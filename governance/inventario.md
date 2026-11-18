# Inventario de Activos de IA, Datos e Integraciones

| ID | Componente | Tipo | Ubicación Real en Código | Clasificación | Responsable |
|----|------------|------|--------------------------|---------------|-------------|
| IA-01 | DeepSeek Client (`deepseek-flash`) | LLM API (OpenAI SDK) | `backend/src/services/ai/deepseekService.js` | Interno | Arquitectura IA |
| IA-02 | LangGraph Multiagent StateGraph | Orquestador (`@langchain/langgraph`) | `backend/src/agents/langgraphWorkflow.js` | Interno | Arquitectura IA |
| IA-03 | Embeddings BGE-M3 (Ollama) | Modelo Vectorial | `backend/src/services/rag/embeddingService.js` | Interno | Ingeniería RAG |
| VEC-01 | Qdrant Vector Store Real (v1.20.2) | Base Vectorial 1024d Cosine (`policybot_hr_docs`, 47 puntos) | `backend/src/services/rag/qdrantService.js` | Interno | Ingeniería RAG |
| DB-01 | MySQL `policybot_rrhh` | Base Relacional (15 tablas, incl. `google_drive_connections`) | `database/schema.sql` / `backend/src/config/database.js` | Confidencial / Sensible | Datos y RRHH |
| SEC-01 | Token Crypto (`AES-256-GCM`) | Cifrado autenticado de refresh tokens OAuth | `backend/src/services/security/tokenCryptoService.js` | Crítico | Seguridad |
| EXT-01 | Google Drive API v3 (OAuth 2.0) | Fuente Documental Oficial (`drive.readonly` + carpeta restringida) | `backend/src/services/rag/googleDriveService.js` | Interno / Confidencial | ADMIN_RRHH |
| CRON-01 | Report Scheduler (`0 7 * * *` CR) | Automatización (`node-cron`) | `backend/src/services/cron/reportScheduler.js` | Interno | Operaciones RRHH |
| AG-01 | Agente Orquestador | Agente LangGraph | `backend/src/agents/orchestratorAgent.js` | Interno | Gobernanza IA |
| AG-02 | Agente Políticas RAG | Agente LangGraph | `backend/src/agents/policiesRagAgent.js` | Interno | Gobernanza IA |
| AG-03 | Agente Datos Colaborador | Agente LangGraph | `backend/src/agents/employeeDataAgent.js` | Confidencial | Seguridad / RRHH |
| AG-04 | Agente Analista de Reportes | Agente LangGraph | `backend/src/agents/reportsAnalystAgent.js` | Interno | Analítica RRHH |
| AG-05 | Agente Ingesta y Sincronización | Agente RAG | `backend/src/agents/ingestionSyncAgent.js` | Interno | RRHH |
| AG-06 | Agente Validador | Agente Control | `backend/src/agents/validatorAgent.js` | Crítico | Oficialía de Cumplimiento |
