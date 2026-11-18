# Guía de Agentes Multiagente (LangGraph.js)

La orquestación se ejecuta mediante `StateGraph` de `@langchain/langgraph` en `backend/src/agents/langgraphWorkflow.js`.

## 1. Agente 1 — Orquestador (`orchestratorAgent.js`)
- **Función:** Clasificar la intención (`POLITICA_RRHH`, `DATOS_PERSONALES`, `MIXTA`, `REPORTE_RRHH`, `RESTRINGIDA_SEGURIDAD`, `RESTRINGIDA_GOBERNANZA`, `FUERA_DE_ALCANCE`) y sintetizar la única respuesta final al usuario.
- **Guardrails:** Detecta prompt injection, inyección SQL, solicitudes sobre datos o salarios de terceros y peticiones de decisiones laborales prohibidas (despidos, contrataciones, sanciones, cambios salariales o aprobaciones automáticas).

## 2. Agente 2 — Políticas RAG (`policiesRagAgent.js`)
- **Función:** Vectorizar la consulta y buscar en Qdrant (`qdrantService.js`) fragmentos entre 500 y 1000 tokens de las 10 políticas indexadas.
- **Trazabilidad:** Exige superar el umbral `RAG_SIMILARITY_THRESHOLD` y coincidencia sustantiva de términos; devuelve citas con `document_id`, `document_name`, `section`, `version`, `effective_date` y `drive_url`.
- **Escalamiento:** Cuando no hay evidencia suficiente, declara explícitamente que no existe información confirmada y crea un ticket en `escalaciones_rrhh`.

## 3. Agente 3 — Datos del Colaborador (`employeeDataAgent.js`)
- **Función:** Consultar en MySQL saldos de vacaciones, solicitudes, incapacidades, próxima evaluación, cumpleaños y movimientos autorizados.
- **Regla de Oro:** Usa únicamente `userContext.colaboradorId` extraído del JWT validado en servidor.

## 4. Agente 4 — Analista de Reportes (`reportsAnalystAgent.js`)
- **Función:** Calcular las 13 métricas SQL agregadas de RRHH y solicitar a DeepSeek (`deepseek-flash`) la redacción de un resumen ejecutivo de 3 a 5 frases sin modificar las cifras.
- **Programación:** Se ejecuta automáticamente todos los días a las `07:00` en `America/Costa_Rica` vía `node-cron` y manualmente mediante `POST /api/reports/generate`.

## 5. Agente 5 — Ingesta y Sincronización (`ingestionSyncAgent.js`)
- **Función:** Detectar documentos nuevos, modificados (SHA-256) o eliminados en Google Drive o repositorio local, extraer texto (Google Docs, Google Sheets CSV, PDF, Markdown), fragmentar con solapamiento, generar embeddings con `bge-m3` y actualizar `document_sync_state`.

## 6. Agente Validador (`validatorAgent.js`) y Escalamiento Humano (`humanEscalationService.js`)
- El **Agente Validador** verifica antes de responder: respaldo de citas, cero fugas de terceros, fidelidad numérica SQL y cumplimiento de las 6 prohibiciones de gobernanza.
- El **Servicio de Escalamiento** genera tickets `ESC-YYYY-XXXX` visibles y resolubles en el Dashboard RRHH.
