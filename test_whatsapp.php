<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/functions.php';


function sendWhatsAppAOC($to, $params = [], $imageUrl)
{

    $url = "https://api.aoc-portal.com/v1/whatsapp";

    $data = [
        "from" => "+918271807608",
        "campaignName" => "api-test",
        "to" => "+91" . $to,
        "templateName" => "info__offical",
        "components" => [
            "body" => [
                "params" => $params
            ],
            "header" => [
                "type" => "image",
                "image" => [
                    "link" => $imageUrl
                ]
            ]
        ],
        "type" => "template"
    ];

    $headers = [
        "Content-Type: application/json",
        "apikey: urc3jWG5z6UWep1qhrDz2OuX1JUxFQ"
    ];

    $ch = curl_init($url);

    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POSTFIELDS => json_encode($data),
    ]);

    $response = curl_exec($ch);

    if (curl_errno($ch)) {
        return curl_error($ch);
    }

    curl_close($ch);

    return $response;
}

$params = ["Ram", "Payment Due", "500"];

$result = sendWhatsAppAOC("9431426600", $params, "https://offerplant.com/img/hero-img-1.png");

print_r($result);
?>