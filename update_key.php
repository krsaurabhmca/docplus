<?php
require_once __DIR__ . '/config/database.php';
$key = "3z10SlLux0yUF3lG5JbH7JP0FM08FO";
mysqli_query($conn, "UPDATE doctors SET whatsapp_api_key = '$key' WHERE id = 2");
echo "Doctor 2 API Key updated.";
?>
