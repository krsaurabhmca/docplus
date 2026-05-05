<?php
require_once 'includes/auth.php';
$doctor_id = current_doctor_id();
$q = clean_input($_GET['q'] ?? '');
$page = page_number();
$limit = page_size();
$offset = ($page - 1) * $limit;
$allowed_sort = ['name' => 'c.name', 'patients' => 'patient_count', 'created' => 'c.created_at'];
[$sort, $dir, $order_by] = sort_state($allowed_sort, 'name', 'ASC');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = (int)($_POST['id'] ?? 0);
    $name = clean_input($_POST['name'] ?? '');
    $description = clean_input($_POST['description'] ?? '');

    if ($name === '') {
        flash_set('error', 'Category name is required.');
    } elseif ($id > 0) {
        $stmt = mysqli_prepare($conn, 'UPDATE patient_categories SET name = ?, description = ? WHERE id = ? AND doctor_id = ?');
        mysqli_stmt_bind_param($stmt, 'ssii', $name, $description, $id, $doctor_id);
        mysqli_stmt_execute($stmt);
        flash_set('success', 'Category updated.');
    } else {
        $stmt = mysqli_prepare($conn, 'INSERT INTO patient_categories (doctor_id, name, description) VALUES (?, ?, ?)');
        mysqli_stmt_bind_param($stmt, 'iss', $doctor_id, $name, $description);
        mysqli_stmt_execute($stmt);
        flash_set('success', 'Category added.');
    }
    redirect('categories.php');
}

if (isset($_GET['delete'])) {
    $id = (int)$_GET['delete'];
    $stmt = mysqli_prepare($conn, 'DELETE FROM patient_categories WHERE id = ? AND doctor_id = ?');
    mysqli_stmt_bind_param($stmt, 'ii', $id, $doctor_id);
    mysqli_stmt_execute($stmt);
    flash_set('success', 'Category deleted.');
    redirect('categories.php');
}

$edit = null;
if (isset($_GET['edit'])) {
    $id = (int)$_GET['edit'];
    $stmt = mysqli_prepare($conn, 'SELECT * FROM patient_categories WHERE id = ? AND doctor_id = ?');
    mysqli_stmt_bind_param($stmt, 'ii', $id, $doctor_id);
    mysqli_stmt_execute($stmt);
    $edit = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
}

$where = ' WHERE c.doctor_id = ?';
$types = 'i';
$params = [$doctor_id];
if ($q !== '') {
    $where .= ' AND (c.name LIKE ? OR c.description LIKE ?)';
    $like = '%' . $q . '%';
    $types .= 'ss';
    $params[] = $like;
    $params[] = $like;
}

$count_sql = 'SELECT COUNT(*) FROM patient_categories c' . $where;
$total = count_rows($conn, $count_sql, $types, $params);

$sql = 'SELECT c.*, COUNT(p.id) AS patient_count FROM patient_categories c LEFT JOIN patients p ON p.category_id = c.id' . $where . ' GROUP BY c.id ORDER BY ' . $order_by . ' ' . $dir . ' LIMIT ? OFFSET ?';
$types .= 'ii';
$params[] = $limit;
$params[] = $offset;
$stmt = mysqli_prepare($conn, $sql);
bind_params($stmt, $types, $params);
mysqli_stmt_execute($stmt);
$categories = mysqli_stmt_get_result($stmt);

$page_title = 'Patient Categories';
$page_subtitle = 'Group patients for follow-up campaigns, reports, and clinic workflow.';
require_once 'includes/header.php';
?>
<section class="card">
        <div class="toolbar">
            <form method="get" class="actions">
                <input name="q" value="<?php echo e($q); ?>" placeholder="Search category">
                <select name="limit">
                    <?php foreach ([10,20,50,100] as $size): ?>
                        <option value="<?php echo $size; ?>" <?php echo $limit === $size ? 'selected' : ''; ?>><?php echo $size; ?> rows</option>
                    <?php endforeach; ?>
                </select>
                <button class="btn" type="submit"><?php echo icon('search'); ?> Search</button>
            </form>
            <a class="btn btn-primary" href="#category-modal"><?php echo icon('plus'); ?> Add Category</a>
        </div>
        <div class="table-wrap">
            <table>
                <thead><tr><th><?php echo sort_link('Name', 'name', $sort, $dir); ?></th><th>Patients</th><th>Action</th></tr></thead>
                <tbody>
                <?php if (mysqli_num_rows($categories) === 0): ?>
                    <tr><td colspan="3" class="empty-cell">No categories found.</td></tr>
                <?php endif; ?>
                <?php while ($row = mysqli_fetch_assoc($categories)): ?>
                    <tr>
                        <td>
                            <div style="font-weight: 800; color: var(--text);"><?php echo e($row['name']); ?></div>
                            <div class="muted" style="font-size: 13px; margin-top: 2px;"><?php echo e($row['description']); ?></div>
                        </td>
                        <td>
                            <span class="badge" style="background: #f0fdfa; color: #12836f; font-weight: 800; padding: 4px 12px;">
                                <?php echo (int)$row['patient_count']; ?> Patients
                            </span>
                        </td>
                        <td class="actions">
                            <a class="btn btn-icon btn-edit" href="categories.php?edit=<?php echo (int)$row['id']; ?>" title="Edit category"><?php echo icon('edit'); ?></a>
                            <a class="btn btn-icon btn-delete" href="categories.php?delete=<?php echo (int)$row['id']; ?>" title="Delete" onclick="return confirm('Delete this category?')"><?php echo icon('delete'); ?></a>
                        </td>
                    </tr>
                <?php endwhile; ?>
                </tbody>
            </table>
        </div>
        <?php echo pagination($total, $page, $limit); ?>
</section>

<div id="category-modal" class="modal <?php echo $edit ? 'is-open' : ''; ?>">
    <div class="modal-card">
        <div class="toolbar">
            <h2><?php echo $edit ? 'Edit Category' : 'Add Category'; ?></h2>
            <a class="btn btn-icon btn-close" href="categories.php" title="Close modal" aria-label="Close modal"><?php echo icon('close'); ?></a>
        </div>
        <form method="post" class="grid">
            <input type="hidden" name="id" value="<?php echo e($edit['id'] ?? 0); ?>">
            <div class="field">
                <label for="name">Category Name</label>
                <input id="name" name="name" value="<?php echo e($edit['name'] ?? ''); ?>" required>
            </div>
            <div class="field">
                <label for="description">Description</label>
                <textarea id="description" name="description"><?php echo e($edit['description'] ?? ''); ?></textarea>
            </div>
            <button class="btn btn-primary" type="submit"><?php echo icon('save'); ?> Save Category</button>
        </form>
    </div>
</div>
<?php require_once 'includes/footer.php'; ?>
