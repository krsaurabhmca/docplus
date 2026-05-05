<?php
require_once 'includes/auth.php';
$doctor_id = current_doctor_id();
[$range, $from, $to] = date_range_from_request('this_month');
$page = page_number();
$limit = page_size();
$offset = ($page - 1) * $limit;
$allowed_sort = ['date' => 'appointment_date', 'visits' => 'visits', 'income' => 'income'];
[$sort, $dir, $order_by] = sort_state($allowed_sort, 'date', 'DESC');

$stmt = mysqli_prepare($conn, 'SELECT COALESCE(SUM(fee),0) AS total_income, COUNT(*) AS total_appointments FROM appointments WHERE doctor_id = ? AND appointment_date BETWEEN ? AND ?');
mysqli_stmt_bind_param($stmt, 'iss', $doctor_id, $from, $to);
mysqli_stmt_execute($stmt);
$summary = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));

$new_count = count_rows($conn, "SELECT COUNT(*) FROM appointments WHERE doctor_id = ? AND appointment_type = 'New' AND appointment_date BETWEEN ? AND ?", 'iss', [$doctor_id, $from, $to]);
$old_count = count_rows($conn, "SELECT COUNT(*) FROM appointments WHERE doctor_id = ? AND appointment_type = 'Old' AND appointment_date BETWEEN ? AND ?", 'iss', [$doctor_id, $from, $to]);

$daily_total = count_rows($conn, 'SELECT COUNT(*) FROM (SELECT appointment_date FROM appointments WHERE doctor_id = ? AND appointment_date BETWEEN ? AND ? GROUP BY appointment_date) x', 'iss', [$doctor_id, $from, $to]);
$stmt = mysqli_prepare($conn, 'SELECT appointment_date, COUNT(*) AS visits, COALESCE(SUM(fee),0) AS income FROM appointments WHERE doctor_id = ? AND appointment_date BETWEEN ? AND ? GROUP BY appointment_date ORDER BY ' . $order_by . ' ' . $dir . ' LIMIT ? OFFSET ?');
$report_params = [$doctor_id, $from, $to, $limit, $offset];
bind_params($stmt, 'issii', $report_params);
mysqli_stmt_execute($stmt);
$daily = mysqli_stmt_get_result($stmt);

$stmt = mysqli_prepare($conn, 'SELECT c.name, COUNT(p.id) AS total FROM patient_categories c LEFT JOIN patients p ON p.category_id = c.id WHERE c.doctor_id = ? GROUP BY c.id ORDER BY total DESC');
mysqli_stmt_bind_param($stmt, 'i', $doctor_id);
mysqli_stmt_execute($stmt);
$category_report = mysqli_stmt_get_result($stmt);

$page_title = 'Reports';
$page_subtitle = 'Track income, appointment volume, and new versus old patient trends.';
require_once 'includes/header.php';
?>
<section class="card">
    <form method="get" class="filter-stack">
        <div class="actions report-actions">
            <select name="limit">
                <?php foreach ([10,20,50,100] as $size): ?>
                    <option value="<?php echo $size; ?>" <?php echo $limit === $size ? 'selected' : ''; ?>><?php echo $size; ?> rows</option>
                <?php endforeach; ?>
            </select>
            <button class="btn btn-primary" type="submit"><?php echo icon('reports'); ?> Run Report</button>
        </div>
        <?php date_range_controls($range, $from, $to); ?>
    </form>
</section>

<section class="grid grid-4" style="margin-top:12px;">
    <div class="card metric">
        <?php echo icon('reports'); ?><div class="metric-icon"></div>
        <span>Income</span>
        <strong>Rs. <?php echo number_format((float)$summary['total_income'], 2); ?></strong>
    </div>
    <div class="card metric">
        <?php echo icon('calendar'); ?><div class="metric-icon"></div>
        <span>Appointments</span>
        <strong><?php echo (int)$summary['total_appointments']; ?></strong>
    </div>
    <div class="card metric">
        <?php echo icon('plus'); ?><div class="metric-icon"></div>
        <span>New Patients</span>
        <strong><?php echo $new_count; ?></strong>
    </div>
    <div class="card metric">
        <?php echo icon('patients'); ?><div class="metric-icon"></div>
        <span>Old Patients</span>
        <strong><?php echo $old_count; ?></strong>
    </div>
</section>

<section class="report-grid">
    <div class="card">
        <div class="toolbar">
            <h2>Income & Appointment Report</h2>
        </div>
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th><?php echo sort_link('Date', 'date', $sort, $dir); ?></th>
                        <th><?php echo sort_link('Appointments', 'visits', $sort, $dir); ?></th>
                        <th><?php echo sort_link('Income', 'income', $sort, $dir); ?></th>
                    </tr>
                </thead>
                <tbody>
                <?php if (mysqli_num_rows($daily) === 0): ?>
                    <tr><td colspan="3" class="empty-cell">No report data in this date range.</td></tr>
                <?php endif; ?>
                <?php while ($row = mysqli_fetch_assoc($daily)): ?>
                    <tr>
                        <td><strong><?php echo e(date('d M Y', strtotime($row['appointment_date']))); ?></strong></td>
                        <td><?php echo (int)$row['visits']; ?> visits</td>
                        <td>Rs. <?php echo number_format((float)$row['income'], 2); ?></td>
                    </tr>
                <?php endwhile; ?>
                </tbody>
            </table>
        </div>
        <?php echo pagination($daily_total, $page, $limit); ?>
    </div>
    
    <div class="card">
        <div class="toolbar">
            <h2>Patient Categories</h2>
        </div>
        <div class="table-wrap" style="border:0; box-shadow:none;">
            <table style="min-width: 0;">
                <tbody>
                <?php 
                $categories = [];
                $max_patients = 0;
                while ($row = mysqli_fetch_assoc($category_report)) {
                    $categories[] = $row;
                    if ($row['total'] > $max_patients) $max_patients = $row['total'];
                }
                ?>
                <?php if (empty($categories)): ?>
                    <tr><td class="empty-cell">No categories found.</td></tr>
                <?php endif; ?>
                <?php foreach ($categories as $row): 
                    $pct = $max_patients > 0 ? round(($row['total'] / $max_patients) * 100) : 0;
                ?>
                    <tr>
                        <td style="padding: 10px 0;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                                <strong><?php echo e($row['name']); ?></strong>
                                <span class="muted"><?php echo $row['total']; ?> patients</span>
                            </div>
                            <div class="progress-wrap">
                                <div class="progress">
                                    <div class="progress-bar" style="width: <?php echo $pct; ?>%;"></div>
                                </div>
                                <span class="progress-val"><?php echo $pct; ?>%</span>
                            </div>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</section>
<?php require_once 'includes/footer.php'; ?>
