<?php
require_once 'includes/auth.php';
$doctor_id = current_doctor_id();
$month = clean_input($_GET['month'] ?? date('Y-m'));
$start = $month . '-01';
$days = (int)date('t', strtotime($start));
$end = date('Y-m-t', strtotime($start));
$prev_month = date('Y-m', strtotime($start . ' -1 month'));
$next_month = date('Y-m', strtotime($start . ' +1 month'));
$first_weekday = (int)date('N', strtotime($start));
$today = date('Y-m-d');

$stmt = mysqli_prepare($conn, 'SELECT a.appointment_date, p.name AS patient_name, a.appointment_type FROM appointments a JOIN patients p ON p.id = a.patient_id WHERE a.doctor_id = ? AND a.appointment_date BETWEEN ? AND ? ORDER BY a.appointment_date, a.id');
mysqli_stmt_bind_param($stmt, 'iss', $doctor_id, $start, $end);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);
$events = [];
while ($row = mysqli_fetch_assoc($result)) {
    $events[$row['appointment_date']][] = $row;
}

$page_title = 'Appointment Calendar';
$page_subtitle = 'Scan the month and spot upcoming visits quickly.';
require_once 'includes/header.php';
?>
<section class="card calendar-toolbar" style="padding: 12px 20px;">
    <div style="display:flex; gap:10px;">
        <a class="btn" href="calendar.php?month=<?php echo e($prev_month); ?>"><?php echo icon('prev'); ?></a>
        <a class="btn" href="calendar.php?month=<?php echo e($next_month); ?>"><?php echo icon('next'); ?></a>
    </div>
    
    <div class="calendar-title">
        <h2 style="margin:0; font-size: 20px;"><?php echo e(date('F Y', strtotime($start))); ?></h2>
    </div>

    <form method="get" class="actions" style="gap: 6px;">
        <input type="month" name="month" value="<?php echo e($month); ?>" style="min-height: 36px; padding: 4px 10px; width: 160px;">
        <button class="btn btn-primary" type="submit" style="min-height: 36px;">Go</button>
    </form>
</section>

<section class="calendar" style="margin-top:16px;">
    <?php foreach (['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] as $weekday): ?>
        <div class="weekday"><?php echo e($weekday); ?></div>
    <?php endforeach; ?>
    <?php for ($blank = 1; $blank < $first_weekday; $blank++): ?>
        <div class="day day-muted"></div>
    <?php endfor; ?>
    <?php for ($day = 1; $day <= $days; $day++): ?>
        <?php $date = $month . '-' . str_pad((string)$day, 2, '0', STR_PAD_LEFT); ?>
        <div class="day <?php echo $date === $today ? 'day-today' : ''; ?>">
            <strong><?php echo e($day); ?></strong>
            <?php foreach (($events[$date] ?? []) as $event): ?>
                <span class="event"><?php echo e($event['patient_name']); ?> <span class="badge"><?php echo e($event['appointment_type']); ?></span></span>
            <?php endforeach; ?>
        </div>
    <?php endfor; ?>
</section>
<?php require_once 'includes/footer.php'; ?>
