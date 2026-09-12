/* Neon Anime admin dashboard.
 *
 * The page works as a local preview when opened from the bundled APK, and
 * switches to the authenticated live API when served by server.mjs. Secrets
 * are never accepted, persisted, rendered, or downloaded by this file.
 */
(function () {
    'use strict';

    const KEY = {
        anime: 'neon_admin_anime_preview',
        settings: 'neon_admin_settings',
        notice: 'neon_admin_notice_dismissed',
        theme: 'neon_theme'
    };
    const API_ROOT = '/api';
    const seedAnime = (window.NEON_ANIME && window.NEON_ANIME.list) || [];
    const seedArticles = (window.NEON_MAG && window.NEON_MAG.list) || [];
    const USERS = [
        { id: 'usr-arman', name: 'آرمان نادری', email: 'arman@neon.example', role: 'user', plan: 'vip', lastActive: 'امروز، ۱۰:۴۳', status: 'active', initial: 'آ' },
        { id: 'usr-sara', name: 'سارا احمدی', email: 'sara@neon.example', role: 'editor', plan: 'vip', lastActive: 'امروز، ۰۹:۱۲', status: 'active', initial: 'س' },
        { id: 'usr-kianoosh', name: 'کیانوش اوتاکو', email: 'kianoosh@neon.example', role: 'user', plan: 'basic', lastActive: 'دیروز، ۲۲:۰۸', status: 'active', initial: 'ک' },
        { id: 'usr-admin', name: 'مدیر سایت', email: 'admin@neon.example', role: 'owner', plan: 'vip', lastActive: 'اکنون', status: 'active', initial: 'A' },
        { id: 'usr-mehrdad', name: 'مهرداد کریمی', email: 'mehrdad@neon.example', role: 'user', plan: 'basic', lastActive: '۳ روز پیش', status: 'restricted', initial: 'م' }
    ];
    const REPORTS = [
        { id: 'report-1', user: 'مهدی رستمی', initial: 'م', anime: 'حمله به تایتان', time: '۱۲ دقیقه پیش', text: 'این قسمت پخش نمی‌شود و لینک مشکل دارد.' },
        { id: 'report-2', user: 'luna_otaku', initial: 'L', anime: 'جوجوتسو کایسن', time: '۳۸ دقیقه پیش', text: 'اسپویل قسمت جدید در کامنت نوشته شده است.' },
        { id: 'report-3', user: 'رضا ۷۷', initial: 'ر', anime: 'شیطان کش', time: '۱ ساعت پیش', text: 'این پیام حاوی محتوای نامناسب است.' },
        { id: 'report-4', user: 'saman_neo', initial: 'S', anime: 'وان پیس', time: '۲ ساعت پیش', text: 'درخواست دوبله قسمت بعدی.' }
    ];
    const state = {
        anime: loadJson(KEY.anime, seedAnime),
        articles: seedArticles.slice(),
        users: USERS.slice(),
        reports: REPORTS.slice(),
        settings: null,
        dashboard: null,
        active: 'dashboard',
        editingId: null,
        editingArticleSlug: null,
        live: false
    };

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

    function loadJson(key, fallback) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || 'null');
            return Array.isArray(value) && value.length ? value : (fallback.slice ? fallback.slice() : fallback);
        } catch (error) {
            return fallback.slice ? fallback.slice() : fallback;
        }
    }

    function saveJson(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) {}
    }

    function esc(value) {
        return String(value == null ? '' : value).replace(/[&<>'"]/g, character => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[character]));
    }

    function slugify(value) {
        return String(value).toLowerCase().trim().replace(/[^\w\u0600-\u06ff]+/g, '-').replace(/^-+|-+$/g, '') || `title-${Date.now()}`;
    }

    function toast(message, type = 'info') {
        const region = $('#adminToast');
        if (!region) return;
        const el = document.createElement('div');
        el.className = `admin-toast ${type}`;
        el.textContent = message;
        region.appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(7px)';
            setTimeout(() => el.remove(), 220);
        }, 3800);
    }

    function applyTheme(theme) {
        const light = theme === 'light';
        if (light) document.documentElement.setAttribute('data-theme', 'light');
        else document.documentElement.removeAttribute('data-theme');
        try { localStorage.setItem(KEY.theme, light ? 'light' : 'dark'); } catch (error) {}
        const meta = $('meta[name="theme-color"]');
        if (meta) meta.content = light ? '#f4f6fa' : '#0a0b12';
    }

    function openModal(id) {
        const element = $('#' + id);
        if (!element) return;
        element.hidden = false;
        document.body.classList.add('modal-open');
        const focus = element.querySelector('input,select,textarea,button');
        if (focus) setTimeout(() => focus.focus(), 30);
    }

    function closeModal(id) {
        const element = $('#' + id);
        if (!element) return;
        element.hidden = true;
        if (!$$('.admin-modal-backdrop:not([hidden])').length) document.body.classList.remove('modal-open');
    }

    function statusLabel(status) { return status === 'airing' ? 'در حال پخش' : status === 'finished' ? 'پایان‌یافته' : 'پیش‌نویس'; }
    function statusClass(status) { return status === 'airing' ? 'airing' : status === 'finished' ? 'finished' : 'draft'; }
    function roleLabel(role) { return ({ owner: 'مالک', editor: 'ویرایشگر', user: 'کاربر' }[role] || role || 'کاربر'); }
    function planLabel(plan) { return plan === 'vip' ? 'VIP' : 'عادی'; }
    function userStatusLabel(status) { return status === 'restricted' ? 'محدود' : 'فعال'; }
    function poster(item) { return item.poster || 'assets/img/attack-on-titan.webp'; }

    async function apiFetch(endpoint, options = {}) {
        const response = await fetch(API_ROOT + endpoint, {
            credentials: 'same-origin',
            headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) },
            ...options
        });
        let data = {};
        try { data = await response.json(); } catch (error) {}
        if (!response.ok) {
            const error = new Error(data.message || `HTTP ${response.status}`);
            error.status = response.status;
            error.code = data.error;
            throw error;
        }
        return data;
    }

    function setMode(live) {
        state.live = live;
        const pill = $('#modePill');
        const label = $('#modePillText');
        if (pill) pill.classList.toggle('live', live);
        if (label) label.textContent = live ? 'LIVE SERVER' : 'DEMO MODE';
        const notice = $('.demo-notice');
        if (notice) {
            if (live) notice.classList.add('hidden');
            else {
                let dismissed = false;
                try { dismissed = localStorage.getItem(KEY.notice) === 'true'; } catch (error) {}
                if (!dismissed) notice.classList.remove('hidden');
            }
        }
        document.body.dataset.mode = live ? 'live' : 'demo';
    }

    function showLogin() {
        if (location.protocol === 'file:') return;
        const error = $('#loginError');
        if (error) error.textContent = '';
        openModal('loginModal');
    }

    function showSetup() {
        if (location.protocol === 'file:') return;
        const error = $('#setupError');
        if (error) error.textContent = '';
        openModal('setupModal');
    }

    async function loadLiveData() {
        const [catalog, articles, users, moderation, settings] = await Promise.all([
            apiFetch('/v1/catalog'), apiFetch('/v1/articles'), apiFetch('/v1/users'), apiFetch('/v1/moderation'), apiFetch('/v1/settings')
        ]);
        state.anime = catalog.items || [];
        state.articles = articles.items || [];
        state.users = users.items || [];
        state.reports = moderation.items || [];
        state.settings = settings.settings || null;
        renderAll();
    }

    async function connectBackend() {
        if (location.protocol === 'file:') return;
        try {
            state.dashboard = await apiFetch('/v1/dashboard');
            setMode(true);
            await loadLiveData();
            toast('به سرور واقعی وصل شدی؛ تغییرات روی سایت ذخیره می‌شوند.', 'success');
        } catch (error) {
            setMode(false);
            if (error.status === 401) showLogin();
            else if (error.status === 503 && error.code === 'auth_not_configured') showSetup();
            else if (error.status !== 404) toast('اتصال به API مدیریت برقرار نشد؛ حالت پیش‌نمایش فعال است.', 'warning');
        }
    }

    async function handleSetup(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const button = form.querySelector('button[type="submit"]');
        const errorBox = $('#setupError');
        const original = button.innerHTML;
        button.disabled = true;
        button.textContent = 'در حال ساخت...';
        if (errorBox) errorBox.textContent = '';
        try {
            await apiFetch('/setup/admin', { method: 'POST', headers: { 'X-Setup-Token': $('#setupToken').value.trim() }, body: JSON.stringify({ username: $('#setupUsername').value.trim(), password: $('#setupPassword').value }) });
            closeModal('setupModal');
            toast('حساب مدیر ساخته شد؛ حالا وارد شو.', 'success');
            showLogin();
        } catch (error) {
            if (errorBox) errorBox.textContent = error.message || 'راه‌اندازی ناموفق بود.';
        } finally {
            button.disabled = false;
            button.innerHTML = original;
        }
    }

    async function handleLogin(event) {
        event.preventDefault();
        const button = event.currentTarget.querySelector('button[type="submit"]');
        const errorBox = $('#loginError');
        const original = button.innerHTML;
        button.disabled = true;
        button.textContent = 'در حال ورود...';
        if (errorBox) errorBox.textContent = '';
        try {
            await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ username: $('#adminUsername').value.trim(), password: $('#adminPassword').value }) });
            closeModal('loginModal');
            setMode(true);
            await loadLiveData();
            toast('ورود مدیر موفق بود؛ پنل به سایت متصل است.', 'success');
        } catch (error) {
            if (errorBox) errorBox.textContent = error.code === 'auth_not_configured' ? 'احراز هویت روی سرور هنوز تنظیم نشده است.' : (error.message || 'ورود ناموفق بود.');
        } finally {
            button.disabled = false;
            button.innerHTML = original;
        }
    }

    function showSection(section) {
        state.active = section;
        $$('.admin-panel-section').forEach(panel => panel.classList.toggle('active-panel', panel.dataset.adminPanel === section));
        $$('.admin-nav-link').forEach(link => link.classList.toggle('active', link.dataset.adminSection === section));
        if (location.hash !== '#' + section) history.replaceState(null, '', '#' + section);
        $('#adminSidebar')?.classList.remove('open');
        $('#adminBackdrop')?.classList.remove('visible');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function bindNavigation() {
        $$('.admin-nav-link').forEach(link => link.addEventListener('click', event => { event.preventDefault(); showSection(link.dataset.adminSection); }));
        $$('[data-quick],[data-jump]').forEach(button => button.addEventListener('click', () => showSection(button.dataset.quick || button.dataset.jump)));
        $$('[data-toast]').forEach(button => button.addEventListener('click', () => toast(button.dataset.toast, 'warning')));
        const initial = location.hash.slice(1);
        if (initial && $(`[data-admin-panel="${initial}"]`)) showSection(initial);
    }

    function renderStats() {
        const count = state.anime.length;
        const episodes = state.anime.reduce((sum, item) => sum + ((item.episodes && item.episodes.length) || 0), 0);
        const titles = $('#statTitles');
        if (titles) titles.textContent = String(count).padStart(2, '0');
        const users = $('#statUsers');
        const vip = $('#statVip');
        if (state.dashboard?.stats) {
            if (users) users.textContent = Number(state.dashboard.stats.users || 0).toLocaleString('fa-IR');
            if (vip) vip.textContent = Number(state.dashboard.stats.vip || 0).toLocaleString('fa-IR');
        }
        const countEl = $('#contentCount');
        if (countEl) countEl.textContent = `${count} عنوان · ${episodes} قسمت`;
    }

    function renderContent() {
        const table = $('#contentTable');
        if (!table) return;
        const query = ($('#contentSearch')?.value || '').trim().toLowerCase();
        const filter = $('#contentStatus')?.value || 'all';
        const list = state.anime.filter(item => {
            const haystack = `${item.title || ''} ${item.titleEn || ''} ${(item.aliases || []).join(' ')}`.toLowerCase();
            return (!query || haystack.includes(query)) && (filter === 'all' || (item.status || 'draft') === filter);
        });
        table.innerHTML = list.map(item => `<tr><td><div class="table-title"><img class="poster-mini" src="${esc(poster(item))}" alt=""><div><b>${esc(item.title)}</b><small>${esc(item.titleEn || item.id)}</small></div></div></td><td><span class="state-pill ${statusClass(item.status)}"><i></i>${statusLabel(item.status)}</span></td><td class="rating">★ ${Number(item.rating || 0).toFixed(1)}</td><td>${item.episodes?.length || 0} قسمت</td><td>${state.live ? 'همین الان' : 'داده نمونه'}</td><td><div class="row-actions"><button class="row-action" type="button" data-edit-id="${esc(item.id)}" title="ویرایش">✎</button><button class="row-action" type="button" data-toggle-id="${esc(item.id)}" title="تغییر وضعیت">↻</button></div></td></tr>`).join('');
        $('#contentEmpty')?.toggleAttribute('hidden', list.length !== 0);
        renderStats();
        $$('[data-edit-id]').forEach(button => button.addEventListener('click', () => openEditor(button.dataset.editId)));
        $$('[data-toggle-id]').forEach(button => button.addEventListener('click', () => toggleStatus(button.dataset.toggleId)));
    }

    function openEditor(id) {
        state.editingId = id || null;
        const item = state.anime.find(entry => entry.id === id);
        $('#contentModalTitle').textContent = item ? 'ویرایش عنوان' : 'افزودن عنوان جدید';
        $('#editingId').value = item?.id || '';
        $('#titleFa').value = item?.title || '';
        $('#titleEn').value = item?.titleEn || '';
        $('#titleStatus').value = item?.status || 'draft';
        $('#titleRating').value = item?.rating || 8.5;
        $('#titleGenres').value = (item?.genres || []).join(', ');
        $('#titleDescription').value = item?.desc || '';
        openModal('contentModal');
    }

    function titlePayload(old) {
        return {
            id: $('#editingId').value || slugify($('#titleEn').value),
            title: $('#titleFa').value.trim(),
            titleEn: $('#titleEn').value.trim(),
            status: $('#titleStatus').value,
            rating: Number($('#titleRating').value || 0),
            genres: $('#titleGenres').value.split(',').map(value => value.trim()).filter(Boolean),
            genreLabel: $('#titleGenres').value.trim(),
            desc: $('#titleDescription').value.trim(),
            poster: old?.poster || 'assets/img/attack-on-titan.webp',
            banner: old?.banner || 'assets/img/attack-on-titan-wallpaper.webp',
            episodes: old?.episodes || []
        };
    }

    async function saveTitle(event) {
        event.preventDefault();
        const old = state.anime.find(entry => entry.id === $('#editingId').value);
        const payload = titlePayload(old);
        if (!payload.title || !payload.titleEn) return toast('نام فارسی و انگلیسی الزامی است.', 'error');
        try {
            if (state.live) {
                const endpoint = old ? `/v1/catalog/${encodeURIComponent(old.id)}` : '/v1/catalog';
                await apiFetch(endpoint, { method: old ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
                await loadLiveData();
                closeModal('contentModal');
                return toast('عنوان روی سرور ذخیره شد و سایت از آن استفاده می‌کند.', 'success');
            }
            const index = state.anime.findIndex(entry => entry.id === payload.id);
            const next = { ...(old || {}), ...payload };
            if (index === -1) state.anime.unshift(next); else state.anime[index] = next;
            saveJson(KEY.anime, state.anime);
            renderContent(); closeModal('contentModal');
            toast(old ? 'عنوان بروزرسانی شد؛ تغییر محلی ذخیره شد.' : 'عنوان جدید به کاتالوگ پیش‌نمایش اضافه شد.', 'success');
        } catch (error) {
            if (error.status === 401) showLogin();
            toast(error.message || 'ذخیره عنوان ناموفق بود.', 'error');
        }
    }

    async function toggleStatus(id) {
        const item = state.anime.find(entry => entry.id === id);
        if (!item) return;
        const status = item.status === 'airing' ? 'finished' : item.status === 'finished' ? 'draft' : 'airing';
        try {
            if (state.live) {
                await apiFetch(`/v1/catalog/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) });
                await loadLiveData();
            } else {
                item.status = status; saveJson(KEY.anime, state.anime); renderContent();
            }
            toast(`وضعیت «${item.title}» به ${statusLabel(status)} تغییر کرد.`, 'success');
        } catch (error) { toast(error.message || 'تغییر وضعیت ناموفق بود.', 'error'); }
    }

    function openArticleEditor(slug) {
        state.editingArticleSlug = slug || null;
        const article = state.articles.find(item => item.slug === slug);
        $('#articleModalTitle').textContent = article ? 'ویرایش مقاله' : 'مقاله جدید';
        $('#editingArticleSlug').value = article?.slug || '';
        $('#articleTitle').value = article?.title || '';
        $('#articleExcerpt').value = article?.excerpt || '';
        $('#articleCategory').value = article?.category || 'news';
        $('#articleAuthor').value = article?.author || 'مدیر سایت';
        $('#articleImage').value = article?.image || 'assets/img/og-image.jpg';
        openModal('articleModal');
    }

    async function saveArticle(event) {
        event.preventDefault();
        const old = state.articles.find(item => item.slug === $('#editingArticleSlug').value);
        const payload = { slug: $('#editingArticleSlug').value || slugify($('#articleTitle').value), title: $('#articleTitle').value.trim(), excerpt: $('#articleExcerpt').value.trim(), category: $('#articleCategory').value, author: $('#articleAuthor').value.trim(), image: $('#articleImage').value.trim() || 'assets/img/og-image.jpg', tags: old?.tags || [], body: old?.body || [] };
        if (!payload.title) return toast('عنوان مقاله الزامی است.', 'error');
        try {
            if (state.live) {
                const endpoint = old ? `/v1/articles/${encodeURIComponent(old.slug)}` : '/v1/articles';
                await apiFetch(endpoint, { method: old ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
                await loadLiveData(); closeModal('articleModal'); return toast('مقاله روی سرور ذخیره شد.', 'success');
            }
            const index = state.articles.findIndex(item => item.slug === payload.slug);
            if (index === -1) state.articles.unshift(payload); else state.articles[index] = { ...state.articles[index], ...payload };
            renderArticles(); closeModal('articleModal'); toast('مقاله در پیش‌نمایش ذخیره شد.', 'success');
        } catch (error) { toast(error.message || 'ذخیره مقاله ناموفق بود.', 'error'); }
    }

    function renderArticles() {
        const grid = $('#articleGrid');
        if (!grid) return;
        grid.innerHTML = state.articles.slice(0, 12).map(article => `<article class="article-admin-card"><img src="${esc(article.image || 'assets/img/og-image.jpg')}" alt=""><div class="article-card-body"><span class="article-category">${esc(article.category || 'MAGAZINE')}</span><h3>${esc(article.title)}</h3><p>${esc(article.excerpt || '')}</p><div class="article-card-foot"><span>${esc(article.dateLabel || article.date || 'پیش‌نویس')}</span><button type="button" data-article-edit="${esc(article.slug)}">ویرایش ↗</button></div></div></article>`).join('');
        $$('[data-article-edit]').forEach(button => button.addEventListener('click', () => openArticleEditor(button.dataset.articleEdit)));
    }

    function renderUsers() {
        const table = $('#userTable');
        if (!table) return;
        table.innerHTML = state.users.map(user => `<tr><td><div class="table-title"><span class="moderation-avatar">${esc(user.initial || user.name?.slice(0, 1))}</span><div><b>${esc(user.name)}</b><small>${esc(user.email)}</small></div></div></td><td><span class="role-pill">${esc(roleLabel(user.role))}</span></td><td><span class="vip-pill ${user.plan !== 'vip' ? 'basic' : ''}">✦ ${esc(planLabel(user.plan))}</span></td><td>${esc(user.lastActive || user.last || '—')}</td><td><span class="status-dot"></span>${esc(userStatusLabel(user.status))}</td><td><div class="row-actions"><button class="row-action" type="button" data-user-toggle="${esc(user.id || user.email)}" title="تغییر وضعیت">↻</button></div></td></tr>`).join('');
        $$('[data-user-toggle]').forEach(button => button.addEventListener('click', () => toggleUser(button.dataset.userToggle)));
    }

    async function toggleUser(id) {
        const user = state.users.find(entry => entry.id === id || entry.email === id);
        if (!user) return;
        const status = user.status === 'restricted' ? 'active' : 'restricted';
        try {
            if (state.live) { await apiFetch(`/v1/users/${encodeURIComponent(user.id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }); await loadLiveData(); }
            else { user.status = status; renderUsers(); }
            toast(`وضعیت کاربر به «${userStatusLabel(status)}» تغییر کرد.`, 'success');
        } catch (error) { toast(error.message || 'تغییر کاربر ناموفق بود.', 'error'); }
    }

    function renderModeration() {
        const list = $('#moderationList');
        if (!list) return;
        list.innerHTML = state.reports.map(report => `<div class="moderation-item" data-report="${esc(report.id)}"><span class="moderation-avatar">${esc(report.initial)}</span><main><b>${esc(report.user)} <small>· ${esc(report.time)}</small></b><p>${esc(report.text)}</p><small>${esc(report.anime)}</small></main><div class="moderation-actions"><button type="button" data-moderate="approve" title="تأیید">✓</button><button class="delete" type="button" data-moderate="delete" title="حذف">×</button></div></div>`).join('');
        $$('.moderation-item [data-moderate]').forEach(button => button.addEventListener('click', () => moderateReport(button.closest('.moderation-item').dataset.report, button.dataset.moderate)));
    }

    async function moderateReport(id, action) {
        try {
            if (state.live) { await apiFetch(`/v1/moderation/${encodeURIComponent(id)}`, { method: 'POST', body: JSON.stringify({ action }) }); await loadLiveData(); }
            else { state.reports = state.reports.filter(report => report.id !== id); renderModeration(); }
            toast(action === 'approve' ? 'گزارش بررسی و بسته شد.' : 'مورد از صف نمایش حذف شد.', 'success');
        } catch (error) { toast(error.message || 'عملیات moderation ناموفق بود.', 'error'); }
    }

    function renderSchedule() {
        const wrap = $('#scheduleItems');
        if (!wrap) return;
        const entries = state.anime.slice(0, 4);
        wrap.innerHTML = entries.map((item, index) => `<div class="schedule-item"><span class="schedule-time">${['18:30', '20:00', '21:15', '23:00'][index]}</span><img class="schedule-poster" src="${esc(poster(item))}" alt=""><div><b>${esc(item.title)} · قسمت ${index + 1}</b><small>${index % 2 ? 'زیرنویس فارسی' : 'دوبله اختصاصی'} · اطلاع‌رسانی فعال</small></div><span class="schedule-type">${index % 2 ? 'SUB' : 'DUB'}</span></div>`).join('');
        $$('.schedule-days button').forEach(day => day.addEventListener('click', () => { $$('.schedule-days button').forEach(item => item.classList.remove('active')); day.classList.add('active'); toast(`برنامه‌ی ${day.textContent.trim()} نمایش داده شد.`, 'info'); }));
    }

    function loadSettings() {
        let saved = state.settings || {};
        if (!state.live) { try { saved = JSON.parse(localStorage.getItem(KEY.settings) || '{}'); } catch (error) {} }
        if (saved.name) $('#siteName').value = saved.name;
        if (saved.description) $('#siteDescription').value = saved.description;
        if (saved.language) $('#siteLanguage').value = saved.language;
        if (saved.timezone) $('#siteTimezone').value = saved.timezone;
        if (typeof saved.registration === 'boolean') $('#registrationToggle').checked = saved.registration;
        if (typeof saved.comments === 'boolean') $('#commentsToggle').checked = saved.comments;
        if (typeof saved.maintenance === 'boolean') $('#maintenanceToggle').checked = saved.maintenance;
    }

    async function saveSettings(event) {
        event.preventDefault();
        const settings = { name: $('#siteName').value.trim(), description: $('#siteDescription').value.trim(), language: $('#siteLanguage').value, timezone: $('#siteTimezone').value, registration: $('#registrationToggle').checked, comments: $('#commentsToggle').checked, maintenance: $('#maintenanceToggle').checked };
        try {
            if (state.live) { await apiFetch('/v1/settings', { method: 'PATCH', body: JSON.stringify(settings) }); state.settings = settings; }
            else saveJson(KEY.settings, settings);
            $('#savedLabel').textContent = 'آخرین ذخیره: همین الان';
            toast(state.live ? 'تنظیمات روی سایت ذخیره شد.' : 'تنظیمات در حالت پیش‌نمایش ذخیره شد.', 'success');
        } catch (error) { toast(error.message || 'ذخیره تنظیمات ناموفق بود.', 'error'); }
    }

    async function runAction(action) {
        if (!state.live) return toast('برای اجرای واقعی، ابتدا بک‌اند و ورود مدیر را فعال کن.', 'warning');
        try { await apiFetch('/v1/actions', { method: 'POST', body: JSON.stringify({ action }) }); toast('عملیات در صف امن سرور ثبت شد.', 'success'); }
        catch (error) { toast(error.message || 'اجرای عملیات ناموفق بود.', 'error'); }
    }

    function renderAll() { renderStats(); renderContent(); renderArticles(); renderUsers(); renderModeration(); renderSchedule(); loadSettings(); }

    function download(filename, content, type = 'application/json;charset=utf-8') {
        const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 800); toast(`${filename} دانلود شد؛ secretی داخل فایل نیست.`, 'success');
    }

    function bind() {
        bindNavigation();
        renderAll();
        $('#contentSearch')?.addEventListener('input', renderContent);
        $('#contentStatus')?.addEventListener('change', renderContent);
        $('#contentForm')?.addEventListener('submit', saveTitle);
        $('#articleForm')?.addEventListener('submit', saveArticle);
        $('#adminLoginForm')?.addEventListener('submit', handleLogin);
        $('#adminSetupForm')?.addEventListener('submit', handleSetup);
        $('#quickAddButton')?.addEventListener('click', () => openEditor());
        $('#addTitleButton')?.addEventListener('click', () => openEditor());
        $('#newArticleButton')?.addEventListener('click', () => openArticleEditor());
        $('#scheduleButton')?.addEventListener('click', () => toast('زمان‌بندی واقعی بعد از اتصال backend ذخیره می‌شود.', 'warning'));
        $('#settingsForm')?.addEventListener('submit', saveSettings);
        $('#exportCatalog')?.addEventListener('click', () => download('neon-catalog-export.json', JSON.stringify({ exportedAt: new Date().toISOString(), source: state.live ? 'live-api' : 'admin-preview', items: state.anime.map(({ id, title, titleEn, status, rating, genres, episodes }) => ({ id, title, titleEn, status, rating, genres, episodeCount: episodes?.length || 0 })) }, null, 2) + '\n'));
        $('#exportUsers')?.addEventListener('click', () => download('neon-users-export.json', JSON.stringify({ exportedAt: new Date().toISOString(), source: state.live ? 'live-api' : 'admin-preview', users: state.users.map(({ name, email, role, plan, status }) => ({ name, email, role, plan, status })) }, null, 2) + '\n'));
        $('#deployButton')?.addEventListener('click', () => runAction('deploy'));
        $('#dismissAdminNotice')?.addEventListener('click', () => { $('.demo-notice')?.classList.add('hidden'); try { localStorage.setItem(KEY.notice, 'true'); } catch (error) {} });
        try { if (localStorage.getItem(KEY.notice) === 'true') $('.demo-notice')?.classList.add('hidden'); } catch (error) {}
        $('#globalSearch')?.addEventListener('keydown', event => { if (event.key === 'Enter') { showSection('content'); $('#contentSearch').value = event.currentTarget.value; renderContent(); } });
        document.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#globalSearch')?.focus(); } });
        $$('[data-close-modal]').forEach(button => button.addEventListener('click', () => closeModal(button.dataset.closeModal)));
        $$('.admin-modal-backdrop').forEach(backdrop => backdrop.addEventListener('click', event => { if (event.target === backdrop && backdrop.id !== 'loginModal') closeModal(backdrop.id); }));
        document.addEventListener('keydown', event => { if (event.key === 'Escape') $$('.admin-modal-backdrop:not([hidden])').forEach(element => { if (element.id !== 'loginModal') closeModal(element.id); }); });
        $('#mobileMenu')?.addEventListener('click', () => { $('#adminSidebar')?.classList.toggle('open'); $('#adminBackdrop')?.classList.toggle('visible'); });
        $('#adminBackdrop')?.addEventListener('click', () => { $('#adminSidebar')?.classList.remove('open'); $('#adminBackdrop')?.classList.remove('visible'); });
        $('#themeToggle')?.addEventListener('click', () => applyTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light'));
        $('#notificationButton')?.addEventListener('click', () => toast(state.live ? 'اعلان‌های سرور خوانده شد.' : '۳ اعلان نمونه در نسخه‌ی متصل نمایش داده می‌شود.', 'info'));
        connectBackend();
    }

    document.addEventListener('DOMContentLoaded', () => { applyTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'); bind(); });
})();
