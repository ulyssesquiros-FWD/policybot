# PolicyBot HR — Portal de Políticas de RRHH con RAG Multiagente

Portal corporativo inteligente de Recursos Humanos para **TicoTech S.A. (Costa Rica)** construido con **React + Vite**, **Node.js + Express**, **LangGraph.js**, **DeepSeek (`deepseek-flash`)**, **MySQL (`policybot_rrhh`)**, **Qdrant**, **Ollama (`bge-m3`)**, **Google Drive API v3** y **node-cron**.

---

## Estructura del Proyecto

```text
├── frontend/       # Aplicación React + Vite (6 pantallas completas + Recharts)
├── backend/        # API REST Express, JWT, Seguridad, LangGraph.js y los 6 Agentes
├── database/       # schema.sql, migraciones, seeders (55 colaboradores) y 10 políticas CR
├── governance/     # ADRs, inventario, matriz de riesgos, RBAC, prompts y evaluación 45 preguntas
├── docs/           # Arquitectura, guía de agentes, informe técnico y setup de Drive/Ollama
└── tests/          # Suite automatizada de seguridad, RBAC, RAG, reportes y gobernanza
```

---

## Requisitos Previos

- **Node.js** v20+ (probado en `v22.18.0`) y **npm**
- **MySQL 8.x / 9.x** (o Docker Compose incluido)
- *(Opcionales para integraciones externas en vivo)*:
  - **DEEPSEEK_API_KEY** para generación en vivo con `deepseek-flash`
  - **Qdrant** (`localhost:6333`) y **Ollama** (`ollama pull bge-m3`)
  - **Google Drive API v3** (Service Account en Google Cloud Console)

> **Continuidad Local:** Si alguna integración externa (`DEEPSEEK_API_KEY`, MySQL local sin contraseña configurada, Qdrant, Ollama o Google Drive) no está configurada aún en el entorno de demostración, el sistema registra explícitamente el estado real en `/api/health` y en **Gobernanza y Auditoría**, activando espejos locales verificables para que la aplicación funcione íntegramente sin simular conexiones externas falsas.

---

## Instalación y Configuración

### 1. Clonar / Preparar variables de entorno
Copie `.env.example` a `backend/.env` (ya incluido configurado para desarrollo local) y complete las claves externas que desee habilitar:
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password_mysql
DB_NAME=policybot_rrhh

DEEPSEEK_API_KEY=sk-tu-api-key-deepseek
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-flash
```

### 2. Levantar MySQL, Qdrant y Ollama

**Qdrant Vector Server (v1.20.2):**
- **Opción Docker Compose:**
  ```bash
  docker compose up -d
  ```
  Inicia el contenedor `policybot-qdrant` con la imagen oficial `qdrant/qdrant:v1.20.2`, exponiendo los puertos `127.0.0.1:6333` (HTTP/REST) y `127.0.0.1:6334` (gRPC) con volumen persistente `qdrant_storage`.
- **Opción Binario Nativo Windows:**
  Si no dispone de Docker o WSL2 en Windows:
  ```powershell
  cd qdrant_server
  .\qdrant.exe
  ```
  Inicia inmediatamente el servidor oficial nativo escuchando en `http://127.0.0.1:6333`.

**Ollama Embeddings (BGE-M3 1024d):**
```bash
ollama pull bge-m3
```

**MySQL (8.x / 9.x):**
Si usa MySQL nativo en Windows, inicie el servicio y verifique las credenciales en `backend/.env`.

### 3. Instalar dependencias
```bash
cd backend
npm install
cd ../frontend
npm install
```

### 4. Poblar la Base de Datos e Indexar las 10 Políticas
Desde la raíz del proyecto:
```bash
node database/seeders/seed.js
```
Esto crea las 14 tablas, **55 colaboradores ficticios**, **3 meses de movimientos**, saldos de vacaciones, solicitudes, incapacidades, indexa las **10 políticas laborales de Costa Rica** y genera los reportes iniciales.

---

## Ejecución del Proyecto

Abra dos terminales en la raíz del proyecto:

**Terminal 1 — Backend API & Multiagente (Puerto 4000):**
```bash
cd backend
npm start
```

**Terminal 2 — Frontend React (Puerto 5173):**
```bash
cd frontend
npm run dev
```

Acceda en el navegador a: **http://localhost:5173**

---

## Usuarios de Demostración

| Rol | Usuario / Cargo | Correo | Contraseña | Capacidades |
|-----|-----------------|--------|------------|-------------|
| **ADMIN_RRHH** | **Ulysses Quirós** (Principal Administrator) | `ana.mora@policybot.cr` | `AdminRRHH2026!` | Acceso total: Dashboard RRHH (14 KPIs), aprobar/rechazar solicitudes, resolver escalamientos, generar reportes, sincronizar Google Drive, catálogo de políticas, gobernanza y chat analítico. |
| **COLABORADOR** | **Carlos Rojas** (Senior Developer) | `carlos.rojas@policybot.cr` | `Colab2026!` | Portal personal santuario (16 días de vacaciones), crear solicitudes pendientes, chat RAG de políticas y datos propios. Bloqueado de datos de terceros y módulos admin. |
| **AUDITOR** | **Roberto Castillo** (Auditor de Cumplimiento) | `roberto.castillo@policybot.cr` | `Auditor2026!` | Solo lectura de Gobernanza, matriz de riesgos y bitácora `audit_logs`. |

---

## Pruebas y Evaluación Automatizada

```bash
# 1. Pruebas de integración con Servidor Qdrant Real (1024d Cosine) (7 pruebas)
node tests/qdrant_live_tests.js

# 2. Pruebas de seguridad y hardening Google Drive OAuth (6 pruebas)
node tests/drive_hardening_tests.js

# 3. Suite integral de seguridad, RBAC, agentes, RAG y reportes (16 pruebas)
node tests/run_all_tests.js

# 4. Evaluación automatizada del banco de 45 preguntas (25 enunciado + 20 propias)
node governance/evaluations/run_evaluation.js

# 5. Compilación de producción del frontend
cd frontend && npm run build
```

Consulte la documentación detallada en:
- [docs/apple_inspired_visual_redesign.md](docs/apple_inspired_visual_redesign.md)
- [docs/final_validation_report.md](docs/final_validation_report.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/agents_guide.md](docs/agents_guide.md)
- [docs/google_drive_setup.md](docs/google_drive_setup.md)
- [docs/technical_report.md](docs/technical_report.md)
- [governance/README.md](governance/README.md)
- [governance/evaluations/evaluation_results.md](governance/evaluations/evaluation_results.md)
