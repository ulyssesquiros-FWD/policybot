# Especificación de Agentes — PolicyBot HR

| Agente | Archivo | Responsabilidad Principal | Restricciones |
|--------|---------|---------------------------|---------------|
| **Agente 1: Orquestador** | `backend/src/agents/orchestratorAgent.js` | Clasificar intención, bloquear inyecciones/terceros/gobernanza, coordinar grafo y emitir la única respuesta final al usuario. | No consulta directamente tablas de terceros ni inventa políticas. |
| **Agente 2: Políticas RAG** | `backend/src/agents/policiesRagAgent.js` | Recuperar fragmentos de Qdrant sobre umbral, exigir relevancia sustantiva y citar documento, código, sección, versión y enlace. | Prohibido responder sin evidencia documental; ante vacío, ofrece escalamiento. |
| **Agente 3: Datos Colaborador** | `backend/src/agents/employeeDataAgent.js` | Consultar en MySQL saldo de vacaciones, solicitudes, incapacidades y fechas del colaborador autenticado. | Usa exclusivamente `req.user.colaboradorId` del JWT; prohibido consultar otros empleados. |
| **Agente 4: Analista de Reportes** | `backend/src/agents/reportsAnalystAgent.js` | Ejecutar las 13 consultas SQL de agregación diaria y generar el resumen ejecutivo (3-5 frases) con DeepSeek sin alterar cifras. | Solo accesible para rol `ADMIN_RRHH` o proceso `node-cron`. |
| **Agente 5: Ingesta y Sincronización** | `backend/src/agents/ingestionSyncAgent.js` | Detectar cambios/eliminaciones en Drive o repositorio local, extraer texto, fragmentar (500-1000 tokens), vectorizar con BGE-M3 y actualizar `document_sync_state`. | Requiere rol `ADMIN_RRHH` para ejecución manual vía API. |
| **Agente Validador** | `backend/src/agents/validatorAgent.js` | Auditar respaldo de citas, aislamiento de terceros, coincidencia numérica SQL y las 6 reglas de gobernanza antes de entregar la respuesta. | Bloquea respuestas que fallen cualquier control. |
| **Escalamiento Humano** | `backend/src/agents/humanEscalationService.js` | Crear tickets `ESC-YYYY-XXXX` en `escalaciones_rrhh` cuando falta evidencia o lo pide el usuario. | Asignación automática a Dirección RRHH. |
