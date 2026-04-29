<?php
require_once 'includes/auth.php';

$doctor_id = current_doctor_id();
$today = date('Y-m-d');
$month_start = date('Y-m-01');
$month_end = date('Y-m-t');

$total_patients = count_rows($conn, 'SELECT COUNT(*) FROM patients WHERE doctor_id = ?', 'i', [$doctor_id]);
$today_appointments = count_rows($conn, 'SELECT COUNT(*) FROM appointments WHERE doctor_id = ? AND appointment_date = ?', 'is', [$doctor_id, $today]);
$new_patients = count_rows($conn, "SELECT COUNT(*) FROM appointments WHERE doctor_id = ? AND appointment_type = 'New'", 'i', [$doctor_id]);

$stmt = mysqli_prepare($conn, 'SELECT COALESCE(SUM(fee),0) AS income FROM appointments WHERE doctor_id = ? AND appointment_date BETWEEN ? AND ?');
mysqli_stmt_bind_param($stmt, 'iss', $doctor_id, $month_start, $month_end);
mysqli_stmt_execute($stmt);
$income = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt))['income'] ?? 0;

$stmt = mysqli_prepare($conn, 'SELECT a.*, p.name AS patient_name, p.mobile FROM appointments a JOIN patients p ON p.id = a.patient_id WHERE a.doctor_id = ? ORDER BY a.appointment_date DESC, a.id DESC LIMIT 8');
mysqli_stmt_bind_param($stmt, 'i', $doctor_id);
mysqli_stmt_execute($stmt);
$recent = mysqli_stmt_get_result($stmt);

$page_title = 'Dashboard';
$page_subtitle = 'Today at a glance, with the fastest clinic actions close by.';
require_once 'includes/header.php';
?>
<section class="quick-panel">
    <div>
        <p class="eyebrow">Quick start</p>
        <h2>Keep the front desk moving</h2>
        <p class="muted">Add a patient first, then create a new or old visit with fee, remarks, and follow-up date.</p>
    </div>
    <div class="quick-actions">
        <a class="btn btn-primary" href="patient-form.php">Add Patient</a>
        <a class="btn btn-soft" href="appointment-form.php">Book Appointment</a>
        <a class="btn" href="calendar.php">Open Calendar</a>
    </div>
</section>

<section class="grid grid-4">
    <div class="card metric"><span>Total Patients</span><strong><?php echo $total_patients; ?></strong></div>
    <div class="card metric"><span>Today Appointments</span><strong><?php echo $today_appointments; ?></strong></div>
    <div class="card metric"><span>New Visits</span><strong><?php echo $new_patients; ?></strong></div>
    <div class="card metric"><span>This Month Income</span><strong>Rs. <?php echo number_format((float)$income, 2); ?></strong></div>
</section>

<section class="card" style="margin-top:16px;">
    <div class="toolbar">
        <h2>Recent appointments</h2>
        <a class="btn btn-soft" href="appointments.php">View all</a>
    </div>
    <div class="table-wrap">
        <table>
            <thead><tr><th>Date</th><th>Patient</th><th>Type</th><th>Fee</th><th>Follow-up</th></tr></thead>
            <tbody>
            <?php if (mysqli_num_rows($recent) === 0): ?>
                <tr><td colspan="5" class="empty-cell">No appointments yet. Create the first appointment to start tracking visits.</td></tr>
            <?php endif; ?>
            <?php while ($row = mysqli_fetch_assoc($recent)): ?>
                <tr>
                    <td><?php echo e(date('d M Y', strtotime($row['appointment_date']))); ?></td>
                    <td><?php echo e($row['patient_name']); ?><br><span class="muted"><?php echo e($row['mobile']); ?></span></td>
                    <td><span class="badge <?php echo $row['appointment_type'] === 'Old' ? 'badge-old' : ''; ?>"><?php echo e($row['appointment_type']); ?></span></td>
                    <td>Rs. <?php echo number_format((float)$row['fee'], 2); ?></td>
                    <td><?php echo $row['next_followup_date'] ? e(date('d M Y', strtotime($row['next_followup_date']))) : '-'; ?></td>
                </tr>
            <?php endwhile; ?>
            </tbody>
        </table>
    </div>
</section>
<?php require_once 'includes/footer.php'; ?>
