<?php
require_once __DIR__ . '/config/database.php';
$r = mysqli_query($conn, 'DESCRIBE doctors');
while($row = mysqli_fetch_assoc($r)) echo $row['Field'] . PHP_EOL;
?>
