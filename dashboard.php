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
<section class="quick-panel" style="background: linear-gradient(135deg, #ffffff 0%, #f1fdfb 100%); border-left-width: 6px;">
    <div>
        <p class="eyebrow" style="color: var(--primary);">Quick Actions</p>
        <h2 style="font-size: 20px; margin-bottom: 4px;">Welcome back, Doctor</h2>
        <p class="muted" style="margin: 0; font-size: 14.5px;">Manage your front desk efficiently with these shortcut tools.</p>
    </div>
    <div class="quick-actions" style="gap: 8px;">
        <a class="btn btn-primary" href="patient-form.php"><?php echo icon('plus'); ?> Add Patient</a>
        <a class="btn btn-soft" href="appointment-form.php"><?php echo icon('calendar'); ?> New Appointment</a>
        <a class="btn" href="calendar.php"><?php echo icon('overview'); ?> Calendar</a>
    </div>
</section>

<section class="grid grid-4" style="margin-top:12px;">
    <div class="card metric">
        <?php echo icon('patients'); ?><div class="metric-icon"></div>
        <span>Total Patients</span>
        <strong><?php echo $total_patients; ?></strong>
    </div>
    <div class="card metric">
        <?php echo icon('calendar'); ?><div class="metric-icon"></div>
        <span>Today Appointments</span>
        <strong><?php echo $today_appointments; ?></strong>
    </div>
    <div class="card metric">
        <?php echo icon('plus'); ?><div class="metric-icon"></div>
        <span>New Visits</span>
        <strong><?php echo $new_patients; ?></strong>
    </div>
    <div class="card metric">
        <?php echo icon('reports'); ?><div class="metric-icon"></div>
        <span>Month Income</span>
        <strong>Rs. <?php echo number_format((float)$income, 2); ?></strong>
    </div>
</section>

<section class="card" style="margin-top:12px;">
    <div class="toolbar" style="margin-bottom: 12px;">
        <h2 style="font-size: 18px;">Recent Appointments</h2>
        <a class="btn btn-soft" href="appointments.php">View all activity</a>
    </div>
    <div class="table-wrap">
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Patient Details</th>
                    <th>Type</th>
                    <th>Fee Collected</th>
                    <th>Next Follow-up</th>
                </tr>
            </thead>
            <tbody>
            <?php if (mysqli_num_rows($recent) === 0): ?>
                <tr><td colspan="5" class="empty-cell">No appointments recorded yet.</td></tr>
            <?php endif; ?>
            <?php while ($row = mysqli_fetch_assoc($recent)): ?>
                <tr>
                    <td style="white-space: nowrap;"><strong><?php echo e(date('d M Y', strtotime($row['appointment_date']))); ?></strong></td>
                    <td>
                        <div style="font-weight: 600;"><?php echo e($row['patient_name']); ?></div>
                        <div class="muted" style="font-size: 12.5px;"><?php echo e($row['mobile']); ?></div>
                    </td>
                    <td><span class="badge <?php echo $row['appointment_type'] === 'Old' ? 'badge-old' : ''; ?>"><?php echo e($row['appointment_type']); ?> Visit</span></td>
                    <td><strong style="color: var(--text);">Rs. <?php echo number_format((float)$row['fee'], 2); ?></strong></td>
                    <td>
                        <?php if ($row['next_followup_date']): ?>
                            <span class="badge" style="background:#f1f5f9; color:var(--text-light);"><?php echo e(date('d M Y', strtotime($row['next_followup_date']))); ?></span>
                        <?php else: ?>
                            <span class="muted">-</span>
                        <?php endif; ?>
                    </td>
                </tr>
            <?php endwhile; ?>
            </tbody>
        </table>
    </div>
</section>
<?php require_once 'includes/footer.php'; ?>
