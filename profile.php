<?php
require_once 'includes/auth.php';
$doctor_id = current_doctor_id();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = clean_input($_POST['name'] ?? '');
    $qualification = clean_input($_POST['qualification'] ?? '');
    $specialization = clean_input($_POST['specialization'] ?? '');
    $fee = (float)($_POST['fee'] ?? 0);
    $fee_repeat_days = (int)($_POST['fee_repeat_days'] ?? 0);
    $clinic_name = clean_input($_POST['clinic_name'] ?? '');
    $clinic_address = clean_input($_POST['clinic_address'] ?? '');
    $whatsapp_from = clean_input($_POST['whatsapp_from'] ?? '');
    $whatsapp_api_key = clean_input($_POST['whatsapp_api_key'] ?? '');
    $photo_path = null;

    if (!empty($_FILES['photo']['name']) && is_uploaded_file($_FILES['photo']['tmp_name'])) {
        $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        $mime = mime_content_type($_FILES['photo']['tmp_name']);
        if (!isset($allowed[$mime])) {
            flash_set('error', 'Please upload a JPG, PNG, or WEBP profile photo.');
            redirect('profile.php');
        }

        $upload_dir = __DIR__ . '/uploads/doctors';
        if (!is_dir($upload_dir)) {
            mkdir($upload_dir, 0777, true);
        }
        $photo_path = 'uploads/doctors/doctor-' . $doctor_id . '-' . time() . '.' . $allowed[$mime];
        move_uploaded_file($_FILES['photo']['tmp_name'], __DIR__ . '/' . $photo_path);
    }

    if ($photo_path) {
        $stmt = mysqli_prepare($conn, 'UPDATE doctors SET name = ?, qualification = ?, specialization = ?, photo_path = ?, fee = ?, fee_repeat_days = ?, clinic_name = ?, clinic_address = ?, whatsapp_from = ?, whatsapp_api_key = ? WHERE id = ?');
        mysqli_stmt_bind_param($stmt, 'ssssdissssi', $name, $qualification, $specialization, $photo_path, $fee, $fee_repeat_days, $clinic_name, $clinic_address, $whatsapp_from, $whatsapp_api_key, $doctor_id);
    } else {
        $stmt = mysqli_prepare($conn, 'UPDATE doctors SET name = ?, qualification = ?, specialization = ?, fee = ?, fee_repeat_days = ?, clinic_name = ?, clinic_address = ?, whatsapp_from = ?, whatsapp_api_key = ? WHERE id = ?');
        mysqli_stmt_bind_param($stmt, 'sssdissssi', $name, $qualification, $specialization, $fee, $fee_repeat_days, $clinic_name, $clinic_address, $whatsapp_from, $whatsapp_api_key, $doctor_id);
    }
    mysqli_stmt_execute($stmt);

    flash_set('success', 'Doctor profile updated.');
    redirect('profile.php');
}

$stmt = mysqli_prepare($conn, 'SELECT * FROM doctors WHERE id = ?');
mysqli_stmt_bind_param($stmt, 'i', $doctor_id);
mysqli_stmt_execute($stmt);
$doctor = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));

$page_title = 'Doctor Profile';
$page_subtitle = 'Keep clinic identity, specialization, and consultation fee rules updated.';
require_once 'includes/header.php';
?>
<section class="card">
    <form method="post" class="form-grid" enctype="multipart/form-data">
        <div class="profile-photo-panel field full">
            <div class="doctor-photo">
                <?php if (!empty($doctor['photo_path'])): ?>
                    <img src="<?php echo e($doctor['photo_path']); ?>" alt="Doctor photo">
                <?php else: ?>
                    <span><?php echo e(strtoupper(substr($doctor['name'] ?: 'DR', 0, 2))); ?></span>
                <?php endif; ?>
            </div>
            <div class="field">
                <label for="photo">Doctor Photo</label>
                <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp">
                <p class="muted">Use a clear square photo for a professional clinic profile.</p>
            </div>
        </div>
        <div class="field">
            <label>Mobile</label>
            <input value="<?php echo e($doctor['mobile']); ?>" disabled>
        </div>
        <div class="field">
            <label for="name">Doctor Name</label>
            <input id="name" name="name" value="<?php echo e($doctor['name']); ?>" required>
        </div>
        <div class="field">
            <label for="qualification">Qualification</label>
            <input id="qualification" name="qualification" value="<?php echo e($doctor['qualification']); ?>" placeholder="MBBS, MD">
        </div>
        <div class="field">
            <label for="specialization">Specialization</label>
            <input id="specialization" name="specialization" value="<?php echo e($doctor['specialization']); ?>" placeholder="General Physician">
        </div>
        <div class="field">
            <label for="fee">Consultation Fee</label>
            <input id="fee" name="fee" type="number" min="0" step="0.01" value="<?php echo e($doctor['fee']); ?>">
        </div>
        <div class="field">
            <label for="fee_repeat_days">Fee Repeat After Days</label>
            <input id="fee_repeat_days" name="fee_repeat_days" type="number" min="0" value="<?php echo e($doctor['fee_repeat_days']); ?>">
        </div>
        <div class="field">
            <label for="clinic_name">Clinic Name</label>
            <input id="clinic_name" name="clinic_name" value="<?php echo e($doctor['clinic_name']); ?>">
        </div>
        <div class="field full">
            <label for="clinic_address">Clinic Address</label>
            <textarea id="clinic_address" name="clinic_address"><?php echo e($doctor['clinic_address']); ?></textarea>
        </div>
        <div class="field">
            <label for="whatsapp_from">WhatsApp From Number</label>
            <input id="whatsapp_from" name="whatsapp_from" value="<?php echo e($doctor['whatsapp_from']); ?>" placeholder="+91XXXXXXXXXX">
            <p class="muted">Your registered WhatsApp business number.</p>
        </div>
        <div class="field">
            <label for="whatsapp_api_key">AOC API Key</label>
            <input id="whatsapp_api_key" name="whatsapp_api_key" value="<?php echo e($doctor['whatsapp_api_key']); ?>" placeholder="Enter your API Key">
            <p class="muted">AOC Portal official API Key for WhatsApp.</p>
        </div>
        <div class="field full">
            <button class="btn btn-primary" type="submit"><?php echo icon('save'); ?> Save Profile</button>
        </div>
    </form>
</section>
<?php require_once 'includes/footer.php'; ?>
