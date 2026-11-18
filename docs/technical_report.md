# Informe Técnico — PolicyBot HR (Mini Proyecto #2)

## 1. Resumen Ejecutivo
**PolicyBot HR** es un portal corporativo de consulta de políticas de Recursos Humanos y analítica operativa basado en un sistema **RAG Multiagente con LangGraph.js**, **React + Vite**, **Node.js + Express**, **MySQL (`policybot_rrhh` vía Sequelize ORM)**, **Servidor Qdrant Real v1.20.2**, **Ollama (`bge-m3` 1024d)**, **DeepSeek (`deepseek-flash`)**, **Google Drive API v3 (OAuth 2.0)** y automatización diaria con **node-cron** (`America/Costa_Rica`).

## 2. Decisiones Técnicas y Normativa Costarricense
- Los documentos de políticas institucionales distinguen explícitamente la **legislación laboral vigente de Costa Rica** (Código de Trabajo Ley N° 2, Ley de Aguinaldo N° 2412, Ley Solidarista N° 6970, Ley de Protección de la Persona frente al Tratamiento de sus Datos Personales N° 8968, Ley contra Hostigamiento Sexual N° 7476, Ley de Teletrabajo N° 9738, Ley de Licencia de Paternidad N° 10191, Reglamento CCSS y Póliza RT del INS) de los **beneficios internos** de TicoTech S.A.
- Los fragmentos documentales se generan en bloques de 500 a 1000 tokens con solapamiento y metadatos completos (`document_id`, `document_name`, `section`, `version`, `effective_date`, `drive_url`, `drive_file_id`, `chunk_id`).

## 3. Infraestructura Vectorial: Qdrant Server Real y Embeddings BGE-M3
- **Servidor Qdrant v1.20.2 en Vivo:** Escuchando en `http://127.0.0.1:6333` (REST) y puerto 6334 (gRPC). Se suministra tanto binario nativo optimizado para Windows como receta dockerizada en `docker-compose.yml` (`qdrant/qdrant:v1.20.2`, volumen `qdrant_storage`).
- **Colección Vectorial:** `policybot_hr_docs` configurada con tamaño de vector `1024` y métrica `Cosine`.
- **Embeddings BGE-M3:** Generados en tiempo real por Ollama (`bge-m3:latest`) con vectores densos de 1024 dimensiones en ~149 ms por consulta.
- **Idempotencia Determinista:** Identificadores UUID RFC 4122 v4 derivados del `chunk_id` mediante SHA-256 para evitar duplicados en reindexaciones.
- **Control de Fallback:** `RAG_ALLOW_LOCAL_VECTOR_FALLBACK=false` para garantizar que las consultas se resuelvan exclusivamente en el servidor Qdrant real.

## 4. Seguridad y Gobernanza Implementadas
- **Autenticación y RBAC:** Contraseñas con `bcryptjs`, tokens JWT con expiración de 8h y middleware `requireRole` para proteger los módulos de RRHH, Documentos y Gobernanza.
- **Aislamiento de Datos (Ley N° 8968):** `employeeDataAgent.js` y `employeeController.js` operan exclusivamente con el `colaboradorId` firmado en el JWT del servidor, rechazando intentos de consulta sobre terceros con código HTTP 403 y bloqueo en el Orquestador.
- **Cifrado de Tokens OAuth:** La tabla `google_drive_connections` almacena los refresh tokens cifrados con `AES-256-GCM` con IV aleatorio y tag de autenticación.
- **Acceso Exclusivo mediante ORM:** 100% de las operaciones sobre MySQL se ejecutan a través de **Sequelize ORM** (15 modelos), sin sentencias SQL en texto plano en la aplicación.
- **Gobernanza de IA:** Bloqueo explícito de despidos, contrataciones, sanciones, cambios salariales y aprobación automática de vacaciones; auditoría persistente en `audit_logs`.

## 5. Resultados Verificados de Pruebas y Evaluación
- **Compilación Frontend (`npm run build`):** Exitosa (`frontend/dist/`), 2247 módulos transformados, 0 errores.
- **Pruebas de Integración Qdrant Server Real (`tests/qdrant_live_tests.js`):** **7 / 7 aprobadas (100%)**.
- **Pruebas de Seguridad Google Drive (`tests/drive_hardening_tests.js`):** **6 / 6 aprobadas (100%)**.
- **Suite Integral de Backend (`tests/run_all_tests.js`):** **16 / 16 pruebas aprobadas (100%)**.
- **Banco de Evaluación de 45 Preguntas (`governance/evaluations/run_evaluation.js`):**
  - Precisión global: **45 / 45 (100%)** (meta >= 80%).
  - Exposición de datos de terceros: **0** (meta = 0).
  - Respuestas RAG sin cita documental: **0** (meta = 0).
  - Detalle disponible en [evaluation_results.md](../governance/evaluations/evaluation_results.md).
