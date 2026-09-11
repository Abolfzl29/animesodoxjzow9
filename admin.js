/* Neon Anime admin dashboard. Local edits are a preview only; production writes
 * must go through authenticated, allowlisted backend endpoints. No secret is
 * accepted, persisted, rendered, or downloaded by this file. */
(function () {
    'use strict';
    const KEY = { anime: 'neon_admin_anime_preview', settings: 'neon_admin_settings', notice: 'neon_admin_notice_dismissed', theme: 'neon_theme' };
    const seedAnime = (window.NEON_ANIME && window.NEON_ANIME.list) || [];
    const seedArticles = (window.NEON_MAG && window.NEON_MAG.list) || [];
    const state = { anime: loadJson(KEY.anime, seedAnime), articles: seedArticles.slice(), active: 'dashboard', editingId: null };
    const $ = (s, root = document) => root.querySelector(s);
    const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
    const USERS = [
        { name: 'آرمان نادری', email: 'arman@neon.example', role: 'کاربر', plan: 'VIP', last: 'امروز، ۱۰:۴۳', status: 'فعال', initial: 'آ' },
        { name: 'سارا احمدی', email: 'sara@neon.example', role: 'ویرایشگر', plan: 'VIP', last: 'امروز، ۰۹:۱۲', status: 'فعال', initial: 'س' },
        { name: 'کیانوش اوتاکو', email: 'kianoosh@neon.example', role: 'کاربر', plan: 'عادی', last: 'دیروز، ۲۲:۰۸', status: 'فعال', initial: 'ک' },
        { name: 'مدیر سایت', email: 'admin@neon.example', role: 'مالک', plan: 'VIP', last: 'اکنون', status: 'فعال', initial: 'A' },
        { name: 'مهرداد کریمی', email: 'mehrdad@neon.example', role: 'کاربر', plan: 'عادی', last: '۳ روز پیش', status: 'محدود', initial: 'م' }
    ];
    const REPORTS = [
        { user: 'مهدی رستمی', initial: 'م', anime: 'حمله به تایتان', time: '۱۲ دقیقه پیش', text: 'این قسمت پخش نمی‌شود و لینک مشکل دارد.' },
        { user: 'luna_otaku', initial: 'L', anime: 'جوجوتسو کایسن', time: '۳۸ دقیقه پیش', text: 'اسپویل قسمت جدید در کامنت نوشته شده است.' },
        { user: 'رضا ۷۷', initial: 'ر', anime: 'شیطان کش', time: '۱ ساعت پیش', text: 'این پیام حاوی محتوای نامناسب است.' },
        { user: 'saman_neo', initial: 'S', anime: 'وان پیس', time: '۲ ساعت پیش', text: 'درخواست دوبله قسمت بعدی.' }
    ];

    function loadJson(key, fallback) { try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return Array.isArray(value) && value.length ? value : fallback.slice ? fallback.slice() : fallback; } catch (e) { return fallback.slice ? fallback.slice() : fallback; } }
    function saveJson(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} }
    function esc(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])); }
    function slugify(value) { return String(value).toLowerCase().trim().replace(/[^\w\u0600-\u06ff]+/g, '-').replace(/^-+|-+$/g, '') || `title-${Date.now()}`; }
    function toast(message, type = 'info') { const region = $('#adminToast'); if (!region) return; const el = document.createElement('div'); el.className = `admin-toast ${type}`; el.textContent = message; region.appendChild(el); setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(7px)'; setTimeout(() => el.remove(), 220); }, 3800); }
    function applyTheme(theme) { const light = theme === 'light'; document.documentElement.toggleAttribute('data-theme', light); if (light) document.documentElement.setAttribute('data-theme', 'light'); try { localStorage.setItem(KEY.theme, light ? 'light' : 'dark'); } catch (e) {} const meta = $('meta[name="theme-color"]'); if (meta) meta.content = light ? '#f4f6fa' : '#0a0b12'; }
    function openModal(id) { const el = $('#' + id); if (!el) return; el.hidden = false; document.body.classList.add('modal-open'); const focus = el.querySelector('input,select,textarea,button'); if (focus) setTimeout(() => focus.focus(), 30); }
    function closeModal(id) { const el = $('#' + id); if (!el) return; el.hidden = true; if (!$$('.admin-modal-backdrop:not([hidden])').length) document.body.classList.remove('modal-open'); }
    function statusLabel(status) { return status === 'airing' ? 'در حال پخش' : status === 'finished' ? 'پایان‌یافته' : 'پیش‌نویس'; }
    function statusClass(status) { return status === 'airing' ? 'airing' : status === 'finished' ? 'finished' : 'draft'; }

    function showSection(section) {
        state.active = section;
        $$('.admin-panel-section').forEach(panel => panel.classList.toggle('active-panel', panel.dataset.adminPanel === section));
        $$('.admin-nav-link').forEach(link => link.classList.toggle('active', link.dataset.adminSection === section));
        if (location.hash !== '#' + section) history.replaceState(null, '', '#' + section);
        $('#adminSidebar')?.classList.remove('open'); $('#adminBackdrop')?.classList.remove('visible');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    function bindNavigation() {
        $$('.admin-nav-link').forEach(link => link.addEventListener('click', e => { e.preventDefault(); showSection(link.dataset.adminSection); }));
        $$('[data-quick],[data-jump]').forEach(button => button.addEventListener('click', () => showSection(button.dataset.quick || button.dataset.jump)));
        $$('[data-toast]').forEach(button => button.addEventListener('click', () => toast(button.dataset.toast, 'warning')));
        const initial = location.hash.slice(1); if (initial && $('[data-admin-panel="' + initial + '"]')) showSection(initial);
    }

    function renderStats() { const count = state.anime.length; const episodes = state.anime.reduce((sum, item) => sum + ((item.episodes && item.episodes.length) || 0), 0); const titles = $('#statTitles'); if (titles) titles.textContent = String(count).padStart(2, '0'); const countEl = $('#contentCount'); if (countEl) countEl.textContent = `${count} عنوان · ${episodes} قسمت`; }
    function poster(item) { return item.poster || 'assets/img/anime-placeholder.webp'; }
    function renderContent() {
        const table = $('#contentTable'); if (!table) return;
        const query = ($('#contentSearch')?.value || '').trim().toLowerCase(); const filter = $('#contentStatus')?.value || 'all';
        const list = state.anime.filter(item => { const hay = `${item.title || ''} ${item.titleEn || ''} ${(item.aliases || []).join(' ')}`.toLowerCase(); return (!query || hay.includes(query)) && (filter === 'all' || (item.status || 'draft') === filter); });
        table.innerHTML = list.map(item => `<tr><td><div class="table-title"><img class="poster-mini" src="${esc(poster(item))}" alt=""><div><b>${esc(item.title)}</b><small>${esc(item.titleEn || item.id)}</small></div></div></td><td><span class="state-pill ${statusClass(item.status)}"><i></i>${statusLabel(item.status)}</span></td><td class="rating">★ ${Number(item.rating || 0).toFixed(1)}</td><td>${item.episodes?.length || 0} قسمت</td><td>امروز، ۱۰:۲۴</td><td><div class="row-actions"><button class="row-action" type="button" data-edit-id="${esc(item.id)}" title="ویرایش">✎</button><button class="row-action" type="button" data-toggle-id="${esc(item.id)}" title="تغییر وضعیت">↻</button></div></td></tr>`).join('');
        $('#contentEmpty')?.toggleAttribute('hidden', list.length !== 0); renderStats();
        $$('[data-edit-id]').forEach(btn => btn.addEventListener('click', () => openEditor(btn.dataset.editId)));
        $$('[data-toggle-id]').forEach(btn => btn.addEventListener('click', () => toggleStatus(btn.dataset.toggleId)));
    }
    function openEditor(id) {
        state.editingId = id || null; const item = state.anime.find(x => x.id === id);
        $('#contentModalTitle').textContent = item ? 'ویرایش عنوان' : 'افزودن عنوان جدید'; $('#editingId').value = item?.id || '';
        $('#titleFa').value = item?.title || ''; $('#titleEn').value = item?.titleEn || ''; $('#titleStatus').value = item?.status || 'draft'; $('#titleRating').value = item?.rating || 8.5; $('#titleGenres').value = (item?.genres || []).join(', '); $('#titleDescription').value = item?.desc || '';
        openModal('contentModal');
    }
    function saveTitle(event) { event.preventDefault(); const title = $('#titleFa').value.trim(); const titleEn = $('#titleEn').value.trim(); if (!title || !titleEn) return toast('نام فارسی و انگلیسی الزامی است.', 'error'); const id = $('#editingId').value || slugify(titleEn); const old = state.anime.find(x => x.id === id); const next = { ...(old || {}), id, title, titleEn, status: $('#titleStatus').value, rating: Number($('#titleRating').value || 0), genres: $('#titleGenres').value.split(',').map(x => x.trim()).filter(Boolean), genreLabel: $('#titleGenres').value, desc: $('#titleDescription').value.trim(), poster: old?.poster || 'assets/img/attack-on-titan.webp', banner: old?.banner || 'assets/img/attack-on-titan-wallpaper.webp', episodes: old?.episodes || [] }; const index = state.anime.findIndex(x => x.id === id); if (index === -1) state.anime.unshift(next); else state.anime[index] = next; saveJson(KEY.anime, state.anime); renderContent(); closeModal('contentModal'); toast(old ? 'عنوان بروزرسانی شد؛ تغییر محلی ذخیره شد.' : 'عنوان جدید به کاتالوگ پیش‌نمایش اضافه شد.', 'success'); }
    function toggleStatus(id) { const item = state.anime.find(x => x.id === id); if (!item) return; item.status = item.status === 'airing' ? 'finished' : item.status === 'finished' ? 'draft' : 'airing'; saveJson(KEY.anime, state.anime); renderContent(); toast(`وضعیت «${item.title}» به ${statusLabel(item.status)} تغییر کرد.`, 'success'); }
    function download(filename, content, type = 'application/json;charset=utf-8') { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 800); toast(`${filename} دانلود شد؛ secretی داخل فایل نیست.`, 'success'); }

    function renderArticles() { const grid = $('#articleGrid'); if (!grid) return; grid.innerHTML = state.articles.slice(0, 12).map(article => `<article class="article-admin-card"><img src="${esc(article.image || 'assets/img/og-image.jpg')}" alt=""><div class="article-card-body"><span class="article-category">${esc(article.category || 'MAGAZINE')}</span><h3>${esc(article.title)}</h3><p>${esc(article.excerpt || '')}</p><div class="article-card-foot"><span>${esc(article.dateLabel || article.date || 'پیش‌نویس')}</span><button type="button" data-toast="ویرایشگر مقاله در اتصال بک‌اند فعال می‌شود.">ویرایش ↗</button></div></div></article>`).join(''); $$('.article-admin-card [data-toast]').forEach(btn => btn.addEventListener('click', () => toast(btn.dataset.toast, 'warning'))); }
    function renderUsers() { const table = $('#userTable'); if (!table) return; table.innerHTML = USERS.map(user => `<tr><td><div class="table-title"><span class="moderation-avatar">${esc(user.initial)}</span><div><b>${esc(user.name)}</b><small>${esc(user.email)}</small></div></div></td><td><span class="role-pill">${esc(user.role)}</span></td><td><span class="vip-pill ${user.plan === 'عادی' ? 'basic' : ''}">✦ ${esc(user.plan)}</span></td><td>${esc(user.last)}</td><td><span class="status-dot"></span>${esc(user.status)}</td><td><div class="row-actions"><button class="row-action" type="button" data-user-action="${esc(user.email)}">⋯</button></div></td></tr>`).join(''); $$('[data-user-action]').forEach(btn => btn.addEventListener('click', () => toast('منوی کاربر در نسخه‌ی متصل به API باز می‌شود.', 'warning'))); }
    function renderModeration() { const list = $('#moderationList'); if (!list) return; list.innerHTML = REPORTS.map((report, index) => `<div class="moderation-item" data-report="${index}"><span class="moderation-avatar">${esc(report.initial)}</span><main><b>${esc(report.user)} <small>· ${esc(report.time)}</small></b><p>${esc(report.text)}</p><small>${esc(report.anime)}</small></main><div class="moderation-actions"><button type="button" data-moderate="approve" title="تأیید">✓</button><button class="delete" type="button" data-moderate="delete" title="حذف">×</button></div></div>`).join(''); $$('.moderation-item [data-moderate]').forEach(btn => btn.addEventListener('click', () => { const item = btn.closest('.moderation-item'); item?.remove(); toast(btn.dataset.moderate === 'approve' ? 'گزارش بررسی و بسته شد.' : 'مورد از صف نمایش حذف شد.', 'success'); })); }
    function renderSchedule() { const wrap = $('#scheduleItems'); if (!wrap) return; const entries = state.anime.slice(0, 4); wrap.innerHTML = entries.map((item, index) => `<div class="schedule-item"><span class="schedule-time">${['18:30','20:00','21:15','23:00'][index]}</span><img class="schedule-poster" src="${esc(poster(item))}" alt=""><div><b>${esc(item.title)} · قسمت ${index + 1}</b><small>${index % 2 ? 'زیرنویس فارسی' : 'دوبله اختصاصی'} · اطلاع‌رسانی فعال</small></div><span class="schedule-type">${index % 2 ? 'SUB' : 'DUB'}</span></div>`).join(''); $$('.schedule-days button').forEach(day => day.addEventListener('click', () => { $$('.schedule-days button').forEach(x => x.classList.remove('active')); day.classList.add('active'); toast(`برنامه‌ی ${day.textContent.trim()} نمایش داده شد.`, 'info'); })); }
    function loadSettings() { let saved = {}; try { saved = JSON.parse(localStorage.getItem(KEY.settings) || '{}'); } catch (e) {} if (saved.name) $('#siteName').value = saved.name; if (saved.description) $('#siteDescription').value = saved.description; if (saved.language) $('#siteLanguage').value = saved.language; if (saved.timezone) $('#siteTimezone').value = saved.timezone; if (typeof saved.registration === 'boolean') $('#registrationToggle').checked = saved.registration; if (typeof saved.comments === 'boolean') $('#commentsToggle').checked = saved.comments; if (typeof saved.maintenance === 'boolean') $('#maintenanceToggle').checked = saved.maintenance; }
    function saveSettings(event) { event.preventDefault(); const settings = { name: $('#siteName').value.trim(), description: $('#siteDescription').value.trim(), language: $('#siteLanguage').value, timezone: $('#siteTimezone').value, registration: $('#registrationToggle').checked, comments: $('#commentsToggle').checked, maintenance: $('#maintenanceToggle').checked }; saveJson(KEY.settings, settings); $('#savedLabel').textContent = 'آخرین ذخیره: همین الان'; toast('تنظیمات در حالت پیش‌نمایش ذخیره شد.', 'success'); }
    function bind() {
        bindNavigation(); renderStats(); renderContent(); renderArticles(); renderUsers(); renderModeration(); renderSchedule(); loadSettings();
        $('#contentSearch')?.addEventListener('input', renderContent); $('#contentStatus')?.addEventListener('change', renderContent); $('#contentForm')?.addEventListener('submit', saveTitle); $('#quickAddButton')?.addEventListener('click', () => openEditor()); $('#addTitleButton')?.addEventListener('click', () => openEditor()); $('#newArticleButton')?.addEventListener('click', () => toast('برای ساخت مقاله، اتصال API تحریریه را فعال کن.', 'warning')); $('#scheduleButton')?.addEventListener('click', () => toast('زمان‌بندی واقعی بعد از اتصال backend ذخیره می‌شود.', 'warning')); $('#settingsForm')?.addEventListener('submit', saveSettings);
        $('#exportCatalog')?.addEventListener('click', () => download('neon-catalog-export.json', JSON.stringify({ exportedAt: new Date().toISOString(), source: 'admin-preview', items: state.anime.map(({ id, title, titleEn, status, rating, genres, episodes }) => ({ id, title, titleEn, status, rating, genres, episodeCount: episodes?.length || 0 })) }, null, 2) + '\n'));
        $('#exportUsers')?.addEventListener('click', () => download('neon-users-preview.json', JSON.stringify({ exportedAt: new Date().toISOString(), source: 'admin-preview', users: USERS.map(({ name, email, role, plan, status }) => ({ name, email, role, plan, status })) }, null, 2) + '\n'));
        $('#deployButton')?.addEventListener('click', () => toast('برای انتشار واقعی، ابتدا endpoint امن /api/ops/actions را فعال کن.', 'warning'));
        $('#dismissAdminNotice')?.addEventListener('click', () => { $('.demo-notice')?.classList.add('hidden'); try { localStorage.setItem(KEY.notice, 'true'); } catch (e) {} }); try { if (localStorage.getItem(KEY.notice) === 'true') $('.demo-notice')?.classList.add('hidden'); } catch (e) {}
        $('#globalSearch')?.addEventListener('keydown', e => { if (e.key === 'Enter') { showSection('content'); $('#contentSearch').value = e.currentTarget.value; renderContent(); } }); document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#globalSearch')?.focus(); } });
        $$('[data-close-modal]').forEach(btn => btn.addEventListener('click', () => closeModal(btn.dataset.closeModal))); $$('.admin-modal-backdrop').forEach(backdrop => backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(backdrop.id); })); document.addEventListener('keydown', e => { if (e.key === 'Escape') { $$('.admin-modal-backdrop:not([hidden])').forEach(x => closeModal(x.id)); } });
        $('#mobileMenu')?.addEventListener('click', () => { $('#adminSidebar')?.classList.toggle('open'); $('#adminBackdrop')?.classList.toggle('visible'); }); $('#adminBackdrop')?.addEventListener('click', () => { $('#adminSidebar')?.classList.remove('open'); $('#adminBackdrop')?.classList.remove('visible'); }); $('#themeToggle')?.addEventListener('click', () => applyTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light')); $('#notificationButton')?.addEventListener('click', () => toast('۳ اعلان جدید در نسخه‌ی متصل نمایش داده می‌شود.', 'info'));
    }
    document.addEventListener('DOMContentLoaded', () => { applyTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'); bind(); });
})();
