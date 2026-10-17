
CREATE DATABASE IF NOT EXISTS simple_interest_calculator;

USE simple_interest_calculator;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS calculations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    mode VARCHAR(30) NOT NULL,
    principal DECIMAL(15, 2) NOT NULL,
    rate DECIMAL(8, 4) NOT NULL,
    time DECIMAL(10, 4) NOT NULL,
    time_unit VARCHAR(20) NOT NULL,
    interest DECIMAL(15, 2) NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_calculations_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,

    INDEX idx_calculations_user_created (user_id, created_at)
);

CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    calculation_id INT NULL,
    report_name VARCHAR(255) NOT NULL,
    storage_key VARCHAR(1024) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_reports_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_reports_calculation
        FOREIGN KEY (calculation_id) REFERENCES calculations(id)
        ON DELETE SET NULL,

    INDEX idx_reports_user_created (user_id, created_at)
);
