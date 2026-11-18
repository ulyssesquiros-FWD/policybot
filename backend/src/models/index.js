const { Sequelize, DataTypes, Op } = require('sequelize');
const config = require('../config/env');

const sequelize = new Sequelize(config.db.database, config.db.user, config.db.password, {
  host: config.db.host,
  port: config.db.port,
  dialect: 'mysql',
  logging: false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  }
});

// 1. Rol
const Role = sequelize.define('Role', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.ENUM('ADMIN_RRHH', 'COLABORADOR', 'AUDITOR'), allowNull: false, unique: true },
  descripcion: { type: DataTypes.STRING(255), allowNull: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'roles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// 2. Permiso
const Permission = sequelize.define('Permission', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  codigo: { type: DataTypes.STRING(80), allowNull: false, unique: true },
  modulo: { type: DataTypes.STRING(60), allowNull: false },
  descripcion: { type: DataTypes.STRING(255), allowNull: false }
}, {
  tableName: 'permisos',
  timestamps: false
});

// 3. RolPermiso
const RolePermission = sequelize.define('RolePermission', {
  rol_id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
  permiso_id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false }
}, {
  tableName: 'rol_permisos',
  timestamps: false
});

// 4. Colaborador
const Collaborator = sequelize.define('Collaborator', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  codigo_empleado: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  cedula: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  apellidos: { type: DataTypes.STRING(120), allowNull: false },
  correo: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  departamento: { type: DataTypes.STRING(100), allowNull: false },
  puesto: { type: DataTypes.STRING(120), allowNull: false },
  fecha_ingreso: { type: DataTypes.DATEONLY, allowNull: false },
  fecha_salida: { type: DataTypes.DATEONLY, allowNull: true },
  salario_mensual: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  modalidad: { type: DataTypes.ENUM('PRESENCIAL', 'HIBRIDO', 'TELETRABAJO'), allowNull: false, defaultValue: 'HIBRIDO' },
  jefe_directo_id: { type: DataTypes.INTEGER, allowNull: true },
  estado: { type: DataTypes.ENUM('ACTIVO', 'INACTIVO', 'VACACIONES', 'INCAPACITADO'), allowNull: false, defaultValue: 'ACTIVO' },
  fecha_cumpleanos: { type: DataTypes.DATEONLY, allowNull: false },
  proxima_evaluacion: { type: DataTypes.DATEONLY, allowNull: false },
  ultimo_score_desempeno: { type: DataTypes.DECIMAL(3, 2), allowNull: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'colaboradores',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// 5. Usuario
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  rol_id: { type: DataTypes.INTEGER, allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  ultimo_login: { type: DataTypes.DATE, allowNull: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'usuarios',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// 6. SaldoVacaciones
const VacationBalance = sequelize.define('VacationBalance', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  periodo: { type: DataTypes.STRING(20), allowNull: false },
  dias_acumulados: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0.00 },
  dias_disfrutados: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0.00 },
  dias_disponibles: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0.00 },
  dias_vencidos: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0.00 },
  fecha_proximo_vencimiento: { type: DataTypes.DATEONLY, allowNull: true },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'saldos_vacaciones',
  timestamps: true,
  createdAt: false,
  updatedAt: 'updated_at'
});

// 7. Solicitud
const Request = sequelize.define('Request', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: false },
  tipo: {
    type: DataTypes.ENUM(
      'VACACIONES',
      'PERMISO_CON_GOCE',
      'PERMISO_SIN_GOCE',
      'LICENCIA_PATERNIDAD',
      'LICENCIA_DUELO',
      'CONSTANCIA_SALARIAL',
      'TELETRABAJO'
    ),
    allowNull: false
  },
  fecha_solicitud: { type: DataTypes.DATE, allowNull: false },
  fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false },
  fecha_fin: { type: DataTypes.DATEONLY, allowNull: false },
  dias_solicitados: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 1.00 },
  motivo: { type: DataTypes.STRING(300), allowNull: false },
  estado: { type: DataTypes.ENUM('PENDIENTE', 'APROBADA', 'RECHAZADA'), allowNull: false, defaultValue: 'PENDIENTE' },
  aprobador_id: { type: DataTypes.INTEGER, allowNull: true },
  comentario_resolucion: { type: DataTypes.STRING(300), allowNull: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'solicitudes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// 8. Incapacidad
const Disability = sequelize.define('Disability', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: false },
  entidad_emisora: { type: DataTypes.ENUM('CCSS', 'INS', 'CLINICA_PRIVADA'), allowNull: false },
  numero_boleta: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  tipo_incapacidad: { type: DataTypes.ENUM('ENFERMEDAD_COMUN', 'RIESGO_TRABAJO', 'MATERNIDAD'), allowNull: false },
  fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false },
  fecha_fin: { type: DataTypes.DATEONLY, allowNull: false },
  dias_incapacidad: { type: DataTypes.INTEGER, allowNull: false },
  porcentaje_subsidio_patrono: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  porcentaje_subsidio_entidad: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  estado: { type: DataTypes.ENUM('ACTIVA', 'FINALIZADA'), allowNull: false, defaultValue: 'ACTIVA' },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'incapacidades',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// 9. MovimientoPersonal
const PersonnelMovement = sequelize.define('PersonnelMovement', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: false },
  tipo_movimiento: {
    type: DataTypes.ENUM(
      'INGRESO',
      'SALIDA_VOLUNTARIA',
      'DESPIDO_CON_RESPONSABILIDAD',
      'ASCENSO',
      'CAMBIO_DEPARTAMENTO',
      'AJUSTE_SALARIAL'
    ),
    allowNull: false
  },
  departamento_anterior: { type: DataTypes.STRING(100), allowNull: true },
  departamento_nuevo: { type: DataTypes.STRING(100), allowNull: true },
  puesto_anterior: { type: DataTypes.STRING(120), allowNull: true },
  puesto_nuevo: { type: DataTypes.STRING(120), allowNull: true },
  fecha_efectiva: { type: DataTypes.DATEONLY, allowNull: false },
  motivo: { type: DataTypes.STRING(300), allowNull: false },
  autorizado_por: { type: DataTypes.STRING(150), allowNull: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'movimientos_personal',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// 10. ConsultaChat
const ChatConsultation = sequelize.define('ChatConsultation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: false },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: false },
  sesion_id: { type: DataTypes.STRING(80), allowNull: false },
  pregunta: { type: DataTypes.TEXT, allowNull: false },
  intencion_clasificada: { type: DataTypes.STRING(60), allowNull: false },
  tema_principal: { type: DataTypes.STRING(100), allowNull: false },
  agente_primario: { type: DataTypes.STRING(80), allowNull: false },
  agentes_invocados: { type: DataTypes.JSON, allowNull: false },
  respuesta: { type: DataTypes.TEXT, allowNull: false },
  citas_json: { type: DataTypes.JSON, allowNull: true },
  documentos_recuperados: { type: DataTypes.JSON, allowNull: true },
  confianza: { type: DataTypes.DECIMAL(4, 2), allowNull: false, defaultValue: 0.00 },
  resuelta_sin_escalamiento: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  escalada: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  latencia_ms: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  tokens_usados: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  validacion_aprobada: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'consultas_chat',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// 11. ReporteDiario
const DailyReport = sequelize.define('DailyReport', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  fecha_reporte: { type: DataTypes.DATEONLY, allowNull: false },
  generado_por: { type: DataTypes.ENUM('CRON_AUTOMATICO', 'MANUAL_RRHH', 'SEED_INICIAL'), allowNull: false, defaultValue: 'CRON_AUTOMATICO' },
  metricas_json: { type: DataTypes.JSON, allowNull: false },
  resumen_ejecutivo: { type: DataTypes.TEXT, allowNull: false },
  modelo_ia: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'deepseek-flash' },
  latencia_ms: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'reportes_diarios',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// 12. AuditLog
const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
  rol: { type: DataTypes.STRING(40), allowNull: false },
  accion: { type: DataTypes.STRING(120), allowNull: false },
  recurso: { type: DataTypes.STRING(150), allowNull: false },
  agente_utilizado: { type: DataTypes.STRING(80), allowNull: true },
  documentos_recuperados: { type: DataTypes.JSON, allowNull: true },
  tiempo_respuesta_ms: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  resultado: { type: DataTypes.ENUM('EXITO', 'BLOQUEADO_SEGURIDAD', 'BLOQUEADO_GOBERNANZA', 'ESCALADO', 'ERROR'), allowNull: false },
  detalle: { type: DataTypes.TEXT, allowNull: true },
  ip_address: { type: DataTypes.STRING(64), allowNull: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'audit_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// 13. DocumentSyncState
const DocumentSyncState = sequelize.define('DocumentSyncState', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  document_id: { type: DataTypes.STRING(80), allowNull: false, unique: true },
  document_name: { type: DataTypes.STRING(200), allowNull: false },
  codigo_documento: { type: DataTypes.STRING(40), allowNull: false },
  version: { type: DataTypes.STRING(20), allowNull: false },
  effective_date: { type: DataTypes.DATEONLY, allowNull: false },
  responsable: { type: DataTypes.STRING(150), allowNull: false },
  drive_file_id: { type: DataTypes.STRING(150), allowNull: true },
  drive_url: { type: DataTypes.STRING(500), allowNull: false },
  checksum_hash: { type: DataTypes.STRING(128), allowNull: false },
  chunks_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  estado_indexacion: { type: DataTypes.ENUM('INDEXADO', 'PENDIENTE', 'ERROR', 'ELIMINADO'), allowNull: false, defaultValue: 'INDEXADO' },
  origen: { type: DataTypes.ENUM('LOCAL_SEED', 'MANUAL_UPLOAD', 'GOOGLE_DRIVE'), allowNull: false, defaultValue: 'LOCAL_SEED' },
  ultima_sincronizacion: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'document_sync_state',
  timestamps: true,
  createdAt: 'ultima_sincronizacion',
  updatedAt: 'updated_at'
});

// 14. EscalacionRrhh
const HumanEscalation = sequelize.define('HumanEscalation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ticket_codigo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  consulta_id: { type: DataTypes.INTEGER, allowNull: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: false },
  pregunta_original: { type: DataTypes.TEXT, allowNull: false },
  motivo_escalamiento: { type: DataTypes.STRING(255), allowNull: false },
  categoria: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'CONSULTA_POLITICA' },
  prioridad: { type: DataTypes.ENUM('BAJA', 'MEDIA', 'ALTA', 'CRITICA'), allowNull: false, defaultValue: 'MEDIA' },
  estado: { type: DataTypes.ENUM('ABIERTO', 'EN_REVISION', 'RESUELTO'), allowNull: false, defaultValue: 'ABIERTO' },
  asignado_a: { type: DataTypes.STRING(150), allowNull: true },
  respuesta_rrhh: { type: DataTypes.TEXT, allowNull: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'escalaciones_rrhh',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 15. GoogleDriveConnection
const GoogleDriveConnection = sequelize.define('GoogleDriveConnection', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  connected_by: { type: DataTypes.INTEGER, allowNull: false },
  google_email: { type: DataTypes.STRING(150), allowNull: true },
  refresh_token_encrypted: { type: DataTypes.TEXT, allowNull: true },
  scopes: { type: DataTypes.STRING(500), allowNull: false },
  folder_id: { type: DataTypes.STRING(150), allowNull: true },
  connection_status: { type: DataTypes.ENUM('CONNECTED', 'DISCONNECTED', 'ERROR', 'EXPIRED'), allowNull: false, defaultValue: 'DISCONNECTED' },
  connected_at: { type: DataTypes.DATE, allowNull: true },
  last_sync_at: { type: DataTypes.DATE, allowNull: true },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'google_drive_connections',
  timestamps: true,
  createdAt: false,
  updatedAt: 'updated_at'
});

// --- Relaciones y Asociaciones ORM ---
User.belongsTo(Role, { foreignKey: 'rol_id', as: 'rol' });
Role.hasMany(User, { foreignKey: 'rol_id', as: 'usuarios' });

User.belongsTo(Collaborator, { foreignKey: 'colaborador_id', as: 'colaborador' });
Collaborator.hasOne(User, { foreignKey: 'colaborador_id', as: 'usuario' });

Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'rol_id', otherKey: 'permiso_id', as: 'permisos' });
Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'permiso_id', otherKey: 'rol_id', as: 'roles' });

Collaborator.hasOne(VacationBalance, { foreignKey: 'colaborador_id', as: 'saldoVacaciones' });
VacationBalance.belongsTo(Collaborator, { foreignKey: 'colaborador_id', as: 'colaborador' });

Collaborator.hasMany(Request, { foreignKey: 'colaborador_id', as: 'solicitudes' });
Request.belongsTo(Collaborator, { foreignKey: 'colaborador_id', as: 'colaborador' });

Collaborator.hasMany(Disability, { foreignKey: 'colaborador_id', as: 'incapacidades' });
Disability.belongsTo(Collaborator, { foreignKey: 'colaborador_id', as: 'colaborador' });

Collaborator.hasMany(PersonnelMovement, { foreignKey: 'colaborador_id', as: 'movimientos' });
PersonnelMovement.belongsTo(Collaborator, { foreignKey: 'colaborador_id', as: 'colaborador' });

Collaborator.belongsTo(Collaborator, { foreignKey: 'jefe_directo_id', as: 'jefeDirecto' });

User.hasMany(ChatConsultation, { foreignKey: 'usuario_id', as: 'consultasChat' });
ChatConsultation.belongsTo(User, { foreignKey: 'usuario_id', as: 'usuario' });

Collaborator.hasMany(ChatConsultation, { foreignKey: 'colaborador_id', as: 'consultasChat' });
ChatConsultation.belongsTo(Collaborator, { foreignKey: 'colaborador_id', as: 'colaborador' });

User.hasMany(AuditLog, { foreignKey: 'usuario_id', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'usuario_id', as: 'usuario' });

Collaborator.hasMany(AuditLog, { foreignKey: 'colaborador_id', as: 'auditLogs' });
AuditLog.belongsTo(Collaborator, { foreignKey: 'colaborador_id', as: 'colaborador' });

Collaborator.hasMany(HumanEscalation, { foreignKey: 'colaborador_id', as: 'escalaciones' });
HumanEscalation.belongsTo(Collaborator, { foreignKey: 'colaborador_id', as: 'colaborador' });

ChatConsultation.hasOne(HumanEscalation, { foreignKey: 'consulta_id', as: 'escalacion' });
HumanEscalation.belongsTo(ChatConsultation, { foreignKey: 'consulta_id', as: 'consulta' });

User.hasMany(GoogleDriveConnection, { foreignKey: 'connected_by', as: 'driveConnections' });
GoogleDriveConnection.belongsTo(User, { foreignKey: 'connected_by', as: 'connectedByUser' });

module.exports = {
  sequelize,
  Sequelize,
  Op,
  Role,
  Permission,
  RolePermission,
  Collaborator,
  User,
  VacationBalance,
  Request,
  Disability,
  PersonnelMovement,
  ChatConsultation,
  DailyReport,
  AuditLog,
  DocumentSyncState,
  HumanEscalation,
  GoogleDriveConnection
};
