<?php
session_start();
require_once 'config/database.php';
require_once 'includes/functions.php';

if (current_doctor_id() > 0) {
    redirect('dashboard.php');
}

$demo_otp = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $mobile = preg_replace('/\D+/', '', clean_input($_POST['mobile'] ?? ''));

    if (strlen($mobile) < 10 || strlen($mobile) > 15) {
        flash_set('error', 'Please enter a valid mobile number.');
    } else {
        $otp = (string)random_int(100000, 999999);
        $expires_at = date('Y-m-d H:i:s', strtotime('+10 minutes'));

        $stmt = mysqli_prepare($conn, 'INSERT INTO doctor_otps (mobile, otp_code, expires_at) VALUES (?, ?, ?)');
        mysqli_stmt_bind_param($stmt, 'sss', $mobile, $otp, $expires_at);
        mysqli_stmt_execute($stmt);

        $_SESSION['otp_mobile'] = $mobile;
        $_SESSION['demo_otp'] = $otp;
        redirect('verify-otp.php');
    }
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Doctor Signup | DocPlus</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body class="login-body">
    <section class="login-card">
        <a class="brand" href="index.php"><span class="brand-mark">+</span><span>DocPlus</span></a>
        <h1>Doctor onboarding</h1>
        <p>Sign up or log in with mobile OTP. SMS API can be connected inside this step when your provider details are ready.</p>
        <?php flash_show(); ?>
        <form method="post">
            <div class="field">
                <label for="mobile">Mobile Number</label>
                <input id="mobile" name="mobile" maxlength="15" inputmode="numeric" required placeholder="Enter doctor mobile">
            </div>
            <button class="btn btn-primary" type="submit" style="margin-top:16px;width:100%;">Send OTP</button>
        </form>
    </section>
</body>
</html>
