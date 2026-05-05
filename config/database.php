<?php
date_default_timezone_set('Asia/Kolkata');
// Environment Detection
$is_live = ($_SERVER['HTTP_HOST'] === 'docplus.offerplant.com');

if ($is_live) {
    // Live Database Credentials (Hostinger/Remote)
    $db_host = 'localhost'; // Usually 'localhost' on shared hosting
    $db_user = 'u960515621_docplus';
    $db_pass = '@DocsPlus_2001';
    $db_name = 'u960515621_docplus';
    define('CONFIG_BASE_URL', 'https://docplus.offerplant.com');
} else {
    // Local Database Credentials (XAMPP)
    $db_host = 'localhost';
    $db_user = 'root';
    $db_pass = '';
    $db_name = 'docplus';
    define('CONFIG_BASE_URL', 'http://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . '/docplus');
}

$conn = mysqli_connect($db_host, $db_user, $db_pass, $db_name);

if (!$conn) {
    die('Database connection failed: ' . mysqli_connect_error());
}

mysqli_set_charset($conn, 'utf8mb4');
?>
