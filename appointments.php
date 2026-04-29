<?php
require_once 'includes/auth.php';
$doctor_id = current_doctor_id();
[$range, $from, $to] = date_range_from_request('this_month');
$q = clean_input($_GET['q'] ?? '');
$page = page_number();
$limit = page_size();
$offset = ($page - 1) * $limit;
$allowed_sort = ['date' => 'a.appointment_date', 'patient' => 'p.name', 'type' => 'a.appointment_type', 'fee' => 'a.fee', 'followup' => 'a.next_followup_date'];
[$sort, $dir, $order_by] = sort_state($allowed_sort, 'date', 'DESC');

$where = ' WHERE a.doctor_id = ? AND a.appointment_date BETWEEN ? AND ?';
$types = 'iss';
$params = [$doctor_id, $from, $to];
if ($q !== '') {
    $where .= ' AND (p.name LIKE ? OR p.mobile LIKE ? OR a.remarks LIKE ?)';
    $like = '%' . $q . '%';
    $types .= 'sss';
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}

$total = count_rows($conn, 'SELECT COUNT(*) FROM appointments a JOIN patients p ON p.id = a.patient_id' . $where, $types, $params);
$sql = 'SELECT a.*, p.name AS patient_name, p.mobile FROM appointments a JOIN patients p ON p.id = a.patient_id' . $where . ' ORDER BY ' . $order_by . ' ' . $dir . ', a.id DESC LIMIT ? OFFSET ?';
$types .= 'ii';
$params[] = $limit;
$params[] = $offset;
$stmt = mysqli_prepare($conn, $sql);
bind_params($stmt, $types, $params);
mysqli_stmt_execute($stmt);
$appointments = mysqli_stmt_get_result($stmt);

$page_title = 'Appointments';
$page_subtitle = 'Filter visits by date and manage fees, remarks, and next follow-up.';
require_once 'includes/header.php';
?>
<section class="card">
    <div class="toolbar">
        <form method="get" class="filter-stack">
            <div class="actions">
                <input name="q" value="<?php echo e($q); ?>" placeholder="Search patient, mobile, remarks">
                <select name="limit">
                    <?php foreach ([10,20,50,100] as $size): ?>
                        <option value="<?php echo $size; ?>" <?php echo $limit === $size ? 'selected' : ''; ?>><?php echo $size; ?> rows</option>
                    <?php endforeach; ?>
                </select>
                <button class="btn" type="submit"><?php echo icon('search'); ?> Search</button>
            </div>
            <?php date_range_controls($range, $from, $to); ?>
        </form>
    </div>
    <div class="table-wrap">
        <table>
            <thead><tr><th><?php echo sort_link('Date', 'date', $sort, $dir); ?></th><th><?php echo sort_link('Patient', 'patient', $sort, $dir); ?></th><th><?php echo sort_link('Type', 'type', $sort, $dir); ?></th><th><?php echo sort_link('Fee', 'fee', $sort, $dir); ?></th><th><?php echo sort_link('Follow-up', 'followup', $sort, $dir); ?></th><th>Remarks</th><th>Action</th></tr></thead>
            <tbody>
            <?php if (mysqli_num_rows($appointments) === 0): ?>
                <tr><td colspan="7" class="empty-cell">No appointments in this date range.</td></tr>
            <?php endif; ?>
            <?php while ($row = mysqli_fetch_assoc($appointments)): ?>
                <tr>
                    <td><?php echo e(date('d M Y', strtotime($row['appointment_date']))); ?></td>
                    <td><?php echo e($row['patient_name']); ?><br><span class="muted"><?php echo e($row['mobile']); ?></span></td>
                    <td><span class="badge <?php echo $row['appointment_type'] === 'Old' ? 'badge-old' : ''; ?>"><?php echo e($row['appointment_type']); ?></span></td>
                    <td>Rs. <?php echo number_format((float)$row['fee'], 2); ?></td>
                    <td><?php echo $row['next_followup_date'] ? e(date('d M Y', strtotime($row['next_followup_date']))) : '-'; ?></td>
                    <td><?php echo e($row['remarks']); ?></td>
                    <td><a class="btn btn-icon btn-edit" href="appointment-form.php?id=<?php echo (int)$row['id']; ?>" title="Edit appointment" aria-label="Edit appointment"><?php echo icon('edit'); ?></a></td>
                </tr>
            <?php endwhile; ?>
            </tbody>
        </table>
    </div>
    <?php echo pagination($total, $page, $limit); ?>
</section>
<?php require_once 'includes/footer.php'; ?>
