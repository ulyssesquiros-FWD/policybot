-- ============================================================================
-- PolicyBot HR - Esquema Completo de Base de Datos MySQL
-- Base de datos: policybot_rrhh
-- Motor: InnoDB | Charset: utf8mb4
-- ============================================================================

CREATE DATABASE IF NOT EXISTS policybot_rrhh
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE policybot_rrhh;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS google_drive_connections;
DROP TABLE IF EXISTS escalaciones_rrhh;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS document_sync_state;
DROP TABLE IF EXISTS reportes_diarios;
DROP TABLE IF EXISTS consultas_chat;
DROP TABLE IF EXISTS movimientos_personal;
DROP TABLE IF EXISTS incapacidades;
DROP TABLE IF EXISTS solicitudes;
DROP TABLE IF EXISTS saldos_vacaciones;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS colaboradores;
DROP TABLE IF EXISTS rol_permisos;
DROP TABLE IF EXISTS permisos;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. Roles del sistema
CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre ENUM('ADMIN_RRHH', 'COLABORADOR', 'AUDITOR') NOT NULL UNIQUE,
  descripcion VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Permisos granulares
CREATE TABLE permisos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(80) NOT NULL UNIQUE,
  modulo VARCHAR(60) NOT NULL,
  descripcion VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Relación Roles - Permisos
CREATE TABLE rol_permisos (
  rol_id INT NOT NULL,
  permiso_id INT NOT NULL,
  PRIMARY KEY (rol_id, permiso_id),
  CONSTRAINT fk_rp_rol FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_permiso FOREIGN KEY (permiso_id) REFERENCES permisos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Colaboradores (Datos maestros de RRHH)
CREATE TABLE colaboradores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo_empleado VARCHAR(20) NOT NULL UNIQUE,
  cedula VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  apellidos VARCHAR(120) NOT NULL,
  correo VARCHAR(150) NOT NULL UNIQUE,
  departamento VARCHAR(100) NOT NULL,
  puesto VARCHAR(120) NOT NULL,
  fecha_ingreso DATE NOT NULL,
  fecha_salida DATE NULL,
  salario_mensual DECIMAL(12, 2) NOT NULL CHECK (salario_mensual > 0),
  modalidad ENUM('PRESENCIAL', 'HIBRIDO', 'TELETRABAJO') NOT NULL DEFAULT 'HIBRIDO',
  jefe_directo_id INT NULL,
  estado ENUM('ACTIVO', 'INACTIVO', 'VACACIONES', 'INCAPACITADO') NOT NULL DEFAULT 'ACTIVO',
  fecha_cumpleanos DATE NOT NULL,
  proxima_evaluacion DATE NOT NULL,
  ultimo_score_desempeno DECIMAL(3, 2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_colab_depto (departamento),
  INDEX idx_colab_estado (estado),
  CONSTRAINT fk_colab_jefe FOREIGN KEY (jefe_directo_id) REFERENCES colaboradores(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Usuarios de autenticación (JWT + bcrypt)
CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  colaborador_id INT NOT NULL UNIQUE,
  rol_id INT NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  ultimo_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_usuario_rol (rol_id),
  CONSTRAINT fk_usuario_colab FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE,
  CONSTRAINT fk_usuario_rol FOREIGN KEY (rol_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Saldos de vacaciones
CREATE TABLE saldos_vacaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  colaborador_id INT NOT NULL UNIQUE,
  periodo VARCHAR(20) NOT NULL,
  dias_acumulados DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  dias_disfrutados DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  dias_disponibles DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  dias_vencidos DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  fecha_proximo_vencimiento DATE NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_saldo_disponibles (dias_disponibles),
  CONSTRAINT fk_saldo_colab FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Solicitudes de vacaciones, permisos, constancias y teletrabajo
CREATE TABLE solicitudes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  colaborador_id INT NOT NULL,
  tipo ENUM(
    'VACACIONES',
    'PERMISO_CON_GOCE',
    'PERMISO_SIN_GOCE',
    'LICENCIA_PATERNIDAD',
    'LICENCIA_DUELO',
    'CONSTANCIA_SALARIAL',
    'TELETRABAJO'
  ) NOT NULL,
  fecha_solicitud DATETIME NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  dias_solicitados DECIMAL(5, 2) NOT NULL DEFAULT 1.00,
  motivo VARCHAR(300) NOT NULL,
  estado ENUM('PENDIENTE', 'APROBADA', 'RECHAZADA') NOT NULL DEFAULT 'PENDIENTE',
  aprobador_id INT NULL,
  comentario_resolucion VARCHAR(300) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sol_colab_estado (colaborador_id, estado),
  INDEX idx_sol_estado_fecha (estado, fecha_solicitud),
  CONSTRAINT fk_sol_colab FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE,
  CONSTRAINT fk_sol_aprobador FOREIGN KEY (aprobador_id) REFERENCES colaboradores(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Incapacidades (CCSS / INS / Clínica Privada)
CREATE TABLE incapacidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  colaborador_id INT NOT NULL,
  entidad_emisora ENUM('CCSS', 'INS', 'CLINICA_PRIVADA') NOT NULL,
  numero_boleta VARCHAR(50) NOT NULL UNIQUE,
  tipo_incapacidad ENUM('ENFERMEDAD_COMUN', 'RIESGO_TRABAJO', 'MATERNIDAD') NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  dias_incapacidad INT NOT NULL CHECK (dias_incapacidad > 0),
  porcentaje_subsidio_patrono DECIMAL(5, 2) NOT NULL,
  porcentaje_subsidio_entidad DECIMAL(5, 2) NOT NULL,
  estado ENUM('ACTIVA', 'FINALIZADA') NOT NULL DEFAULT 'ACTIVA',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_incap_estado_fecha (estado, fecha_inicio),
  CONSTRAINT fk_incap_colab FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Movimientos de personal (Ingresos, salidas, ascensos, ajustes)
CREATE TABLE movimientos_personal (
  id INT AUTO_INCREMENT PRIMARY KEY,
  colaborador_id INT NOT NULL,
  tipo_movimiento ENUM(
    'INGRESO',
    'SALIDA_VOLUNTARIA',
    'DESPIDO_CON_RESPONSABILIDAD',
    'ASCENSO',
    'CAMBIO_DEPARTAMENTO',
    'AJUSTE_SALARIAL'
  ) NOT NULL,
  departamento_anterior VARCHAR(100) NULL,
  departamento_nuevo VARCHAR(100) NULL,
  puesto_anterior VARCHAR(120) NULL,
  puesto_nuevo VARCHAR(120) NULL,
  fecha_efectiva DATE NOT NULL,
  motivo VARCHAR(300) NOT NULL,
  autorizado_por VARCHAR(150) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mov_tipo_fecha (tipo_movimiento, fecha_efectiva),
  CONSTRAINT fk_mov_colab FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Historial de consultas al chatbot multiagente
CREATE TABLE consultas_chat (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  colaborador_id INT NOT NULL,
  sesion_id VARCHAR(80) NOT NULL,
  pregunta TEXT NOT NULL,
  intencion_clasificada VARCHAR(60) NOT NULL,
  tema_principal VARCHAR(100) NOT NULL,
  agente_primario VARCHAR(80) NOT NULL,
  agentes_invocados JSON NOT NULL,
  respuesta TEXT NOT NULL,
  citas_json JSON NULL,
  documentos_recuperados JSON NULL,
  confianza DECIMAL(4, 2) NOT NULL DEFAULT 0.00,
  resuelta_sin_escalamiento TINYINT(1) NOT NULL DEFAULT 1,
  escalada TINYINT(1) NOT NULL DEFAULT 0,
  latencia_ms INT NOT NULL DEFAULT 0,
  tokens_usados INT NOT NULL DEFAULT 0,
  validacion_aprobada TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_chat_sesion (sesion_id),
  INDEX idx_chat_tema (tema_principal),
  INDEX idx_chat_fecha (created_at),
  CONSTRAINT fk_chat_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_chat_colab FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Reportes diarios automatizados (node-cron 07:00 America/Costa_Rica)
CREATE TABLE reportes_diarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fecha_reporte DATE NOT NULL,
  generado_por ENUM('CRON_AUTOMATICO', 'MANUAL_RRHH', 'SEED_INICIAL') NOT NULL DEFAULT 'CRON_AUTOMATICO',
  metricas_json JSON NOT NULL,
  resumen_ejecutivo TEXT NOT NULL,
  modelo_ia VARCHAR(80) NOT NULL DEFAULT 'deepseek-flash',
  latencia_ms INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rep_fecha (fecha_reporte)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Bitácora de auditoría y gobernanza
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NULL,
  colaborador_id INT NULL,
  rol VARCHAR(40) NOT NULL,
  accion VARCHAR(120) NOT NULL,
  recurso VARCHAR(150) NOT NULL,
  agente_utilizado VARCHAR(80) NULL,
  documentos_recuperados JSON NULL,
  tiempo_respuesta_ms INT NOT NULL DEFAULT 0,
  resultado ENUM('EXITO', 'BLOQUEADO_SEGURIDAD', 'BLOQUEADO_GOBERNANZA', 'ESCALADO', 'ERROR') NOT NULL,
  detalle TEXT NULL,
  ip_address VARCHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_resultado (resultado),
  INDEX idx_audit_fecha (created_at),
  CONSTRAINT fk_audit_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  CONSTRAINT fk_audit_colab FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Estado de sincronización documental (Google Drive / Local -> Qdrant)
CREATE TABLE document_sync_state (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_id VARCHAR(80) NOT NULL UNIQUE,
  document_name VARCHAR(200) NOT NULL,
  codigo_documento VARCHAR(40) NOT NULL,
  version VARCHAR(20) NOT NULL,
  effective_date DATE NOT NULL,
  responsable VARCHAR(150) NOT NULL,
  drive_file_id VARCHAR(150) NULL,
  drive_url VARCHAR(500) NOT NULL,
  checksum_hash VARCHAR(128) NOT NULL,
  chunks_count INT NOT NULL DEFAULT 0,
  estado_indexacion ENUM('INDEXADO', 'PENDIENTE', 'ERROR', 'ELIMINADO') NOT NULL DEFAULT 'INDEXADO',
  origen ENUM('LOCAL_SEED', 'MANUAL_UPLOAD', 'GOOGLE_DRIVE') NOT NULL DEFAULT 'LOCAL_SEED',
  ultima_sincronizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Tickets de escalamiento humano a RRHH
CREATE TABLE escalaciones_rrhh (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_codigo VARCHAR(30) NOT NULL UNIQUE,
  consulta_id INT NULL,
  colaborador_id INT NOT NULL,
  pregunta_original TEXT NOT NULL,
  motivo_escalamiento VARCHAR(255) NOT NULL,
  categoria VARCHAR(80) NOT NULL DEFAULT 'CONSULTA_POLITICA',
  prioridad ENUM('BAJA', 'MEDIA', 'ALTA', 'CRITICA') NOT NULL DEFAULT 'MEDIA',
  estado ENUM('ABIERTO', 'EN_REVISION', 'RESUELTO') NOT NULL DEFAULT 'ABIERTO',
  asignado_a VARCHAR(150) NULL,
  respuesta_rrhh TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_esc_estado (estado),
  CONSTRAINT fk_esc_consulta FOREIGN KEY (consulta_id) REFERENCES consultas_chat(id) ON DELETE SET NULL,
  CONSTRAINT fk_esc_colab FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Conexiones seguras OAuth 2.0 de Google Drive (refresh token cifrado AES-256-GCM)
CREATE TABLE google_drive_connections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  connected_by INT NOT NULL,
  google_email VARCHAR(150) NULL,
  refresh_token_encrypted TEXT NULL,
  scopes VARCHAR(500) NOT NULL,
  folder_id VARCHAR(150) NULL,
  connection_status ENUM('CONNECTED', 'DISCONNECTED', 'ERROR', 'EXPIRED') NOT NULL DEFAULT 'DISCONNECTED',
  connected_at TIMESTAMP NULL,
  last_sync_at TIMESTAMP NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_gdc_status (connection_status),
  CONSTRAINT fk_gdc_user FOREIGN KEY (connected_by) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
