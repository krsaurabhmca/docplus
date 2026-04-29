document.addEventListener('DOMContentLoaded', function () {
    var body = document.body;
    var openButton = document.querySelector('[data-sidebar-open]');
    var closeTargets = document.querySelectorAll('[data-sidebar-close], .nav a, .logout');
    var toggleButtons = document.querySelectorAll('[data-sidebar-toggle]');

    if (localStorage.getItem('docplus-sidebar-collapsed') === '1') {
        body.classList.add('sidebar-collapsed');
    }

    if (openButton) {
        openButton.addEventListener('click', function () {
            body.classList.add('sidebar-open');
        });
    }

    closeTargets.forEach(function (item) {
        item.addEventListener('click', function () {
            body.classList.remove('sidebar-open');
        });
    });

    toggleButtons.forEach(function (toggleButton) {
        toggleButton.addEventListener('click', function () {
            body.classList.toggle('sidebar-collapsed');
            localStorage.setItem('docplus-sidebar-collapsed', body.classList.contains('sidebar-collapsed') ? '1' : '0');
        });
    });

    document.querySelectorAll('table').forEach(function (table) {
        var headers = Array.from(table.querySelectorAll('thead th')).map(function (header) {
            return header.textContent.replace(/\s+/g, ' ').trim();
        });

        table.querySelectorAll('tbody tr').forEach(function (row) {
            Array.from(row.children).forEach(function (cell, index) {
                if (!cell.hasAttribute('data-label') && headers[index]) {
                    cell.setAttribute('data-label', headers[index]);
                }
            });
        });
    });

    document.querySelectorAll('[data-copy-target]').forEach(function (button) {
        button.addEventListener('click', function () {
            var target = document.getElementById(button.getAttribute('data-copy-target'));
            if (!target) {
                return;
            }

            var text = target.textContent;
            navigator.clipboard.writeText(text).then(function () {
                var oldText = button.textContent;
                button.textContent = 'Copied';
                setTimeout(function () {
                    button.textContent = oldText.trim() || 'Copy';
                }, 1200);
            });
        });
    });
});
