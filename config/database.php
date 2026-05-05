<?php
date_default_timezone_set('Asia/Kolkata');
// Environment Detection
$is_live = (($_SERVER['HTTP_HOST'] ?? '') === 'docplus.offerplant.com');
$env_path = __DIR__ . '/env.php';
$env = file_exists($env_path) ? require $env_path : [];

if ($is_live) {
    // Live Database Credentials (from env.php)
    $db_host = $env['DB_HOST'] ?? 'localhost';
    $db_user = $env['DB_USER'] ?? '';
    $db_pass = $env['DB_PASS'] ?? '';
    $db_name = $env['DB_NAME'] ?? '';
    define('CONFIG_BASE_URL', $env['BASE_URL'] ?? '');
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
