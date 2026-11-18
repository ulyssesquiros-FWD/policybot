# PolicyBot HR — Apple-Inspired Visual Redesign & Enterprise Experience
**Documento de Arquitectura de Diseño, Identidad de Marca y Validación Visual**  
*Fecha: 18 de Noviembre de 2026*  
*Versión: 3.0.0 Production Release*  
*Organización: TicoTech S.A. (San José, Costa Rica)*  
*Administrador Principal: Ulysses Quirós (Principal Administrator)*  

---

## 1. Dirección Creativa y Filosofía de Diseño

### 1.1 Concepto Rector: *"Human Resources. Reimagined with Intelligence."*
PolicyBot HR ha sido completamente transformado desde un panel administrativo convencional hacia una experiencia digital premium inspirada en los estándares editoriales, tipográficos y de interacción de **Apple.com**.

El objetivo central de este rediseño es elevar la percepción de la plataforma a la de un sistema operativo de inteligencia artificial corporativa de clase mundial. Cada pantalla abandona las plantillas SaaS saturadas de tarjetas policromáticas y adopta:
- **Espacio negativo generoso:** Amplitud visual que permite respirar a la información crítica.
- **Tipografía dominante y expresiva:** Jerarquía clara con titulares grandes, limpios y ligeros, utilizando **Inter** y la métrica de **SF Pro Display / SF Pro Text**.
- **Composiciones cinematográficas:** Fondos que alternan deliberadamente secciones en negro grafito profundo (`#101114`) y blanco puro (`#FFFFFF`) con transiciones suaves en gris claro (`#F5F5F7`).
- **Glassmorphism calibrado:** Barras de navegación flotantes y contenedores interactivos con desenfoque de fondo ultra-refinado (`backdrop-filter: blur(24px)`).
- **Micro-interacciones fluidas:** Animaciones sutiles potenciadas por `framer-motion` que responden al scroll y al cursor con desaceleraciones naturales de tipo Apple.

### 1.2 Paleta Cromática y Tokens de Diseño
La identidad visual se fundamenta en un sistema cromático sobrio y altamente tecnológico:

| Token / Color | Hexadecimal | Aplicación Principal |
| :--- | :--- | :--- |
| **Graphite Black** | `#101114` | Hero cinematográfico, Sidebar Pro, Footer, Burbujas de usuario |
| **Pure White** | `#FFFFFF` | Fondos de lienzo de día, tarjetas de agentes, modales de lectura |
| **Light Gray** | `#F5F5F7` | Contenedores secundarios, fondos de entrada, badges neutros |
| **Mid Gray** | `#86868B` | Subtítulos editoriales, etiquetas de metadatos, bordes suaves |
| **Tech Blue** | `#2878FF` | Botones de acción primaria, enlaces a Google Drive, nodos activos |
| **Deep Navy** | `#14233F` | Acentos de profundidad en degradados y grafos neuronales |
| **Emerald Green** | `#34C759` | Estado saludable, citas RAG verificadas, aprobación de solicitudes |
| **Amber Gold** | `#FF9500` | Alertas de escalamiento humano, estado pendiente de validación |
| **Crimson Red** | `#FF3B30` | Bloqueos de seguridad, riesgos críticos, rechazos de solicitud |

---

## 2. Identidad de Marca y Administrador Principal

### 2.1 Identidad de Marca Original (`BrandLogo.jsx`)
Se diseñó un isotipo geométrico vectorial original que sintetiza la misión de PolicyBot HR:
- Una curva orgánica que simboliza el **factor humano** y la gestión de personas.
- Un nodo neuronal interconectado que representa la **inteligencia artificial multiagente**.
- Un punto focal de pulso tecnológico en `#2878FF`.

El logotipo está vectorizado en SVG con soporte nativo para modos oscuro y claro, favicon web oficial para navegadores retina (`frontend/index.html`), y escalado proporcional (`sm`, `md`, `lg`, `xl`).

### 2.2 Perfil del Administrador Principal: **Ulysses Quirós**
La aplicación personaliza dinámicamente la experiencia ejecutiva en honor al Administrador Principal:

- **Nombre completo:** Ulysses Quirós
- **Cargo corporativo:** Principal Administrator
- **Organización:** TicoTech S.A.
- **Insignia de Avatar (Avatar Badge):** `UQ` (con gradiente azul tecnológico y tipografía condensada premium)
- **Saludo Dinámico en Encabezado:**
  > *"Welcome back, Ulysses."*  
  > *"Your organization, intelligently connected."*
- **Compatibilidad Técnica:** El colaborador ID `1` en MySQL (`policybot_rrhh.colaboradores`) y en el repositorio ORM Sequelize fue actualizado a `Ulysses Quirós`, manteniendo su correo de autenticación `ana.mora@policybot.cr` y contraseña `AdminRRHH2026!` para garantizar **100% de compatibilidad retrospectiva** con las suites de pruebas automatizadas y los scripts de seguridad.
- **Resolución Dinámica:** El nombre no está cableado en duro; la interfaz extrae el primer nombre (`user.nombreCompleto.split(' ')[0]`) y genera las iniciales (`UQ` para Ulysses Quirós, `CR` para Carlos Rojas), adaptándose elegantemente a cualquier sesión autenticada.

---

## 3. Arquitectura de Pantallas y Experiencia de Usuario

### 3.1 Página de Inicio Cinematográfica (`/` — `LandingPage.jsx`)
La raíz pública (`/`) ofrece una experiencia editorial inmersiva dividida en seis actos narrativos:

1. **Hero Cinematográfico:** Titular a escala máxima (*"El futuro de Recursos Humanos ya está aquí."*), subtítulo sobre orquestación de IA y botones de acción ("Explorar la Plataforma", "Iniciar Sesión").
2. **Una Nueva Experiencia:** Manifiesto editorial sobre la transición desde silos documentales hacia un organismo corporativo interconectado.
3. **Inteligencia Multiagente con Propósito:**
   - Explorador interactivo de las 7 capacidades centrales: Orquestación LangGraph, RAG con Citas de Google Drive, Privacidad de Datos en MySQL, Analítica Predictiva, Ingesta Automatizada, Guardrails de Gobernanza y Escalamiento Humano.
   - Grafo de red neuronal SVG animado con nodos interconectados y pulsos de datos en tiempo real.
4. **Conocimiento Conectado en Tiempo Real:** Pipeline visual interactivo de 4 etapas:
   $$\text{Google Drive API v3} \longrightarrow \text{Embeddings BGE-M3 (1024d)} \longrightarrow \text{Qdrant Vector Server} \longrightarrow \text{DeepSeek-V3 LLM}$$
5. **Datos que Generan Claridad:** Explorador en vivo de métricas organizacionales con pestañas interactivas para Vacaciones (saldos, días acumulados), Solicitudes (estados, aprobaciones), Ausencias (incapacidades CCSS) y Rotación (tasa del 3.6%).
6. **Seguridad, Confianza y Cierre:** Cuatro pilares de gobernanza (Zero Hallucination, Aislamiento RBAC, Human-in-the-Loop, Trazabilidad Inmutable) seguidos de una llamada a la acción cinematográfica y pie de página corporativo de TicoTech S.A.

### 3.2 Acceso Cinematográfico (`/login` — `Login.jsx`)
- **Diseño Split-Screen:** Mitad izquierda con fotografía arquitectónica de alto contraste, cita inspiradora y logo luminoso; mitad derecha con formulario limpio en fondo blanco puro.
- **Carga de Credenciales Demo en 1 Clic:**
  - Botón premium para cargar credenciales de **Ulysses Quirós (Principal Administrator)**.
  - Botón secundario para cargar credenciales de **Carlos Rojas (Colaborador)**.
- **Manejo de Errores Suave:** Indicadores de validación animados sin recarga de página.

### 3.3 Consola Ejecutiva de RRHH (`/hr-admin` — `HrAdminDashboard.jsx`)
- **Cifras de Gran Escala:** Números KPI monumentales (`kpi-big-number`) para Colaboradores Activos (55), Solicitudes Pendientes (8) y Escalamientos Prioritarios (2).
- **Gráficos Minimalistas:** Distribución departamental y tendencias de ausentismo con paleta monocromática refinada.
- **Aprobaciones Humanas (Human-in-the-Loop):** Tabla de solicitudes con botones de acción directa ("Aprobar", "Rechazar") que actualizan el saldo en MySQL en tiempo real.
- **Resolutor de Escalamientos:** Tarjetas de tickets humanos generados por consultas complejas del chat, permitiendo a Ulysses Quirós resolverlos y dejar notas de auditoría.

### 3.4 Espacio del Colaborador (`/dashboard` — `EmployeeDashboard.jsx`)
- **Santuario Personal:** Visualización limpia y sin distracciones.
- **Contador Monumental de Vacaciones:** Indicador destacado (`16.00 días disponibles`), barra de progreso hacia el tope legal de 20 días y desglose legal según el Código de Trabajo de Costa Rica.
- **Modal de Solicitud de Vacaciones:** Interfaz modal simplificada para registrar solicitudes respetando el saldo máximo disponible.

### 3.5 Intelligence Studio (`/chat` — `SmartChat.jsx`)
- **Lienzo Tipo Estudio:** Panel lateral de historial de consultas con filtrado temático y área principal de conversación espaciosa.
- **Burbujas Asimétricas:**
  - Mensajes del usuario en cápsulas de negro grafito (`#101114`) con texto blanco y sombras suaves.
  - Mensajes de PolicyBot en tarjetas blancas inmaculadas con borde microfino, insignias de agentes, indicador de nivel de confianza (`ALTA` / `MEDIA` / `BAJA`) y tiempo de respuesta en milisegundos.
- **Citas Documentales Interactivas (`CitationBadge.jsx`):**
  - Muestra el código de la política (`POL-VAC-001`), versión, porcentaje de relevancia semántica (`92% match`) y fragmento exacto.
  - Botón para inspeccionar el fragmento en un modal de lectura limpio.
  - Enlace directo a Google Drive (`https://drive.google.com/file/d/.../view`) para auditar el archivo original en la nube.
- **Barra de Entrada Flotante:** Entrada redondeada con desenfoque de fondo (`backdrop-filter`) y botón de envío circular que pulsa sutilmente durante la orquestación multiagente.

### 3.6 Catálogo de Políticas & Google Drive Hub (`/documents` — `DocumentAdmin.jsx`)
- **Hub de Conexión Google Drive OAuth 2.0:**
  - Tarjeta de conexión perimetral mostrando la cuenta autorizada (`ulyssesquiros@gmail.com`), estado de conexión (`CONNECTED`), modo de permisos (`Lectura + Subida/Edición`) y carpeta asignada (`1ZGIZtMz7Keh_5jUNvycwyHtJiizsZJhV`).
  - Botones de acción para reconectar, sincronizar con el repositorio o subir las 10 políticas a Drive con un solo clic.
- **Catálogo Editorial:** Tabla con estilo Apple para los 10 documentos normativos, indicando código, versión, vigencia, fragmentos indexados, estado RAG y enlaces a Drive.
- **Subida & Ingesta RAG:** Formulario flotante para incorporar nuevas políticas en formato Markdown o subir archivos (`.md`, `.txt`, `.pdf`).
- **Prueba Semántica en Vivo:** Buscador interactivo para evaluar los puntajes de similitud del servidor Qdrant con BGE-M3.

### 3.7 Centro de Gobernanza, Seguridad & Auditoría (`/governance` — `GovernanceAudit.jsx`)
- **Estado de Salud del Sistema:** Tarjetas de telemetría para MySQL (ORM Sequelize), DeepSeek-V3 (tokens consumidos y endpoint), Qdrant Server (v1.20 en puerto 6333) y Google Drive API.
- **6 Reglas Irrenunciables:** Tarjetas estructuradas con el principio de Human-in-the-Loop, aislamiento de datos, no-alucinación y trazabilidad.
- **Inventario Multiagente & Prompts:** Tablas de agentes LangGraph y registro formal de versiones de prompts de sistema.
- **Matriz de Riesgos:** Registro de amenazas de IA y privacidad con severidades codificadas por color.
- **Bitácora Inmutable en Tiempo Real:** Tabla con eventos de auditoría, latencia en ms, usuario/rol, agente invocado y filtros dinámicos por resultado (`EXITO`, `BLOQUEADO_SEGURIDAD`, `ESCALADO`).

---

## 4. Verificación Técnica y Resultados de Pruebas

Toda la reestructuración visual se ejecutó preservando el 100% de la lógica de negocio, los esquemas de base de datos relacionales, los endpoints REST y los contratos de seguridad.

### 4.1 Resultados de las Suites de Pruebas Automatizadas

| Suite de Validación | Comando Ejecutado | Resultado | Estado |
| :--- | :--- | :---: | :---: |
| **Backend & Integración E2E** | `node tests/run_all_tests.js` | **16 / 16** | ✅ APROBADO (100%) |
| **Seguridad & Hardening Google Drive** | `node tests/drive_hardening_tests.js` | **6 / 6** | ✅ APROBADO (100%) |
| **Qdrant Server Real (1024d)** | `node tests/qdrant_live_tests.js` | **7 / 7** | ✅ APROBADO (100%) |
| **Frontend Production Build** | `npm --prefix frontend run build` | **0 Errores** | ✅ APROBADO (10.35s) |

### 4.2 Verificación de Servicios Reales Activos
- **DeepSeek API:** Conexión real con modelo `deepseek-chat` (DeepSeek-V3), respuesta HTTP exitosa y cuotas activas.
- **MySQL Database:** Conexión real con Sequelize ORM a la base de datos `policybot_rrhh` en `localhost:3306`. 14 tablas relacionales, 55 colaboradores simulados, 0 consultas SQL crudas en el código.
- **Google Drive API v3:** OAuth 2.0 perimetral restringido a la carpeta autorizada de Ulysses Quirós (`1ZGIZtMz7Keh_5jUNvycwyHtJiizsZJhV`). Tokens cifrados con AES-256-GCM en MySQL.
- **Qdrant Vector Server:** Servidor binario nativo oficial v1.20.2 ejecutándose en `127.0.0.1:6333` con 47 puntos vectoriales indexados en la colección `policybot_hr_docs` a 1024 dimensiones (Cosina).
- **Ollama BGE-M3:** Vectorizador multilingüe denso real de 1024 dimensiones sin fallback local determinista.

---

## 5. Conclusión y Entrega Definitiva

El rediseño de **PolicyBot HR** entrega una solución de vanguardia que cumple rigurosamente con la visión estética inspirada en Apple: sobriedad, tipografía expresiva, interacción fluida y máxima jerarquía visual. La identidad ejecutiva de **Ulysses Quirós** preside con elegancia la plataforma de **TicoTech S.A.**, respaldada por una arquitectura de inteligencia artificial auditable, segura y matemáticamente sólida.
