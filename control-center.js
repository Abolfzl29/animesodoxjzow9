/*
 * Neon Anime Ops — safe, same-origin control surface.
 *
 * This file deliberately never accepts, stores, renders, copies, or downloads
 * a secret. Real operations are expected behind authenticated, allowlisted
 * same-origin endpoints such as /api/ops/health and /api/ops/actions.
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'neon_ops_connection';
    const BANNER_KEY = 'neon_ops_security_banner_dismissed';
    const DEFAULT_CONNECTION = {
        name: 'neon-prod-01',
        host: 'api.neon-anime.example',
        port: 443,
        path: '/api/ops',
        region: 'EU / Frankfurt'
    };
    const state = {
        connection: loadConnection(),
        mode: 'demo',
        selectedOperation: null,
        lastHealth: null
    };

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

    function loadConnection() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
            if (!saved || typeof saved !== 'object') return { ...DEFAULT_CONNECTION };
            return {
                name: cleanText(saved.name, DEFAULT_CONNECTION.name, 80),
                host: cleanText(saved.host, DEFAULT_CONNECTION.host, 180),
                port: clampNumber(saved.port, DEFAULT_CONNECTION.port, 1, 65535),
                path: cleanPath(saved.path, DEFAULT_CONNECTION.path),
                region: cleanText(saved.region, DEFAULT_CONNECTION.region, 80)
            };
        } catch (error) {
            return { ...DEFAULT_CONNECTION };
        }
    }

    function cleanText(value, fallback, maxLength) {
        const text = String(value == null ? '' : value).trim();
        return text ? text.slice(0, maxLength) : fallback;
    }

    function cleanPath(value, fallback) {
        let path = cleanText(value, fallback, 80);
        if (!path.startsWith('/')) path = '/' + path;
        return path.replace(/\/{2,}/g, '/').replace(/\/$/, '') || fallback;
    }

    function clampNumber(value, fallback, min, max) {
        const number = Number(value);
        return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
    }

    function saveConnection(connection) {
        state.connection = connection;
        // Only non-sensitive connection metadata is persisted. There is no key
        // input in this UI and no secret is ever written to localStorage.
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(connection)); } catch (error) {}
        renderConnection();
    }

    function renderConnection() {
        const { connection } = state;
        const name = $('#serverName');
        const endpoint = $('#serverEndpoint');
        const region = $('#serverRegion');
        if (name) name.textContent = connection.name;
        if (endpoint) endpoint.innerHTML = `${escapeHtml(connection.host)} <span>·</span> HTTPS:${connection.port}`;
        if (region) region.textContent = connection.region;
        const hostInput = $('#connectionHost');
        const nameInput = $('#connectionName');
        const portInput = $('#connectionPort');
        const pathInput = $('#connectionPath');
        if (hostInput) hostInput.value = connection.host;
        if (nameInput) nameInput.value = connection.name;
        if (portInput) portInput.value = connection.port;
        if (pathInput) pathInput.value = connection.path;
    }

    // This is for UI text generated from user-provided connection metadata.
    function escapeHtml(value) {
        return String(value).replace(/[&<>'"]/g, character => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[character]));
    }

    function applyTheme(theme) {
        const isLight = theme === 'light';
        if (isLight) document.documentElement.setAttribute('data-theme', 'light');
        else document.documentElement.removeAttribute('data-theme');
        try { localStorage.setItem('neon_theme', isLight ? 'light' : 'dark'); } catch (error) {}
        const meta = $('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', isLight ? '#f4f6fa' : '#080a10');
        const button = $('#themeButton');
        if (button) {
            button.setAttribute('aria-pressed', String(isLight));
            button.title = isLight ? 'حالت شب' : 'حالت روز';
        }
    }

    function currentTheme() {
        return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    }

    function showToast(message, type = 'info') {
        const region = $('#toastRegion');
        if (!region) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? '✓' : type === 'warning' ? '!' : type === 'error' ? '×' : '•';
        toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${escapeHtml(message)}</span>`;
        region.appendChild(toast);
        window.setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(8px)';
            window.setTimeout(() => toast.remove(), 240);
        }, 4400);
    }

    function openModal(id) {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.hidden = false;
        document.body.classList.add('modal-open');
        const focusable = modal.querySelector('input, button');
        if (focusable) window.setTimeout(() => focusable.focus(), 40);
    }

    function closeModal(id) {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.hidden = true;
        if (!$$('.modal-backdrop:not([hidden])').length) document.body.classList.remove('modal-open');
    }

    function toggleSidebar(force) {
        const sidebar = $('#opsSidebar');
        const backdrop = $('#sidebarBackdrop');
        const button = $('#mobileMenuButton');
        if (!sidebar || !backdrop) return;
        const shouldOpen = typeof force === 'boolean' ? force : !sidebar.classList.contains('is-open');
        sidebar.classList.toggle('is-open', shouldOpen);
        backdrop.classList.toggle('is-visible', shouldOpen);
        if (button) button.setAttribute('aria-expanded', String(shouldOpen));
    }

    function renderHealthStatus(kind, label, detail) {
        const status = $('#serverStatus');
        const healthLabel = $('#healthLabel');
        const healthBar = $('#healthBar');
        const lastChecked = $('#lastChecked');
        if (status) {
            status.className = `status-chip ${kind === 'live' ? 'status-live' : kind === 'error' ? 'status-error' : 'status-demo'}`;
            status.innerHTML = `<i></i> ${escapeHtml(label)}`;
        }
        if (healthLabel) {
            healthLabel.textContent = detail || label;
            healthLabel.style.color = kind === 'live' ? 'var(--ops-green)' : kind === 'error' ? 'var(--ops-pink)' : 'var(--ops-yellow)';
        }
        if (healthBar) healthBar.style.width = kind === 'live' ? '96%' : kind === 'error' ? '22%' : '78%';
        if (lastChecked) {
            lastChecked.textContent = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date());
        }
    }

    function addActivity(title, detail, type = 'info', status = 'ثبت شد') {
        const list = $('#activityList');
        if (!list) return;
        const icons = { success: '✓', info: '↻', warning: '!', error: '×' };
        const statusClasses = { success: 'success-text', info: 'info-text', warning: 'warning-text', error: 'warning-text' };
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `<span class="activity-icon ${type}">${icons[type] || '•'}</span><div><strong>${escapeHtml(title)}</strong><small>اکنون · ${escapeHtml(detail)}</small></div><span class="activity-state ${statusClasses[type] || 'info-text'}">${escapeHtml(status)}</span>`;
        list.prepend(item);
        while (list.children.length > 5) list.lastElementChild.remove();
    }

    function setButtonLoading(button, isLoading, loadingLabel = 'در حال بررسی...') {
        if (!button) return;
        if (isLoading) {
            button.dataset.originalLabel = button.innerHTML;
            button.innerHTML = `<span class="button-loader"></span> ${loadingLabel}`;
            button.disabled = true;
        } else {
            button.innerHTML = button.dataset.originalLabel || button.innerHTML;
            button.disabled = false;
        }
    }

    async function requestOps(path, options = {}) {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 4500);
        const headers = { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
        try {
            const response = await fetch(path, { ...options, headers, credentials: 'same-origin', signal: controller.signal });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const contentType = response.headers.get('content-type') || '';
            return contentType.includes('application/json') ? await response.json() : {};
        } finally {
            window.clearTimeout(timeout);
        }
    }

    async function checkHealth(button, announce = true) {
        setButtonLoading(button, true);
        try {
            // The browser calls a same-origin endpoint. A production adapter
            // should authenticate this request with a secure session cookie.
            const data = await requestOps(`${state.connection.path}/health`, { method: 'GET' });
            state.mode = 'connected';
            state.lastHealth = data;
            renderHealthStatus('live', 'متصل', data.status || 'سرویس سالم');
            addActivity('بررسی سلامت سرور', 'پاسخ معتبر از بک‌اند', 'success', 'موفق');
            if (announce) showToast('اتصال به بک‌اند عملیات با موفقیت برقرار شد.', 'success');
            return true;
        } catch (error) {
            state.mode = 'demo';
            renderHealthStatus('demo', 'آماده اتصال', 'بک‌اند تنظیم نشده');
            addActivity('بررسی سلامت انجام نشد', 'endpoint بک‌اند پیدا نشد؛ حالت پیش‌نمایش', 'warning', 'در انتظار');
            if (announce) showToast('بک‌اند عملیات هنوز روی این هاست فعال نیست؛ صفحه در حالت پیش‌نمایش باقی ماند.', 'warning');
            return false;
        } finally {
            setButtonLoading(button, false);
        }
    }

    function getSafeBaseUrl() {
        const host = state.connection.host.replace(/^https?:\/\//i, '').replace(/\/$/, '');
        return `https://${host}:${state.connection.port}${state.connection.path}`;
    }

    function buildEnvExample() {
        return `# Neon Anime — safe environment template\n# این فایل را می‌توان commit کرد؛ مقدار واقعی secret را هرگز اینجا ننویس.\nNODE_ENV=production\nPORT=8080\nNEON_API_BASE_URL=${getSafeBaseUrl()}\nNEON_API_KEY=replace-with-secret-manager-value\n# Store the real key in your platform secret manager.\n`;
    }

    function buildManifest() {
        return JSON.stringify({
            name: 'neon-anime-ops-config',
            format: 'safe-template',
            generatedAt: new Date().toISOString(),
            server: {
                name: state.connection.name,
                host: state.connection.host,
                port: state.connection.port,
                region: state.connection.region,
                protocol: 'https'
            },
            api: {
                basePath: state.connection.path,
                key: '[stored-in-secret-manager]'
            },
            allowedOperations: ['health', 'deploy', 'cache', 'restart', 'rotate_api_key'],
            security: {
                secretsIncluded: false,
                note: 'The real API key must remain in a server-side secret manager.'
            }
        }, null, 2) + '\n';
    }

    function buildGithubGuide() {
        return [
            '# Neon Anime — secure deployment handoff',
            '',
            'این فایل عمداً هیچ API key واقعی ندارد.',
            '',
            '## فایل‌های امن',
            '- .env.example',
            '- neon-ops-config.json',
            '- control-center.html',
            '',
            '## راه‌اندازی secret روی سرور',
            '1. مقدار واقعی NEON_API_KEY را فقط در Secret Manager یا Environment Variables هاست ثبت کن.',
            '2. دسترسی آن را به سرویس بک‌اند بده، نه به کد مرورگر.',
            '3. endpoint های /api/ops/health و /api/ops/actions را با احراز هویت و allowlist فعال کن.',
            '4. پس از تغییر یا افشای احتمالی، کلید را rotate و revoke کن.',
            '',
            '## انتشار فایل‌های بدون secret',
            '~~~bash',
            'git add .env.example neon-ops-config.json GITHUB-SETUP.md',
            'git commit -m "docs: add safe ops configuration template"',
            'git push',
            '~~~',
            '',
            'هرگز فایل .env واقعی، private key یا token را commit نکن.',
            ''
        ].join('\n');
    }

    function downloadFile(filename, content, type) {
        const blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast(`${filename} آماده دانلود شد؛ secret داخل فایل نیست.`, 'success');
    }

    async function copyText(text, successMessage) {
        try {
            await navigator.clipboard.writeText(text);
            showToast(successMessage, 'success');
        } catch (error) {
            showToast('کپی خودکار در این مرورگر فعال نیست؛ متن را از راهنمای دانلود بردار.', 'warning');
        }
    }

    function openActionConfirmation(operation, label) {
        state.selectedOperation = operation;
        const title = $('#actionModalTitle');
        const copy = $('#actionModalCopy');
        if (title) title.textContent = `تأیید ${label}`;
        if (copy) copy.textContent = state.mode === 'connected'
            ? `عملیات «${label}» از مسیر مجاز سرور اجرا می‌شود و در گزارش فعالیت ثبت خواهد شد.`
            : `عملیات «${label}» بعد از فعال شدن endpoint بک‌اند اجرا می‌شود. در حالت پیش‌نمایش هیچ تغییری روی سرور ایجاد نمی‌شود.`;
        openModal('actionModal');
    }

    async function executeSelectedOperation() {
        const operation = state.selectedOperation;
        const button = $('#confirmActionButton');
        if (!operation) return;
        if (state.mode !== 'connected') {
            closeModal('actionModal');
            showToast('برای اجرای عملیات، ابتدا بک‌اند امن را روی سرور فعال و اتصال را بررسی کن.', 'warning');
            return;
        }
        setButtonLoading(button, true, 'در حال اجرا...');
        try {
            await requestOps(`${state.connection.path}/actions`, {
                method: 'POST',
                body: JSON.stringify({ action: operation })
            });
            addActivity(`اجرای ${operation}`, 'پاسخ معتبر از سرور', 'success', 'موفق');
            showToast('عملیات با موفقیت در سرور ثبت شد.', 'success');
            closeModal('actionModal');
        } catch (error) {
            addActivity(`اجرای ${operation}`, 'پاسخ نامعتبر از بک‌اند', 'error', 'ناموفق');
            showToast('اجرای عملیات ناموفق بود؛ لاگ بک‌اند را بررسی کن.', 'error');
        } finally {
            setButtonLoading(button, false);
        }
    }

    function bindNavigation() {
        $$('.ops-nav-link').forEach(link => {
            link.addEventListener('click', () => {
                $$('.ops-nav-link').forEach(item => item.classList.remove('active'));
                link.classList.add('active');
                toggleSidebar(false);
            });
        });
        const sections = $$('[data-section]');
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    const link = $(`[data-section-link="${entry.target.dataset.section}"]`);
                    if (!link) return;
                    $$('.ops-nav-link').forEach(item => item.classList.remove('active'));
                    link.classList.add('active');
                });
            }, { rootMargin: '-30% 0px -58% 0px', threshold: 0 });
            sections.forEach(section => observer.observe(section));
        }
    }

    function bindModals() {
        $$('[data-close-modal]').forEach(button => button.addEventListener('click', () => closeModal(button.dataset.closeModal)));
        $$('.modal-backdrop').forEach(backdrop => backdrop.addEventListener('click', event => {
            if (event.target === backdrop) closeModal(backdrop.id);
        }));
        document.addEventListener('keydown', event => {
            if (event.key !== 'Escape') return;
            $$('.modal-backdrop:not([hidden])').forEach(modal => closeModal(modal.id));
            toggleSidebar(false);
        });
    }

    function bindConnectionForm() {
        const form = $('#connectionForm');
        if (!form) return;
        form.addEventListener('submit', event => {
            event.preventDefault();
            const hostValue = $('#connectionHost').value.trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');
            if (!hostValue || /[\s<>"']/.test(hostValue)) {
                showToast('آدرس API معتبر نیست.', 'error');
                $('#connectionHost').focus();
                return;
            }
            const connection = {
                name: cleanText($('#connectionName').value, DEFAULT_CONNECTION.name, 80),
                host: hostValue,
                port: clampNumber($('#connectionPort').value, 443, 1, 65535),
                path: cleanPath($('#connectionPath').value, DEFAULT_CONNECTION.path),
                region: state.connection.region
            };
            saveConnection(connection);
            closeModal('connectionModal');
            checkHealth($('#checkHealthButton'), true);
        });
    }

    function bindActions() {
        $('#connectServerButton')?.addEventListener('click', () => openModal('connectionModal'));
        $('#editConnectionButton')?.addEventListener('click', () => openModal('connectionModal'));
        $('#checkHealthButton')?.addEventListener('click', event => checkHealth(event.currentTarget, true));
        $('#refreshButton')?.addEventListener('click', event => {
            const button = event.currentTarget;
            button.classList.add('refreshing');
            window.setTimeout(() => button.classList.remove('refreshing'), 650);
            checkHealth($('#checkHealthButton'), true);
        });
        $('#copyEndpointButton')?.addEventListener('click', () => copyText(`${state.connection.path}/health`, 'مسیر health check کپی شد.'));
        $('#rotateKeyButton')?.addEventListener('click', () => openActionConfirmation('rotate_api_key', 'چرخش امن کلید'));
        $('#confirmActionButton')?.addEventListener('click', executeSelectedOperation);
        $$('.quick-action').forEach(button => button.addEventListener('click', () => openActionConfirmation(button.dataset.operation, button.dataset.label)));
        $('#clearActivityButton')?.addEventListener('click', () => {
            const list = $('#activityList');
            if (list) list.innerHTML = '<div class="activity-empty">نمایش رویدادها پاک شد. لاگ واقعی در بک‌اند باقی می‌ماند.</div>';
            showToast('نمایش فعالیت‌های اخیر پاک شد؛ لاگ سرور دست‌نخورده است.', 'success');
        });
        $('#downloadManifestButton')?.addEventListener('click', () => downloadFile('neon-ops-config.json', buildManifest(), 'application/json;charset=utf-8'));
        $('#downloadEnvButton')?.addEventListener('click', () => downloadFile('.env.example', buildEnvExample(), 'text/plain;charset=utf-8'));
        $('#downloadGuideButton')?.addEventListener('click', () => downloadFile('GITHUB-SETUP.md', buildGithubGuide(), 'text/markdown;charset=utf-8'));
    }

    function init() {
        renderConnection();
        applyTheme(currentTheme());
        bindNavigation();
        bindModals();
        bindConnectionForm();
        bindActions();

        $('#themeButton')?.addEventListener('click', () => applyTheme(currentTheme() === 'light' ? 'dark' : 'light'));
        $('#dismissBanner')?.addEventListener('click', () => {
            $('#securityBanner')?.classList.add('is-hidden');
            try { localStorage.setItem(BANNER_KEY, 'true'); } catch (error) {}
        });
        try {
            if (localStorage.getItem(BANNER_KEY) === 'true') $('#securityBanner')?.classList.add('is-hidden');
        } catch (error) {}
        $('#mobileMenuButton')?.addEventListener('click', () => toggleSidebar());
        $('#sidebarBackdrop')?.addEventListener('click', () => toggleSidebar(false));
    }

    document.addEventListener('DOMContentLoaded', init);
})();
