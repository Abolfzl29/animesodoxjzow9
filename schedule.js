/* ==========================================================================
 * schedule.html — «تقویم پخش هفتگی» (standalone page)
 *
 * Features:
 *   1. Seven Persian-week days (شنبه … جمعه) as tabs; today's tab is marked
 *      and selected automatically (override with ?day=<key>).
 *   2. «پخش امروز» section: today's episodes with a live countdown/status.
 *   3. Release time (ساعت انتشار) shown on every episode card.
 *   4. Dub/Sub filter (همه / دوبله / زیرنویس); entries available in both
 *      versions match either filter.
 *   5. Release reminders: 🔔 toggles persist to localStorage
 *      (neon_schedule_reminders). If the Notification API is available and
 *      granted, due reminders fire as system notifications; otherwise (or in
 *      addition) they appear as in-page toasts while this page is open.
 *
 * Broadcast data below is demo data keyed by real ids from data/anime.js.
 * Times are 24h Tehran time (Asia/Tehran ≈ visitor-local for the demo site).
 * ========================================================================== */
(function () {
    'use strict';

    var DATA = window.NEON_ANIME;
    var L = window.NeonLibrary;

    /* ------------------------------------------------------------------ */
    /* Week model (Persian week starts on شنبه)                            */
    /* ------------------------------------------------------------------ */
    var WEEK = [
        { key: 'sat', label: 'شنبه', jsDay: 6 },
        { key: 'sun', label: 'یک‌شنبه', jsDay: 0 },
        { key: 'mon', label: 'دوشنبه', jsDay: 1 },
        { key: 'tue', label: 'سه‌شنبه', jsDay: 2 },
        { key: 'wed', label: 'چهارشنبه', jsDay: 3 },
        { key: 'thu', label: 'پنج‌شنبه', jsDay: 4 },
        { key: 'fri', label: 'جمعه', jsDay: 5 }
    ];

    function weekByKey(key) {
        for (var i = 0; i < WEEK.length; i++) { if (WEEK[i].key === key) return WEEK[i]; }
        return null;
    }

    function todayKey(now) {
        now = now || new Date();
        for (var i = 0; i < WEEK.length; i++) { if (WEEK[i].jsDay === now.getDay()) return WEEK[i].key; }
        return 'sat';
    }

    /* ------------------------------------------------------------------ */
    /* Demo broadcast data (lang: 'dub' | 'sub' | 'both')                  */
    /* ------------------------------------------------------------------ */
    var SCHEDULE = [
        { day: 'sat', animeId: 'one-piece', ep: 1118, time: '20:00', lang: 'sub' },
        { day: 'sat', animeId: 'attack-on-titan', ep: 22, time: '22:30', lang: 'dub', vip: true },
        { day: 'sun', animeId: 'demon-slayer', ep: 12, time: '19:00', lang: 'dub' },
        { day: 'sun', animeId: 'chainsaw-man', ep: 9, time: '21:30', lang: 'sub' },
        { day: 'mon', animeId: 'jujutsu-kaisen', ep: 15, time: '20:30', lang: 'both' },
        { day: 'mon', animeId: 'cyberpunk-edgerunners', ep: 5, time: '23:00', lang: 'sub' },
        { day: 'tue', animeId: 'death-note', ep: 10, time: '18:30', lang: 'dub' },
        { day: 'tue', animeId: 'one-piece', ep: 1119, time: '21:00', lang: 'sub' },
        { day: 'wed', animeId: 'demon-slayer', ep: 13, time: '20:00', lang: 'sub' },
        { day: 'wed', animeId: 'attack-on-titan', ep: 23, time: '22:15', lang: 'both' },
        { day: 'thu', animeId: 'jujutsu-kaisen', ep: 16, time: '19:30', lang: 'sub' },
        { day: 'thu', animeId: 'chainsaw-man', ep: 10, time: '22:00', lang: 'dub' },
        { day: 'fri', animeId: 'cyberpunk-edgerunners', ep: 6, time: '17:00', lang: 'both' },
        { day: 'fri', animeId: 'death-note', ep: 11, time: '20:30', lang: 'sub' }
    ];

    /* ------------------------------------------------------------------ */
    /* Small helpers                                                       */
    /* ------------------------------------------------------------------ */
    var FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
    function toFa(value) {
        if (DATA && typeof DATA.toFa === 'function') return DATA.toFa(value);
        return String(value).replace(/\d/g, function (d) { return FA_DIGITS[d]; });
    }

    function pad2(n) { return (n < 10 ? '0' : '') + n; }

    function timeToMinutes(hhmm) {
        var parts = String(hhmm).split(':');
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || '0', 10);
    }

    function entryTitle(entry) {
        var anime = DATA && DATA.byId ? DATA.byId[entry.animeId] : null;
        return anime ? anime.title : entry.animeId;
    }

    function entryPoster(entry) {
        var anime = DATA && DATA.byId ? DATA.byId[entry.animeId] : null;
        return anime ? anime.poster : 'assets/og-image.jpg';
    }

    function episodeTitle(entry) {
        var anime = DATA && DATA.byId ? DATA.byId[entry.animeId] : null;
        if (anime && anime.episodes) {
            for (var i = 0; i < anime.episodes.length; i++) {
                if (anime.episodes[i].number === entry.ep) return anime.episodes[i].title;
            }
        }
        return '';
    }

    function entryKey(entry) {
        return entry.day + '|' + entry.animeId + '|' + entry.ep;
    }

    function matchesLang(entry, langFilter) {
        if (langFilter === 'all') return true;
        if (entry.lang === 'both') return true; // dual release matches both filters
        return entry.lang === langFilter;
    }

    function dayEntries(dayKey) {
        return SCHEDULE.filter(function (e) { return e.day === dayKey; })
            .sort(function (a, b) { return timeToMinutes(a.time) - timeToMinutes(b.time); });
    }

    function reminderId(entry) { return entryKey(entry); }

    /* Next occurrence of (dayKey, HH:MM) at/after `now` as a Date. */
    function nextOccurrence(dayKey, hhmm, now) {
        now = now || new Date();
        var day = weekByKey(dayKey) || WEEK[0];
        var occ = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        var diff = (day.jsDay - occ.getDay() + 7) % 7;
        occ.setDate(occ.getDate() + diff);
        occ.setHours(parseInt(hhmm.split(':')[0], 10), parseInt(hhmm.split(':')[1] || '0', 10), 0, 0);
        if (occ.getTime() < now.getTime()) occ.setDate(occ.getDate() + 7);
        return occ;
    }

    function fmtClock(hhmm) { return toFa(hhmm); }

    function fmtCountdown(ms) {
        if (ms <= 0) return 'کمتر از یک دقیقه';
        var totalMin = Math.floor(ms / 60000);
        var days = Math.floor(totalMin / 1440);
        var hours = Math.floor((totalMin % 1440) / 60);
        var minutes = totalMin % 60;
        var parts = [];
        if (days) parts.push(toFa(days) + ' روز');
        if (hours) parts.push(toFa(hours) + ' ساعت');
        if (minutes) parts.push(toFa(minutes) + ' دقیقه');
        return parts.length ? parts.join(' و ') : 'کمتر از یک دقیقه';
    }

    function fmtDayDate(date) {
        try {
            return new Intl.DateTimeFormat('fa-IR', {
                weekday: 'long', day: 'numeric', month: 'long'
            }).format(date);
        } catch (e) {
            return WEEK.filter(function (d) { return d.jsDay === date.getDay(); })[0].label +
                ' ' + toFa(date.getDate()) + '/' + toFa(date.getMonth() + 1);
        }
    }

    /* ------------------------------------------------------------------ */
    /* Reminders storage                                                   */
    /* ------------------------------------------------------------------ */
    var REMINDERS_KEY = 'neon_schedule_reminders';

    function readReminders() {
        try {
            var raw = JSON.parse(localStorage.getItem(REMINDERS_KEY) || '[]');
            if (!Array.isArray(raw)) return [];
            return raw.filter(function (r) {
                return r && typeof r.id === 'string' && r.day && r.animeId && r.time;
            });
        } catch (e) { return []; }
    }

    function writeReminders(list) {
        try { localStorage.setItem(REMINDERS_KEY, JSON.stringify(list)); return true; }
        catch (e) { return false; }
    }

    function findReminder(id) {
        var list = readReminders();
        for (var i = 0; i < list.length; i++) { if (list[i].id === id) return list[i]; }
        return null;
    }

    function upsertReminder(entry) {
        var list = readReminders();
        var id = reminderId(entry);
        var existing = null;
        list.forEach(function (r) { if (r.id === id) existing = r; });
        if (existing) return existing;
        var rec = {
            id: id,
            day: entry.day,
            animeId: entry.animeId,
            ep: entry.ep,
            time: entry.time,
            title: entryTitle(entry),
            createdAt: Date.now()
        };
        list.push(rec);
        writeReminders(list);
        return rec;
    }

    function removeReminder(id) {
        var list = readReminders().filter(function (r) { return r.id !== id; });
        writeReminders(list);
    }

    function markReminderFired(id, occKey) {
        var list = readReminders();
        list.forEach(function (r) { if (r.id === id) r.lastFired = occKey; });
        writeReminders(list);
    }

    function notificationAllowed() {
        return typeof window.Notification === 'function' && Notification.permission === 'granted';
    }

    function askNotificationPermission(done) {
        if (typeof window.Notification !== 'function') { if (done) done('unsupported'); return; }
        if (Notification.permission !== 'default') { if (done) done(Notification.permission); return; }
        try {
            var p = Notification.requestPermission(function (perm) { if (done) done(perm); });
            if (p && typeof p.then === 'function') p.then(function (perm) { if (done) done(perm); });
        } catch (e) { if (done) done('denied'); }
    }

    /* ------------------------------------------------------------------ */
    /* DOM helpers                                                         */
    /* ------------------------------------------------------------------ */
    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = String(text);
        return node;
    }

    function toast(message, type) {
        if (L && typeof L.toast === 'function') { L.toast(message, type); return; }
        if (typeof window.showToast === 'function') { window.showToast(message); return; }
        var container = document.getElementById('toastContainer');
        if (!container) return;
        var node = el('div', 'toast', message);
        container.appendChild(node);
        setTimeout(function () { node.classList.add('show'); }, 10);
        setTimeout(function () {
            node.classList.remove('show');
            setTimeout(function () { node.remove(); }, 400);
        }, 3500);
    }

    /* ------------------------------------------------------------------ */
    /* Page state                                                          */
    /* ------------------------------------------------------------------ */
    var state = { day: 'sat', lang: 'all' };
    var refs = {};

    function langBadges(entry) {
        var wrap = el('span', 'lang-badges sch-badges');
        if (entry.lang === 'dub' || entry.lang === 'both') {
            wrap.appendChild(el('span', 'lang-badge dub', 'دوبله'));
        }
        if (entry.lang === 'sub' || entry.lang === 'both') {
            wrap.appendChild(el('span', 'lang-badge sub', 'زیرنویس'));
        }
        return wrap;
    }

    function buildCard(entry, options) {
        options = options || {};
        var card = el('article', 'sch-card');
        card.dataset.entry = entryKey(entry);
        card.dataset.anime = entry.animeId;

        var link = el('a', 'sch-card__link');
        link.href = DATA && DATA.detailUrl ? DATA.detailUrl(entry.animeId) : 'catalog.html';
        link.setAttribute('aria-label', 'صفحهٔ ' + entryTitle(entry));

        var img = el('img');
        img.src = entryPoster(entry);
        img.alt = 'پوستر ' + entryTitle(entry);
        img.width = 64;
        img.height = 88;
        img.loading = 'lazy';
        img.decoding = 'async';
        link.appendChild(img);
        card.appendChild(link);

        var body = el('div', 'sch-card__body');
        var title = el('a', 'sch-card__title', entryTitle(entry));
        title.href = link.href;
        body.appendChild(title);

        var epLabel = 'قسمت ' + toFa(entry.ep);
        var epName = episodeTitle(entry);
        body.appendChild(el('p', 'sch-card__ep', epLabel + (epName ? ' · ' + epName : '')));

        var meta = el('div', 'sch-card__meta');
        var timeChip = el('span', 'sch-time', '🕒 ساعت ' + fmtClock(entry.time));
        timeChip.title = 'ساعت انتشار';
        meta.appendChild(timeChip);
        meta.appendChild(langBadges(entry));
        if (entry.vip) meta.appendChild(el('span', 'sch-vip', '✦ VIP'));
        body.appendChild(meta);

        if (options.statusSlot) {
            var status = el('p', 'sch-card__status');
            status.dataset.role = 'status';
            body.appendChild(status);
            card._statusNode = status;
        }

        var actions = el('div', 'sch-card__actions');
        var watch = el('a', 'sch-btn sch-btn--watch', '▶ تماشا');
        watch.href = DATA && DATA.watchUrl ? DATA.watchUrl(entry.animeId, entry.ep) : 'watch.html';
        actions.appendChild(watch);

        var remind = el('button', 'sch-btn sch-btn--remind', '🔔 یادآوری');
        remind.type = 'button';
        remind.dataset.remind = reminderId(entry);
        actions.appendChild(remind);
        body.appendChild(actions);

        card.appendChild(body);
        syncRemindButton(card, entry);
        return card;
    }

    function syncRemindButton(card, entry) {
        var btn = card.querySelector('[data-remind]');
        if (!btn) return;
        var active = !!findReminder(reminderId(entry));
        btn.classList.toggle('is-on', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        btn.textContent = active ? '🔕 لغو یادآوری' : '🔔 یادآوری';
        btn.title = active ? 'لغو یادآوری انتشار این قسمت' : 'یادآوری انتشار این قسمت';
    }

    /* ------------------------------------------------------------------ */
    /* Rendering: day tabs                                                 */
    /* ------------------------------------------------------------------ */
    function renderTabs() {
        var host = refs.days;
        if (!host) return;
        host.innerHTML = '';
        var today = todayKey();
        WEEK.forEach(function (day) {
            var btn = el('button', 'sch-day', day.label);
            btn.type = 'button';
            btn.role = 'tab';
            btn.dataset.day = day.key;
            if (day.key === today) {
                btn.classList.add('is-today');
                btn.appendChild(el('span', 'sch-day__today', ' (امروز)'));
            }
            var count = dayEntries(day.key).length;
            if (count) btn.appendChild(el('span', 'sch-day__count', toFa(count)));
            btn.addEventListener('click', function () { selectDay(day.key); });
            host.appendChild(btn);
        });
    }

    function selectDay(dayKey) {
        if (!weekByKey(dayKey)) dayKey = todayKey();
        state.day = dayKey;
        try {
            var url = new URL(window.location.href);
            url.searchParams.set('day', dayKey);
            window.history.replaceState(null, '', url.toString());
        } catch (e) { /* file:// or older browsers — ignore */ }
        Array.prototype.forEach.call(refs.days.querySelectorAll('.sch-day'), function (btn) {
            var on = btn.dataset.day === dayKey;
            btn.classList.toggle('active', on);
            btn.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        renderDay();
    }

    /* ------------------------------------------------------------------ */
    /* Rendering: selected day list (with dub/sub filter)                  */
    /* ------------------------------------------------------------------ */
    function renderDay() {
        var host = refs.content;
        if (!host) return;
        host.innerHTML = '';
        host.setAttribute('aria-busy', 'false');

        var items = dayEntries(state.day).filter(function (e) { return matchesLang(e, state.lang); });

        if (!items.length) {
            var empty = el('div', 'sch-empty');
            empty.appendChild(el('span', 'sch-empty__icon', '🗓'));
            empty.appendChild(el('h3', null, 'پخشی با این فیلتر نیست'));
            empty.appendChild(el('p', null,
                state.lang === 'all'
                    ? 'برای این روز قسمت جدیدی برنامه‌ریزی نشده است.'
                    : 'برای این روز نسخهٔ انتخابی شما برنامه‌ریزی نشده؛ فیلتر را تغییر دهید.'));
            host.appendChild(empty);
            return;
        }

        items.forEach(function (entry) { host.appendChild(buildCard(entry)); });
    }

    /* ------------------------------------------------------------------ */
    /* Rendering: today's episodes + live status                           */
    /* ------------------------------------------------------------------ */
    function todayStatus(entry, now) {
        now = now || new Date();
        var occ = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        occ.setHours(parseInt(entry.time.split(':')[0], 10), parseInt(entry.time.split(':')[1] || '0', 10), 0, 0);
        var diff = occ.getTime() - now.getTime();
        if (diff <= 0 && diff > -24 * 60 * 1000) {
            return { cls: 'is-live', text: '🔴 در حال پخش' };
        }
        if (diff <= -24 * 60 * 1000) {
            return { cls: 'is-done', text: '✔ پخش شد' };
        }
        return { cls: 'is-upcoming', text: '⏳ تا پخش: ' + fmtCountdown(diff) };
    }

    function renderToday(now) {
        var host = refs.todayList;
        if (!host) return;
        now = now || new Date();
        if (refs.todayDate) refs.todayDate.textContent = fmtDayDate(now);

        var today = todayKey(now);
        var items = dayEntries(today);
        host.innerHTML = '';

        if (!items.length) {
            var empty = el('p', 'sch-today-empty', 'امروز پخشی برنامه‌ریزی نشده است؛ روزهای دیگر هفته را از تقویم پایین ببینید.');
            host.appendChild(empty);
            return;
        }

        items.forEach(function (entry) {
            var card = buildCard(entry, { statusSlot: true });
            var status = todayStatus(entry, now);
            if (card._statusNode) {
                card._statusNode.className = 'sch-card__status ' + status.cls;
                card._statusNode.textContent = status.text;
            }
            host.appendChild(card);
        });
    }

    /* ------------------------------------------------------------------ */
    /* Rendering: active reminders                                         */
    /* ------------------------------------------------------------------ */
    function renderReminders() {
        var host = refs.reminderList;
        if (!host) return;
        host.innerHTML = '';
        var list = readReminders();

        if (!list.length) {
            host.appendChild(el('p', 'sch-reminders-empty',
                'هنوز یادآوری فعالی ندارید. روی «🔔 یادآوری» هر قسمت بزنید تا نزدیک ساعت انتشار خبرتان کنیم.'));
            return;
        }

        list.forEach(function (rec) {
            var row = el('div', 'sch-reminder');
            var info = el('div', 'sch-reminder__info');
            var day = weekByKey(rec.day);
            var occ = nextOccurrence(rec.day, rec.time);
            info.appendChild(el('strong', null, rec.title + ' — قسمت ' + toFa(rec.ep)));
            info.appendChild(el('span', null,
                (day ? day.label : rec.day) + ' ساعت ' + fmtClock(rec.time) +
                ' · پخش بعدی: ' + fmtDayDate(occ) + '، ' + fmtCountdown(occ.getTime() - Date.now()) + ' دیگر'));
            row.appendChild(info);

            var cancel = el('button', 'sch-btn sch-btn--remind is-on', 'لغو یادآوری');
            cancel.type = 'button';
            cancel.dataset.remind = rec.id;
            cancel.dataset.fromPanel = '1';
            row.appendChild(cancel);
            host.appendChild(row);
        });
    }

    /* ------------------------------------------------------------------ */
    /* Reminder interactions                                               */
    /* ------------------------------------------------------------------ */
    function entryById(id) {
        for (var i = 0; i < SCHEDULE.length; i++) {
            if (reminderId(SCHEDULE[i]) === id) return SCHEDULE[i];
        }
        // Reminder kept for an entry no longer in the demo grid — rebuild from record.
        var rec = findReminder(id);
        return rec ? { day: rec.day, animeId: rec.animeId, ep: rec.ep, time: rec.time } : null;
    }

    function toggleReminder(id) {
        var entry = entryById(id);
        if (!entry) return;
        var title = entryTitle(entry);

        if (findReminder(id)) {
            removeReminder(id);
            toast('یادآوری «' + title + ' — قسمت ' + toFa(entry.ep) + '» لغو شد.');
        } else {
            upsertReminder(entry);
            var occ = nextOccurrence(entry.day, entry.time);
            var detail = fmtDayDate(occ) + '، ساعت ' + fmtClock(entry.time);
            askNotificationPermission(function (perm) {
                if (perm === 'granted') {
                    toast('یادآوری ساخته شد ⏰ ' + title + ' — ' + detail + ' (اعلان سیستمی فعال است)');
                } else if (perm === 'unsupported') {
                    toast('یادآوری ساخته شد ⏰ ' + title + ' — ' + detail + ' (اعلان فقط داخل همین صفحه)');
                } else {
                    toast('یادآوری ساخته شد ⏰ ' + title + ' — ' + detail + ' (بدون اجازهٔ اعلان، فقط داخل همین صفحه)');
                }
            });
        }
        refreshRemindButtons();
        renderReminders();
    }

    function refreshRemindButtons() {
        Array.prototype.forEach.call(document.querySelectorAll('.sch-card'), function (card) {
            var key = card.dataset.entry;
            if (!key) return;
            var entry = entryById(key);
            if (entry) syncRemindButton(card, entry);
        });
    }

    /* Fire reminders whose next occurrence is within the next minute. */
    function checkDueReminders(now) {
        now = now || new Date();
        readReminders().forEach(function (rec) {
            var occ = nextOccurrence(rec.day, rec.time, now);
            var occKey = occ.toISOString().slice(0, 10) + 'T' + occ.toTimeString().slice(0, 5);
            if (rec.lastFired === occKey) return;
            var lead = occ.getTime() - now.getTime();
            if (lead > 60 * 1000) return;
            markReminderFired(rec.id, occKey);
            var msg = '🔔 زمان انتشار رسید: «' + rec.title + ' — قسمت ' + toFa(rec.ep) + '»';
            if (notificationAllowed()) {
                try {
                    var n = new Notification('نئون انیمه — یادآوری انتشار', { body: msg, icon: 'assets/icon-192.png' });
                    n.onclick = function () {
                        window.focus();
                        var url = DATA && DATA.watchUrl ? DATA.watchUrl(rec.animeId, rec.ep) : 'watch.html';
                        window.location.href = url;
                    };
                } catch (e) { /* notification constructors can throw in some contexts */ }
            }
            toast(msg);
        });
    }

    /* ------------------------------------------------------------------ */
    /* Filter chips                                                        */
    /* ------------------------------------------------------------------ */
    function bindFilters() {
        Array.prototype.forEach.call(refs.filters.querySelectorAll('.sch-chip'), function (chip) {
            chip.addEventListener('click', function () {
                state.lang = chip.dataset.lang || 'all';
                Array.prototype.forEach.call(refs.filters.querySelectorAll('.sch-chip'), function (c) {
                    var on = c === chip;
                    c.classList.toggle('is-active', on);
                    c.setAttribute('aria-pressed', on ? 'true' : 'false');
                });
                renderDay();
            });
        });
    }

    /* ------------------------------------------------------------------ */
    /* Init                                                                */
    /* ------------------------------------------------------------------ */
    function init() {
        refs.days = document.getElementById('schDays');
        refs.content = document.getElementById('schContent');
        refs.filters = document.querySelector('.sch-filters');
        refs.todayList = document.getElementById('schTodayList');
        refs.todayDate = document.getElementById('schTodayDate');
        refs.reminderList = document.getElementById('schReminderList');
        if (!refs.days || !refs.content) return; // page elements missing

        if (L && typeof L.initSharedChrome === 'function') L.initSharedChrome();

        var initial = 'all';
        try { initial = new URLSearchParams(window.location.search).get('day') || ''; } catch (e) {}
        state.day = weekByKey(initial) ? initial : todayKey();

        renderTabs();
        bindFilters();
        selectDay(state.day);
        renderToday();
        renderReminders();

        // Delegated click handling for every 🔔 button on the page.
        document.addEventListener('click', function (ev) {
            var btn = ev.target.closest ? ev.target.closest('[data-remind]') : null;
            if (!btn) return;
            toggleReminder(btn.dataset.remind);
        });

        // Keep countdowns and due reminders fresh while the page is open.
        setInterval(function () {
            renderToday();
            checkDueReminders();
        }, 30 * 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Exposed for tests / debugging.
    window.NEON_SCHEDULE = {
        WEEK: WEEK,
        SCHEDULE: SCHEDULE,
        state: state,
        todayKey: todayKey,
        dayEntries: dayEntries,
        matchesLang: matchesLang,
        nextOccurrence: nextOccurrence,
        fmtCountdown: fmtCountdown,
        todayStatus: todayStatus,
        entryKey: entryKey,
        reminders: {
            key: REMINDERS_KEY,
            read: readReminders,
            toggle: toggleReminder,
            checkDue: checkDueReminders
        }
    };
})();
