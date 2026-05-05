<?php
include 'includes/functions.php';
$conn = mysqli_connect(DB_HOST, DB_USER, DB_PASS, DB_NAME);
$res = mysqli_query($conn, "DESC patients");
while($row = mysqli_fetch_assoc($res)) {
    print_r($row);
}
?>
