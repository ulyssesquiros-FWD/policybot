# Configuración de Google Drive API v3 (OAuth 2.0 y Service Account), Ollama y Qdrant

## 1. Configuración de Google Drive API v3 mediante OAuth 2.0 Web Client

El proyecto soporta autenticación segura mediante **OAuth 2.0 Web Client** con parámetro `state` criptográfico de un solo uso, scope `https://www.googleapis.com/auth/drive` (para lectura, subida y edición de documentos restringida exclusivamente a la carpeta autorizada), cifrado `AES-256-GCM` de tokens en MySQL (`google_drive_connections`) y restricción estricta a la carpeta autorizada (`GOOGLE_DRIVE_FOLDER_ID` o configurada desde el panel).

### Variables en `backend/.env` (Nunca versionar valores reales en Git):
```env
GOOGLE_CLIENT_ID=<TU_GOOGLE_OAUTH_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<TU_GOOGLE_OAUTH_CLIENT_SECRET>
GOOGLE_REDIRECT_URI=http://localhost:4000/api/documents/drive/callback
GOOGLE_TOKEN_ENCRYPTION_KEY=<CLAVE_HEX_64_CARACTERES_AES_256_GCM>
GOOGLE_DRIVE_FOLDER_ID=<ID_CARPETA_AUTORIZADA_RRHH>
```

### Pasos en Google Cloud Console:
1. En Google Cloud Console:
   - Habilite **Google Drive API**.
   - Diríjase a **APIs & Services > Credentials** y seleccione su cliente **OAuth 2.0 Web Client**.
   - En **Orígenes de JavaScript autorizados**, agregue:
     - `http://localhost:5173`
     - `http://localhost:4000`
   - En **URIs de redireccionamiento autorizados**, agregue:
     - `http://localhost:4000/api/documents/drive/callback`
   - Guarde los cambios.
2. En la aplicación PolicyBot HR:
   - Inicie sesión como Administrador de RRHH (`ana.mora@policybot.cr` / `AdminRRHH2026!`).
   - Diríjase a **Docs & RAG**.
   - Configure el **ID de la carpeta autorizada de Google Drive** (obligatorio antes de sincronizar).
   - Pulse **"Conectar / Autorizar Google Drive"** (genera un `state` criptográfico de un solo uso vinculado al administrador autenticado).
   - Acepte el permiso de solo lectura (`https://www.googleapis.com/auth/drive.readonly`).
   - El backend validará el `state`, intercambiará el `code`, obtendrá la identidad de la cuenta Google, cifrará el `refresh_token` con `AES-256-GCM` y lo guardará en la tabla MySQL `google_drive_connections`.

---

## 2. Configuración Opcional mediante Service Account
Si prefiere sincronizar con Service Account sin flujo de navegador:
1. Cree una Service Account en Google Cloud Console.
2. Comparta la carpeta de Drive de políticas con el correo de la Service Account (permiso Lector).
3. Configure en `backend/.env`:
```env
GOOGLE_DRIVE_FOLDER_ID=<FOLDER_ID>
GOOGLE_SERVICE_ACCOUNT_EMAIL=<service-account-email>
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

> **Modo Local Demostrable:** Si no se autoriza Google Drive o no existe conexión activa, el Agente 5 sincroniza automáticamente desde `database/policies/` y permite la ingesta manual controlada desde **Docs & RAG**.

---

## 3. Configuración de Ollama con BGE-M3 (Embeddings Locales)
1. Instale Ollama y descargue el modelo `bge-m3`:
```bash
ollama pull bge-m3
ollama serve
```
2. Configure en `backend/.env`:
```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=bge-m3
```

---

## 4. Levantamiento de MySQL y Qdrant con Docker Compose
```bash
docker compose up -d
```
Inicia **MySQL 8.4** (`3306`) y **Qdrant** (`6333`/`6334`). Si utiliza MySQL nativo en Windows, configure `DB_USER` y `DB_PASSWORD` en `backend/.env`.
