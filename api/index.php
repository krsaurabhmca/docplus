<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/functions.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

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
    $photo_path = clean_input($input['photo_path'] ?? $doctor['photo_path']);
    $wa_template = clean_input($input['whatsapp_template_name'] ?? $doctor['whatsapp_template_name']);
    $wa_from = clean_input($input['whatsapp_from'] ?? $doctor['whatsapp_from']);
    $wa_api_key = clean_input($input['whatsapp_api_key'] ?? $doctor['whatsapp_api_key']);
    $default_revisit = (int)($input['default_revisit_days'] ?? $doctor['default_revisit_days']);

    $stmt = mysqli_prepare($conn, 'UPDATE doctors SET name = ?, qualification = ?, specialization = ?, fee = ?, fee_repeat_days = ?, clinic_name = ?, clinic_address = ?, photo_path = ?, whatsapp_template_name = ?, whatsapp_from = ?, whatsapp_api_key = ?, default_revisit_days = ? WHERE id = ?');
    mysqli_stmt_bind_param($stmt, 'sssdissssssii', $name, $qualification, $specialization, $fee, $fee_repeat_days, $clinic_name, $clinic_address, $photo_path, $wa_template, $wa_from, $wa_api_key, $default_revisit, $doctor_id);
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
        $sql = 'SELECT c.*, COUNT(cl.patient_id) as patient_count 
                FROM patient_categories c 
                LEFT JOIN patient_category_links cl ON c.id = cl.category_id' . 
                str_replace('doctor_id', 'c.doctor_id', $where) . ' 
                GROUP BY c.id 
                ORDER BY c.name ASC LIMIT ? OFFSET ?';
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
            $stmt = mysqli_prepare($conn, 'SELECT p.*, GROUP_CONCAT(c.name SEPARATOR ", ") AS category_name, GROUP_CONCAT(cl.category_id) AS category_ids FROM patients p LEFT JOIN patient_category_links cl ON cl.patient_id = p.id LEFT JOIN patient_categories c ON c.id = cl.category_id WHERE p.id = ? AND p.doctor_id = ? GROUP BY p.id');
            mysqli_stmt_bind_param($stmt, 'ii', $id, $doctor_id);
            mysqli_stmt_execute($stmt);
            $row = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
            if ($row) {
                $row['category_ids'] = $row['category_ids'] ? array_map('intval', explode(',', $row['category_ids'])) : [];
                api_response(['success' => true, 'data' => $row]);
            } else {
                api_error('Patient not found.', 404);
            }
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
        $total = count_rows($conn, 'SELECT COUNT(DISTINCT p.id) FROM patients p LEFT JOIN patient_category_links cl ON cl.patient_id = p.id' . $where, $types, $params);
        $sql = 'SELECT p.*, GROUP_CONCAT(c.name SEPARATOR ", ") AS category_name FROM patients p LEFT JOIN patient_category_links cl ON cl.patient_id = p.id LEFT JOIN patient_categories c ON c.id = cl.category_id' . $where . ' GROUP BY p.id ORDER BY p.id DESC LIMIT ? OFFSET ?';
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
        $category_ids = $input['category_ids'] ?? [];
        $name = clean_input($input['name']);
        $age = isset($input['age']) ? (int)$input['age'] : null;
        $gender = clean_input($input['gender'] ?? 'Other');
        $mobile = clean_input($input['mobile'] ?? '');
        $address = clean_input($input['address'] ?? '');
        $stmt = mysqli_prepare($conn, 'INSERT INTO patients (doctor_id, name, age, gender, mobile, address) VALUES (?, ?, ?, ?, ?, ?)');
        mysqli_stmt_bind_param($stmt, 'isisss', $doctor_id, $name, $age, $gender, $mobile, $address);
        mysqli_stmt_execute($stmt);
        $patient_id = mysqli_insert_id($conn);

        if (!empty($category_ids) && is_array($category_ids)) {
            foreach ($category_ids as $cat_id) {
                $stmt = mysqli_prepare($conn, 'INSERT IGNORE INTO patient_category_links (patient_id, category_id) VALUES (?, ?)');
                mysqli_stmt_bind_param($stmt, 'ii', $patient_id, $cat_id);
                mysqli_stmt_execute($stmt);
            }
        }
        api_response(['success' => true, 'id' => $patient_id], 201);
    }

    if (($method === 'PUT' || $method === 'PATCH') && $id) {
        $input = api_input();
        require_fields($input, ['name']);
        $category_ids = $input['category_ids'] ?? [];
        $name = clean_input($input['name']);
        $age = isset($input['age']) ? (int)$input['age'] : null;
        $gender = clean_input($input['gender'] ?? 'Other');
        $mobile = clean_input($input['mobile'] ?? '');
        $address = clean_input($input['address'] ?? '');
        $stmt = mysqli_prepare($conn, 'UPDATE patients SET name = ?, age = ?, gender = ?, mobile = ?, address = ? WHERE id = ? AND doctor_id = ?');
        mysqli_stmt_bind_param($stmt, 'sisssii', $name, $age, $gender, $mobile, $address, $id, $doctor_id);
        mysqli_stmt_execute($stmt);

        // Update category links
        $stmt = mysqli_prepare($conn, 'DELETE FROM patient_category_links WHERE patient_id = ?');
        mysqli_stmt_bind_param($stmt, 'i', $id);
        mysqli_stmt_execute($stmt);

        if (!empty($category_ids) && is_array($category_ids)) {
            foreach ($category_ids as $cat_id) {
                $stmt = mysqli_prepare($conn, 'INSERT IGNORE INTO patient_category_links (patient_id, category_id) VALUES (?, ?)');
                mysqli_stmt_bind_param($stmt, 'ii', $id, $cat_id);
                mysqli_stmt_execute($stmt);
            }
        }
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
    $stmt = mysqli_prepare($conn, 'SELECT p.*, GROUP_CONCAT(c.name SEPARATOR ", ") AS category_name FROM patients p LEFT JOIN patient_category_links cl ON cl.patient_id = p.id LEFT JOIN patient_categories c ON c.id = cl.category_id WHERE p.id = ? AND p.doctor_id = ? GROUP BY p.id');
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
        $from = clean_input($_GET['from'] ?? '');
        $to = clean_input($_GET['to'] ?? '');
        $q = clean_input($_GET['q'] ?? '');
        $page = api_page();
        $limit = api_limit();
        $offset = ($page - 1) * $limit;
        
        $where = ' WHERE a.doctor_id = ?';
        $types = 'i';
        $params = [$doctor_id];

        if ($from !== '' && $to !== '') {
            $date_field = ($_GET['date_type'] ?? 'visit') === 'followup' ? 'a.next_followup_date' : 'a.appointment_date';
            $where .= " AND $date_field BETWEEN ? AND ?";
            $types .= 'ss';
            $params[] = $from;
            $params[] = $to;
        }

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


function campaigns_handler($conn, $doctor, $method, $id)
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
        
        $variables = $input['variables'] ?? [];
        if (isset($input['var1'])) $variables[0] = $input['var1'];
        if (isset($input['var2'])) $variables[1] = $input['var2'];
        if (isset($input['var3'])) $variables[2] = $input['var3'];

        $category_ids = $input['category_ids'] ?? [];
        if (!is_array($category_ids)) $category_ids = [];
        
        $body_parts = ["Hello"];
        foreach ($variables as $v) {
            if ($v) $body_parts[] = clean_input($v);
        }
        $body_parts[] = "Thank you for your valuable time and kind consideration.";
        $message = implode("\n\n", $body_parts);
        
        $total_recipients = 0;
        $recipients = [];
        
        if (empty($category_ids)) {
            $stmt = mysqli_prepare($conn, 'SELECT mobile FROM patients WHERE doctor_id = ? AND mobile IS NOT NULL AND mobile != ""');
            mysqli_stmt_bind_param($stmt, 'i', $doctor_id);
            mysqli_stmt_execute($stmt);
            $recipients = rows_from_result(mysqli_stmt_get_result($stmt));
        } else {
            $placeholders = implode(',', array_fill(0, count($category_ids), '?'));
            $types = 'i' . str_repeat('i', count($category_ids));
            $params = array_merge([$doctor_id], $category_ids);
            
            // Join with patient_category_links for accurate targeting
            $sql = "SELECT DISTINCT p.mobile FROM patients p 
                    JOIN patient_category_links cl ON p.id = cl.patient_id 
                    WHERE p.doctor_id = ? AND cl.category_id IN ($placeholders) 
                    AND p.mobile IS NOT NULL AND p.mobile != ''";
            
            $stmt = mysqli_prepare($conn, $sql);
            bind_params($stmt, $types, $params);
            mysqli_stmt_execute($stmt);
            $recipients = rows_from_result(mysqli_stmt_get_result($stmt));
        }

        $total_recipients = count($recipients);
        $template_name = clean_input($input['template_name'] ?? 'custom_campaign');
        
        // Use provided header media or fallback to default
        $header_media = $input['header_media'] ?? '';
        if ($header_media) {
            $full_header_url = CONFIG_BASE_URL . '/' . $header_media;
        } else {
            $full_header_url = "https://offerplant.com/img/hero-img-1.png";
        }

        // Start sending process
        $sent_count = 0;
        $api_logs = [];
        foreach ($recipients as $recipient) {
            $res = send_whatsapp_template($doctor, $recipient['mobile'], $template_name, $full_header_url, $variables, $input['header_type'] ?? 'image');
            if ($res['success']) {
                $api_res = $res['api_response'] ?? [];
                // Check if API actually reported success
                if (isset($api_res['error']) && $api_res['error'] === false) {
                    $sent_count++;
                }
            }
            $api_logs[] = $recipient['mobile'] . ': ' . json_encode($res);
        }

        $status = 'Completed';
        $channel = 'WhatsApp';
        $api_response_summary = 'Sent ' . $sent_count . ' of ' . $total_recipients . ' recipients. Logs: ' . implode(' | ', $api_logs);
        
        $cat_id = count($category_ids) === 1 ? $category_ids[0] : null;
        $stmt = mysqli_prepare($conn, 'INSERT INTO campaign_logs (doctor_id, category_id, channel, message, recipients_count, status, api_response) VALUES (?, ?, ?, ?, ?, ?, ?)');
        mysqli_stmt_bind_param($stmt, 'iississ', $doctor_id, $cat_id, $channel, $message, $total_recipients, $status, $api_response_summary);
        mysqli_stmt_execute($stmt);
        
        api_response(['success' => true, 'id' => mysqli_insert_id($conn), 'recipients_count' => $total_recipients, 'sent_count' => $sent_count], 201);
    }
    if ($method === 'DELETE' && $id) {
        $stmt = mysqli_prepare($conn, 'DELETE FROM campaign_logs WHERE id = ? AND doctor_id = ?');
        mysqli_stmt_bind_param($stmt, 'ii', $id, $doctor_id);
        mysqli_stmt_execute($stmt);
        api_response(['success' => true, 'message' => 'Campaign deleted.']);
    }
    api_error('Method not allowed.', 405);
}

function reports_handler($conn, $doctor)
{
    $doctor_id = (int)$doctor['id'];
    $from = clean_input($_GET['from'] ?? date('Y-m-01'));
    $to = clean_input($_GET['to'] ?? date('Y-m-t'));
    
    // Overall summary for the period
    $stmt = mysqli_prepare($conn, 'SELECT COALESCE(SUM(fee),0) AS total_income, COUNT(*) AS total_appointments FROM appointments WHERE doctor_id = ? AND appointment_date BETWEEN ? AND ?');
    mysqli_stmt_bind_param($stmt, 'iss', $doctor_id, $from, $to);
    mysqli_stmt_execute($stmt);
    $summary = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    
    // New vs Old patient counts
    $new_count = count_rows($conn, "SELECT COUNT(*) FROM appointments WHERE doctor_id = ? AND appointment_type = 'New' AND appointment_date BETWEEN ? AND ?", 'iss', [$doctor_id, $from, $to]);
    $old_count = count_rows($conn, "SELECT COUNT(*) FROM appointments WHERE doctor_id = ? AND appointment_type = 'Old' AND appointment_date BETWEEN ? AND ?", 'iss', [$doctor_id, $from, $to]);
    
    // Daily breakdown
    $stmt = mysqli_prepare($conn, 'SELECT appointment_date, COUNT(*) AS visits, COALESCE(SUM(fee),0) AS income FROM appointments WHERE doctor_id = ? AND appointment_date BETWEEN ? AND ? GROUP BY appointment_date ORDER BY appointment_date DESC');
    mysqli_stmt_bind_param($stmt, 'iss', $doctor_id, $from, $to);
    mysqli_stmt_execute($stmt);
    $daily = rows_from_result(mysqli_stmt_get_result($stmt));

    $today = date('Y-m-d');
    
    // Today's OPD Status
    // More robust 'New' count: Patients whose first ever appointment is today
    $today_new = count_rows($conn, "SELECT COUNT(*) FROM appointments a WHERE a.doctor_id = ? AND a.appointment_date = ? AND NOT EXISTS (SELECT 1 FROM appointments a2 WHERE a2.patient_id = a.patient_id AND a2.appointment_date < a.appointment_date)", 'is', [$doctor_id, $today]);
    $today_scheduled_followup = count_rows($conn, "SELECT COUNT(*) FROM appointments WHERE doctor_id = ? AND next_followup_date = ?", 'is', [$doctor_id, $today]);
    $today_actual_followup = count_rows($conn, "SELECT COUNT(*) FROM appointments a WHERE a.doctor_id = ? AND a.appointment_date = ? AND EXISTS (SELECT 1 FROM appointments a2 WHERE a2.patient_id = a.patient_id AND a2.appointment_date < a.appointment_date)", 'is', [$doctor_id, $today]);

    // Future Follow-up Targets (Next 7 days)
    $stmt = mysqli_prepare($conn, "SELECT next_followup_date, COUNT(*) AS count FROM appointments WHERE doctor_id = ? AND next_followup_date > ? AND next_followup_date <= ? GROUP BY next_followup_date ORDER BY next_followup_date ASC");
    $next_week = date('Y-m-d', strtotime('+7 days'));
    mysqli_stmt_bind_param($stmt, 'iss', $doctor_id, $today, $next_week);
    mysqli_stmt_execute($stmt);
    $future_followups = rows_from_result(mysqli_stmt_get_result($stmt));

    // Total Patients registered
    $total_patients = count_rows($conn, 'SELECT COUNT(*) FROM patients WHERE doctor_id = ?', 'i', [$doctor_id]);

    api_response([
        'success' => true, 
        'data' => [
            'from' => $from, 
            'to' => $to, 
            'today' => [
                'new' => $today_new,
                'scheduled' => $today_scheduled_followup,
                'actual' => $today_actual_followup
            ],
            'future' => $future_followups,
            'summary' => $summary, 
            'total_patients' => $total_patients,
            'new_patients' => $new_count, 
            'old_patients' => $old_count, 
            'daily' => $daily
        ]
    ]);
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
$id = isset($parts[1]) && is_numeric($parts[1]) ? (int)$parts[1] : (isset($_GET['id']) && is_numeric($_GET['id']) ? (int)$_GET['id'] : 0);
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
        campaigns_handler($conn, $doctor, $method, $id);
        break;
    case 'reports':
        reports_handler($conn, $doctor);
        break;
    case 'calendar':
        calendar_handler($conn, $doctor);
        break;
    case 'whatsapp-templates':
        whatsapp_templates_handler($conn, $doctor, $method, $id);
        break;
    case 'campaign-templates':
        campaign_templates_handler($conn, $doctor, $method, $id);
        break;
    case 'upload-photo':
        if ($method !== 'POST') api_error('Method not allowed.', 405);
        if (!isset($_FILES['photo'])) api_error('No photo uploaded.', 400);
        $file = $_FILES['photo'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'])) api_error('Invalid file type.', 400);
        $name = 'doc_' . $doctor['id'] . '_' . time() . '.' . $ext;
        $dir = __DIR__ . '/../uploads/doctors/';
        if (!is_dir($dir)) mkdir($dir, 0777, true);
        if (move_uploaded_file($file['tmp_name'], $dir . $name)) {
            api_response(['success' => true, 'path' => 'uploads/doctors/' . $name]);
        }
        api_error('Failed to save file. Check folder permissions.', 500);
        break;
    default:
        api_error('Endpoint not found.', 404);
}

function whatsapp_templates_handler($conn, $doctor, $method, $id)
{
    $doctor_id = (int)$doctor['id'];
    if ($method === 'GET') {
        if ($id) {
            $stmt = mysqli_prepare($conn, 'SELECT * FROM whatsapp_templates WHERE id = ? AND doctor_id = ?');
            mysqli_stmt_bind_param($stmt, 'ii', $id, $doctor_id);
            mysqli_stmt_execute($stmt);
            $row = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
            $row ? api_response(['success' => true, 'data' => $row]) : api_error('Template not found.', 404);
        }
        $stmt = mysqli_prepare($conn, 'SELECT * FROM whatsapp_templates WHERE doctor_id = ? ORDER BY id DESC');
        mysqli_stmt_bind_param($stmt, 'i', $doctor_id);
        mysqli_stmt_execute($stmt);
        api_response(['success' => true, 'data' => rows_from_result(mysqli_stmt_get_result($stmt))]);
    }
    if ($method === 'POST') {
        $input = api_input();
        require_fields($input, ['template_name', 'variable_count', 'header_type']);
        $template_name = clean_input($input['template_name']);
        $variable_count = (int)$input['variable_count'];
        $header_type = clean_input($input['header_type']);
        $body_text = isset($input['body_text']) ? clean_input($input['body_text']) : '';
        
        $stmt = mysqli_prepare($conn, 'INSERT INTO whatsapp_templates (doctor_id, template_name, variable_count, header_type, body_text) VALUES (?, ?, ?, ?, ?)');
        if (!$stmt) {
            api_error('Failed to prepare template statement: ' . mysqli_error($conn), 500);
        }
        
        mysqli_stmt_bind_param($stmt, 'isiss', $doctor_id, $template_name, $variable_count, $header_type, $body_text);
        if (mysqli_stmt_execute($stmt)) {
            api_response(['success' => true, 'id' => mysqli_insert_id($conn)], 201);
        } else {
            api_error('Failed to save WhatsApp template: ' . mysqli_stmt_error($stmt), 500);
        }
    }
    if (($method === 'PUT' || $method === 'PATCH') && $id) {
        $input = api_input();
        require_fields($input, ['template_name', 'variable_count', 'header_type']);
        $template_name = clean_input($input['template_name']);
        $variable_count = (int)$input['variable_count'];
        $header_type = clean_input($input['header_type']);
        $body_text = isset($input['body_text']) ? clean_input($input['body_text']) : '';

        $stmt = mysqli_prepare($conn, 'UPDATE whatsapp_templates SET template_name = ?, variable_count = ?, header_type = ?, body_text = ? WHERE id = ? AND doctor_id = ?');
        mysqli_stmt_bind_param($stmt, 'sisiii', $template_name, $variable_count, $header_type, $body_text, $id, $doctor_id);
        if (mysqli_stmt_execute($stmt)) {
            api_response(['success' => true, 'message' => 'Template updated.']);
        } else {
            api_error('Failed to update WhatsApp template: ' . mysqli_stmt_error($stmt), 500);
        }
    }
    if ($method === 'DELETE' && $id) {
        $stmt = mysqli_prepare($conn, 'DELETE FROM whatsapp_templates WHERE id = ? AND doctor_id = ?');
        mysqli_stmt_bind_param($stmt, 'ii', $id, $doctor_id);
        mysqli_stmt_execute($stmt);
        api_response(['success' => true, 'message' => 'Template deleted.']);
    }
}

function campaign_templates_handler($conn, $doctor, $method, $id)
{
    $doctor_id = (int)$doctor['id'];
    if ($method === 'GET') {
        if ($id) {
            $stmt = mysqli_prepare($conn, 'SELECT * FROM campaign_templates WHERE id = ? AND doctor_id = ?');
            mysqli_stmt_bind_param($stmt, 'ii', $id, $doctor_id);
            mysqli_stmt_execute($stmt);
            $row = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
            $row ? api_response(['success' => true, 'data' => $row]) : api_error('Template not found.', 404);
        }
        $stmt = mysqli_prepare($conn, 'SELECT * FROM campaign_templates WHERE doctor_id = ? ORDER BY id DESC');
        mysqli_stmt_bind_param($stmt, 'i', $doctor_id);
        mysqli_stmt_execute($stmt);
        api_response(['success' => true, 'data' => rows_from_result(mysqli_stmt_get_result($stmt))]);
    }
    if ($method === 'POST') {
        $input = api_input();
        require_fields($input, ['name', 'var1', 'var2', 'var3', 'image_path']);
        $stmt = mysqli_prepare($conn, 'INSERT INTO campaign_templates (doctor_id, name, var1, var2, var3, image_path) VALUES (?, ?, ?, ?, ?, ?)');
        mysqli_stmt_bind_param($stmt, 'isssss', $doctor_id, $input['name'], $input['var1'], $input['var2'], $input['var3'], $input['image_path']);
        mysqli_stmt_execute($stmt);
        api_response(['success' => true, 'id' => mysqli_insert_id($conn)], 201);
    }
    if (($method === 'PUT' || $method === 'PATCH') && $id) {
        $input = api_input();
        require_fields($input, ['name', 'var1', 'var2', 'var3']);
        $name = clean_input($input['name']);
        $v1 = clean_input($input['var1']);
        $v2 = clean_input($input['var2']);
        $v3 = clean_input($input['var3']);
        $img = $input['image_path'] ?? '';

        $stmt = mysqli_prepare($conn, 'UPDATE campaign_templates SET name = ?, var1 = ?, var2 = ?, var3 = ?, image_path = ? WHERE id = ? AND doctor_id = ?');
        mysqli_stmt_bind_param($stmt, 'sssssii', $name, $v1, $v2, $v3, $img, $id, $doctor_id);
        if (mysqli_stmt_execute($stmt)) {
            api_response(['success' => true, 'message' => 'Internal template updated.']);
        } else {
            api_error('Failed to update template: ' . mysqli_stmt_error($stmt), 500);
        }
    }
    if ($method === 'DELETE' && $id) {
        $stmt = mysqli_prepare($conn, 'DELETE FROM campaign_templates WHERE id = ? AND doctor_id = ?');
        mysqli_stmt_bind_param($stmt, 'ii', $id, $doctor_id);
        mysqli_stmt_execute($stmt);
        api_response(['success' => true, 'message' => 'Template deleted.']);
    }
}
?>
