<?php
require_once 'includes/auth.php';

$page_title = 'API Documentation';
$page_subtitle = 'Use these endpoints to connect mobile apps, WhatsApp services, dashboards, or third-party tools.';
require_once 'includes/header.php';

function code_block($title, $code, $language = 'http')
{
    static $count = 0;
    $count++;
    $id = 'code-sample-' . $count;
    ?>
    <div class="code-card">
        <div class="code-head">
            <strong><?php echo e($title); ?></strong>
            <button class="btn btn-soft copy-btn" type="button" data-copy-target="<?php echo e($id); ?>"><?php echo icon('copy'); ?> Copy</button>
        </div>
        <pre><code id="<?php echo e($id); ?>" class="language-<?php echo e($language); ?>"><?php echo e(trim($code)); ?></code></pre>
    </div>
    <?php
}
?>

<section class="docs-layout">
    <aside class="docs-toc card">
        <h2>API Sections</h2>
        <a href="#base">Base</a>
        <a href="#auth">Authentication</a>
        <a href="#profile">Doctor Profile</a>
        <a href="#categories">Categories</a>
        <a href="#patients">Patients</a>
        <a href="#appointments">Appointments</a>
        <a href="#campaigns">Campaigns</a>
        <a href="#reports">Reports</a>
        <a href="#calendar">Calendar</a>
        <a href="#errors">Errors</a>
    </aside>

    <div class="docs-content">
        <section id="base" class="card docs-section">
            <p class="eyebrow">Base URL</p>
            <h2>Local API Base</h2>
            <p class="muted">Use the `route` query parameter on XAMPP for maximum compatibility.</p>
            <?php code_block('Base URL', 'http://localhost/docplus/api/index.php'); ?>
            <?php code_block('Protected Request Headers', "Authorization: Bearer YOUR_API_TOKEN\nX-API-Token: YOUR_API_TOKEN\nContent-Type: application/json"); ?>
        </section>

        <section id="auth" class="card docs-section">
            <p class="eyebrow">Step 1</p>
            <h2>Authentication</h2>
            <p class="muted">Request an OTP, verify it, then use the returned token for all protected endpoints.</p>
            <?php code_block('Request OTP', "POST /docplus/api/index.php?route=auth/request-otp\n\n{\n  \"mobile\": \"9431426600\"\n}", 'json'); ?>
            <?php code_block('Verify OTP', "POST /docplus/api/index.php?route=auth/verify-otp\n\n{\n  \"mobile\": \"9431426600\",\n  \"otp\": \"123456\"\n}", 'json'); ?>
            <?php code_block('cURL Auth Example', "curl -X POST \"http://localhost/docplus/api/index.php?route=auth/request-otp\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"mobile\":\"9431426600\"}'", 'bash'); ?>
        </section>

        <section id="profile" class="card docs-section">
            <p class="eyebrow">Doctor</p>
            <h2>Doctor Profile</h2>
            <?php code_block('Get Profile', 'GET /docplus/api/index.php?route=profile'); ?>
            <?php code_block('Update Profile', "PUT /docplus/api/index.php?route=profile\n\n{\n  \"name\": \"Dr. Sharma\",\n  \"qualification\": \"MBBS, MD\",\n  \"specialization\": \"General Physician\",\n  \"fee\": 500,\n  \"fee_repeat_days\": 7,\n  \"clinic_name\": \"DocPlus Clinic\",\n  \"clinic_address\": \"Main Road\"\n}", 'json'); ?>
        </section>

        <section id="categories" class="card docs-section">
            <p class="eyebrow">Patient Grouping</p>
            <h2>Patient Categories</h2>
            <?php code_block('List Categories', 'GET /docplus/api/index.php?route=categories&q=general&page=1&limit=20'); ?>
            <?php code_block('Create Category', "POST /docplus/api/index.php?route=categories\n\n{\n  \"name\": \"Diabetes\",\n  \"description\": \"Diabetes follow-up patients\"\n}", 'json'); ?>
            <?php code_block('Update Category', "PUT /docplus/api/index.php?route=categories/1\n\n{\n  \"name\": \"General\",\n  \"description\": \"Walk-in and regular patients\"\n}", 'json'); ?>
            <?php code_block('Delete Category', 'DELETE /docplus/api/index.php?route=categories/1'); ?>
        </section>

        <section id="patients" class="card docs-section">
            <p class="eyebrow">Patient Records</p>
            <h2>Patients</h2>
            <?php code_block('List Patients', 'GET /docplus/api/index.php?route=patients&q=jonas&page=1&limit=20'); ?>
            <?php code_block('Get Patient', 'GET /docplus/api/index.php?route=patients/2'); ?>
            <?php code_block('Patient Profile With Ledger', 'GET /docplus/api/index.php?route=patients/2/profile'); ?>
            <?php code_block('Create Patient', "POST /docplus/api/index.php?route=patients\n\n{\n  \"category_id\": 1,\n  \"name\": \"Jonas Campbell\",\n  \"age\": 34,\n  \"gender\": \"Male\",\n  \"mobile\": \"9876543210\",\n  \"address\": \"Clinic Road\"\n}", 'json'); ?>
            <?php code_block('Update Patient', "PUT /docplus/api/index.php?route=patients/2\n\n{\n  \"category_id\": 1,\n  \"name\": \"Jonas Campbell\",\n  \"age\": 35,\n  \"gender\": \"Male\",\n  \"mobile\": \"9876543210\",\n  \"address\": \"Updated address\"\n}", 'json'); ?>
            <?php code_block('Delete Patient', 'DELETE /docplus/api/index.php?route=patients/2'); ?>
        </section>

        <section id="appointments" class="card docs-section">
            <p class="eyebrow">Visits</p>
            <h2>Appointments</h2>
            <?php code_block('List Appointments', 'GET /docplus/api/index.php?route=appointments&from=2026-04-01&to=2026-04-30&q=jonas&page=1&limit=20'); ?>
            <?php code_block('Create Appointment', "POST /docplus/api/index.php?route=appointments\n\n{\n  \"patient_id\": 2,\n  \"appointment_type\": \"Old\",\n  \"appointment_date\": \"2026-04-29\",\n  \"fee\": 500,\n  \"next_followup_date\": \"2026-05-06\",\n  \"remarks\": \"Routine follow-up\"\n}", 'json'); ?>
            <?php code_block('Update Appointment', "PUT /docplus/api/index.php?route=appointments/10\n\n{\n  \"patient_id\": 2,\n  \"appointment_type\": \"Old\",\n  \"appointment_date\": \"2026-04-29\",\n  \"fee\": 500,\n  \"next_followup_date\": \"2026-05-06\",\n  \"remarks\": \"Updated remarks\"\n}", 'json'); ?>
            <?php code_block('Delete Appointment', 'DELETE /docplus/api/index.php?route=appointments/10'); ?>
        </section>

        <section id="campaigns" class="card docs-section">
            <p class="eyebrow">Messaging</p>
            <h2>Campaigns</h2>
            <?php code_block('List Campaigns', 'GET /docplus/api/index.php?route=campaigns&page=1&limit=20'); ?>
            <?php code_block('Create Campaign Log', "POST /docplus/api/index.php?route=campaigns\n\n{\n  \"category_id\": 1,\n  \"channel\": \"WhatsApp\",\n  \"message\": \"Clinic will remain open tomorrow from 10 AM.\"\n}", 'json'); ?>
        </section>

        <section id="reports" class="card docs-section">
            <p class="eyebrow">Analytics</p>
            <h2>Reports</h2>
            <?php code_block('Income Report', 'GET /docplus/api/index.php?route=reports&from=2026-04-01&to=2026-04-30'); ?>
        </section>

        <section id="calendar" class="card docs-section">
            <p class="eyebrow">Calendar</p>
            <h2>Appointment Calendar</h2>
            <?php code_block('Month Events', 'GET /docplus/api/index.php?route=calendar&month=2026-04'); ?>
        </section>

        <section id="errors" class="card docs-section">
            <p class="eyebrow">Format</p>
            <h2>Responses and Errors</h2>
            <?php code_block('List Response', "{\n  \"success\": true,\n  \"data\": [],\n  \"meta\": {\n    \"total\": 0,\n    \"page\": 1,\n    \"limit\": 20,\n    \"pages\": 1\n  }\n}", 'json'); ?>
            <?php code_block('Error Response', "{\n  \"success\": false,\n  \"message\": \"Required fields are missing.\",\n  \"errors\": [\"name\"]\n}", 'json'); ?>
        </section>
    </div>
</section>

<?php require_once 'includes/footer.php'; ?>
