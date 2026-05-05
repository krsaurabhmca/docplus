<?php
require_once __DIR__ . '/config/database.php';
mysqli_query($conn, "UPDATE doctors SET whatsapp_from = '+919431426600', whatsapp_api_key = 'TEST_KEY' WHERE id = 1");
echo "Doctor 1 updated with test credentials.";
?>
