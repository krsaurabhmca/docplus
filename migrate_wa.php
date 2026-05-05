<?php
require_once __DIR__ . '/config/database.php';
$sql = "ALTER TABLE doctors 
        ADD COLUMN wa_instance_id VARCHAR(100) DEFAULT NULL AFTER clinic_address, 
        ADD COLUMN wa_api_key VARCHAR(255) DEFAULT NULL AFTER wa_instance_id";
if (mysqli_query($conn, $sql)) {
    echo "Migration successful.";
} else {
    echo "Error: " . mysqli_error($conn);
}
?>
