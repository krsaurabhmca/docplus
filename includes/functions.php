<?php
function clean_input($value)
{
    return trim((string)$value);
}

function e($value)
{
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}

function redirect($path)
{
    header('Location: ' . $path);
    exit;
}

function flash_set($type, $message)
{
    $_SESSION['flash'] = ['type' => $type, 'message' => $message];
}

function flash_show()
{
    if (empty($_SESSION['flash'])) {
        return;
    }

    $flash = $_SESSION['flash'];
    unset($_SESSION['flash']);
    echo '<div class="alert alert-' . e($flash['type']) . '">' . e($flash['message']) . '</div>';
}

function current_doctor_id()
{
    return isset($_SESSION['doctor_id']) ? (int)$_SESSION['doctor_id'] : 0;
}

function doctor_fee($conn, $doctor_id)
{
    $stmt = mysqli_prepare($conn, 'SELECT fee FROM doctors WHERE id = ?');
    mysqli_stmt_bind_param($stmt, 'i', $doctor_id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $row = mysqli_fetch_assoc($result);
    return $row ? (float)$row['fee'] : 0;
}

function bind_params($stmt, $types, &$params)
{
    $refs = [];
    foreach ($params as $key => &$value) {
        $refs[$key] = &$value;
    }
    mysqli_stmt_bind_param($stmt, $types, ...$refs);
}

function count_rows($conn, $sql, $types = '', $params = [])
{
    $stmt = mysqli_prepare($conn, $sql);
    if ($types !== '') {
        bind_params($stmt, $types, $params);
    }
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $row = mysqli_fetch_row($result);
    return (int)($row[0] ?? 0);
}

function icon($name)
{
    $icons = [
        'overview' => '<path d="M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z"/>',
        'calendar' => '<path d="M7 2v3M17 2v3M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/>',
        'patients' => '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
        'reports' => '<path d="M3 3v18h18"/><path d="M7 16v-5M12 16V7M17 16v-8"/>',
        'campaigns' => '<path d="m3 11 18-8-8 18-2-7-8-3Z"/><path d="m11 14 10-11"/>',
        'category' => '<path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z"/>',
        'profile' => '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>',
        'logout' => '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
        'plus' => '<path d="M12 5v14M5 12h14"/>',
        'search' => '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
        'prev' => '<path d="m15 18-6-6 6-6"/>',
        'next' => '<path d="m9 18 6-6-6-6"/>',
        'menu' => '<path d="M4 6h16M4 12h16M4 18h16"/>',
        'sidebar' => '<path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5Z"/><path d="M9 3v18"/>',
        'docs' => '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h6"/>',
        'copy' => '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
        'edit' => '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/>',
        'delete' => '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>',
        'close' => '<path d="M18 6 6 18M6 6l12 12"/>',
        'save' => '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
        'call' => '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.77.63 2.6a2 2 0 0 1-.45 2.11L8 9.72a16 16 0 0 0 6.28 6.28l1.29-1.29a2 2 0 0 1 2.11-.45c.83.3 1.7.51 2.6.63A2 2 0 0 1 22 16.92Z"/>',
        'whatsapp' => '<path d="M20.5 11.8a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.3-4.7a8.5 8.5 0 1 1 16.2-4Z"/><path d="M8.8 8.6c.2-.5.4-.5.7-.5h.5c.2 0 .4 0 .6.4l.8 1.9c.1.2.1.4 0 .6l-.5.7c-.1.2-.2.3 0 .6.6 1 1.4 1.8 2.5 2.3.3.2.4.1.6-.1l.7-.9c.2-.2.4-.2.6-.1l1.9.9c.3.1.4.3.4.5-.1.7-.5 1.4-1.1 1.7-.6.3-2.5.4-5.1-1.5-2.6-1.9-4-4.6-4.1-5.6-.1-.5.3-1.2.5-1.4Z"/>',
        'view' => '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    ];

    $path = $icons[$name] ?? $icons['overview'];
    return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">' . $path . '</svg>';
}

function page_number()
{
    return max(1, (int)($_GET['page'] ?? 1));
}

function page_size()
{
    $allowed = [10, 20, 50, 100];
    $size = (int)($_GET['limit'] ?? 10);
    return in_array($size, $allowed, true) ? $size : 10;
}

function sort_state($allowed, $default_column, $default_dir = 'DESC')
{
    $sort = $_GET['sort'] ?? $default_column;
    $dir = strtoupper($_GET['dir'] ?? $default_dir);
    if (!isset($allowed[$sort])) {
        $sort = $default_column;
    }
    if (!in_array($dir, ['ASC', 'DESC'], true)) {
        $dir = $default_dir;
    }
    return [$sort, $dir, $allowed[$sort]];
}

function sort_link($label, $column, $current_sort, $current_dir)
{
    $params = $_GET;
    $params['sort'] = $column;
    $params['dir'] = ($current_sort === $column && $current_dir === 'ASC') ? 'DESC' : 'ASC';
    $params['page'] = 1;
    $arrow = $current_sort === $column ? ($current_dir === 'ASC' ? ' up' : ' down') : '';
    return '<a class="sort-link" href="?' . http_build_query($params) . '">' . e($label) . '<span>' . e($arrow) . '</span></a>';
}

function pagination($total, $page, $limit)
{
    $pages = max(1, (int)ceil($total / $limit));
    if ($pages <= 1) {
        return '';
    }

    $html = '<div class="pagination">';
    $params = $_GET;
    for ($i = 1; $i <= $pages; $i++) {
        if ($i > 2 && $i < $page - 1) {
            if ($i === 3) {
                $html .= '<span>...</span>';
            }
            continue;
        }
        if ($i < $pages - 1 && $i > $page + 1) {
            if ($i === $page + 2) {
                $html .= '<span>...</span>';
            }
            continue;
        }
        $params['page'] = $i;
        $class = $i === $page ? ' class="active"' : '';
        $html .= '<a' . $class . ' href="?' . http_build_query($params) . '">' . $i . '</a>';
    }
    $html .= '</div>';
    return $html;
}

function date_range_from_request($default = 'this_month')
{
    $range = clean_input($_GET['range'] ?? $default);
    $today = date('Y-m-d');
    if ($range === 'today') {
        return [$range, $today, $today];
    }
    if ($range === 'last_7') {
        return [$range, date('Y-m-d', strtotime('-6 days')), $today];
    }
    if ($range === 'this_year') {
        return [$range, date('Y-01-01'), date('Y-12-31')];
    }
    if ($range === 'custom') {
        $from = clean_input($_GET['from'] ?? date('Y-m-01'));
        $to = clean_input($_GET['to'] ?? date('Y-m-t'));
        return [$range, $from, $to];
    }
    return ['this_month', date('Y-m-01'), date('Y-m-t')];
}

function date_range_controls($range, $from, $to)
{
    $items = [
        'today' => 'Today',
        'last_7' => 'Last 7 Days',
        'this_month' => 'This Month',
        'this_year' => 'This Year',
        'custom' => 'Custom'
    ];
    echo '<input type="hidden" name="range" value="' . e($range) . '">';
    echo '<div class="range-bar">';
    foreach ($items as $value => $label) {
        $params = $_GET;
        $params['range'] = $value;
        $params['page'] = 1;
        if ($value !== 'custom') {
            unset($params['from'], $params['to']);
        }
        $class = $range === $value ? ' class="active"' : '';
        echo '<a' . $class . ' href="?' . http_build_query($params) . '">' . e($label) . '</a>';
    }
    echo '</div>';
    if ($range === 'custom') {
        echo '<div class="actions compact-range">';
        echo '<input type="date" name="from" value="' . e($from) . '">';
        echo '<input type="date" name="to" value="' . e($to) . '">';
        echo '<button class="btn" type="submit">Apply</button>';
        echo '</div>';
    }
}
?>
