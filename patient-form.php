<?php
require_once 'includes/auth.php';
$doctor_id = current_doctor_id();
$id = (int)($_GET['id'] ?? 0);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = (int)($_POST['id'] ?? 0);
    $category_id = (int)($_POST['category_id'] ?? 0);
    $name = clean_input($_POST['name'] ?? '');
    $age = (int)($_POST['age'] ?? 0);
    $gender = clean_input($_POST['gender'] ?? 'Other');
    $mobile = clean_input($_POST['mobile'] ?? '');
    $address = clean_input($_POST['address'] ?? '');
    $category_value = $category_id > 0 ? $category_id : null;

    if ($id > 0) {
        $stmt = mysqli_prepare($conn, 'UPDATE patients SET category_id = ?, name = ?, age = ?, gender = ?, mobile = ?, address = ? WHERE id = ? AND doctor_id = ?');
        mysqli_stmt_bind_param($stmt, 'isisssii', $category_value, $name, $age, $gender, $mobile, $address, $id, $doctor_id);
        mysqli_stmt_execute($stmt);
        flash_set('success', 'Patient updated.');
    } else {
        $stmt = mysqli_prepare($conn, 'INSERT INTO patients (doctor_id, category_id, name, age, gender, mobile, address) VALUES (?, ?, ?, ?, ?, ?, ?)');
        mysqli_stmt_bind_param($stmt, 'iisisss', $doctor_id, $category_value, $name, $age, $gender, $mobile, $address);
        mysqli_stmt_execute($stmt);
        $id = mysqli_insert_id($conn);
        flash_set('success', 'Patient added.');
    }
    redirect('patient-view.php?id=' . $id);
}

$patient = ['id' => 0, 'category_id' => '', 'name' => '', 'age' => '', 'gender' => 'Other', 'mobile' => '', 'address' => ''];
if ($id > 0) {
    $stmt = mysqli_prepare($conn, 'SELECT * FROM patients WHERE id = ? AND doctor_id = ?');
    mysqli_stmt_bind_param($stmt, 'ii', $id, $doctor_id);
    mysqli_stmt_execute($stmt);
    $patient = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    if (!$patient) {
        flash_set('error', 'Patient not found.');
        redirect('patients.php');
    }
}

$stmt = mysqli_prepare($conn, 'SELECT id, name FROM patient_categories WHERE doctor_id = ? ORDER BY name');
mysqli_stmt_bind_param($stmt, 'i', $doctor_id);
mysqli_stmt_execute($stmt);
$categories = mysqli_stmt_get_result($stmt);

$page_title = $id > 0 ? 'Edit Patient' : 'Add Patient';
$page_subtitle = 'Capture the core patient information needed for visits and follow-ups.';
require_once 'includes/header.php';
?>
<section class="card">
    <form method="post" class="form-grid">
        <input type="hidden" name="id" value="<?php echo (int)$patient['id']; ?>">
        <div class="field">
            <label for="name">Patient Name</label>
            <input id="name" name="name" value="<?php echo e($patient['name']); ?>" required>
        </div>
        <div class="field">
            <label for="mobile">Mobile</label>
            <input id="mobile" name="mobile" value="<?php echo e($patient['mobile']); ?>" inputmode="numeric">
        </div>
        <div class="field">
            <label for="age">Age</label>
            <input id="age" name="age" type="number" min="0" value="<?php echo e($patient['age']); ?>">
        </div>
        <div class="field">
            <label for="gender">Gender</label>
            <select id="gender" name="gender">
                <?php foreach (['Male','Female','Other'] as $gender): ?>
                    <option value="<?php echo $gender; ?>" <?php echo $patient['gender'] === $gender ? 'selected' : ''; ?>><?php echo $gender; ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="field">
            <label for="category_id">Category</label>
            <select id="category_id" name="category_id">
                <option value="0">Unassigned</option>
                <?php while ($cat = mysqli_fetch_assoc($categories)): ?>
                    <option value="<?php echo (int)$cat['id']; ?>" <?php echo (int)$patient['category_id'] === (int)$cat['id'] ? 'selected' : ''; ?>><?php echo e($cat['name']); ?></option>
                <?php endwhile; ?>
            </select>
        </div>
        <div class="field full">
            <label for="address">Address</label>
            <textarea id="address" name="address"><?php echo e($patient['address']); ?></textarea>
        </div>
        <div class="field full">
            <button class="btn btn-primary" type="submit"><?php echo icon('save'); ?> Save Patient</button>
        </div>
    </form>
</section>
<?php require_once 'includes/footer.php'; ?>
