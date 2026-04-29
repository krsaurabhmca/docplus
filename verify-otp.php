<?php
session_start();
require_once 'config/database.php';
require_once 'includes/functions.php';

$mobile = $_SESSION['otp_mobile'] ?? '';
if ($mobile === '') {
    redirect('index.php');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $otp = clean_input($_POST['otp'] ?? '');
    $now = date('Y-m-d H:i:s');

    $stmt = mysqli_prepare($conn, 'SELECT id FROM doctor_otps WHERE mobile = ? AND otp_code = ? AND is_used = 0 AND expires_at >= ? ORDER BY id DESC LIMIT 1');
    mysqli_stmt_bind_param($stmt, 'sss', $mobile, $otp, $now);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $otp_row = mysqli_fetch_assoc($result);

    if ($otp_row) {
        $otp_id = (int)$otp_row['id'];
        $stmt = mysqli_prepare($conn, 'UPDATE doctor_otps SET is_used = 1 WHERE id = ?');
        mysqli_stmt_bind_param($stmt, 'i', $otp_id);
        mysqli_stmt_execute($stmt);

        $stmt = mysqli_prepare($conn, 'SELECT id FROM doctors WHERE mobile = ? LIMIT 1');
        mysqli_stmt_bind_param($stmt, 's', $mobile);
        mysqli_stmt_execute($stmt);
        $doctor = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));

        if (!$doctor) {
            $stmt = mysqli_prepare($conn, 'INSERT INTO doctors (mobile) VALUES (?)');
            mysqli_stmt_bind_param($stmt, 's', $mobile);
            mysqli_stmt_execute($stmt);
            $doctor_id = mysqli_insert_id($conn);

            $category = 'General';
            $desc = 'Default patient category';
            $stmt = mysqli_prepare($conn, 'INSERT INTO patient_categories (doctor_id, name, description) VALUES (?, ?, ?)');
            mysqli_stmt_bind_param($stmt, 'iss', $doctor_id, $category, $desc);
            mysqli_stmt_execute($stmt);
        } else {
            $doctor_id = (int)$doctor['id'];
        }

        $_SESSION['doctor_id'] = $doctor_id;
        unset($_SESSION['otp_mobile'], $_SESSION['demo_otp']);
        flash_set('success', 'Welcome to DocPlus.');
        redirect('dashboard.php');
    }

    flash_set('error', 'Invalid or expired OTP.');
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Verify OTP | DocPlus</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body class="login-body">
    <section class="login-card">
        <a class="brand" href="index.php"><span class="brand-mark">+</span><span>DocPlus</span></a>
        <h1>Verify OTP</h1>
        <p>Enter the OTP sent to <?php echo e($mobile); ?>.</p>
        <?php if (!empty($_SESSION['demo_otp'])): ?>
            <div class="alert alert-info">Demo OTP: <?php echo e($_SESSION['demo_otp']); ?></div>
        <?php endif; ?>
        <?php flash_show(); ?>
        <form method="post">
            <div class="field">
                <label for="otp">OTP</label>
                <input id="otp" name="otp" maxlength="6" inputmode="numeric" required placeholder="6 digit OTP">
            </div>
            <button class="btn btn-primary" type="submit" style="margin-top:16px;width:100%;">Verify</button>
        </form>
    </section>
</body>
</html>
