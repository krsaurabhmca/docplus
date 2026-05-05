<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/functions.php';

echo "Testing INTEGRATED function in functions.php...\n";

// Use a mock doctor (empty because defaults are in the function now)
$doctor = [];
$to = "9431426600";
$template = "info__offical";
$vars = ["Integrated Test", "Success", "Antigravity"];
$media = "https://offerplant.com/img/hero-img-1.png";

$result = send_whatsapp_template($doctor, $to, $template, $media, $vars);

if ($result['success']) {
    echo "Integrated Test SUCCESS!\n";
    echo "Response: " . json_encode($result['api_response'], JSON_PRETTY_PRINT) . "\n";
} else {
    echo "Integrated Test FAILED!\n";
    echo "Error: " . $result['message'] . "\n";
}
?>
