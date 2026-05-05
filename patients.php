<?php
require_once 'includes/auth.php';
$doctor_id = current_doctor_id();

$q = clean_input($_GET['q'] ?? '');
$category_id = isset($_GET['category_id']) && $_GET['category_id'] !== '' ? (int)$_GET['category_id'] : null;
$min_age = isset($_GET['min_age']) && $_GET['min_age'] !== '' ? (int)$_GET['min_age'] : null;
$max_age = isset($_GET['max_age']) && $_GET['max_age'] !== '' ? (int)$_GET['max_age'] : null;
$from_date = clean_input($_GET['from_date'] ?? '');
$to_date = clean_input($_GET['to_date'] ?? '');

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
    $types .= 'sss';
    $params[] = $like; $params[] = $like; $params[] = $like;
}

if ($category_id) {
    $where .= ' AND EXISTS (SELECT 1 FROM patient_category_links cl WHERE cl.patient_id = p.id AND cl.category_id = ?)';
    $types .= 'i';
    $params[] = $category_id;
}

if ($min_age !== null) {
    $where .= ' AND p.age >= ?';
    $types .= 'i';
    $params[] = $min_age;
}

if ($max_age !== null) {
    $where .= ' AND p.age <= ?';
    $types .= 'i';
    $params[] = $max_age;
}

if ($from_date !== '') {
    $where .= ' AND DATE(p.created_at) >= ?';
    $types .= 's';
    $params[] = $from_date;
}

if ($to_date !== '') {
    $where .= ' AND DATE(p.created_at) <= ?';
    $types .= 's';
    $params[] = $to_date;
}

$total = count_rows($conn, 'SELECT COUNT(DISTINCT p.id) FROM patients p' . $where, $types, $params);
$sql = 'SELECT p.*, GROUP_CONCAT(c.name SEPARATOR ", ") AS category_name FROM patients p LEFT JOIN patient_category_links cl ON cl.patient_id = p.id LEFT JOIN patient_categories c ON c.id = cl.category_id' . $where . ' GROUP BY p.id ORDER BY ' . $order_by . ' ' . $dir . ' LIMIT ? OFFSET ?';
$types .= 'ii';
$params[] = $limit;
$params[] = $offset;
$stmt = mysqli_prepare($conn, $sql);
bind_params($stmt, $types, $params);
mysqli_stmt_execute($stmt);
$patients = mysqli_stmt_get_result($stmt);

// Fetch categories for filter
$stmt = mysqli_prepare($conn, 'SELECT id, name FROM patient_categories WHERE doctor_id = ? ORDER BY name ASC');
mysqli_stmt_bind_param($stmt, 'i', $doctor_id);
mysqli_stmt_execute($stmt);
$categories = mysqli_stmt_get_result($stmt);

$page_title = 'Patients';
$page_subtitle = 'Search, filter, and manage your patient records with clinical precision.';
require_once 'includes/header.php';
?>
<section class="card" style="margin-bottom: 20px;">
    <form method="get" class="grid grid-4" style="gap: 15px;">
        <div class="field">
            <label>Search Patient</label>
            <input name="q" value="<?php echo e($q); ?>" placeholder="Name or mobile...">
        </div>
        <div class="field">
            <label>Category</label>
            <select name="category_id">
                <option value="">All Categories</option>
                <?php while ($cat = mysqli_fetch_assoc($categories)): ?>
                    <option value="<?php echo $cat['id']; ?>" <?php echo $category_id == $cat['id'] ? 'selected' : ''; ?>><?php echo e($cat['name']); ?></option>
                <?php endwhile; ?>
            </select>
        </div>
        <div class="field">
            <label>Age Range</label>
            <div style="display: flex; gap: 5px;">
                <input name="min_age" value="<?php echo e($min_age); ?>" placeholder="Min" type="number">
                <input name="max_age" value="<?php echo e($max_age); ?>" placeholder="Max" type="number">
            </div>
        </div>
        <div class="field">
            <label>Join Date (From - To)</label>
            <div style="display: flex; gap: 5px;">
                <input name="from_date" value="<?php echo e($from_date); ?>" type="date">
                <input name="to_date" value="<?php echo e($to_date); ?>" type="date">
            </div>
        </div>
        <div class="field" style="grid-column: span 3;">
             <button class="btn btn-primary" type="submit"><?php echo icon('search'); ?> Apply Filters</button>
             <a href="patients.php" class="btn">Clear Filters</a>
        </div>
        <div class="field" style="text-align: right;">
             <a class="btn btn-primary" href="patient-form.php" style="background:#12836f;"><?php echo icon('plus'); ?> Add Patient</a>
        </div>
    </form>
</section>

<section class="card">
    <div class="table-wrap">
        <table>
            <thead><tr><th><?php echo sort_link('Name', 'name', $sort, $dir); ?></th><th><?php echo sort_link('Age/Gender', 'age', $sort, $dir); ?></th><th>Category</th><th>Mobile</th><th>Join Date</th><th>Action</th></tr></thead>
            <tbody>
            <?php if (mysqli_num_rows($patients) === 0): ?>
                <tr><td colspan="6" class="empty-cell">No patients found matches your criteria.</td></tr>
            <?php endif; ?>
            <?php while ($row = mysqli_fetch_assoc($patients)): ?>
                <tr>
                    <td><strong><?php echo e($row['name']); ?></strong></td>
                    <td><?php echo e($row['age']); ?> Yrs / <?php echo e($row['gender']); ?></td>
                    <td><span class="badge" style="background: #e0f2fe; color: #0369a1;"><?php echo e($row['category_name'] ?? 'Unassigned'); ?></span></td>
                    <td><?php echo e($row['mobile']); ?></td>
                    <td><span class="muted" style="font-size: 13px;"><?php echo e(date('d M Y', strtotime($row['created_at']))); ?></span></td>
                    <td class="actions">
                        <a class="btn btn-icon btn-soft" href="patient-view.php?id=<?php echo (int)$row['id']; ?>" title="View profile"><?php echo icon('view'); ?></a>
                        <a class="btn btn-icon btn-edit" href="patient-form.php?id=<?php echo (int)$row['id']; ?>" title="Edit"><?php echo icon('edit'); ?></a>
                    </td>
                </tr>
            <?php endwhile; ?>
            </tbody>
        </table>
    </div>
    <?php echo pagination($total, $page, $limit); ?>
</section>
<?php require_once 'includes/footer.php'; ?>
