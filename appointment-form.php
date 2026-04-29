<?php
require_once 'includes/auth.php';
$doctor_id = current_doctor_id();
$id = (int)($_GET['id'] ?? 0);
$prefill_patient = (int)($_GET['patient_id'] ?? 0);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = (int)($_POST['id'] ?? 0);
    $patient_id = (int)($_POST['patient_id'] ?? 0);
    $appointment_type = clean_input($_POST['appointment_type'] ?? 'New');
    $appointment_date = clean_input($_POST['appointment_date'] ?? date('Y-m-d'));
    $fee = (float)($_POST['fee'] ?? 0);
    $next_followup_date = clean_input($_POST['next_followup_date'] ?? '');
    $remarks = clean_input($_POST['remarks'] ?? '');
    $followup = $next_followup_date !== '' ? $next_followup_date : null;

    if ($id > 0) {
        $stmt = mysqli_prepare($conn, 'UPDATE appointments SET patient_id = ?, appointment_type = ?, appointment_date = ?, fee = ?, next_followup_date = ?, remarks = ? WHERE id = ? AND doctor_id = ?');
        mysqli_stmt_bind_param($stmt, 'issdssii', $patient_id, $appointment_type, $appointment_date, $fee, $followup, $remarks, $id, $doctor_id);
        mysqli_stmt_execute($stmt);
        flash_set('success', 'Appointment updated.');
    } else {
        $stmt = mysqli_prepare($conn, 'INSERT INTO appointments (doctor_id, patient_id, appointment_type, appointment_date, fee, next_followup_date, remarks) VALUES (?, ?, ?, ?, ?, ?, ?)');
        mysqli_stmt_bind_param($stmt, 'iissdss', $doctor_id, $patient_id, $appointment_type, $appointment_date, $fee, $followup, $remarks);
        mysqli_stmt_execute($stmt);
        flash_set('success', 'Appointment added.');
    }
    redirect('appointments.php');
}

$appointment = [
    'id' => 0,
    'patient_id' => $prefill_patient,
    'appointment_type' => 'New',
    'appointment_date' => date('Y-m-d'),
    'fee' => doctor_fee($conn, $doctor_id),
    'next_followup_date' => '',
    'remarks' => ''
];

if ($id > 0) {
    $stmt = mysqli_prepare($conn, 'SELECT * FROM appointments WHERE id = ? AND doctor_id = ?');
    mysqli_stmt_bind_param($stmt, 'ii', $id, $doctor_id);
    mysqli_stmt_execute($stmt);
    $appointment = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    if (!$appointment) {
        flash_set('error', 'Appointment not found.');
        redirect('appointments.php');
    }
}

$stmt = mysqli_prepare($conn, 'SELECT id, name, mobile FROM patients WHERE doctor_id = ? ORDER BY name');
mysqli_stmt_bind_param($stmt, 'i', $doctor_id);
mysqli_stmt_execute($stmt);
$patients = mysqli_stmt_get_result($stmt);

$page_title = $id > 0 ? 'Edit Appointment' : 'New Appointment';
$page_subtitle = 'Create a visit, collect fee status, and schedule the next follow-up.';
require_once 'includes/header.php';
?>
<section class="card">
    <form method="post" class="form-grid">
        <input type="hidden" name="id" value="<?php echo (int)$appointment['id']; ?>">
        <div class="field">
            <label for="patient_id">Patient</label>
            <select id="patient_id" name="patient_id" required>
                <option value="">Select patient</option>
                <?php while ($patient = mysqli_fetch_assoc($patients)): ?>
                    <option value="<?php echo (int)$patient['id']; ?>" <?php echo (int)$appointment['patient_id'] === (int)$patient['id'] ? 'selected' : ''; ?>>
                        <?php echo e($patient['name'] . ' - ' . $patient['mobile']); ?>
                    </option>
                <?php endwhile; ?>
            </select>
        </div>
        <div class="field">
            <label for="appointment_type">Appointment Type</label>
            <select id="appointment_type" name="appointment_type">
                <option value="New" <?php echo $appointment['appointment_type'] === 'New' ? 'selected' : ''; ?>>New</option>
                <option value="Old" <?php echo $appointment['appointment_type'] === 'Old' ? 'selected' : ''; ?>>Old</option>
            </select>
        </div>
        <div class="field">
            <label for="appointment_date">Appointment Date</label>
            <input id="appointment_date" name="appointment_date" type="date" value="<?php echo e($appointment['appointment_date']); ?>" required>
        </div>
        <div class="field">
            <label for="fee">Fee / 0</label>
            <input id="fee" name="fee" type="number" min="0" step="0.01" value="<?php echo e($appointment['fee']); ?>">
        </div>
        <div class="field">
            <label for="next_followup_date">Next Follow-up Date</label>
            <input id="next_followup_date" name="next_followup_date" type="date" value="<?php echo e($appointment['next_followup_date']); ?>">
        </div>
        <div class="field full">
            <label for="remarks">Remarks</label>
            <textarea id="remarks" name="remarks"><?php echo e($appointment['remarks']); ?></textarea>
        </div>
        <div class="field full">
            <button class="btn btn-primary" type="submit"><?php echo icon('save'); ?> Save Appointment</button>
        </div>
    </form>
</section>
<?php require_once 'includes/footer.php'; ?>
