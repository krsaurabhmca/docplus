<?php
require_once 'includes/auth.php';
$doctor_id = current_doctor_id();
$q = clean_input($_GET['q'] ?? '');
$page = page_number();
$limit = page_size();
$offset = ($page - 1) * $limit;
$allowed_sort = ['date' => 'l.created_at', 'category' => 'c.name', 'channel' => 'l.channel', 'recipients' => 'l.recipients_count', 'status' => 'l.status'];
[$sort, $dir, $order_by] = sort_state($allowed_sort, 'date', 'DESC');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $category_id = (int)($_POST['category_id'] ?? 0);
    $channel = clean_input($_POST['channel'] ?? 'WhatsApp');
    $message = clean_input($_POST['message'] ?? '');
    $category_value = $category_id > 0 ? $category_id : null;

    if ($message === '') {
        flash_set('error', 'Message is required.');
    } else {
        if ($category_id > 0) {
            $stmt = mysqli_prepare($conn, 'SELECT COUNT(*) AS total FROM patients WHERE doctor_id = ? AND category_id = ? AND mobile IS NOT NULL AND mobile != ""');
            mysqli_stmt_bind_param($stmt, 'ii', $doctor_id, $category_id);
        } else {
            $stmt = mysqli_prepare($conn, 'SELECT COUNT(*) AS total FROM patients WHERE doctor_id = ? AND mobile IS NOT NULL AND mobile != ""');
            mysqli_stmt_bind_param($stmt, 'i', $doctor_id);
        }
        mysqli_stmt_execute($stmt);
        $recipients = (int)(mysqli_fetch_assoc(mysqli_stmt_get_result($stmt))['total'] ?? 0);

        // Store the campaign request. Replace this block with your WhatsApp/SMS API call.
        $status = 'Queued';
        $api_response = 'API provider not configured. Campaign saved for integration.';
        $stmt = mysqli_prepare($conn, 'INSERT INTO campaign_logs (doctor_id, category_id, channel, message, recipients_count, status, api_response) VALUES (?, ?, ?, ?, ?, ?, ?)');
        mysqli_stmt_bind_param($stmt, 'iississ', $doctor_id, $category_value, $channel, $message, $recipients, $status, $api_response);
        mysqli_stmt_execute($stmt);

        flash_set('success', 'Campaign saved. Connect the provider API to send messages.');
        redirect('campaigns.php');
    }
}

$stmt = mysqli_prepare($conn, 'SELECT id, name FROM patient_categories WHERE doctor_id = ? ORDER BY name');
mysqli_stmt_bind_param($stmt, 'i', $doctor_id);
mysqli_stmt_execute($stmt);
$categories = mysqli_stmt_get_result($stmt);

$where = ' WHERE l.doctor_id = ?';
$types = 'i';
$params = [$doctor_id];
if ($q !== '') {
    $where .= ' AND (l.message LIKE ? OR l.channel LIKE ? OR l.status LIKE ? OR c.name LIKE ?)';
    $like = '%' . $q . '%';
    $types .= 'ssss';
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}
$total = count_rows($conn, 'SELECT COUNT(*) FROM campaign_logs l LEFT JOIN patient_categories c ON c.id = l.category_id' . $where, $types, $params);
$sql = 'SELECT l.*, c.name AS category_name FROM campaign_logs l LEFT JOIN patient_categories c ON c.id = l.category_id' . $where . ' ORDER BY ' . $order_by . ' ' . $dir . ' LIMIT ? OFFSET ?';
$types .= 'ii';
$params[] = $limit;
$params[] = $offset;
$stmt = mysqli_prepare($conn, $sql);
bind_params($stmt, $types, $params);
mysqli_stmt_execute($stmt);
$logs = mysqli_stmt_get_result($stmt);

$page_title = 'Campaigns';
$page_subtitle = 'Prepare category-wise WhatsApp or text campaigns for API integration.';
require_once 'includes/header.php';
?>
<section class="grid grid-2">
    <div class="card">
        <h2>Send Campaign</h2>
        <form method="post" class="grid">
            <div class="field">
                <label for="category_id">Patient Category</label>
                <select id="category_id" name="category_id">
                    <option value="0">All Categories</option>
                    <?php while ($cat = mysqli_fetch_assoc($categories)): ?>
                        <option value="<?php echo (int)$cat['id']; ?>"><?php echo e($cat['name']); ?></option>
                    <?php endwhile; ?>
                </select>
            </div>
            <div class="field">
                <label for="channel">Channel</label>
                <select id="channel" name="channel">
                    <option>WhatsApp</option>
                    <option>Text</option>
                </select>
            </div>
            <div class="field">
                <label for="message">Message</label>
                <textarea id="message" name="message" required placeholder="Write appointment reminder, clinic update, or health campaign message"></textarea>
            </div>
            <button class="btn btn-primary" type="submit"><?php echo icon('save'); ?> Save Campaign</button>
        </form>
    </div>
    <div class="card">
        <div class="toolbar">
            <h2>Campaign Log</h2>
            <form method="get" class="actions">
                <input name="q" value="<?php echo e($q); ?>" placeholder="Search campaign log">
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
                <thead><tr><th><?php echo sort_link('Date', 'date', $sort, $dir); ?></th><th><?php echo sort_link('Category', 'category', $sort, $dir); ?></th><th><?php echo sort_link('Channel', 'channel', $sort, $dir); ?></th><th><?php echo sort_link('Recipients', 'recipients', $sort, $dir); ?></th><th><?php echo sort_link('Status', 'status', $sort, $dir); ?></th></tr></thead>
                <tbody>
                <?php if (mysqli_num_rows($logs) === 0): ?>
                    <tr><td colspan="5" class="empty-cell">No campaign logs found.</td></tr>
                <?php endif; ?>
                <?php while ($row = mysqli_fetch_assoc($logs)): ?>
                    <tr>
                        <td><?php echo e(date('d M Y', strtotime($row['created_at']))); ?></td>
                        <td><?php echo e($row['category_name'] ?? 'All'); ?></td>
                        <td><?php echo e($row['channel']); ?></td>
                        <td><?php echo (int)$row['recipients_count']; ?></td>
                        <td><span class="badge"><?php echo e($row['status']); ?></span></td>
                    </tr>
                <?php endwhile; ?>
                </tbody>
            </table>
        </div>
        <?php echo pagination($total, $page, $limit); ?>
    </div>
</section>
<?php require_once 'includes/footer.php'; ?>
