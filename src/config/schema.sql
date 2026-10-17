CREATE DATABASE IF NOT EXISTS simple_interest_calculator
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE simple_interest_calculator;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS calculations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  mode VARCHAR(40) NOT NULL,
  principal DECIMAL(18, 2) NOT NULL,
  rate DECIMAL(9, 4) NOT NULL,
  time DECIMAL(12, 4) NOT NULL,
  time_unit VARCHAR(16) NOT NULL,
  interest DECIMAL(18, 2) NOT NULL,
  total_amount DECIMAL(18, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_calculations_user_created (user_id, created_at),
  CONSTRAINT fk_calculations_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  calculation_id BIGINT UNSIGNED NULL,
  report_name VARCHAR(255) NOT NULL,
  storage_key VARCHAR(1024) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reports_user_created (user_id, created_at),
  KEY idx_reports_calculation (calculation_id),
  CONSTRAINT fk_reports_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_reports_calculation
    FOREIGN KEY (calculation_id) REFERENCES calculations (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;
