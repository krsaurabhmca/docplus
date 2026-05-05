<?php
require_once __DIR__ . '/config/database.php';

$sql = "CREATE TABLE IF NOT EXISTS campaign_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    var1 TEXT,
    var2 TEXT,
    var3 TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)";

if (mysqli_query($conn, $sql)) {
    echo "Table campaign_templates created successfully\n";
} else {
    echo "Error creating table: " . mysqli_error($conn) . "\n";
}
?>
