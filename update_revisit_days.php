<?php
require_once __DIR__ . '/config/database.php';

$sql = "ALTER TABLE doctors 
        ADD COLUMN default_revisit_days INT UNSIGNED DEFAULT 15";

if (mysqli_query($conn, $sql)) {
    echo "Table doctors updated successfully with default_revisit_days field\n";
} else {
    echo "Error updating table: " . mysqli_error($conn) . "\n";
}
?>
