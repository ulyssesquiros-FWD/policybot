# Prompt Registry: Agente Validador (v1.0)

- **Agente:** Agente Validador
- **Versión:** v1.0
- **Archivo fuente:** `backend/src/agents/validatorAgent.js`

## Controles Ejecutados
1. `respaldo_documental_citas`: Exige al menos 1 cita verificable cuando la respuesta RAG afirma políticas vigentes.
2. `aislamiento_datos_terceros`: Valida que `colaboradorId` consultado coincida 1:1 con `userContext.colaboradorId`.
3. `fidelidad_numerica_sql_personal` / `reportes`: Asegura coincidencia exacta con las consultas SQL previas.
4. `reglas_gobernanza_ia`: Bloquea cualquier texto que simule aprobar vacaciones, despedir, sancionar o cambiar salarios.
