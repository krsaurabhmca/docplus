<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/functions.php';

header('Content-Type: application/json; charset=utf-8');

function api_response($data = [], $status = 200)
{
    http_response_code($status);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

function api_error($message, $status = 400, $errors = [])
{
    api_response(['success' => false, 'message' => $message, 'errors' => $errors], $status);
}

function api_input()
{
    $raw = file_get_contents('php://input');
    $json = json_decode($raw, true);
    if (is_array($json)) {
        return $json;
    }
    return $_POST;
}

function api_route()
{
    $route = $_GET['route'] ?? ($_SERVER['PATH_INFO'] ?? '');
    $route = trim($route, '/');
    return $route === '' ? [] : explode('/', $route);
}

function api_method()
{
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
}

function bearer_token()
{
    if (!empty($_SERVER['HTTP_X_API_TOKEN'])) {
        return trim($_SERVER['HTTP_X_API_TOKEN']);
    }
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (stripos($header, 'Bearer ') === 0) {
        return trim(substr($header, 7));
    }
    return '';
}

function require_doctor($conn)
{
    $token = bearer_token();
    if ($token === '') {
        api_error('Bearer token is required.', 401);
    }

    $hash = hash('sha256', $token);
    $stmt = mysqli_prepare($conn, 'SELECT * FROM doctors WHERE api_token_hash = ? AND is_active = 1 LIMIT 1');
    mysqli_stmt_bind_param($stmt, 's', $hash);
    mysqli_stmt_execute($stmt);
    $doctor = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    if (!$doctor) {
        api_error('Invalid or expired API token.', 401);
    }
    return $doctor;
}

function require_fields($input, $fields)
{
    $missing = [];
    foreach ($fields as $field) {
        if (!isset($input[$field]) || clean_input($input[$field]) === '') {
            $missing[] = $field;
        }
    }
    if ($missing) {
        api_error('Required fields are missing.', 422, $missing);
    }
}

function api_page()
{
    return max(1, (int)($_GET['page'] ?? 1));
}

function api_limit()
{
    $limit = (int)($_GET['limit'] ?? 20);
    return min(100, max(1, $limit));
}

function list_response($items, $total, $page, $limit)
{
    return [
        'success' => true,
        'data' => $items,
        'meta' => [
            'total' => (int)$total,
            'page' => (int)$page,
            'limit' => (int)$limit,
            'pages' => max(1, (int)ceil($total / $limit))
        ]
    ];
}

function rows_from_result($result)
{
    $rows = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $rows[] = $row;
    }
    return $rows;
}

function auth_request_otp($conn)
{
    $input = api_input();
    require_fields($input, ['mobile']);
    $mobile = preg_replace('/\D+/', '', $input['mobile']);
    if (strlen($mobile) < 10 || strlen($mobile) > 15) {
        api_error('Invalid mobile number.', 422);
    }

    $otp = (string)random_int(100000, 999999);
    $expires_at = date('Y-m-d H:i:s', strtotime('+10 minutes'));
    $stmt = mysqli_prepare($conn, 'INSERT INTO doctor_otps (mobile, otp_code, expires_at) VALUES (?, ?, ?)');
    mysqli_stmt_bind_param($stmt, 'sss', $mobile, $otp, $expires_at);
    mysqli_stmt_execute($stmt);

    api_response([
        'success' => true,
        'message' => 'OTP generated. Connect SMS provider before production use.',
        'demo_otp' => $otp
    ]);
}

function auth_verify_otp($conn)
{
    $input = api_input();
    require_fields($input, ['mobile', 'otp']);
    $mobile = preg_replace('/\D+/', '', $input['mobile']);
    $otp = clean_input($input['otp']);
    $now = date('Y-m-d H:i:s');

    $stmt = mysqli_prepare($conn, 'SELECT id FROM doctor_otps WHERE mobile = ? AND otp_code = ? AND is_used = 0 AND expires_at >= ? ORDER BY id DESC LIMIT 1');
    mysqli_stmt_bind_param($stmt, 'sss', $mobile, $otp, $now);
    mysqli_stmt_execute($stmt);
    $otp_row = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    if (!$otp_row) {
        api_error('Invalid or expired OTP.', 401);
    }

    $otp_id = (int)$otp_row['id'];
    $stmt = mysqli_prepare($conn, 'UPDATE doctor_otps SET is_used = 1 WHERE id = ?');
    mysqli_stmt_bind_param($stmt, 'i', $otp_id);
    mysqli_stmt_execute($stmt);

    $stmt = mysqli_prepare($conn, 'SELECT * FROM doctors WHERE mobile = ? LIMIT 1');
    mysqli_stmt_bind_param($stmt, 's', $mobile);
    mysqli_stmt_execute($stmt);
    $doctor = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));

    if (!$doctor) {
        $stmt = mysqli_prepare($conn, 'INSERT INTO doctors (mobile) VALUES (?)');
        mysqli_stmt_bind_param($stmt, 's', $mobile);
        mysqli_stmt_execute($stmt);
        $doctor_id = mysqli_insert_id($conn);
        $name = 'General';
        $desc = 'Default patient category';
        $stmt = mysqli_prepare($conn, 'INSERT INTO patient_categories (doctor_id, name, description) VALUES (?, ?, ?)');
        mysqli_stmt_bind_param($stmt, 'iss', $doctor_id, $name, $desc);
        mysqli_stmt_execute($stmt);
    } else {
        $doctor_id = (int)$doctor['id'];
    }

    $token = 'dp_' . bin2hex(random_bytes(32));
    $hash = hash('sha256', $token);
    $created = date('Y-m-d H:i:s');
    $stmt = mysqli_prepare($conn, 'UPDATE doctors SET api_token_hash = ?, api_token_created_at = ? WHERE id = ?');
    mysqli_stmt_bind_param($stmt, 'ssi', $hash, $created, $doctor_id);
    mysqli_stmt_execute($stmt);

    $stmt = mysqli_prepare($conn, 'SELECT id, mobile, name, qualification, specialization, fee, fee_repeat_days, clinic_name, clinic_address, photo_path FROM doctors WHERE id = ?');
    mysqli_stmt_bind_param($stmt, 'i', $doctor_id);
    mysqli_stmt_execute($stmt);
    $doctor = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));

    api_response(['success' => true, 'token' => $token, 'doctor' => $doctor]);
}

function profile_handler($conn, $doctor, $method)
{
    $doctor_id = (int)$doctor['id'];
    if ($method === 'GET') {
        unset($doctor['api_token_hash']);
        api_response(['success' => true, 'data' => $doctor]);
    }
    if ($method !== 'PUT' && $method !== 'POST') {
        api_error('Method not allowed.', 405);
    }
    $input = api_input();
    $name = clean_input($input['name'] ?? $doctor['name']);
    $qualification = clean_input($input['qualification'] ?? $doctor['qualification']);
    $specialization = clean_input($input['specialization'] ?? $doctor['specialization']);
    $fee = (float)($input['fee'] ?? $doctor['fee']);
    $fee_repeat_days = (int)($input['fee_repeat_days'] ?? $doctor['fee_repeat_days']);
    $clinic_name = clean_input($input['clinic_name'] ?? $doctor['clinic_name']);
    $clinic_address = clean_input($input['clinic_address'] ?? $doctor['clinic_address']);

    $stmt = mysqli_prepare($conn, 'UPDATE doctors SET name = ?, qualification = ?, specialization = ?, fee = ?, fee_repeat_days = ?, clinic_name = ?, clinic_address = ? WHERE id = ?');
    mysqli_stmt_bind_param($stmt, 'sssdissi', $name, $qualification, $specialization, $fee, $fee_repeat_days, $clinic_name, $clinic_address, $doctor_id);
    mysqli_stmt_execute($stmt);
    api_response(['success' => true, 'message' => 'Profile updated.']);
}

function categories_handler($conn, $doctor, $method, $id)
{
    $doctor_id = (int)$doctor['id'];
    if ($method === 'GET') {
        if ($id) {
            $stmt = mysqli_prepare($conn, 'SELECT * FROM patient_categories WHERE id = ? AND doctor_id = ?');
            mysqli_stmt_bind_param($stmt, 'ii', $id, $doctor_id);
            mysqli_stmt_execute($stmt);
            $row = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
            $row ? api_response(['success' => true, 'data' => $row]) : api_error('Category not found.', 404);
        }
        $q = clean_input($_GET['q'] ?? '');
        $page = api_page();
        $limit = api_limit();
        $offset = ($page - 1) * $limit;
        $where = ' WHERE doctor_id = ?';
        $types = 'i';
        $params = [$doctor_id];
        if ($q !== '') {
            $where .= ' AND (name LIKE ? OR description LIKE ?)';
            $types .= 'ss';
            $params[] = '%' . $q . '%';
            $params[] = '%' . $q . '%';
        }
        $total = count_rows($conn, 'SELECT COUNT(*) FROM patient_categories' . $where, $types, $params);
        $sql = 'SELECT * FROM patient_categories' . $where . ' ORDER BY name ASC LIMIT ? OFFSET ?';
        $types .= 'ii';
        $params[] = $limit;
        $params[] = $offset;
        $stmt = mysqli_prepare($conn, $sql);
        bind_params($stmt, $types, $params);
        mysqli_stmt_execute($stmt);
        api_response(list_response(rows_from_result(mysqli_stmt_get_result($stmt)), $total, $page, $limit));
    }

    if ($method === 'POST') {
        $input = api_input();
        require_fields($input, ['name']);
        $name = clean_input($input['name']);
        $description = clean_input($input['description'] ?? '');
        $stmt = mysqli_prepare($conn, 'INSERT INTO patient_categories (doctor_id, name, description) VALUES (?, ?, ?)');
        mysqli_stmt_bind_param($stmt, 'iss', $doctor_id, $name, $description);
        mysqli_stmt_execute($stmt);
        api_response(['success' => true, 'id' => mysqli_insert_id($conn)], 201);
    }

    if (($method === 'PUT' || $method === 'PATCH') && $id) {
        $input = api_input();
        require_fields($input, ['name']);
        $name = clean_input($input['name']);
        $description = clean_input($input['description'] ?? '');
        $stmt = mysqli_prepare($conn, 'UPDATE patient_categories SET name = ?, description = ? WHERE id = ? AND doctor_id = ?');
        mysqli_stmt_bind_param($stmt, 'ssii', $name, $description, $id, $doctor_id);
        mysqli_stmt_execute($stmt);
        api_response(['success' => true, 'message' => 'Category updated.']);
    }

    if ($method === 'DELETE' && $id) {
        $stmt = mysqli_prepare($conn, 'DELETE FROM patient_categories WHERE id = ? AND doctor_id = ?');
        mysqli_stmt_bind_param($stmt, 'ii', $id, $doctor_id);
        mysqli_stmt_execute($stmt);
        api_response(['success' => true, 'message' => 'Category deleted.']);
    }
    api_error('Method not allowed.', 405);
}

function patients_handler($conn, $doctor, $method, $id, $sub)
{
    $doctor_id = (int)$doctor['id'];
    if ($method === 'GET') {
        if ($id && $sub === 'profile') {
            return patient_profile($conn, $doctor_id, $id);
        }
        if ($id) {
            $stmt = mysqli_prepare($conn, 'SELECT p.*, c.name AS category_name FROM patients p LEFT JOIN patient_categories c ON c.id = p.category_id WHERE p.id = ? AND p.doctor_id = ?');
            mysqli_stmt_bind_param($stmt, 'ii', $id, $doctor_id);
            mysqli_stmt_execute($stmt);
            $row = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
            $row ? api_response(['success' => true, 'data' => $row]) : api_error('Patient not found.', 404);
        }
        $q = clean_input($_GET['q'] ?? '');
        $page = api_page();
        $limit = api_limit();
        $offset = ($page - 1) * $limit;
        $where = ' WHERE p.doctor_id = ?';
        $types = 'i';
        $params = [$doctor_id];
        if ($q !== '') {
            $where .= ' AND (p.name LIKE ? OR p.mobile LIKE ? OR p.address LIKE ?)';
            $types .= 'sss';
            $params[] = '%' . $q . '%';
            $params[] = '%' . $q . '%';
            $params[] = '%' . $q . '%';
        }
        $total = count_rows($conn, 'SELECT COUNT(*) FROM patients p' . $where, $types, $params);
        $sql = 'SELECT p.*, c.name AS category_name FROM patients p LEFT JOIN patient_categories c ON c.id = p.category_id' . $where . ' ORDER BY p.id DESC LIMIT ? OFFSET ?';
        $types .= 'ii';
        $params[] = $limit;
        $params[] = $offset;
        $stmt = mysqli_prepare($conn, $sql);
        bind_params($stmt, $types, $params);
        mysqli_stmt_execute($stmt);
        api_response(list_response(rows_from_result(mysqli_stmt_get_result($stmt)), $total, $page, $limit));
    }

    if ($method === 'POST') {
        $input = api_input();
        require_fields($input, ['name']);
        $category_id = !empty($input['category_id']) ? (int)$input['category_id'] : null;
        $name = clean_input($input['name']);
        $age = isset($input['age']) ? (int)$input['age'] : null;
        $gender = clean_input($input['gender'] ?? 'Other');
        $mobile = clean_input($input['mobile'] ?? '');
        $address = clean_input($input['address'] ?? '');
        $stmt = mysqli_prepare($conn, 'INSERT INTO patients (doctor_id, category_id, name, age, gender, mobile, address) VALUES (?, ?, ?, ?, ?, ?, ?)');
        mysqli_stmt_bind_param($stmt, 'iisisss', $doctor_id, $category_id, $name, $age, $gender, $mobile, $address);
        mysqli_stmt_execute($stmt);
        api_response(['success' => true, 'id' => mysqli_insert_id($conn)], 201);
    }

    if (($method === 'PUT' || $method === 'PATCH') && $id) {
        $input = api_input();
        require_fields($input, ['name']);
        $category_id = !empty($input['category_id']) ? (int)$input['category_id'] : null;
        $name = clean_input($input['name']);
        $age = isset($input['age']) ? (int)$input['age'] : null;
        $gender = clean_input($input['gender'] ?? 'Other');
        $mobile = clean_input($input['mobile'] ?? '');
        $address = clean_input($input['address'] ?? '');
        $stmt = mysqli_prepare($conn, 'UPDATE patients SET category_id = ?, name = ?, age = ?, gender = ?, mobile = ?, address = ? WHERE id = ? AND doctor_id = ?');
        mysqli_stmt_bind_param($stmt, 'isisssii', $category_id, $name, $age, $gender, $mobile, $address, $id, $doctor_id);
        mysqli_stmt_execute($stmt);
        api_response(['success' => true, 'message' => 'Patient updated.']);
    }

    if ($method === 'DELETE' && $id) {
        $stmt = mysqli_prepare($conn, 'DELETE FROM patients WHERE id = ? AND doctor_id = ?');
        mysqli_stmt_bind_param($stmt, 'ii', $id, $doctor_id);
        mysqli_stmt_execute($stmt);
        api_response(['success' => true, 'message' => 'Patient deleted.']);
    }
    api_error('Method not allowed.', 405);
}

function patient_profile($conn, $doctor_id, $patient_id)
{
    $stmt = mysqli_prepare($conn, 'SELECT p.*, c.name AS category_name FROM patients p LEFT JOIN patient_categories c ON c.id = p.category_id WHERE p.id = ? AND p.doctor_id = ?');
    mysqli_stmt_bind_param($stmt, 'ii', $patient_id, $doctor_id);
    mysqli_stmt_execute($stmt);
    $patient = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    if (!$patient) {
        api_error('Patient not found.', 404);
    }

    $stmt = mysqli_prepare($conn, 'SELECT * FROM appointments WHERE patient_id = ? AND doctor_id = ? ORDER BY appointment_date DESC, id DESC');
    mysqli_stmt_bind_param($stmt, 'ii', $patient_id, $doctor_id);
    mysqli_stmt_execute($stmt);
    $history = rows_from_result(mysqli_stmt_get_result($stmt));

    $stmt = mysqli_prepare($conn, 'SELECT COALESCE(SUM(fee),0) AS ledger_total, COUNT(*) AS visit_count FROM appointments WHERE patient_id = ? AND doctor_id = ?');
    mysqli_stmt_bind_param($stmt, 'ii', $patient_id, $doctor_id);
    mysqli_stmt_execute($stmt);
    $ledger = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));

    api_response(['success' => true, 'data' => ['patient' => $patient, 'ledger' => $ledger, 'history' => $history]]);
}

function appointments_handler($conn, $doctor, $method, $id)
{
    $doctor_id = (int)$doctor['id'];
    if ($method === 'GET') {
        if ($id) {
            $stmt = mysqli_prepare($conn, 'SELECT a.*, p.name AS patient_name, p.mobile FROM appointments a JOIN patients p ON p.id = a.patient_id WHERE a.id = ? AND a.doctor_id = ?');
            mysqli_stmt_bind_param($stmt, 'ii', $id, $doctor_id);
            mysqli_stmt_execute($stmt);
            $row = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
            $row ? api_response(['success' => true, 'data' => $row]) : api_error('Appointment not found.', 404);
        }
        $from = clean_input($_GET['from'] ?? date('Y-m-01'));
        $to = clean_input($_GET['to'] ?? date('Y-m-t'));
        $q = clean_input($_GET['q'] ?? '');
        $page = api_page();
        $limit = api_limit();
        $offset = ($page - 1) * $limit;
        $where = ' WHERE a.doctor_id = ? AND a.appointment_date BETWEEN ? AND ?';
        $types = 'iss';
        $params = [$doctor_id, $from, $to];
        if ($q !== '') {
            $where .= ' AND (p.name LIKE ? OR p.mobile LIKE ? OR a.remarks LIKE ?)';
            $types .= 'sss';
            $params[] = '%' . $q . '%';
            $params[] = '%' . $q . '%';
            $params[] = '%' . $q . '%';
        }
        $total = count_rows($conn, 'SELECT COUNT(*) FROM appointments a JOIN patients p ON p.id = a.patient_id' . $where, $types, $params);
        $sql = 'SELECT a.*, p.name AS patient_name, p.mobile FROM appointments a JOIN patients p ON p.id = a.patient_id' . $where . ' ORDER BY a.appointment_date DESC, a.id DESC LIMIT ? OFFSET ?';
        $types .= 'ii';
        $params[] = $limit;
        $params[] = $offset;
        $stmt = mysqli_prepare($conn, $sql);
        bind_params($stmt, $types, $params);
        mysqli_stmt_execute($stmt);
        api_response(list_response(rows_from_result(mysqli_stmt_get_result($stmt)), $total, $page, $limit));
    }

    $input = api_input();
    if ($method === 'POST') {
        require_fields($input, ['patient_id', 'appointment_date']);
        $patient_id = (int)$input['patient_id'];
        $appointment_type = clean_input($input['appointment_type'] ?? 'New');
        $appointment_date = clean_input($input['appointment_date']);
        $fee = (float)($input['fee'] ?? 0);
        $next_followup_date = clean_input($input['next_followup_date'] ?? '') ?: null;
        $remarks = clean_input($input['remarks'] ?? '');
        $stmt = mysqli_prepare($conn, 'INSERT INTO appointments (doctor_id, patient_id, appointment_type, appointment_date, fee, next_followup_date, remarks) VALUES (?, ?, ?, ?, ?, ?, ?)');
        mysqli_stmt_bind_param($stmt, 'iissdss', $doctor_id, $patient_id, $appointment_type, $appointment_date, $fee, $next_followup_date, $remarks);
        mysqli_stmt_execute($stmt);
        api_response(['success' => true, 'id' => mysqli_insert_id($conn)], 201);
    }

    if (($method === 'PUT' || $method === 'PATCH') && $id) {
        require_fields($input, ['patient_id', 'appointment_date']);
        $patient_id = (int)$input['patient_id'];
        $appointment_type = clean_input($input['appointment_type'] ?? 'New');
        $appointment_date = clean_input($input['appointment_date']);
        $fee = (float)($input['fee'] ?? 0);
        $next_followup_date = clean_input($input['next_followup_date'] ?? '') ?: null;
        $remarks = clean_input($input['remarks'] ?? '');
        $stmt = mysqli_prepare($conn, 'UPDATE appointments SET patient_id = ?, appointment_type = ?, appointment_date = ?, fee = ?, next_followup_date = ?, remarks = ? WHERE id = ? AND doctor_id = ?');
        mysqli_stmt_bind_param($stmt, 'issdssii', $patient_id, $appointment_type, $appointment_date, $fee, $next_followup_date, $remarks, $id, $doctor_id);
        mysqli_stmt_execute($stmt);
        api_response(['success' => true, 'message' => 'Appointment updated.']);
    }

    if ($method === 'DELETE' && $id) {
        $stmt = mysqli_prepare($conn, 'DELETE FROM appointments WHERE id = ? AND doctor_id = ?');
        mysqli_stmt_bind_param($stmt, 'ii', $id, $doctor_id);
        mysqli_stmt_execute($stmt);
        api_response(['success' => true, 'message' => 'Appointment deleted.']);
    }
    api_error('Method not allowed.', 405);
}

function campaigns_handler($conn, $doctor, $method)
{
    $doctor_id = (int)$doctor['id'];
    if ($method === 'GET') {
        $page = api_page();
        $limit = api_limit();
        $offset = ($page - 1) * $limit;
        $total = count_rows($conn, 'SELECT COUNT(*) FROM campaign_logs WHERE doctor_id = ?', 'i', [$doctor_id]);
        $stmt = mysqli_prepare($conn, 'SELECT l.*, c.name AS category_name FROM campaign_logs l LEFT JOIN patient_categories c ON c.id = l.category_id WHERE l.doctor_id = ? ORDER BY l.id DESC LIMIT ? OFFSET ?');
        mysqli_stmt_bind_param($stmt, 'iii', $doctor_id, $limit, $offset);
        mysqli_stmt_execute($stmt);
        api_response(list_response(rows_from_result(mysqli_stmt_get_result($stmt)), $total, $page, $limit));
    }
    if ($method === 'POST') {
        $input = api_input();
        require_fields($input, ['channel', 'message']);
        $category_id = !empty($input['category_id']) ? (int)$input['category_id'] : null;
        $channel = clean_input($input['channel']);
        $message = clean_input($input['message']);
        if ($category_id) {
            $stmt = mysqli_prepare($conn, 'SELECT COUNT(*) AS total FROM patients WHERE doctor_id = ? AND category_id = ? AND mobile IS NOT NULL AND mobile != ""');
            mysqli_stmt_bind_param($stmt, 'ii', $doctor_id, $category_id);
        } else {
            $stmt = mysqli_prepare($conn, 'SELECT COUNT(*) AS total FROM patients WHERE doctor_id = ? AND mobile IS NOT NULL AND mobile != ""');
            mysqli_stmt_bind_param($stmt, 'i', $doctor_id);
        }
        mysqli_stmt_execute($stmt);
        $recipients = (int)(mysqli_fetch_assoc(mysqli_stmt_get_result($stmt))['total'] ?? 0);
        $status = 'Queued';
        $api_response = 'API provider not configured.';
        $stmt = mysqli_prepare($conn, 'INSERT INTO campaign_logs (doctor_id, category_id, channel, message, recipients_count, status, api_response) VALUES (?, ?, ?, ?, ?, ?, ?)');
        mysqli_stmt_bind_param($stmt, 'iississ', $doctor_id, $category_id, $channel, $message, $recipients, $status, $api_response);
        mysqli_stmt_execute($stmt);
        api_response(['success' => true, 'id' => mysqli_insert_id($conn), 'recipients_count' => $recipients], 201);
    }
    api_error('Method not allowed.', 405);
}

function reports_handler($conn, $doctor)
{
    $doctor_id = (int)$doctor['id'];
    $from = clean_input($_GET['from'] ?? date('Y-m-01'));
    $to = clean_input($_GET['to'] ?? date('Y-m-t'));
    $stmt = mysqli_prepare($conn, 'SELECT COALESCE(SUM(fee),0) AS total_income, COUNT(*) AS total_appointments FROM appointments WHERE doctor_id = ? AND appointment_date BETWEEN ? AND ?');
    mysqli_stmt_bind_param($stmt, 'iss', $doctor_id, $from, $to);
    mysqli_stmt_execute($stmt);
    $summary = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    $new_count = count_rows($conn, "SELECT COUNT(*) FROM appointments WHERE doctor_id = ? AND appointment_type = 'New' AND appointment_date BETWEEN ? AND ?", 'iss', [$doctor_id, $from, $to]);
    $old_count = count_rows($conn, "SELECT COUNT(*) FROM appointments WHERE doctor_id = ? AND appointment_type = 'Old' AND appointment_date BETWEEN ? AND ?", 'iss', [$doctor_id, $from, $to]);
    $stmt = mysqli_prepare($conn, 'SELECT appointment_date, COUNT(*) AS visits, COALESCE(SUM(fee),0) AS income FROM appointments WHERE doctor_id = ? AND appointment_date BETWEEN ? AND ? GROUP BY appointment_date ORDER BY appointment_date DESC');
    mysqli_stmt_bind_param($stmt, 'iss', $doctor_id, $from, $to);
    mysqli_stmt_execute($stmt);
    api_response(['success' => true, 'data' => ['from' => $from, 'to' => $to, 'summary' => $summary, 'new_patients' => $new_count, 'old_patients' => $old_count, 'daily' => rows_from_result(mysqli_stmt_get_result($stmt))]]);
}

function calendar_handler($conn, $doctor)
{
    $doctor_id = (int)$doctor['id'];
    $month = clean_input($_GET['month'] ?? date('Y-m'));
    $start = $month . '-01';
    $end = date('Y-m-t', strtotime($start));
    $stmt = mysqli_prepare($conn, 'SELECT a.*, p.name AS patient_name, p.mobile FROM appointments a JOIN patients p ON p.id = a.patient_id WHERE a.doctor_id = ? AND a.appointment_date BETWEEN ? AND ? ORDER BY a.appointment_date, a.id');
    mysqli_stmt_bind_param($stmt, 'iss', $doctor_id, $start, $end);
    mysqli_stmt_execute($stmt);
    api_response(['success' => true, 'data' => ['month' => $month, 'events' => rows_from_result(mysqli_stmt_get_result($stmt))]]);
}

$parts = api_route();
$resource = $parts[0] ?? '';
$id = isset($parts[1]) && is_numeric($parts[1]) ? (int)$parts[1] : 0;
$sub = $parts[2] ?? '';
$method = api_method();

if ($resource === 'auth' && ($parts[1] ?? '') === 'request-otp' && $method === 'POST') {
    auth_request_otp($conn);
}
if ($resource === 'auth' && ($parts[1] ?? '') === 'verify-otp' && $method === 'POST') {
    auth_verify_otp($conn);
}

$doctor = require_doctor($conn);

switch ($resource) {
    case 'profile':
        profile_handler($conn, $doctor, $method);
        break;
    case 'categories':
        categories_handler($conn, $doctor, $method, $id);
        break;
    case 'patients':
        patients_handler($conn, $doctor, $method, $id, $sub);
        break;
    case 'appointments':
        appointments_handler($conn, $doctor, $method, $id);
        break;
    case 'campaigns':
        campaigns_handler($conn, $doctor, $method);
        break;
    case 'reports':
        reports_handler($conn, $doctor);
        break;
    case 'calendar':
        calendar_handler($conn, $doctor);
        break;
    default:
        api_error('Endpoint not found.', 404);
}
?>
