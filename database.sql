CREATE DATABASE IF NOT EXISTS docplus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE docplus;

CREATE TABLE doctors (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    mobile VARCHAR(15) NOT NULL UNIQUE,
    name VARCHAR(120) DEFAULT NULL,
    qualification VARCHAR(180) DEFAULT NULL,
    specialization VARCHAR(180) DEFAULT NULL,
    photo_path VARCHAR(255) DEFAULT NULL,
    api_token_hash CHAR(64) DEFAULT NULL,
    api_token_created_at DATETIME DEFAULT NULL,
    fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    fee_repeat_days INT UNSIGNED NOT NULL DEFAULT 0,
    clinic_name VARCHAR(160) DEFAULT NULL,
    clinic_address TEXT DEFAULT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE doctor_otps (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    mobile VARCHAR(15) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at DATETIME NOT NULL,
    is_used TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_mobile_otp (mobile, otp_code)
);

CREATE TABLE patient_categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_doctor_category (doctor_id, name),
    CONSTRAINT fk_categories_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

CREATE TABLE patients (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT UNSIGNED NOT NULL,
    category_id INT UNSIGNED DEFAULT NULL,
    name VARCHAR(140) NOT NULL,
    age INT UNSIGNED DEFAULT NULL,
    gender ENUM('Male','Female','Other') NOT NULL DEFAULT 'Other',
    mobile VARCHAR(15) DEFAULT NULL,
    address TEXT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_patients_doctor (doctor_id),
    CONSTRAINT fk_patients_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    CONSTRAINT fk_patients_category FOREIGN KEY (category_id) REFERENCES patient_categories(id) ON DELETE SET NULL
);

CREATE TABLE appointments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT UNSIGNED NOT NULL,
    patient_id INT UNSIGNED NOT NULL,
    appointment_type ENUM('New','Old') NOT NULL DEFAULT 'New',
    appointment_date DATE NOT NULL,
    fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    next_followup_date DATE DEFAULT NULL,
    remarks TEXT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_appointments_doctor_date (doctor_id, appointment_date),
    CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE TABLE campaign_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT UNSIGNED NOT NULL,
    category_id INT UNSIGNED DEFAULT NULL,
    channel ENUM('WhatsApp','Text') NOT NULL,
    message TEXT NOT NULL,
    recipients_count INT UNSIGNED NOT NULL DEFAULT 0,
    status VARCHAR(40) NOT NULL DEFAULT 'Queued',
    api_response TEXT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_campaign_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    CONSTRAINT fk_campaign_category FOREIGN KEY (category_id) REFERENCES patient_categories(id) ON DELETE SET NULL
);

INSERT INTO doctors (mobile, name, qualification, specialization, fee, fee_repeat_days, clinic_name, clinic_address)
VALUES ('9999999999', 'Demo Doctor', 'MBBS', 'General Physician', 500.00, 7, 'DocPlus Clinic', 'Main Road');

INSERT INTO patient_categories (doctor_id, name, description)
VALUES (1, 'General', 'Default walk-in patients'), (1, 'Diabetes', 'Diabetes follow-up patients');
