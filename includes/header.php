<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$page_title = $page_title ?? 'DocPlus';
$page_subtitle = $page_subtitle ?? 'Manage your clinic work from one place.';
$current_page = basename($_SERVER['PHP_SELF']);

function nav_class($file, $current_page)
{
    return $file === $current_page ? 'class="active"' : '';
}
?>
<!doctype html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>
        <?php echo e($page_title); ?> | DocPlus
    </title>

    <!-- Google Font: Roboto -->
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">

    <link rel="stylesheet" href="assets/css/style.css">
</head>

<body>
    <div class="app-shell">
        <div class="sidebar-backdrop" data-sidebar-close></div>
        <aside class="sidebar">
            <a class="brand" href="dashboard.php">
                <span class="brand-mark">DP</span>
                <span>
                    DocPlus
                    <small>Clinic SaaS</small>
                </span>
            </a>
            <nav class="nav">
                <a <?php echo nav_class('dashboard.php', $current_page); ?>
                    href="dashboard.php"><?php echo icon('overview'); ?><span>Overview</span></a>
                <a <?php echo nav_class('appointments.php', $current_page); ?>
                    href="appointments.php"><?php echo icon('calendar'); ?><span>Appointments</span></a>
                <a <?php echo nav_class('patients.php', $current_page); ?>
                    href="patients.php"><?php echo icon('patients'); ?><span>Patients</span></a>
                <a <?php echo nav_class('calendar.php', $current_page); ?>
                    href="calendar.php"><?php echo icon('calendar'); ?><span>Calendar</span></a>
                <a <?php echo nav_class('reports.php', $current_page); ?>
                    href="reports.php"><?php echo icon('reports'); ?><span>Reports</span></a>
                <a <?php echo nav_class('campaigns.php', $current_page); ?>
                    href="campaigns.php"><?php echo icon('campaigns'); ?><span>Campaigns</span></a>
                <a <?php echo nav_class('categories.php', $current_page); ?>
                    href="categories.php"><?php echo icon('category'); ?><span>Categories</span></a>
                <a <?php echo nav_class('profile.php', $current_page); ?>
                    href="profile.php"><?php echo icon('profile'); ?><span>Doctor Profile</span></a>
                <a <?php echo nav_class('api-docs.php', $current_page); ?>
                    href="api-docs.php"><?php echo icon('docs'); ?><span>API Docs</span></a>
            </nav>
            <a class="logout" href="logout.php"><?php echo icon('logout'); ?><span>Logout</span></a>
        </aside>
        <main class="main">
            <div class="mobile-bar">
                <button class="icon-btn" type="button" data-sidebar-open
                    aria-label="Open menu"><?php echo icon('menu'); ?></button>
                <a class="mobile-brand" href="dashboard.php"><span
                        class="brand-mark">DP</span><strong>DocPlus</strong></a>
                <button class="icon-btn hide-on-mobile" type="button" data-sidebar-toggle
                    aria-label="Hide sidebar"><?php echo icon('sidebar'); ?></button>
            </div>
            <header class="topbar">
                <div>
                    <p class="eyebrow">Clinic workspace</p>
                    <h1><?php echo e($page_title); ?></h1>
                    <p class="page-subtitle"><?php echo e($page_subtitle); ?></p>
                </div>
                <div class="top-actions">
                    <button class="icon-btn desktop-sidebar-toggle" type="button" data-sidebar-toggle
                        aria-label="Hide sidebar"><?php echo icon('sidebar'); ?></button>
                    <a class="btn btn-soft" href="patient-form.php"><?php echo icon('plus'); ?> Add Patient</a>
                    <a class="btn btn-primary" href="appointment-form.php"><?php echo icon('calendar'); ?> New
                        Appointment</a>
                </div>
            </header>
            <?php flash_show(); ?>