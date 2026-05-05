<?php
require_once 'config/database.php';

$sql = [
    "CREATE TABLE IF NOT EXISTS patient_category_links (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        patient_id INT UNSIGNED NOT NULL,
        category_id INT UNSIGNED NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_patient_category (patient_id, category_id),
        CONSTRAINT fk_links_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        CONSTRAINT fk_links_category FOREIGN KEY (category_id) REFERENCES patient_categories(id) ON DELETE CASCADE
    )",
    // Migrate existing category_id data
    "INSERT IGNORE INTO patient_category_links (patient_id, category_id)
     SELECT id, category_id FROM patients WHERE category_id IS NOT NULL"
];

foreach ($sql as $q) {
    if (mysqli_query($conn, $q)) {
        echo "Executed: " . substr($q, 0, 50) . "...\n";
    } else {
        echo "Error: " . mysqli_error($conn) . "\n";
    }
}

echo "Migration completed.\n";
?>
