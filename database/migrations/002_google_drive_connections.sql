-- Migración 002: Tabla google_drive_connections para almacenamiento cifrado (AES-256-GCM) de tokens OAuth 2.0
USE policybot_rrhh;

CREATE TABLE IF NOT EXISTS google_drive_connections (
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
