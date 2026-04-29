<?php
require_once 'includes/auth.php';
$doctor_id = current_doctor_id();
$id = (int)($_GET['id'] ?? 0);
$q = clean_input($_GET['q'] ?? '');
$page = page_number();
$limit = page_size();
$offset = ($page - 1) * $limit;
$allowed_sort = ['date' => 'appointment_date', 'type' => 'appointment_type', 'fee' => 'fee', 'followup' => 'next_followup_date'];
[$sort, $dir, $order_by] = sort_state($allowed_sort, 'date', 'DESC');

$stmt = mysqli_prepare($conn, 'SELECT p.*, c.name AS category_name FROM patients p LEFT JOIN patient_categories c ON c.id = p.category_id WHERE p.id = ? AND p.doctor_id = ?');
mysqli_stmt_bind_param($stmt, 'ii', $id, $doctor_id);
mysqli_stmt_execute($stmt);
$patient = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
if (!$patient) {
    flash_set('error', 'Patient not found.');
    redirect('patients.php');
}

$where = ' WHERE patient_id = ? AND doctor_id = ?';
$types = 'ii';
$params = [$id, $doctor_id];
if ($q !== '') {
    $where .= ' AND remarks LIKE ?';
    $types .= 's';
    $params[] = '%' . $q . '%';
}
$history_total = count_rows($conn, 'SELECT COUNT(*) FROM appointments' . $where, $types, $params);
$sql = 'SELECT * FROM appointments' . $where . ' ORDER BY ' . $order_by . ' ' . $dir . ', id DESC LIMIT ? OFFSET ?';
$types .= 'ii';
$params[] = $limit;
$params[] = $offset;
$stmt = mysqli_prepare($conn, $sql);
bind_params($stmt, $types, $params);
mysqli_stmt_execute($stmt);
$history = mysqli_stmt_get_result($stmt);

$stmt = mysqli_prepare($conn, 'SELECT COALESCE(SUM(fee),0) AS ledger_total FROM appointments WHERE patient_id = ? AND doctor_id = ?');
mysqli_stmt_bind_param($stmt, 'ii', $id, $doctor_id);
mysqli_stmt_execute($stmt);
$ledger = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));

$stmt = mysqli_prepare($conn, 'SELECT COUNT(*) AS visit_count, MAX(appointment_date) AS last_visit, MIN(CASE WHEN next_followup_date >= CURDATE() THEN next_followup_date END) AS next_followup FROM appointments WHERE patient_id = ? AND doctor_id = ?');
mysqli_stmt_bind_param($stmt, 'ii', $id, $doctor_id);
mysqli_stmt_execute($stmt);
$visit_stats = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));

$whatsapp = $patient['mobile'] ? 'https://wa.me/91' . preg_replace('/\D+/', '', $patient['mobile']) : '#';
$call = $patient['mobile'] ? 'tel:' . preg_replace('/\D+/', '', $patient['mobile']) : '#';
$patient_initials = strtoupper(substr($patient['name'], 0, 1));
$last_visit = $visit_stats['last_visit'] ? date('d M Y', strtotime($visit_stats['last_visit'])) : 'No visits';
$next_followup = $visit_stats['next_followup'] ? date('d M Y', strtotime($visit_stats['next_followup'])) : 'Not set';

$page_title = $patient['name'];
$page_subtitle = 'Patient profile, visit history, ledger, and communication shortcuts.';
require_once 'includes/header.php';
?>
<section class="patient-hero">
    <div class="patient-main">
        <div class="patient-avatar"><?php echo e($patient_initials); ?></div>
        <div>
            <div class="patient-title-row">
                <h2><?php echo e($patient['name']); ?></h2>
                <span class="badge"><?php echo e($patient['category_name'] ?? 'Unassigned'); ?></span>
            </div>
            <div class="patient-meta">
                <span><?php echo e($patient['age'] ?: '-'); ?> years</span>
                <span><?php echo e($patient['gender']); ?></span>
                <span><?php echo e($patient['mobile'] ?: 'No mobile'); ?></span>
            </div>
            <p class="muted patient-address"><?php echo e($patient['address'] ?: 'Address not added'); ?></p>
        </div>
    </div>
    <div class="patient-actions">
        <a class="btn btn-icon btn-whatsapp" href="<?php echo e($whatsapp); ?>" target="_blank" title="Send WhatsApp message" aria-label="Send WhatsApp message"><?php echo icon('whatsapp'); ?></a>
        <a class="btn btn-icon btn-call" href="<?php echo e($call); ?>" title="Call patient" aria-label="Call patient"><?php echo icon('call'); ?></a>
        <a class="btn btn-icon btn-edit" href="patient-form.php?id=<?php echo (int)$patient['id']; ?>" title="Edit patient" aria-label="Edit patient"><?php echo icon('edit'); ?></a>
        <a class="btn btn-primary" href="appointment-form.php?patient_id=<?php echo (int)$patient['id']; ?>">Add Visit</a>
    </div>
</section>

<section class="grid grid-4 patient-stats">
    <div class="card metric"><span>Ledger</span><strong>Rs. <?php echo number_format((float)$ledger['ledger_total'], 2); ?></strong></div>
    <div class="card metric"><span>Total Visits</span><strong><?php echo (int)$visit_stats['visit_count']; ?></strong></div>
    <div class="card metric"><span>Last Visit</span><strong><?php echo e($last_visit); ?></strong></div>
    <div class="card metric"><span>Next Follow-up</span><strong><?php echo e($next_followup); ?></strong></div>
</section>

<section class="card patient-history-card">
    <div class="history-head">
        <div>
            <p class="eyebrow">Clinical timeline</p>
            <h2>Visit History</h2>
        </div>
        <form method="get" class="actions history-filter">
            <input type="hidden" name="id" value="<?php echo (int)$id; ?>">
            <input name="q" value="<?php echo e($q); ?>" placeholder="Search remarks">
            <select name="limit">
                <?php foreach ([10,20,50,100] as $size): ?>
                    <option value="<?php echo $size; ?>" <?php echo $limit === $size ? 'selected' : ''; ?>><?php echo $size; ?> rows</option>
                <?php endforeach; ?>
            </select>
            <button class="btn" type="submit"><?php echo icon('search'); ?> Search</button>
        </form>
    </div>
    <div class="table-wrap">
        <table>
            <thead>
                <tr>
                    <th><?php echo sort_link('Date', 'date', $sort, $dir); ?></th>
                    <th><?php echo sort_link('Type', 'type', $sort, $dir); ?></th>
                    <th><?php echo sort_link('Fee', 'fee', $sort, $dir); ?></th>
                    <th><?php echo sort_link('Next Follow-up', 'followup', $sort, $dir); ?></th>
                    <th>Remarks</th>
                </tr>
            </thead>
            <tbody>
            <?php if (mysqli_num_rows($history) === 0): ?>
                <tr><td colspan="5" class="empty-cell">No visit history found.</td></tr>
            <?php endif; ?>
            <?php while ($row = mysqli_fetch_assoc($history)): ?>
                <tr>
                    <td><strong><?php echo e(date('d M Y', strtotime($row['appointment_date']))); ?></strong></td>
                    <td><span class="badge <?php echo $row['appointment_type'] === 'Old' ? 'badge-old' : ''; ?>"><?php echo e($row['appointment_type']); ?></span></td>
                    <td>Rs. <?php echo number_format((float)$row['fee'], 2); ?></td>
                    <td><?php echo $row['next_followup_date'] ? e(date('d M Y', strtotime($row['next_followup_date']))) : '-'; ?></td>
                    <td><?php echo e($row['remarks'] ?: '-'); ?></td>
                </tr>
            <?php endwhile; ?>
            </tbody>
        </table>
    </div>
    <?php echo pagination($history_total, $page, $limit); ?>
</section>
<?php require_once 'includes/footer.php'; ?>
