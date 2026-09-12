/* Local library backup for the static GitHub Pages version. */
(function () {
    'use strict';

    var MAX_FILE_BYTES = 1024 * 1024;
    var ALLOWED_KEYS = [
        'neon_watchlist', 'neon_watch_history', 'neon_last_watched',
        'neon_schedule_reminders', 'neon_gami', 'neon_is_logged_in',
        'neon_is_vip', 'neon_user_name', 'neon_user_username',
        'neon_user_avatar', 'neon_user_email', 'neon_user_joined'
    ];

    function allowedKey(key) {
        return ALLOWED_KEYS.indexOf(key) !== -1 || key.indexOf('neon_progress_') === 0 || key.indexOf('neon_sort_') === 0;
    }

    function getLibrary() {
        var data = {};
        for (var i = 0; i < window.localStorage.length; i += 1) {
            var key = window.localStorage.key(i);
            if (key && allowedKey(key)) data[key] = window.localStorage.getItem(key);
        }
        return data;
    }

    function setStatus(message, type) {
        var status = document.getElementById('libraryBackupStatus');
        if (!status) return;
        status.textContent = message;
        status.dataset.state = type || 'info';
    }

    function downloadBackup() {
        var payload = {
            format: 'neon-anime-library',
            version: 1,
            exportedAt: new Date().toISOString(),
            data: getLibrary()
        };
        var blob = new Blob([JSON.stringify(payload, null, 2) + '\n'], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = 'neon-anime-library-backup.json';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        setStatus('پشتیبان کتابخانه دانلود شد.', 'success');
    }

    function restoreBackup(file) {
        if (!file) return;
        if (file.size > MAX_FILE_BYTES) {
            setStatus('فایل پشتیبان بیش از حد بزرگ است.', 'error');
            return;
        }
        var reader = new FileReader();
        reader.onload = function () {
            try {
                var payload = JSON.parse(String(reader.result || ''));
                if (!payload || payload.format !== 'neon-anime-library' || payload.version !== 1 || !payload.data || typeof payload.data !== 'object') {
                    throw new Error('invalid format');
                }
                var entries = Object.keys(payload.data);
                if (entries.length > 500 || entries.some(function (key) { return !allowedKey(key); })) {
                    throw new Error('invalid keys');
                }
                if (!window.confirm('اطلاعات محلی فعلی با این پشتیبان جایگزین شود؟')) return;
                entries.forEach(function (key) { window.localStorage.setItem(key, String(payload.data[key])); });
                setStatus('پشتیبان با موفقیت بازیابی شد؛ صفحه در حال تازه‌سازی است.', 'success');
                setTimeout(function () { window.location.reload(); }, 700);
            } catch (error) {
                setStatus('این فایل پشتیبان معتبر نئون انیمه نیست.', 'error');
            }
        };
        reader.onerror = function () { setStatus('خواندن فایل پشتیبان ناموفق بود.', 'error'); };
        reader.readAsText(file);
    }

    document.addEventListener('DOMContentLoaded', function () {
        var exportButton = document.getElementById('exportLibraryButton');
        var importInput = document.getElementById('importLibraryInput');
        if (exportButton) exportButton.addEventListener('click', downloadBackup);
        if (importInput) importInput.addEventListener('change', function () {
            restoreBackup(importInput.files && importInput.files[0]);
            importInput.value = '';
        });
    });
})();
