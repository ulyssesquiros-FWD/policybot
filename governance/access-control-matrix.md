# Matriz de Control de Acceso (RBAC)

| Recurso / Endpoint | Sin Token | `COLABORADOR` | `AUDITOR` | `ADMIN_RRHH` | Control Técnico |
|--------------------|-----------|---------------|-----------|--------------|-----------------|
| `POST /api/auth/login` | Permitido | Permitido | Permitido | Permitido | Rate limit + `bcrypt.compare` |
| `GET /api/employee/me` | 401 | **Solo datos propios (JWT)** | Solo datos propios | Solo datos propios | `authMiddleware` + bloqueo 403 si pasa otro ID |
| `POST /api/employee/requests` | 401 | Crear solicitud `PENDIENTE` | Crear propia | Crear propia | `authMiddleware` |
| `GET /api/employee/admin/requests` | 401 | **403 Denegado** | **403 Denegado** | Permitido | `requireRole('ADMIN_RRHH')` |
| `PATCH /api/employee/admin/requests/:id` | 401 | **403 Denegado** | **403 Denegado** | Aprobar/Rechazar humano | `requireRole('ADMIN_RRHH')` |
| `POST /api/chat/query` | 401 | Políticas + Datos propios | Políticas + Datos propios | Políticas + Propios + Reportes RRHH | `authMiddleware` + LangGraph guardrails |
| `GET /api/reports/latest` | 401 | **403 Denegado** | **403 Denegado** | Permitido | `requireRole('ADMIN_RRHH')` |
| `POST /api/reports/generate` | 401 | **403 Denegado** | **403 Denegado** | Permitido | `requireRole('ADMIN_RRHH')` |
| `GET /api/documents` | 401 | Lectura citas | Lectura | Lectura y gestión | `authMiddleware` |
| `GET /api/documents/drive/auth-url` | 401 | **403 Denegado** | **403 Denegado** | Genera URL + `state` | `requireRole('ADMIN_RRHH')` |
| `GET /api/documents/drive/callback` | Valida `state` | Valida `state` | Valida `state` | Completa OAuth si `state` válido | `state` 32B un solo uso (TTL 10m) ligado a `ADMIN_RRHH` |
| `POST /api/documents/drive/tokens` | 401 | **403 Bloqueado** | **403 Bloqueado** | **403 Bloqueado** | Deshabilitado permanentemente + auditoría |
| `POST /api/documents/drive/disconnect` | 401 | **403 Denegado** | **403 Denegado** | Revoca conexión | `requireRole('ADMIN_RRHH')` |
| `PATCH /api/documents/drive/folder` | 401 | **403 Denegado** | **403 Denegado** | Fija `folder_id` autorizado | `requireRole('ADMIN_RRHH')` |
| `POST /api/documents/drive/push-local` | 401 | **403 Denegado** | **403 Denegado** | Sube políticas a carpeta Drive | `requireRole('ADMIN_RRHH')` |
| `PUT /api/documents/:documentId` | 401 | **403 Denegado** | **403 Denegado** | Modifica documento en Drive + RAG | `requireRole('ADMIN_RRHH')` |
| `POST /api/documents/sync` / `ingest` | 401 | **403 Denegado** | **403 Denegado** | Permitido | `requireRole('ADMIN_RRHH')` |
| `GET /api/governance/summary` | 401 | **403 Denegado** | Solo lectura | Permitido | `requireRole('ADMIN_RRHH', 'AUDITOR')` |
