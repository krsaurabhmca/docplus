<?php
// Hardcoded test script
$api_key = "3z10SlLux0yUF3lG5JbH7JP0FM08FO";
$from = "+919162941999";
$to = "+919431426600";
$template_name = "info_update_43";
$media_url = "https://offerplant.com/img/hero-img-1.png";

$url = "https://api.aoc-portal.com/v1/whatsapp";

$payload = [
    "from" => $from,
    "campaignName" => "api-test-hardcoded",
    "to" => $to,
    "templateName" => $template_name,
    "components" => [
        "body" => [
            "params" => ["Dummy Patient", "05:00 PM", "DocPlus Hardcoded"]
        ],
        "header" => [
            "type" => "image",
            "image" => [
                "link" => $media_url
            ]
        ]
    ],
    "type" => "template"
];

echo "Sending HARDCODED test...\n";
echo "URL: $url\n";
echo "From: $from -> To: $to\n";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'apikey: ' . $api_key
]);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    echo "\nCURL Error: $error\n";
} else {
    echo "\nHTTP Status: $http_code\n";
    echo "Response: " . ($response ?: "Empty Response (Success)") . "\n";
}
?>