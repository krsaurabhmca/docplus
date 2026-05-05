<?php
require_once __DIR__ . '/config/database.php';

$sql = "ALTER TABLE doctors 
        ADD COLUMN whatsapp_template_name VARCHAR(255) DEFAULT 'api-test',
        ADD COLUMN whatsapp_from VARCHAR(20) DEFAULT '',
        ADD COLUMN whatsapp_api_key TEXT DEFAULT ''";

if (mysqli_query($conn, $sql)) {
    echo "Table doctors updated successfully with WhatsApp settings fields\n";
} else {
    echo "Error updating table: " . mysqli_error($conn) . "\n";
}
?>
