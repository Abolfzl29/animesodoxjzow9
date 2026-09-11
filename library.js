/* ==========================================================================
 * library.js — shared engine for the user library pages.
 *
 * Pages built on top of this file:
 *   favorites.html          (علاقه‌مندی‌های من)
 *   continue-watching.html  (ادامه تماشا)
 *   history.html            (تاریخچه تماشا)
 *   completed.html          (تکمیل‌شده‌ها)
 *   profile.html            (Overview / نمای کلی)
 *
 * Storage contract (unchanged for v1 keys):
 *   neon_watchlist                     ["anime-id", ...]
 *   neon_progress_<anime-id>_<ep>      "0.4213"     (0..1)
 *   neon_last_watched                  {anime, ep, title, banner, ratio, at}
 *   neon_is_vip                        "true" | "false"
 *   neon_is_logged_in                  "true" | "false"
 *
 * New (v2) contract:
 *   neon_watch_history                 [{anime, ep, ratio, watchedAt}, ...]  (max 200)
 *   neon_sort_<page>                   sort id chosen per page
 *
 * Design rules:
 *   - data/anime.js is the ONLY source of anime information (no title/poster is
 *     ever copied into storage).
 *   - every read is defensive: corrupt JSON / missing ids never throw.
 * ========================================================================== */
(function () {
    'use strict';

    /* ------------------------------------------------------------------ */
    /* Constants                                                           */
    /* ------------------------------------------------------------------ */
    var KEYS = {
        watchlist: 'neon_watchlist',
        history: 'neon_watch_history',
        lastWatched: 'neon_last_watched',
        vip: 'neon_is_vip',
        loggedIn: 'neon_is_logged_in'
    };

    var PROGRESS_PREFIX = 'neon_progress_';
    var PROGRESS_RE = /^neon_progress_(.+)_(\d+)$/;

    var HISTORY_LIMIT = 200;
    var STARTED_AT = 0.01;   // >= 1%  -> the episode has really started
    var COMPLETE_AT = 0.95;  // >= 95% -> the episode counts as watched

    var FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

    var SORT_LABELS = {
        'recent': 'جدیدترین فعالیت',
        'oldest': 'قدیمی‌ترین فعالیت',
        'title': 'نام الفبایی',
        'rating': 'بالاترین امتیاز',
        'year': 'جدیدترین سال انتشار',
        'progress-desc': 'بیشترین پیشرفت',
        'progress-asc': 'کمترین پیشرفت'
    };

    var LIB_NAV = [
        { href: 'profile.html', icon: '◈', label: 'نمای کلی', count: 'overview' },
        { href: 'favorites.html', icon: '★', label: 'علاقه‌مندی‌های من', count: 'favorites' },
        { href: 'continue-watching.html', icon: '▶', label: 'ادامه تماشا', count: 'continuing' },
        { href: 'history.html', icon: '⟲', label: 'تاریخچه تماشا', count: 'history' },
        { href: 'completed.html', icon: '✔', label: 'تکمیل‌شده‌ها', count: 'completed' }
    ];

    /* ------------------------------------------------------------------ */
    /* Tiny helpers                                                        */
    /* ------------------------------------------------------------------ */
    function toFa(value) {
        var s = String(value == null ? '' : value);
        if (window.NEON_ANIME && typeof window.NEON_ANIME.toFa === 'function') {
            return window.NEON_ANIME.toFa(value);
        }
        return s.replace(/\d/g, function (d) { return FA_DIGITS[d]; });
    }

    function safeRatio(value) {
        var n = typeof value === 'number' ? value : parseFloat(value);
        if (!isFinite(n) || isNaN(n)) return 0;
        if (n < 0) return 0;
        if (n > 1) return 1;
        return n;
    }

    function clampRatio(value) { return safeRatio(value); }

    function percent(ratio) {
        var r = safeRatio(ratio);
        var p = Math.round(r * 100);
        // Never round an unfinished episode up to (or past) the completion
        // threshold: 94.9% must still read as "in progress".
        if (r < COMPLETE_AT && p >= COMPLETE_AT * 100) p = Math.floor(r * 100);
        return p;
    }

    function toTimestamp(value) {
        if (typeof value === 'number' && isFinite(value)) return value;
        var n = parseInt(value, 10);
        return isFinite(n) ? n : 0;
    }

    function faDateTime(ts) {
        var t = toTimestamp(ts);
        if (!t) return '—';
        try {
            return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(t));
        } catch (e) {
            try { return new Date(t).toLocaleString('fa-IR'); } catch (e2) { return '—'; }
        }
    }

    function isoDate(ts) {
        var t = toTimestamp(ts);
        return t ? new Date(t).toISOString() : '';
    }

    function storageAvailable() {
        try {
            var probe = '__neon_probe__';
            window.localStorage.setItem(probe, '1');
            window.localStorage.removeItem(probe);
            return true;
        } catch (e) { return false; }
    }

    /* ------------------------------------------------------------------ */
    /* Storage layer (never throws)                                        */
    /* ------------------------------------------------------------------ */
    var warnings = [];
    function warn(message) {
        if (message && warnings.indexOf(message) === -1) warnings.push(message);
    }
    function takeWarnings() {
        var copy = warnings.slice();
        warnings = [];
        return copy;
    }

    function lsGet(key) {
        try { return window.localStorage.getItem(key); } catch (e) { return null; }
    }
    function lsSet(key, value) {
        try { window.localStorage.setItem(key, value); return true; } catch (e) { warn('ذخیره‌سازی در مرورگر در دسترس نیست؛ تغییرات بعد از بستن صفحه از بین می‌روند.'); return false; }
    }
    function lsRemove(key) {
        try { window.localStorage.removeItem(key); return true; } catch (e) { return false; }
    }

    function readJsonArray(key) {
        var raw = lsGet(key);
        if (raw === null || raw === '') return { records: [], state: 'empty' };
        var parsed;
        try { parsed = JSON.parse(raw); } catch (e) { return { records: [], state: 'corrupt' }; }
        if (!Array.isArray(parsed)) return { records: [], state: 'corrupt' };
        return { records: parsed, state: 'ok' };
    }

    /* ------------------------------------------------------------------ */
    /* Session                                                             */
    /* ------------------------------------------------------------------ */
    function isVip() { return lsGet(KEYS.vip) === 'true'; }
    function isLoggedIn() { return lsGet(KEYS.loggedIn) === 'true'; }

    /* ------------------------------------------------------------------ */
    /* Data (data/anime.js)                                                */
    /* ------------------------------------------------------------------ */
    function hasData() {
        var d = window.NEON_ANIME;
        return !!(d && Array.isArray(d.list) && d.byId);
    }
    function allAnime() { return hasData() ? window.NEON_ANIME.list : []; }
    function animeById(id) {
        if (!hasData() || !id) return null;
        return window.NEON_ANIME.byId[id] || null;
    }
    function findEpisode(anime, number) {
        if (!anime || !Array.isArray(anime.episodes)) return null;
        var n = parseInt(number, 10);
        for (var i = 0; i < anime.episodes.length; i++) {
            if (anime.episodes[i].number === n) return anime.episodes[i];
        }
        return null;
    }
    function seasonOf(anime, number) {
        var ep = findEpisode(anime, number);
        if (ep) return ep.season;
        return anime && anime.currentSeason ? anime.currentSeason : null;
    }

    /* ------------------------------------------------------------------ */
    /* Watchlist (neon_watchlist)                                          */
    /* ------------------------------------------------------------------ */
    function readWatchlist() {
        var res = readJsonArray(KEYS.watchlist);
        if (res.state === 'corrupt') warn('داده‌ی «لیست من» خراب است و قابل خواندن نیست؛ ابتدا آن را تعمیر یا خالی کنید.');
        return res.records.filter(function (id) { return typeof id === 'string' && id; });
    }
    function writeWatchlist(ids) {
        var clean = [];
        ids.forEach(function (id) {
            if (typeof id === 'string' && id && clean.indexOf(id) === -1) clean.push(id);
        });
        return lsSet(KEYS.watchlist, JSON.stringify(clean));
    }

    /* ------------------------------------------------------------------ */
    /* Progress (neon_progress_<id>_<ep>)                                  */
    /* ------------------------------------------------------------------ */
    function progressKey(animeId, episode) {
        return PROGRESS_PREFIX + animeId + '_' + episode;
    }

    function readProgress() {
        var map = Object.create(null);
        try {
            var store = window.localStorage;
            for (var i = 0; i < store.length; i++) {
                var key = store.key(i);
                var m = PROGRESS_RE.exec(key || '');
                if (!m) continue;
                map[m[1] + '|' + m[2]] = safeRatio(store.getItem(key));
            }
        } catch (e) { /* storage blocked: treat as empty */ }
        return map;
    }

    function episodeRatio(progressMap, animeId, episode) {
        return safeRatio(progressMap[animeId + '|' + episode]);
    }

    function clearEpisodeProgress(animeId, episode) {
        lsRemove(progressKey(animeId, episode));
    }

    function clearAnimeProgress(animeId) {
        var removed = 0;
        try {
            var store = window.localStorage;
            var keys = [];
            for (var i = 0; i < store.length; i++) {
                var key = store.key(i);
                var m = PROGRESS_RE.exec(key || '');
                if (m && m[1] === animeId) keys.push(key);
            }
            keys.forEach(function (key) { if (lsRemove(key)) removed++; });
        } catch (e) { /* ignore */ }
        return removed;
    }

    /* ------------------------------------------------------------------ */
    /* Last watched (neon_last_watched) — kept for backwards compatibility  */
    /* ------------------------------------------------------------------ */
    function readLastWatched() {
        var raw = lsGet(KEYS.lastWatched);
        if (!raw) return null;
        try {
            var parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            var ep = parseInt(parsed.ep, 10);
            if (!parsed.anime || !isFinite(ep)) return null;
            return {
                anime: String(parsed.anime),
                ep: ep,
                title: typeof parsed.title === 'string' ? parsed.title : '',
                banner: typeof parsed.banner === 'string' ? parsed.banner : '',
                ratio: safeRatio(parsed.ratio),
                at: toTimestamp(parsed.at)
            };
        } catch (e) { return null; }
    }

    function writeLastWatched(payload) {
        try { lsSet(KEYS.lastWatched, JSON.stringify(payload)); return true; } catch (e) { return false; }
    }

    function clearLastWatchedFor(ids) {
        var last = readLastWatched();
        if (!last) return false;
        if (ids.indexOf(last.anime) === -1) return false;
        lsRemove(KEYS.lastWatched);
        return true;
    }

    /* ------------------------------------------------------------------ */
    /* Watch history (neon_watch_history)                                  */
    /* ------------------------------------------------------------------ */
    function normalizeHistoryRecord(raw) {
        if (!raw || typeof raw !== 'object') return null;
        var id = typeof raw.anime === 'string' ? raw.anime : (raw.anime && raw.anime.id);
        var ep = parseInt(raw.ep, 10);
        if (!id || !isFinite(ep) || ep < 0) return null;
        return {
            anime: String(id),
            ep: ep,
            ratio: safeRatio(raw.ratio),
            watchedAt: toTimestamp(raw.watchedAt)
        };
    }

    function dedupeHistory(records) {
        var byKey = Object.create(null);
        records.forEach(function (r) {
            var key = r.anime + '|' + r.ep;
            var prev = byKey[key];
            if (!prev || r.watchedAt >= prev.watchedAt) byKey[key] = r;
        });
        return Object.keys(byKey).map(function (k) { return byKey[k]; });
    }

    function readHistory() {
        var res = readJsonArray(KEYS.history);
        if (res.state === 'corrupt') warn('داده‌ی «تاریخچه تماشا» خراب است و قابل خواندن نیست.');
        var out = [];
        res.records.forEach(function (raw) {
            var rec = normalizeHistoryRecord(raw);
            if (rec) out.push(rec);
        });
        out = dedupeHistory(out);
        out.sort(function (a, b) { return a.watchedAt - b.watchedAt; });
        // Housekeeping: never keep more than HISTORY_LIMIT records, whatever
        // wrote them (old builds, manual edits, …).
        if (out.length > HISTORY_LIMIT) {
            out = out.slice(out.length - HISTORY_LIMIT);
            lsSet(KEYS.history, JSON.stringify(out));
        }
        return { records: out, state: res.state, missing: res.state === 'empty' && lsGet(KEYS.history) === null };
    }

    function writeHistory(records) {
        var clean = dedupeHistory(records || []);
        clean.sort(function (a, b) { return a.watchedAt - b.watchedAt; });
        if (clean.length > HISTORY_LIMIT) clean = clean.slice(clean.length - HISTORY_LIMIT);
        return lsSet(KEYS.history, JSON.stringify(clean));
    }

    /** Insert or refresh the single record for (anime, episode). */
    function upsertHistory(animeId, episode, ratio) {
        var ep = parseInt(episode, 10);
        if (!animeId || !isFinite(ep)) return false;
        var current = readHistory().records;
        var record = {
            anime: String(animeId),
            ep: ep,
            ratio: safeRatio(ratio),
            watchedAt: Date.now()
        };
        var kept = current.filter(function (r) { return !(r.anime === record.anime && r.ep === record.ep); });
        kept.push(record);
        return writeHistory(kept);
    }

    /** Remove exact (anime, episode) records. Progress is left untouched. */
    function removeHistoryRecords(pairs) {
        var current = readHistory().records;
        var kept = current.filter(function (r) {
            return !pairs.some(function (p) { return p.anime === r.anime && parseInt(p.ep, 10) === r.ep; });
        });
        return writeHistory(kept);
    }

    function removeHistoryForAnime(animeId) {
        var current = readHistory().records;
        return writeHistory(current.filter(function (r) { return r.anime !== animeId; }));
    }

    /**
     * One-time migration for data written before neon_watch_history existed.
     * Runs only when the key is completely absent, so a record the user deleted
     * on purpose is never resurrected.
     */
    function migrateLegacyHistory() {
        if (!storageAvailable()) return 0;
        if (lsGet(KEYS.history) !== null) return 0;

        var records = [];
        var progress = readProgress();
        Object.keys(progress).forEach(function (key) {
            var parts = key.split('|');
            if (parts.length !== 2) return;
            records.push({
                anime: parts[0],
                ep: parseInt(parts[1], 10),
                ratio: progress[key],
                watchedAt: 0
            });
        });

        var last = readLastWatched();
        if (last) {
            var match = records.filter(function (r) { return r.anime === last.anime && r.ep === last.ep; })[0];
            if (match) {
                match.watchedAt = last.at || 0;
                if (match.ratio <= 0 && last.ratio > 0) match.ratio = last.ratio;
            } else {
                records.push({ anime: last.anime, ep: last.ep, ratio: last.ratio, watchedAt: last.at || 0 });
                // The old player deleted the progress key once an episode was
                // finished; bring it back so "completed" can be detected.
                if (last.ratio >= STARTED_AT && lsGet(progressKey(last.anime, last.ep)) === null) {
                    lsSet(progressKey(last.anime, last.ep), safeRatio(last.ratio).toFixed(4));
                }
            }
        }

        records = records.filter(function (r) { return !!r.anime && isFinite(r.ep); });
        records.sort(function (a, b) { return a.watchedAt - b.watchedAt; });
        writeHistory(records);
        return records.length;
    }

    /* ------------------------------------------------------------------ */
    /* Derived views                                                       */
    /* ------------------------------------------------------------------ */
    function historyByEpisode(records) {
        var map = Object.create(null);
        records.forEach(function (r) { map[r.anime + '|' + r.ep] = r; });
        return map;
    }

    function activityOf(animeId, historyRecords) {
        var t = 0;
        (historyRecords || []).forEach(function (r) {
            if (r.anime === animeId && r.watchedAt > t) t = r.watchedAt;
        });
        var last = readLastWatched();
        if (last && last.anime === animeId && last.at && last.at > t) t = last.at;
        return t;
    }

    /** Per-episode state of one anime, based on real progress values. */
    function animeEpisodeStates(anime, progressMap, historyMap) {
        var episodes = Array.isArray(anime.episodes) ? anime.episodes : [];
        return episodes.map(function (ep) {
            var ratio = episodeRatio(progressMap, anime.id, ep.number);
            var hist = historyMap[anime.id + '|' + ep.number];
            return {
                episode: ep,
                number: ep.number,
                season: ep.season,
                ratio: ratio,
                started: ratio >= STARTED_AT,
                complete: ratio >= COMPLETE_AT,
                watchedAt: hist ? hist.watchedAt : 0
            };
        });
    }

    function baseItem(anime) {
        return {
            anime: anime,
            animeId: anime.id,
            title: anime.title,
            titleEn: anime.titleEn || '',
            rating: typeof anime.rating === 'number' ? anime.rating : 0,
            year: typeof anime.year === 'number' ? anime.year : 0
        };
    }

    /** Titles with an unfinished episode, or a next episode to start. */
    function buildContinueItems() {
        if (!hasData()) return [];
        var progress = readProgress();
        var historyRecords = readHistory().records;
        var historyMap = historyByEpisode(historyRecords);
        var items = [];

        allAnime().forEach(function (anime) {
            var states = animeEpisodeStates(anime, progress, historyMap);
            if (!states.length) return;
            if (states.every(function (s) { return s.complete; })) return; // -> completed page
            // Only titles with real stored progress belong here: a title that
            // was never played (or whose progress was cleared) must not show up.
            if (!states.some(function (s) { return s.ratio >= STARTED_AT; })) return;

            var unfinished = states.filter(function (s) { return s.started && !s.complete; });
            var target = null;
            var kind = 'in-progress';

            if (unfinished.length) {
                var sorted = unfinished.slice().sort(function (a, b) {
                    if (b.watchedAt !== a.watchedAt) return b.watchedAt - a.watchedAt;
                    return b.number - a.number;
                });
                target = sorted[0];
            } else {
                var lastCompleted = -1;
                states.forEach(function (s, i) { if (s.complete) lastCompleted = i; });
                var next = lastCompleted >= 0 ? states[lastCompleted + 1] : states[0];
                if (!next) return;
                target = next;
                kind = 'next';
            }

            var item = baseItem(anime);
            item.key = 'continue:' + anime.id;
            item.kind = kind;
            item.episode = target.episode;
            item.episodeNumber = target.number;
            item.season = target.season;
            item.ratio = target.ratio;
            item.watchedAt = target.watchedAt || activityOf(anime.id, historyRecords);
            item.activity = item.watchedAt || activityOf(anime.id, historyRecords);
            item.locked = !!target.episode.vip && !isVip();
            item.totalEpisodes = states.length;
            item.doneEpisodes = states.filter(function (s) { return s.complete; }).length;
            items.push(item);
        });

        return items;
    }

    /** Titles where every episode available in data/anime.js is watched. */
    function buildCompletedItems() {
        if (!hasData()) return [];
        var progress = readProgress();
        var historyRecords = readHistory().records;
        var historyMap = historyByEpisode(historyRecords);
        var items = [];

        allAnime().forEach(function (anime) {
            var states = animeEpisodeStates(anime, progress, historyMap);
            if (!states.length) return;
            var allDone = states.every(function (s) { return s.complete; });
            if (!allDone) return;

            var completedAt = 0;
            states.forEach(function (s) { if (s.watchedAt > completedAt) completedAt = s.watchedAt; });

            var item = baseItem(anime);
            item.key = 'completed:' + anime.id;
            item.ratio = 1;
            item.completedAt = completedAt;
            item.activity = completedAt || activityOf(anime.id, historyRecords);
            item.totalEpisodes = states.length;
            item.doneEpisodes = states.length;
            items.push(item);
        });

        return items;
    }

    /** Every stored history record, newest first. */
    function buildHistoryItems() {
        var res = readHistory();
        if (res.state === 'corrupt') warn('داده‌ی «تاریخچه تماشا» خراب است و قابل خواندن نیست.');
        return res.records.slice().sort(function (a, b) { return b.watchedAt - a.watchedAt; }).map(function (r) {
            var anime = animeById(r.anime);
            var item = {
                key: 'history:' + r.anime + ':' + r.ep,
                anime: anime,
                animeId: r.anime,
                episodeNumber: r.ep,
                season: anime ? seasonOf(anime, r.ep) : null,
                ratio: safeRatio(r.ratio),
                watchedAt: r.watchedAt,
                activity: r.watchedAt,
                complete: safeRatio(r.ratio) >= COMPLETE_AT
            };
            if (anime) {
                item.title = anime.title;
                item.titleEn = anime.titleEn || '';
                item.rating = typeof anime.rating === 'number' ? anime.rating : 0;
                item.year = typeof anime.year === 'number' ? anime.year : 0;
                var ep = findEpisode(anime, r.ep);
                item.episode = ep || null;
                item.locked = !!(ep && ep.vip) && !isVip();
            } else {
                item.title = 'عنوان حذف‌شده از آرشیو';
                item.titleEn = '';
                item.rating = 0;
                item.year = 0;
                item.episode = null;
                item.locked = false;
            }
            return item;
        });
    }

    /** Titles saved in "My list" (neon_watchlist). */
    function buildFavoriteItems() {
        if (!hasData()) return [];
        var ids = readWatchlist();
        var historyRecords = readHistory().records;
        var progress = readProgress();
        return ids.map(function (id) {
            var anime = animeById(id);
            var item = {
                key: 'favorite:' + id,
                anime: anime,
                animeId: id,
                episodeNumber: null,
                season: null,
                ratio: 0,
                activity: activityOf(id, historyRecords)
            };
            if (anime) {
                item.title = anime.title;
                item.titleEn = anime.titleEn || '';
                item.rating = typeof anime.rating === 'number' ? anime.rating : 0;
                item.year = typeof anime.year === 'number' ? anime.year : 0;
                var states = animeEpisodeStates(anime, progress, historyByEpisode(historyRecords));
                var done = states.filter(function (s) { return s.complete; }).length;
                item.totalEpisodes = states.length;
                item.doneEpisodes = done;
                item.ratio = states.length ? done / states.length : 0;
                item.hasVip = states.some(function (s) { return !!s.episode.vip; });
            } else {
                item.title = 'عنوان حذف‌شده از آرشیو';
                item.titleEn = '';
                item.rating = 0;
                item.year = 0;
                item.totalEpisodes = 0;
                item.doneEpisodes = 0;
                item.hasVip = false;
            }
            return item;
        });
    }

    function watchUrl(animeId, episode) {
        if (window.NEON_ANIME && typeof window.NEON_ANIME.watchUrl === 'function') {
            return window.NEON_ANIME.watchUrl(animeId, episode);
        }
        return 'watch.html?anime=' + encodeURIComponent(animeId) + (episode ? '&ep=' + encodeURIComponent(episode) : '');
    }

    function detailUrl(animeId) {
        if (window.NEON_ANIME && typeof window.NEON_ANIME.detailUrl === 'function') {
            return window.NEON_ANIME.detailUrl(animeId);
        }
        return 'anime.html?id=' + encodeURIComponent(animeId);
    }

    /**
     * Which episode should the play button open for a title?
     * Respects the VIP lock: a locked episode is never opened silently.
     */
    function playTarget(animeId) {
        var anime = animeById(animeId);
        if (!anime || !Array.isArray(anime.episodes) || !anime.episodes.length) return null;
        var progress = readProgress();
        var vip = isVip();
        var incomplete = anime.episodes.filter(function (ep) {
            return episodeRatio(progress, anime.id, ep.number) < COMPLETE_AT;
        });
        var pool = incomplete.length ? incomplete : anime.episodes;
        var unlocked = pool.filter(function (ep) { return !ep.vip || vip; });
        if (unlocked.length) return { episode: unlocked[0], locked: false, ratio: episodeRatio(progress, anime.id, unlocked[0].number) };
        return { episode: pool[0], locked: true, ratio: episodeRatio(progress, anime.id, pool[0].number) };
    }

    function countFavorites() { return readWatchlist().length; }
    function countContinuing() { return buildContinueItems().length; }
    function countCompleted() { return buildCompletedItems().length; }
    function countHistory() { return readHistory().records.length; }

    function counts() {
        return {
            favorites: countFavorites(),
            continuing: countContinuing(),
            completed: countCompleted(),
            history: countHistory()
        };
    }

    /* ------------------------------------------------------------------ */
    /* Sorting                                                             */
    /* ------------------------------------------------------------------ */
    var collator = null;
    function faCollator() {
        if (!collator) {
            try { collator = new Intl.Collator('fa', { sensitivity: 'base', numeric: true }); }
            catch (e) { collator = null; }
        }
        return collator;
    }

    function compareTitle(a, b) {
        var c = faCollator();
        if (c) return c.compare(String(a.title || ''), String(b.title || ''));
        return String(a.title || '').localeCompare(String(b.title || ''));
    }

    var COMPARATORS = {
        'recent': function (a, b) { return (b.activity || 0) - (a.activity || 0) || compareTitle(a, b); },
        'oldest': function (a, b) { return (a.activity || 0) - (b.activity || 0) || compareTitle(a, b); },
        'title': function (a, b) { return compareTitle(a, b); },
        'rating': function (a, b) { return (b.rating || 0) - (a.rating || 0) || compareTitle(a, b); },
        'year': function (a, b) { return (b.year || 0) - (a.year || 0) || (b.rating || 0) - (a.rating || 0); },
        'progress-desc': function (a, b) { return (safeRatio(b.ratio) - safeRatio(a.ratio)) || compareTitle(a, b); },
        'progress-asc': function (a, b) { return (safeRatio(a.ratio) - safeRatio(b.ratio)) || compareTitle(a, b); }
    };

    function sortItems(items, sortId) {
        var cmp = COMPARATORS[sortId] || COMPARATORS.recent;
        return items.slice().sort(cmp);
    }

    /* ------------------------------------------------------------------ */
    /* Toast                                                               */
    /* ------------------------------------------------------------------ */
    function toastContainer() {
        var el = document.getElementById('toastContainer');
        if (!el) {
            el = document.createElement('div');
            el.id = 'toastContainer';
            document.body.appendChild(el);
        }
        if (!el.getAttribute('aria-live')) el.setAttribute('aria-live', 'polite');
        if (!el.getAttribute('role')) el.setAttribute('role', 'status');
        return el;
    }

    function toast(message, type) {
        var container = toastContainer();
        var el = document.createElement('div');
        el.className = 'toast' + (type ? ' toast--' + type : '');
        var icon = document.createElement('span');
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = type === 'error' ? '⚠️' : '✔️';
        var text = document.createElement('span');
        text.textContent = String(message || '');
        el.appendChild(icon);
        el.appendChild(text);
        container.appendChild(el);
        window.setTimeout(function () { el.classList.add('show'); }, 20);
        window.setTimeout(function () {
            el.classList.remove('show');
            window.setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 400);
        }, 3600);
    }

    /* ------------------------------------------------------------------ */
    /* VIP modal helper (works even if the GSAP CDN is unavailable)        */
    /* ------------------------------------------------------------------ */
    function openVipModal() {
        var btn = document.getElementById('vipOpenBtn');
        var modal = document.getElementById('vipModal');
        if (btn && typeof window.gsap !== 'undefined') { btn.click(); return true; }
        if (modal) {
            modal.removeAttribute('hidden');
            modal.classList.add('active');
            return true;
        }
        return false;
    }

    /* ------------------------------------------------------------------ */
    /* Confirmation dialog (focus trap + Escape + focus return)            */
    /* ------------------------------------------------------------------ */
    function focusable(container) {
        var nodes = container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        return Array.prototype.filter.call(nodes, function (n) {
            return !n.disabled && n.getAttribute('aria-hidden') !== 'true' && n.offsetParent !== null;
        });
    }

    function ensureDialog() {
        var existing = document.getElementById('libConfirmDialog');
        if (existing) return existing;

        var wrap = document.createElement('div');
        wrap.className = 'lib-dialog';
        wrap.id = 'libConfirmDialog';
        wrap.hidden = true;

        var backdrop = document.createElement('div');
        backdrop.className = 'lib-dialog__backdrop';
        backdrop.setAttribute('data-lib-close', 'true');

        var panel = document.createElement('div');
        panel.className = 'lib-dialog__panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('aria-labelledby', 'libDialogTitle');
        panel.setAttribute('aria-describedby', 'libDialogDesc');

        var title = document.createElement('h2');
        title.id = 'libDialogTitle';

        var desc = document.createElement('p');
        desc.id = 'libDialogDesc';

        var list = document.createElement('ul');
        list.className = 'lib-dialog__list';
        list.hidden = true;

        var actions = document.createElement('div');
        actions.className = 'lib-dialog__actions';

        var cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'lib-btn';
        cancel.setAttribute('data-lib-act', 'cancel');
        cancel.textContent = 'انصراف';

        var confirm = document.createElement('button');
        confirm.type = 'button';
        confirm.className = 'lib-btn lib-btn--danger';
        confirm.setAttribute('data-lib-act', 'confirm');

        actions.appendChild(cancel);
        actions.appendChild(confirm);

        panel.appendChild(title);
        panel.appendChild(desc);
        panel.appendChild(list);
        panel.appendChild(actions);

        wrap.appendChild(backdrop);
        wrap.appendChild(panel);
        document.body.appendChild(wrap);
        return wrap;
    }

    function confirmAction(options) {
        return new Promise(function (resolve) {
            var opts = options || {};
            var wrap = ensureDialog();
            var panel = wrap.querySelector('.lib-dialog__panel');
            var title = wrap.querySelector('#libDialogTitle');
            var desc = wrap.querySelector('#libDialogDesc');
            var list = wrap.querySelector('.lib-dialog__list');
            var cancelBtn = wrap.querySelector('[data-lib-act="cancel"]');
            var confirmBtn = wrap.querySelector('[data-lib-act="confirm"]');

            title.textContent = opts.title || 'تأیید عملیات';
            desc.textContent = opts.message || '';

            list.innerHTML = '';
            if (opts.items && opts.items.length) {
                list.hidden = false;
                var shown = opts.items.slice(0, 4);
                shown.forEach(function (text) {
                    var li = document.createElement('li');
                    li.textContent = text;
                    list.appendChild(li);
                });
                if (opts.items.length > shown.length) {
                    var more = document.createElement('li');
                    more.textContent = 'و ' + toFa(opts.items.length - shown.length) + ' مورد دیگر';
                    list.appendChild(more);
                }
            } else {
                list.hidden = true;
            }

            confirmBtn.textContent = opts.confirmLabel || 'تأیید';
            confirmBtn.className = 'lib-btn ' + (opts.danger === false ? 'lib-btn--primary' : 'lib-btn--danger');
            cancelBtn.textContent = opts.cancelLabel || 'انصراف';

            var previous = document.activeElement;

            function close(result) {
                wrap.hidden = true;
                document.removeEventListener('keydown', onKey, true);
                if (previous && typeof previous.focus === 'function') {
                    try { previous.focus(); } catch (e) { /* ignore */ }
                }
                resolve(result);
            }

            function onKey(e) {
                if (wrap.hidden) return;
                if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    close(false);
                    return;
                }
                if (e.key !== 'Tab') return;
                var nodes = focusable(panel);
                if (!nodes.length) return;
                var first = nodes[0];
                var last = nodes[nodes.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }

            wrap.onclick = function (e) {
                var target = e.target;
                if (target && target.getAttribute && target.getAttribute('data-lib-close') === 'true') {
                    close(false);
                    return;
                }
                var act = target && target.getAttribute ? target.getAttribute('data-lib-act') : null;
                if (act === 'cancel') close(false);
                else if (act === 'confirm') close(true);
            };

            wrap.hidden = false;
            document.addEventListener('keydown', onKey, true);
            window.setTimeout(function () {
                cancelBtn.focus();
            }, 10);
        });
    }

    /* ------------------------------------------------------------------ */
    /* Card builder                                                        */
    /* ------------------------------------------------------------------ */
    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = String(text);
        return node;
    }

    function buildCard(spec, ctx) {
        var card = el('article', 'lib-card' + (spec.portrait ? ' lib-card--portrait' : ''));
        card.dataset.libKey = spec.key;

        /* ---- media ---- */
        var media = el('div', 'lib-card__media');
        if (spec.poster) {
            var img = document.createElement('img');
            img.className = 'lib-card__poster';
            img.src = spec.poster;
            img.alt = spec.posterAlt || '';
            img.loading = 'lazy';
            img.decoding = 'async';
            media.appendChild(img);
        } else {
            media.appendChild(el('div', 'lib-card__placeholder', '⌁'));
        }

        if (spec.badges && spec.badges.length) {
            var badges = el('div', 'lib-card__badges');
            spec.badges.forEach(function (badge) {
                badges.appendChild(el('span', 'lib-badge' + (badge.tone ? ' lib-badge--' + badge.tone : ''), badge.text));
            });
            media.appendChild(badges);
        }

        /* ---- selection checkbox (never nested in a link) ---- */
        var select = el('label', 'lib-card__select');
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'lib-card__checkbox';
        checkbox.setAttribute('aria-label', spec.selectLabel || ('انتخاب «' + spec.title + '»'));
        checkbox.checked = ctx.isSelected(spec.key);
        checkbox.addEventListener('change', function () {
            ctx.setSelected(spec.key, checkbox.checked);
        });
        var box = el('span', 'lib-card__box');
        box.setAttribute('aria-hidden', 'true');
        select.appendChild(checkbox);
        select.appendChild(box);
        card.appendChild(select);

        card.appendChild(media);

        /* ---- body ---- */
        var body = el('div', 'lib-card__body');

        var heading = el('h3', 'lib-card__title');
        if (spec.href) {
            var link = el('a', 'lib-card__stretch', spec.title);
            link.href = spec.href;
            link.setAttribute('aria-label', spec.stretchLabel || ('جزئیات «' + spec.title + '»'));
            link.addEventListener('click', function (e) {
                if (ctx.manageMode()) { e.preventDefault(); ctx.toggle(spec.key); }
            });
            heading.appendChild(link);
        } else {
            heading.textContent = spec.title;
        }
        body.appendChild(heading);

        if (spec.titleEn) body.appendChild(el('p', 'lib-card__title-en', spec.titleEn));

        if (spec.meta && spec.meta.length) {
            var meta = el('ul', 'lib-card__meta');
            spec.meta.forEach(function (line) {
                var li = document.createElement('li');
                if (line && typeof line === 'object') {
                    if (line.label) li.appendChild(document.createTextNode(line.label + ' '));
                    if (line.value) {
                        var strong = el('span', 'lib-strong', line.value);
                        li.appendChild(strong);
                    }
                } else {
                    li.textContent = line;
                }
                meta.appendChild(li);
            });
            body.appendChild(meta);
        }

        if (typeof spec.progress === 'number') {
            var bar = el('div', 'lib-card__progress' + (spec.progress >= COMPLETE_AT ? ' lib-card__progress--done' : ''));
            bar.setAttribute('role', 'progressbar');
            bar.setAttribute('aria-valuemin', '0');
            bar.setAttribute('aria-valuemax', '100');
            bar.setAttribute('aria-valuenow', String(percent(spec.progress)));
            bar.setAttribute('aria-label', spec.progressLabel || 'پیشرفت تماشا');
            var fill = document.createElement('i');
            fill.style.width = percent(spec.progress) + '%';
            bar.appendChild(fill);
            body.appendChild(bar);
            if (spec.progressText) body.appendChild(el('p', 'lib-card__progress-label', spec.progressText));
        }

        if (spec.note) body.appendChild(el('p', 'lib-card__note', spec.note));

        var actions = el('div', 'lib-card__actions');
        if (spec.primary) {
            if (spec.primary.locked) {
                var lockBtn = el('button', 'lib-btn lib-btn--danger', spec.primary.lockedLabel || '🔒 نیاز به اشتراک ویژه');
                lockBtn.type = 'button';
                lockBtn.setAttribute('aria-label', spec.primary.lockedAriaLabel || spec.primary.lockedLabel || 'نیاز به اشتراک ویژه');
                lockBtn.addEventListener('click', function () {
                    var opened = openVipModal();
                    toast(opened
                        ? 'این قسمت ویژه است؛ برای تماشا باید اشتراک نئون پلاس فعال باشد.'
                        : 'این قسمت فقط برای کاربران دارای اشتراک ویژه باز می‌شود.', 'error');
                });
                actions.appendChild(lockBtn);
            } else {
                var primary = el('a', 'lib-btn lib-btn--primary', spec.primary.label);
                primary.href = spec.primary.href;
                if (spec.primary.ariaLabel) primary.setAttribute('aria-label', spec.primary.ariaLabel);
                actions.appendChild(primary);
            }
        }
        if (spec.secondary) {
            var secondary = el('a', 'lib-btn', spec.secondary.label);
            secondary.href = spec.secondary.href;
            if (spec.secondary.ariaLabel) secondary.setAttribute('aria-label', spec.secondary.ariaLabel);
            actions.appendChild(secondary);
        }
        body.appendChild(actions);

        card.appendChild(body);

        /* ---- click on the card body while managing selects the item ---- */
        card.addEventListener('click', function (e) {
            if (!ctx.manageMode()) return;
            if (e.target.closest('.lib-card__select')) return;
            if (e.target.closest('a, button')) return;
            ctx.toggle(spec.key);
        });

        if (ctx.isSelected(spec.key)) card.classList.add('is-selected');
        return card;
    }

    /* ------------------------------------------------------------------ */
    /* Shared chrome: active links + toast region                          */
    /* ------------------------------------------------------------------ */
    function currentFile() {
        var path = (window.location.pathname || '').split('/').pop() || '';
        return path.toLowerCase();
    }

    function markActiveLinks() {
        var file = currentFile();
        if (!file) return;
        var links = document.querySelectorAll('a[href]');
        Array.prototype.forEach.call(links, function (link) {
            var href = (link.getAttribute('href') || '').split('#')[0].split('?')[0].trim().toLowerCase();
            if (!href || href.charAt(0) === '/' || href.indexOf('//') !== -1) return;
            if (href !== file) return;
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        });
    }

    function buildSidebarNav(activeFile) {
        var stats = counts();
        var nav = el('ul', 'lib-nav');
        LIB_NAV.forEach(function (entry) {
            var li = document.createElement('li');
            var a = el('a', null);
            a.href = entry.href;
            if (entry.href.toLowerCase() === activeFile) a.setAttribute('aria-current', 'page');
            a.appendChild(el('span', 'lib-nav__icon', entry.icon));
            a.appendChild(el('span', 'lib-nav__label', entry.label));
            if (entry.count && entry.count !== 'overview') {
                a.appendChild(el('span', 'lib-nav__count', toFa(stats[entry.count] || 0)));
            }
            li.appendChild(a);
            nav.appendChild(li);
        });
        return nav;
    }

    function renderSidebar(mount, activeFile) {
        if (!mount) return;
        var stats = counts();
        mount.innerHTML = '';
        mount.appendChild(el('h2', 'lib-sidebar__title', 'کتابخانه من'));
        mount.appendChild(buildSidebarNav(activeFile));

        var statsGrid = el('div', 'lib-stats');
        var statDefs = [
            { value: stats.favorites, label: 'عنوان در لیست من' },
            { value: stats.continuing, label: 'در حال تماشا' },
            { value: stats.history, label: 'رکورد تاریخچه' },
            { value: stats.completed, label: 'تکمیل‌شده' }
        ];
        statDefs.forEach(function (s) {
            var box = el('div', 'lib-stat');
            box.appendChild(el('b', null, toFa(s.value)));
            box.appendChild(el('span', null, s.label));
            statsGrid.appendChild(box);
        });
        mount.appendChild(statsGrid);

        var note = el('p', 'lib-sidebar__note');
        if (isLoggedIn()) {
            note.textContent = 'این کتابخانه روی همین مرورگر ذخیره می‌شود. ';
            var link = el('a', null, 'نمای کلی پروفایل');
            link.href = 'profile.html';
            note.appendChild(link);
        } else {
            note.textContent = 'برای همگام‌سازی بین دستگاه‌ها ';
            var login = el('a', null, 'وارد حساب خود شوید');
            login.href = 'login.html?next=' + encodeURIComponent(currentFile());
            note.appendChild(login);
            note.appendChild(document.createTextNode('.'));
        }
        mount.appendChild(note);
    }

    function initSharedChrome() {
        toastContainer();
        markActiveLinks();
        // Side-menu fix for library pages (favorites, history, etc.)
        (function () {
            var menu = document.getElementById('sideMenu');
            var backdrop = document.getElementById('mobileBackdrop');
            var hamburger = document.getElementById('hamburgerBtn');
            var closeBtn = document.getElementById('closeSideBtn');
            var vipBtn = document.getElementById('mobileVipBtn');
            if (!menu || !backdrop || !hamburger) return;
            function setMenu(open) {
                menu.classList.toggle('active', open);
                backdrop.classList.toggle('active', open);
                hamburger.classList.toggle('active', open);
                hamburger.setAttribute('aria-expanded', String(open));
                var vipModal = document.getElementById('vipModal');
                var vipOpen = vipModal && vipModal.classList.contains('active');
                document.body.style.overflow = open || vipOpen ? 'hidden' : '';
                if (open && closeBtn) setTimeout(function () { closeBtn.focus(); }, 100);
            }
            hamburger.addEventListener('click', function () { setMenu(!menu.classList.contains('active')); });
            if (closeBtn) closeBtn.addEventListener('click', function () { setMenu(false); });
            backdrop.addEventListener('click', function () { setMenu(false); });
            menu.querySelectorAll('a').forEach(function (link) {
                link.addEventListener('click', function () { setMenu(false); });
            });
            if (vipBtn) {
                vipBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    setMenu(false);
                    var vipModal = document.getElementById('vipModal');
                    if (vipModal) {
                        vipModal.removeAttribute('hidden');
                        vipModal.classList.add('active');
                        document.body.style.overflow = 'hidden';
                    }
                });
                vipBtn.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        vipBtn.click();
                    }
                });
            }
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' && menu.classList.contains('active')) setMenu(false);
            });
        })();
    }

    /* ------------------------------------------------------------------ */
    /* Page controller                                                     */
    /* ------------------------------------------------------------------ */
    function sortStorageKey(page) { return 'neon_sort_' + page; }

    function readSort(page, allowed, fallback) {
        var fromUrl = '';
        try {
            fromUrl = new URLSearchParams(window.location.search).get('sort') || '';
        } catch (e) { fromUrl = ''; }
        if (fromUrl && allowed.indexOf(fromUrl) !== -1) return fromUrl;
        var stored = lsGet(sortStorageKey(page));
        if (stored && allowed.indexOf(stored) !== -1) return stored;
        return fallback;
    }

    function writeSort(page, sortId) {
        lsSet(sortStorageKey(page), sortId);
        try {
            var url = new URL(window.location.href);
            url.searchParams.set('sort', sortId);
            window.history.replaceState(null, '', url.toString());
        } catch (e) { /* ignore */ }
    }

    function initPage(config) {
        function start() {
            var page = config.page;
            var state = { selected: [], manage: false, sort: config.defaultSort || 'recent' };

            var mount = document.getElementById('libSidebar');
            var grid = document.getElementById('libGrid');
            var empty = document.getElementById('libEmpty');
            var loading = document.getElementById('libLoading');
            var errorPanel = document.getElementById('libError');
            var warningBox = document.getElementById('libWarning');
            var sortSelect = document.getElementById('libSort');
            var manageBtn = document.getElementById('libManageBtn');
            var manageBar = document.getElementById('libManageBar');
            var selectAllBtn = document.getElementById('libSelectAllBtn');
            var exitBtn = document.getElementById('libExitManageBtn');
            var deleteBtn = document.getElementById('libDeleteBtn');
            var countEl = document.getElementById('libCount');
            var manageCount = document.getElementById('libManageCount');

            initSharedChrome();

            // Sort options (only the ones this page actually supports)
            var allowed = (config.sorts || ['recent']).slice();
            if (sortSelect) {
                sortSelect.innerHTML = '';
                allowed.forEach(function (id) {
                    var option = document.createElement('option');
                    option.value = id;
                    option.textContent = SORT_LABELS[id] || id;
                    sortSelect.appendChild(option);
                });
            }
            state.sort = readSort(page, allowed, config.defaultSort || 'recent');
            if (sortSelect) sortSelect.value = state.sort;
            // Never show a generic "delete" button: the label always says what
            // this page is going to do.
            if (deleteBtn && config.manage && config.manage.actionLabel) {
                deleteBtn.textContent = config.manage.actionLabel;
            }

            if (!hasData()) {
                if (storageAvailable() === false) { /* still render: storage errors are handled per read */ }
                if (loading) loading.hidden = true;
                if (grid) grid.hidden = true;
                if (empty) empty.hidden = true;
                if (manageBtn) manageBtn.disabled = true;
                if (sortSelect) sortSelect.disabled = true;
                if (errorPanel) errorPanel.hidden = false;
                if (mount) {
                    mount.innerHTML = '';
                    mount.appendChild(el('h2', 'lib-sidebar__title', 'کتابخانه من'));
                    mount.appendChild(buildSidebarNav(''));
                }
                return;
            }

            migrateLegacyHistory();

            var retryBtn = document.getElementById('libErrorRetry');
            if (retryBtn) retryBtn.addEventListener('click', function () { window.location.reload(); });

            /* ---------- selection helpers ---------- */
            function isSelected(key) { return state.selected.indexOf(key) !== -1; }
            function setSelected(key, flag) {
                var has = isSelected(key);
                if (flag && !has) state.selected.push(key);
                if (!flag && has) state.selected = state.selected.filter(function (k) { return k !== key; });
                syncSelection();
            }
            function toggle(key) { setSelected(key, !isSelected(key)); }

            function syncSelection() {
                Array.prototype.forEach.call(grid.querySelectorAll('.lib-card'), function (card) {
                    var key = card.dataset.libKey;
                    var selected = isSelected(key);
                    card.classList.toggle('is-selected', selected);
                    var box = card.querySelector('.lib-card__checkbox');
                    if (box) box.checked = selected;
                });
                if (manageCount) manageCount.textContent = state.selected.length ? toFa(state.selected.length) + ' مورد انتخاب شده' : 'موردی انتخاب نشده';
                if (deleteBtn) deleteBtn.disabled = state.selected.length === 0;
                if (selectAllBtn) {
                    var total = grid.querySelectorAll('.lib-card').length;
                    var allSelected = total > 0 && state.selected.length >= total;
                    selectAllBtn.textContent = allSelected ? 'لغو انتخاب همه' : 'انتخاب همه';
                    selectAllBtn.disabled = total === 0;
                }
            }

            function setManageMode(flag) {
                state.manage = !!flag;
                if (state.manage === false) state.selected = [];
                grid.classList.toggle('lib-grid--manage', state.manage);
                grid.classList.toggle('lib-grid', true);
                if (manageBar) manageBar.hidden = !state.manage;
                if (manageBtn) {
                    manageBtn.textContent = state.manage ? 'خروج از مدیریت' : 'مدیریت';
                    manageBtn.setAttribute('aria-pressed', String(state.manage));
                    manageBtn.className = state.manage ? 'lib-btn lib-btn--primary' : 'lib-btn';
                }
                syncSelection();
            }

            /* ---------- render ---------- */
            function render() {
                var items = [];
                try {
                    items = config.load() || [];
                } catch (e) {
                    items = [];
                    warn('بخشی از داده‌های ذخیره‌شده قابل خواندن نبود.');
                }
                items = sortItems(items, state.sort);

                grid.innerHTML = '';
                var ctx = {
                    isSelected: isSelected,
                    setSelected: setSelected,
                    toggle: toggle,
                    manageMode: function () { return state.manage; }
                };

                items.forEach(function (item) {
                    var spec;
                    try { spec = config.card(item); } catch (e) { spec = null; }
                    if (!spec) return;
                    grid.appendChild(buildCard(spec, ctx));
                });

                grid.hidden = items.length === 0;
                if (empty) empty.hidden = items.length !== 0;
                if (loading) loading.hidden = true;

                // Drop selections for items that no longer exist.
                var liveKeys = Array.prototype.map.call(grid.querySelectorAll('.lib-card'), function (c) { return c.dataset.libKey; });
                state.selected = state.selected.filter(function (k) { return liveKeys.indexOf(k) !== -1; });

                if (countEl) {
                    countEl.textContent = items.length
                        ? toFa(items.length) + ' ' + (config.unit || 'مورد')
                        : '';
                }

                if (manageBtn) manageBtn.disabled = items.length === 0;
                if (manageBtn && items.length === 0 && state.manage) setManageMode(false);

                var msgs = takeWarnings();
                if (warningBox) {
                    if (msgs.length) {
                        warningBox.innerHTML = '';
                        msgs.forEach(function (m) {
                            var line = el('span', null, '⚠ ' + m);
                            warningBox.appendChild(line);
                        });
                        warningBox.hidden = false;
                    } else {
                        warningBox.hidden = true;
                    }
                }

                renderSidebar(mount, currentFile());
                syncSelection();
            }

            /* ---------- events ---------- */
            if (sortSelect) {
                sortSelect.addEventListener('change', function () {
                    state.sort = sortSelect.value;
                    writeSort(page, state.sort);
                    render();
                });
            }
            if (manageBtn) {
                manageBtn.addEventListener('click', function () { setManageMode(!state.manage); });
            }
            if (exitBtn) {
                exitBtn.addEventListener('click', function () { setManageMode(false); });
            }
            if (selectAllBtn) {
                selectAllBtn.addEventListener('click', function () {
                    var keys = Array.prototype.map.call(grid.querySelectorAll('.lib-card'), function (c) { return c.dataset.libKey; });
                    var allSelected = keys.length > 0 && keys.every(isSelected);
                    state.selected = allSelected ? [] : keys.slice();
                    syncSelection();
                });
            }
            if (deleteBtn && config.manage) {
                deleteBtn.addEventListener('click', function () {
                    if (!state.selected.length) return;
                    var keys = state.selected.slice();
                    var items = [];
                    try {
                        items = (config.load() || []).filter(function (item) { return keys.indexOf(config.keyOf(item)) !== -1; });
                    } catch (e) { items = []; }
                    if (!items.length) { toast('موردی برای اعمال تغییر پیدا نشد.', 'error'); return; }

                    var labels = items.map(function (item) { return config.labelOf(item); });
                    confirmAction({
                        title: config.manage.confirmTitle,
                        message: config.manage.confirmMessage(items.length, items),
                        items: labels,
                        confirmLabel: config.manage.actionLabel,
                        cancelLabel: 'انصراف'
                    }).then(function (ok) {
                        if (!ok) return;
                        var result;
                        try {
                            result = config.manage.perform(items);
                        } catch (e) {
                            result = { ok: false, message: 'عملیات انجام نشد؛ داده‌های ذخیره‌شده در دسترس نیست.' };
                        }
                        if (result && result.ok) {
                            toast(result.message || 'تغییرات با موفقیت اعمال شد.', 'success');
                        } else {
                            toast((result && result.message) || 'عملیات انجام نشد.', 'error');
                        }
                        setManageMode(false);
                        render();
                    });
                });
            }

            window.addEventListener('storage', function (e) {
                if (!e.key || e.key.indexOf('neon_') === 0) render();
            });

            render();
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', start);
        } else {
            start();
        }
    }

    /* ------------------------------------------------------------------ */
    /* Card specs (shared by the four pages and the profile overview)      */
    /* ------------------------------------------------------------------ */
    var specs = {
        favorite: function (item) {
            var vip = isVip();
            var badges = [];
            if (item.anime && item.hasVip) {
                badges.push({ text: vip ? 'ویژه • باز' : 'شامل قسمت ویژه', tone: vip ? 'vip' : null });
            }

            var metaLines = [];
            metaLines.push('امتیاز ' + toFa((item.rating || 0).toFixed(1)) + ' • سال ' + toFa(item.year || 0));
            if (item.anime && item.totalEpisodes) {
                metaLines.push({ label: 'پیشرفت:', value: toFa(item.doneEpisodes) + ' از ' + toFa(item.totalEpisodes) + ' قسمت موجود' });
            }
            metaLines.push(item.activity ? 'آخرین فعالیت: ' + faDateTime(item.activity) : 'هنوز تماشا نشده');

            var spec = {
                key: item.key,
                portrait: true,
                title: item.title,
                titleEn: item.titleEn,
                poster: item.anime ? item.anime.poster : null,
                posterAlt: item.anime ? 'پوستر ' + item.anime.title : '',
                badges: badges,
                meta: metaLines,
                progress: item.anime && item.totalEpisodes ? item.ratio : null,
                progressText: item.anime && item.totalEpisodes ? toFa(percent(item.ratio)) + '٪ از قسمت‌های موجود' : null,
                progressLabel: 'پیشرفت ' + item.title,
                note: item.anime ? null : 'این عنوان دیگر در آرشیو وجود ندارد.',
                selectLabel: 'انتخاب «' + item.title + '» برای حذف از علاقه‌مندی‌ها'
            };

            if (item.anime) {
                spec.href = detailUrl(item.animeId);
                spec.stretchLabel = 'جزئیات «' + item.title + '»';
                var target = playTarget(item.animeId);
                if (target) {
                    if (target.locked) {
                        spec.primary = {
                            locked: true,
                            lockedLabel: '🔒 قسمت ویژه',
                            lockedAriaLabel: 'قسمت ' + toFa(target.episode.number) + ' «' + item.title + '» نیاز به اشتراک ویژه دارد'
                        };
                    } else {
                        var watching = target.ratio >= STARTED_AT;
                        spec.primary = {
                            label: (watching ? 'ادامه قسمت ' : 'پخش قسمت ') + toFa(target.episode.number),
                            href: watchUrl(item.animeId, target.episode.number),
                            ariaLabel: (watching ? 'ادامه قسمت ' : 'پخش قسمت ') + toFa(target.episode.number) + ' «' + item.title + '»'
                        };
                    }
                }
                spec.secondary = {
                    label: 'جزئیات و قسمت‌ها',
                    href: detailUrl(item.animeId),
                    ariaLabel: 'جزئیات و فهرست قسمت‌های «' + item.title + '»'
                };
            } else {
                spec.secondary = { label: 'رفتن به آرشیو', href: 'catalog.html' };
            }
            return spec;
        },

        continueWatching: function (item) {
            var badges = [];
            if (item.kind === 'next') badges.push({ text: 'قسمت بعد', tone: 'done' });
            if (item.locked) badges.push({ text: 'ویژه (VIP)', tone: 'vip' });

            var metaLines = [];
            metaLines.push('فصل ' + toFa(item.season || 0) + ' • قسمت ' + toFa(item.episodeNumber));
            metaLines.push('امتیاز ' + toFa((item.rating || 0).toFixed(1)) + ' • سال ' + toFa(item.year || 0));
            metaLines.push(item.watchedAt ? 'آخرین تماشا: ' + faDateTime(item.watchedAt) : 'زمان آخرین تماشا ثبت نشده');

            var spec = {
                key: item.key,
                portrait: false,
                title: item.title,
                titleEn: item.titleEn,
                poster: item.anime ? item.anime.banner : null,
                posterAlt: item.anime ? 'تصویر ' + item.anime.title : '',
                badges: badges,
                meta: metaLines,
                progress: item.ratio,
                progressText: toFa(percent(item.ratio)) + '٪ از این قسمت • ' + toFa(item.doneEpisodes) + ' از ' + toFa(item.totalEpisodes) + ' قسمت موجود تمام شده',
                progressLabel: 'پیشرفت قسمت ' + toFa(item.episodeNumber) + ' از ' + item.title,
                selectLabel: 'انتخاب «' + item.title + '» برای پاک‌کردن پیشرفت',
                href: detailUrl(item.animeId),
                stretchLabel: 'جزئیات «' + item.title + '»'
            };

            if (item.locked) {
                spec.primary = {
                    locked: true,
                    lockedLabel: '🔒 قسمت ویژه',
                    lockedAriaLabel: 'قسمت ' + toFa(item.episodeNumber) + ' «' + item.title + '» فقط با اشتراک ویژه باز می‌شود'
                };
            } else {
                spec.primary = {
                    label: 'ادامه قسمت ' + toFa(item.episodeNumber),
                    href: watchUrl(item.animeId, item.episodeNumber),
                    ariaLabel: 'ادامه قسمت ' + toFa(item.episodeNumber) + ' «' + item.title + '»'
                };
            }
            spec.secondary = {
                label: 'جزئیات و قسمت‌ها',
                href: detailUrl(item.animeId),
                ariaLabel: 'جزئیات و فهرست قسمت‌های «' + item.title + '»'
            };
            return spec;
        },

        history: function (item) {
            var badges = [];
            if (item.complete) badges.push({ text: 'کامل دیده‌شده', tone: 'done' });
            if (item.locked) badges.push({ text: 'ویژه (VIP)', tone: 'vip' });

            var metaLines = [];
            if (item.anime) {
                metaLines.push('فصل ' + toFa(item.season || 0) + ' • قسمت ' + toFa(item.episodeNumber));
                metaLines.push('امتیاز ' + toFa((item.rating || 0).toFixed(1)) + ' • سال ' + toFa(item.year || 0));
            } else {
                metaLines.push('قسمت ' + toFa(item.episodeNumber));
            }
            metaLines.push(item.watchedAt ? 'آخرین تماشا: ' + faDateTime(item.watchedAt) : 'زمان تماشا ثبت نشده');

            var spec = {
                key: item.key,
                portrait: false,
                title: item.title,
                titleEn: item.titleEn,
                poster: item.anime ? item.anime.banner : null,
                posterAlt: item.anime ? 'تصویر ' + item.anime.title : '',
                badges: badges,
                meta: metaLines,
                progress: item.ratio,
                progressText: toFa(percent(item.ratio)) + '٪ از این قسمت در آخرین تماشا',
                progressLabel: 'پیشرفت قسمت ' + toFa(item.episodeNumber),
                note: item.anime ? null : 'این عنوان دیگر در آرشیو نیست؛ فقط رکورد تاریخچه باقی مانده است.',
                selectLabel: 'انتخاب رکورد «' + item.title + '» قسمت ' + toFa(item.episodeNumber)
            };

            if (item.anime) {
                spec.href = detailUrl(item.animeId);
                spec.stretchLabel = 'جزئیات «' + item.title + '»';
                if (item.locked) {
                    spec.primary = {
                        locked: true,
                        lockedLabel: '🔒 قسمت ویژه',
                        lockedAriaLabel: 'قسمت ' + toFa(item.episodeNumber) + ' «' + item.title + '» فقط با اشتراک ویژه باز می‌شود'
                    };
                } else {
                    spec.primary = {
                        label: 'تماشای دوباره',
                        href: watchUrl(item.animeId, item.episodeNumber),
                        ariaLabel: 'تماشای دوباره‌ی قسمت ' + toFa(item.episodeNumber) + ' «' + item.title + '»'
                    };
                }
                spec.secondary = {
                    label: 'جزئیات و قسمت‌ها',
                    href: detailUrl(item.animeId),
                    ariaLabel: 'جزئیات و فهرست قسمت‌های «' + item.title + '»'
                };
            } else {
                spec.secondary = { label: 'رفتن به آرشیو', href: 'catalog.html' };
            }
            return spec;
        },

        completed: function (item) {
            var vip = isVip();
            var badges = [{ text: 'تکمیل‌شده', tone: 'done' }];
            if (item.anime && Array.isArray(item.anime.episodes) && item.anime.episodes.some(function (e) { return e.vip; })) {
                badges.push({ text: vip ? 'ویژه • باز' : 'شامل قسمت ویژه', tone: vip ? 'vip' : null });
            }

            var metaLines = [];
            metaLines.push('تمام قسمت‌های موجود: ' + toFa(item.totalEpisodes) + ' قسمت');
            metaLines.push('امتیاز ' + toFa((item.rating || 0).toFixed(1)) + ' • سال ' + toFa(item.year || 0));
            metaLines.push(item.completedAt ? 'تاریخ تکمیل: ' + faDateTime(item.completedAt) : 'زمان تکمیل ثبت نشده');

            var spec = {
                key: item.key,
                portrait: true,
                title: item.title,
                titleEn: item.titleEn,
                poster: item.anime ? item.anime.poster : null,
                posterAlt: item.anime ? 'پوستر ' + item.anime.title : '',
                badges: badges,
                meta: metaLines,
                progress: 1,
                progressText: '۱۰۰٪ — تمام قسمت‌های موجود دیده شده',
                progressLabel: 'پیشرفت ' + item.title,
                href: detailUrl(item.animeId),
                stretchLabel: 'جزئیات «' + item.title + '»',
                selectLabel: 'انتخاب «' + item.title + '» برای بازنشانی پیشرفت'
            };

            var target = playTarget(item.animeId);
            if (target) {
                if (target.locked) {
                    spec.primary = {
                        locked: true,
                        lockedLabel: '🔒 نیاز به اشتراک ویژه',
                        lockedAriaLabel: 'تماشای دوباره‌ی «' + item.title + '» نیاز به اشتراک ویژه دارد'
                    };
                } else {
                    spec.primary = {
                        label: 'تماشای دوباره از قسمت ' + toFa(target.episode.number),
                        href: watchUrl(item.animeId, target.episode.number),
                        ariaLabel: 'تماشای دوباره‌ی «' + item.title + '» از قسمت ' + toFa(target.episode.number)
                    };
                }
            }
            spec.secondary = {
                label: 'جزئیات و قسمت‌ها',
                href: detailUrl(item.animeId),
                ariaLabel: 'جزئیات و فهرست قسمت‌های «' + item.title + '»'
            };
            return spec;
        }
    };

    /* ------------------------------------------------------------------ */
    /* Public API                                                          */
    /* ------------------------------------------------------------------ */
    window.NeonLibrary = {
        KEYS: KEYS,
        HISTORY_LIMIT: HISTORY_LIMIT,
        STARTED_AT: STARTED_AT,
        COMPLETE_AT: COMPLETE_AT,
        SORT_LABELS: SORT_LABELS,

        // basics
        toFa: toFa,
        faDateTime: faDateTime,
        isoDate: isoDate,
        safeRatio: safeRatio,
        clampRatio: clampRatio,
        percent: percent,
        hasData: hasData,
        allAnime: allAnime,
        animeById: animeById,
        findEpisode: findEpisode,
        seasonOf: seasonOf,
        storageAvailable: storageAvailable,

        // session
        isVip: isVip,
        isLoggedIn: isLoggedIn,

        // storage
        readWatchlist: readWatchlist,
        writeWatchlist: writeWatchlist,
        progressKey: progressKey,
        readProgress: readProgress,
        episodeRatio: episodeRatio,
        clearEpisodeProgress: clearEpisodeProgress,
        clearAnimeProgress: clearAnimeProgress,
        readLastWatched: readLastWatched,
        writeLastWatched: writeLastWatched,
        clearLastWatchedFor: clearLastWatchedFor,
        readHistory: readHistory,
        writeHistory: writeHistory,
        upsertHistory: upsertHistory,
        removeHistoryRecords: removeHistoryRecords,
        removeHistoryForAnime: removeHistoryForAnime,
        migrateLegacyHistory: migrateLegacyHistory,

        // urls + play targets
        watchUrl: watchUrl,
        detailUrl: detailUrl,
        playTarget: playTarget,

        // derived data
        activityOf: activityOf,
        buildContinueItems: buildContinueItems,
        buildCompletedItems: buildCompletedItems,
        buildHistoryItems: buildHistoryItems,
        buildFavoriteItems: buildFavoriteItems,
        counts: counts,

        // ui
        sortItems: sortItems,
        specs: specs,
        initPage: initPage,
        initSharedChrome: initSharedChrome,
        renderSidebar: renderSidebar,
        buildSidebarNav: buildSidebarNav,
        markActiveLinks: markActiveLinks,
        toast: toast,
        confirmAction: confirmAction,
        openVipModal: openVipModal,
        buildCard: buildCard,
        takeWarnings: takeWarnings
    };
})();
