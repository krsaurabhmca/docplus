<?php
require_once __DIR__ . '/config/database.php';

$sql = "CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT UNSIGNED NOT NULL,
    template_name VARCHAR(255) NOT NULL,
    variable_count INT UNSIGNED NOT NULL DEFAULT 0,
    header_type ENUM('None', 'Text', 'Image', 'Video', 'Document') NOT NULL DEFAULT 'None',
    body_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
)";

if (mysqli_query($conn, $sql)) {
    echo "Table whatsapp_templates created successfully\n";
} else {
    echo "Error creating table: " . mysqli_error($conn) . "\n";
}
?>
