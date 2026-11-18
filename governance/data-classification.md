# Clasificación de Datos y Retención (Ley N° 8968 de Costa Rica)

| Nivel de Clasificación | Ejemplos en `policybot_rrhh` | Regla de Acceso y Minimización | Tiempo de Retención Documentado |
|------------------------|------------------------------|--------------------------------|---------------------------------|
| **Público / General** | Legislación laboral citada en políticas, calendario oficial de feriados | Disponible en respuestas RAG con cita verificable. | Permanente (versionado). |
| **Interno** | 10 documentos de políticas corporativas, `document_sync_state`, `reportes_diarios` agregados | Políticas accesibles por colaboradores autenticados; reportes agregados solo `ADMIN_RRHH`. | Políticas: vigente + 5 años histórico. Reportes diarios: 24 meses. |
| **Confidencial** | `colaboradores.salario_mensual`, `cedula`, `saldos_vacaciones`, `movimientos_personal`, `ultimo_score_desempeno` | **Minimización:** `getCollaboratorCompleteProfile` excluye `salario_mensual` en consultas generales; cada colaborador solo accede a su propio registro vía JWT. | Expediente activo + 10 años tras salida (Art. 602 Código de Trabajo / obligaciones tributarias). |
| **Sensible (Art. 3 Ley 8968)** | `incapacidades` (detalles médicos), `escalaciones_rrhh` por casos de salud o acoso | Prohibido almacenar diagnósticos clínicos específicos en `incapacidades`; solo entidad emisora (`CCSS`/`INS`), número de boleta y fechas. | 5 años en acceso restringido RRHH/Salud Ocupacional. |
| **Credenciales OAuth Delegadas** | `google_drive_connections.refresh_token_encrypted` | Cifrado obligatorio en reposo con **AES-256-GCM** (`GOOGLE_TOKEN_ENCRYPTION_KEY`), nunca devuelto por API ni en logs. | Hasta revocación/desconexión manual por `ADMIN_RRHH` (borrado inmediato al desconectar). |
| **Auditoría y Trazabilidad** | `audit_logs`, `consultas_chat` | Inmutable desde la aplicación; lectura exclusiva `ADMIN_RRHH` y `AUDITOR`. | 36 meses mínimo. |
