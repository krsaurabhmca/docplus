<?php
require_once 'includes/auth.php';
$doctor_id = current_doctor_id();
$q = clean_input($_GET['q'] ?? '');
$page = page_number();
$limit = page_size();
$offset = ($page - 1) * $limit;
$allowed_sort = ['name' => 'p.name', 'age' => 'p.age', 'category' => 'c.name', 'created' => 'p.created_at'];
[$sort, $dir, $order_by] = sort_state($allowed_sort, 'created', 'DESC');

$where = ' WHERE p.doctor_id = ?';
$types = 'i';
$params = [$doctor_id];
if ($q !== '') {
    $like = '%' . $q . '%';
    $where .= ' AND (p.name LIKE ? OR p.mobile LIKE ? OR p.address LIKE ?)';
    $types .= 'ss';
    $params[] = $like;
    $params[] = $like;
    $types .= 's';
    $params[] = $like;
}

$total = count_rows($conn, 'SELECT COUNT(*) FROM patients p LEFT JOIN patient_categories c ON c.id = p.category_id' . $where, $types, $params);
$sql = 'SELECT p.*, c.name AS category_name FROM patients p LEFT JOIN patient_categories c ON c.id = p.category_id' . $where . ' ORDER BY ' . $order_by . ' ' . $dir . ' LIMIT ? OFFSET ?';
$types .= 'ii';
$params[] = $limit;
$params[] = $offset;
$stmt = mysqli_prepare($conn, $sql);
bind_params($stmt, $types, $params);
mysqli_stmt_execute($stmt);
$patients = mysqli_stmt_get_result($stmt);

$page_title = 'Patients';
$page_subtitle = 'Search, add, and open patient records with history and ledger details.';
require_once 'includes/header.php';
?>
<section class="card">
    <div class="toolbar">
        <form method="get" class="actions">
            <input name="q" value="<?php echo e($q); ?>" placeholder="Search name or mobile">
            <select name="limit">
                <?php foreach ([10,20,50,100] as $size): ?>
                    <option value="<?php echo $size; ?>" <?php echo $limit === $size ? 'selected' : ''; ?>><?php echo $size; ?> rows</option>
                <?php endforeach; ?>
            </select>
            <button class="btn" type="submit"><?php echo icon('search'); ?> Search</button>
        </form>
        <a class="btn btn-primary" href="patient-form.php">Add Patient</a>
    </div>
    <div class="table-wrap">
        <table>
            <thead><tr><th><?php echo sort_link('Name', 'name', $sort, $dir); ?></th><th><?php echo sort_link('Age/Gender', 'age', $sort, $dir); ?></th><th><?php echo sort_link('Category', 'category', $sort, $dir); ?></th><th>Mobile</th><th>Address</th><th>Action</th></tr></thead>
            <tbody>
            <?php if (mysqli_num_rows($patients) === 0): ?>
                <tr><td colspan="6" class="empty-cell">No patients found. Add a patient to create appointments and history.</td></tr>
            <?php endif; ?>
            <?php while ($row = mysqli_fetch_assoc($patients)): ?>
                <tr>
                    <td><?php echo e($row['name']); ?></td>
                    <td><?php echo e($row['age']); ?> / <?php echo e($row['gender']); ?></td>
                    <td><span class="badge"><?php echo e($row['category_name'] ?? 'Unassigned'); ?></span></td>
                    <td><?php echo e($row['mobile']); ?></td>
                    <td><?php echo e($row['address']); ?></td>
                    <td class="actions">
                        <a class="btn btn-icon btn-soft" href="patient-view.php?id=<?php echo (int)$row['id']; ?>" title="View patient profile" aria-label="View patient profile"><?php echo icon('view'); ?></a>
                        <a class="btn btn-icon btn-edit" href="patient-form.php?id=<?php echo (int)$row['id']; ?>" title="Edit patient" aria-label="Edit patient"><?php echo icon('edit'); ?></a>
                    </td>
                </tr>
            <?php endwhile; ?>
            </tbody>
        </table>
    </div>
    <?php echo pagination($total, $page, $limit); ?>
</section>
<?php require_once 'includes/footer.php'; ?>
