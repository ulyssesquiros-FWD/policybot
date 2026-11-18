# Arquitectura del Sistema — PolicyBot HR

## Visión General
PolicyBot HR implementa una arquitectura modular desacoplada en tres capas principales (Frontend React, Backend REST + Multiagente LangGraph.js, y Capa de Datos Híbrida MySQL + Qdrant/Ollama), gobernada por controles estrictos de privacidad (Ley N° 8968) y supervisión humana.

## Diagrama de Arquitectura

```mermaid
flowchart TB
    User["Colaborador / Admin RRHH / Auditor"] --> FE["Frontend React + Vite (Puerto 5173)<br/>Login, Portal, Chat, Dashboard RRHH, Docs, Gobernanza"]
    FE -->|"HTTPS/REST + JWT Bearer"| API["Backend Express REST API (Puerto 4000)<br/>Helmet, CORS, Rate Limit, XSS/SQLi Guard"]

    API --> Auth["Auth & RBAC Middleware"]
    Auth --> LG["LangGraph.js StateGraph<br/>backend/src/agents/langgraphWorkflow.js"]

    LG --> AG1["Agente 1: Orquestador<br/>Clasificación y Síntesis Única"]
    AG1 -->|"Políticas"| AG2["Agente 2: Políticas RAG"]
    AG1 -->|"Expediente Propio (JWT)"| AG3["Agente 3: Datos Colaborador"]
    AG1 -->|"Analítica ADMIN_RRHH"| AG4["Agente 4: Analista de Reportes"]
    AG1 -->|"Bloqueos / Fuera de Alcance"| VAL["Agente Validador"]

    AG2 --> VAL
    AG3 --> VAL
    AG4 --> VAL
    VAL -->|"Sin Evidencia"| ESC["Escalamiento Humano<br/>escalaciones_rrhh"]
    VAL --> AG1

    AG2 --> QDR["Qdrant Vector Server Real v1.20.2 (6333)<br/>Colección 1024d Cosine + Ollama BGE-M3 (11434)"]
    AG2 --> DS["DeepSeek API<br/>https://api.deepseek.com (deepseek-flash)"]
    AG4 --> DS
    AG3 --> DB["MySQL 8/9: policybot_rrhh (3306)<br/>Sequelize ORM (15 Modelos Parametrizados)"]
    AG4 --> DB
    CRON["node-cron (07:00 America/Costa_Rica)"] --> AG4

    AG5["Agente 5: Ingesta y Sincronización"] --> GD["Google Drive API v3 (OAuth 2.0 / Carpeta Restringida)"]
    AG5 --> QDR
    AG5 --> DB
```

## Infraestructura Vectorial y Almacenamiento
- **Servidor Qdrant Real (v1.20.2):** Se ejecuta en el host local en `http://127.0.0.1:6333` (REST) y puerto `6334` (gRPC). También se incluye la receta reproducible en `docker-compose.yml` (`qdrant/qdrant:v1.20.2` con volumen persistente `qdrant_storage`).
- **Colección Vectorial:** `policybot_hr_docs` configurada con tamaño de vector `1024`, métrica de distancia `Cosine` y modelo `bge-m3:latest`.
- **Idempotencia y Sin Duplicados:** Cada fragmento se mapea a un UUID v4 determinista mediante RFC 4122 v4 derivado del `chunk_id`, impidiendo duplicaciones en reindexaciones continuas.
- **Desactivación de Fallback Silencioso:** `RAG_ALLOW_LOCAL_VECTOR_FALLBACK=false` asegura que en entornos de producción y auditoría formal todas las operaciones vectoriales consulten estrictamente el servidor Qdrant real.

## Flujo de Seguridad y Trazabilidad
1. **Autenticación:** El cliente envía credenciales a `POST /api/auth/login`; el backend verifica el hash `bcrypt` y firma un JWT con `usuarioId`, `colaboradorId`, `rol` y `permisos`.
2. **Aislamiento de Identidad:** Ni `GET /api/employee/me` ni `POST /api/chat/query` aceptan un `colaboradorId` proveniente del cuerpo o query de otro usuario; toda consulta personal se resuelve desde `req.user.colaboradorId`.
3. **Auditoría:** Todo acceso denegado (401/403), bloqueo de prompt injection, consulta RAG o generación de reporte queda registrado en `audit_logs`.
