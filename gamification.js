/*
 * NEON.ANIME — Gamification pack (vanilla JS, no dependencies).
 *
 * Features:
 *   1) «انیمه شانسی» — Surprise-Me Roulette modal (nav + side-menu triggers).
 *   2) Mood & Vibe Explorer — mood cards on the homepage.
 *   3) Otaku Levels (XP) & 7 achievement badges — profile page.
 *
 * Own storage key:  neon_gami
 *   { spins: 0, moods: [], badges: { <badgeId>: <timestamp> }, notified: { <badgeId>: true } }
 *
 * Everything else (watch history, watchlist, VIP, likes, comments) is read from
 * the keys already maintained by library.js / watch.js / auth.js, so XP is always
 * derived from the user's real activity:
 *   neon_watch_history, neon_watchlist, neon_is_vip, neon_like_*, neon_comments_*,
 *   neon_progress_<anime-id>_<ep>
 */
(function () {
    'use strict';

    /* ==================================================================== */
    /* CONFIG                                                               */
    /* ==================================================================== */

    var STORAGE_KEY = 'neon_gami';
    var SPIN_DURATION_MS = 4200;
    var COMPLETE_AT = 0.95;          // same threshold as library.js
    var RECHECK_INTERVAL_MS = 20000; // catch badges earned while page stays open

    var XP_RULES = {
        episode: 20,       // per unique watched episode
        completed: 30,     // per completed title
        watchlist: 15,     // per title in "My list"
        spin: 5,           // per roulette spin (max 10 counted)
        mood: 3,           // per explored mood (max 5 counted)
        like: 5,           // per liked title (max 7 counted)
        vip: 40            // active VIP subscription
    };

    var LEVELS = [
        { name: 'نوآموز اوتاکو', emoji: '🌱', xp: 0 },
        { name: 'علاقه‌مند نئون', emoji: '⚡', xp: 150 },
        { name: 'جنگجوی اوتاکو', emoji: '🥷', xp: 350 },
        { name: 'استاد اوتاکو', emoji: '🔥', xp: 600 },
        { name: 'امپراتور اوتاکو', emoji: '👑', xp: 850 }
    ];

    var BADGES = [
        {
            id: 'night-owl', name: 'شب‌زنده‌دار', emoji: '🌙', xp: 30,
            desc: 'یکی از شب‌های بی‌خوابی، بین ۱۲ شب تا ۵ صبح یک قسمت تماشا کن.'
        },
        {
            id: 'action-master', name: 'استاد اکشن', emoji: '⚔️', xp: 40,
            desc: 'از ۳ انیمه اکشن مختلف قسمت تماشا کن تا لقب استاد به تو برسد.'
        },
        {
            id: 'librarian', name: 'کتابدار برتر', emoji: '📚', xp: 25,
            desc: '۳ انیمه را به «لیست من» اضافه کن و آرشیو شخصی‌ات را بساز.'
        },
        {
            id: 'marathon', name: 'ماراتن‌باز', emoji: '🏃', xp: 50,
            desc: 'در مجموع ۱۰ قسمت تماشا کن؛ ماراتن اوتاکوها همین‌جا شروع می‌شود.'
        },
        {
            id: 'lucky-neon', name: 'خوش‌شانس نئونی', emoji: '🎲', xp: 20,
            desc: '۳ بار گردونه «انیمه شانسی» را بچرخان و به شانس نئونی اعتماد کن.'
        },
        {
            id: 'critic', name: 'منتقد', emoji: '✍️', xp: 25,
            desc: 'روی ۳ قسمت لایک بگذار یا برایشان نظر بنویس.'
        },
        {
            id: 'vip-lord', name: 'لرد VIP', emoji: '👑', xp: 40,
            desc: 'اشتراک نئون پلاس را فعال کن و در بین لردها جا بگیر.'
        }
    ];

    var MOODS = [
        {
            id: 'adrenaline', emoji: '⚡', label: 'آدرنالین و هیجان',
            tagline: 'دلت می‌خواد ضربان قلبت بره بالا؟',
            genres: ['action']
        },
        {
            id: 'mystery', emoji: '🕯️', label: 'معمایی و فسفرسوز',
            tagline: 'معمایی ذهن‌سوز برای شب‌های بیداری',
            genres: ['mystery', 'psychological']
        },
        {
            id: 'epic', emoji: '🗺️', label: 'حماسی و ماجراجویانه',
            tagline: 'سفرهایی به دنیاهای بزرگ و ناشناخته',
            genres: ['adventure', 'fantasy', 'dark-fantasy']
        },
        {
            id: 'cyber', emoji: '🌃', label: 'سایبرپانک و خاص',
            tagline: 'نئون، سایفر و آینده‌ی پادآرمان‌شهری',
            genres: ['scifi']
        },
        {
            id: 'feels', emoji: '💫', label: 'انگیزشی و احساسی',
            tagline: 'قصه‌هایی که به روحت قدرت می‌دهند',
            genres: ['drama']
        }
    ];

    var WHEEL_COLORS = [
        ['#ff003c', 'rgba(255, 0, 60, 0.55)'],
        ['#00f0ff', 'rgba(0, 240, 255, 0.5)'],
        ['#8a2be2', 'rgba(138, 43, 226, 0.55)'],
        ['#ffaa00', 'rgba(255, 170, 0, 0.5)'],
        ['#00ff9d', 'rgba(0, 255, 157, 0.45)'],
        ['#ff4dd2', 'rgba(255, 77, 210, 0.5)'],
        ['#3d5afe', 'rgba(61, 90, 254, 0.55)']
    ];

    var WHEEL_ICONS = {
        'attack-on-titan': '🗡️',
        'demon-slayer': '🔥',
        'jujutsu-kaisen': '🌀',
        'chainsaw-man': '🪚',
        'one-piece': '🏴‍☠️',
        'death-note': '📓',
        'cyberpunk-edgerunners': '🌃'
    };

    var CONFETTI_COLORS = ['#ff003c', '#00f0ff', '#8a2be2', '#ffaa00', '#ffd166', '#00ff9d', '#ff4dd2'];

    /* ==================================================================== */
    /* SMALL HELPERS                                                        */
    /* ==================================================================== */

    function data() { return window.NEON_ANIME || null; }

    var FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
    function toFa(num) {
        if (data() && typeof data().toFa === 'function') return data().toFa(num);
        return String(num).replace(/\d/g, function (d) { return FA_DIGITS[d]; });
    }

    function esc(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function lsGet(key) {
        try { return window.localStorage.getItem(key); } catch (e) { return null; }
    }
    function lsParse(key, fallback) {
        try {
            var raw = lsGet(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) { return fallback; }
    }
    function lsKeys() {
        try {
            var keys = [];
            for (var i = 0; i < window.localStorage.length; i++) keys.push(window.localStorage.key(i));
            return keys;
        } catch (e) { return []; }
    }

    function faDate(ts) {
        try {
            return new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long' }).format(new Date(ts));
        } catch (e) { return ''; }
    }

    /* ==================================================================== */
    /* GAMIFICATION STATE                                                   */
    /* ==================================================================== */

    function readState() {
        var s = lsParse(STORAGE_KEY, null);
        if (!s || typeof s !== 'object') s = {};
        if (typeof s.spins !== 'number' || !isFinite(s.spins)) s.spins = 0;
        if (!Array.isArray(s.moods)) s.moods = [];
        if (!s.badges || typeof s.badges !== 'object') s.badges = {};
        if (!s.notified || typeof s.notified !== 'object') s.notified = {};
        return s;
    }

    function writeState(s) {
        try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) { /* private mode */ }
    }

    /* ==================================================================== */
    /* STATS + XP                                                           */
    /* ==================================================================== */

    function collectStats() {
        var D = data();
        var state = readState();

        var history = lsParse('neon_watch_history', []);
        if (!Array.isArray(history)) history = [];
        var watchlist = lsParse('neon_watchlist', []);
        if (!Array.isArray(watchlist)) watchlist = [];
        var vip = lsGet('neon_is_vip') === 'true';

        // unique watched episodes + distinct titles
        var epSet = {};
        var titleSet = {};
        var nightOwl = false;
        history.forEach(function (h) {
            if (!h || !h.anime) return;
            epSet[h.anime + ':' + h.ep] = true;
            titleSet[h.anime] = true;
            var hour = new Date(h.watchedAt || 0).getHours();
            if (hour >= 0 && hour < 5) nightOwl = true;
        });
        var uniqueEpisodes = Object.keys(epSet).length;

        // likes (neon_like_<anime-id>) + comment threads (neon_comments_<anime-id>_<ep>)
        var likedTitles = 0;
        var commentThreads = 0;
        lsKeys().forEach(function (key) {
            if (/^neon_like_.+/.test(key) && lsGet(key) === '1') likedTitles++;
            if (/^neon_comments_.+/.test(key)) {
                var list = lsParse(key, []);
                if (Array.isArray(list) && list.length > 0) commentThreads++;
            }
        });

        // completed titles (all episodes >= 95% — same rule as library.js)
        var completed = 0;
        if (D && D.list) {
            D.list.forEach(function (anime) {
                if (!anime.episodes || !anime.episodes.length) return;
                var done = anime.episodes.every(function (ep) {
                    return parseFloat(lsGet('neon_progress_' + anime.id + '_' + ep.number) || '0') >= COMPLETE_AT;
                });
                if (done) completed++;
            });
        }

        // distinct action titles watched
        var actionWatched = 0;
        if (D && D.list) {
            D.list.forEach(function (anime) {
                if (titleSet[anime.id] && anime.genres && anime.genres.indexOf('action') !== -1) actionWatched++;
            });
        }

        return {
            uniqueEpisodes: uniqueEpisodes,
            watchedTitles: Object.keys(titleSet).length,
            actionWatched: actionWatched,
            watchlistCount: Math.min(watchlist.length, 7),
            completed: completed,
            spins: state.spins,
            moods: Math.min(state.moods.length, 5),
            likes: Math.min(likedTitles, 7),
            commentThreads: commentThreads,
            vip: vip,
            nightOwl: nightOwl,
            reactions: Math.min(likedTitles + commentThreads, 99)
        };
    }

    function unlockedBadgeIds() {
        var state = readState();
        return Object.keys(state.badges);
    }

    function computeXP(stats) {
        var xp = 0;
        xp += stats.uniqueEpisodes * XP_RULES.episode;
        xp += stats.completed * XP_RULES.completed;
        xp += stats.watchlistCount * XP_RULES.watchlist;
        xp += Math.min(stats.spins, 10) * XP_RULES.spin;
        xp += stats.moods * XP_RULES.mood;
        xp += stats.likes * XP_RULES.like;
        if (stats.vip) xp += XP_RULES.vip;

        // bonus XP from unlocked badges
        var state = readState();
        BADGES.forEach(function (b) {
            if (state.badges[b.id]) xp += b.xp;
        });
        return xp;
    }

    function levelFor(xp) {
        var level = LEVELS[0];
        for (var i = 0; i < LEVELS.length; i++) {
            if (xp >= LEVELS[i].xp) level = LEVELS[i];
        }
        return {
            index: LEVELS.indexOf(level),
            def: level,
            next: LEVELS[LEVELS.indexOf(level) + 1] || null
        };
    }

    /* ==================================================================== */
    /* BADGE EVALUATION + NOTIFICATIONS                                     */
    /* ==================================================================== */

    function isBadgeEarned(badge, stats) {
        switch (badge.id) {
            case 'night-owl':     return stats.nightOwl;
            case 'action-master': return stats.actionWatched >= 3;
            case 'librarian':     return stats.watchlistCount >= 3;
            case 'marathon':      return stats.uniqueEpisodes >= 10;
            case 'lucky-neon':    return stats.spins >= 3;
            case 'critic':        return stats.reactions >= 3;
            case 'vip-lord':      return stats.vip;
            default:              return false;
        }
    }

    /* Evaluates all badges, stores newly earned ones and queues their
       graphical notification. Safe to call at any time. */
    function evaluateBadges(opts) {
        opts = opts || {};
        var state = readState();
        var stats = collectStats();
        var changed = false;

        BADGES.forEach(function (b) {
            if (!state.badges[b.id] && isBadgeEarned(b, stats)) {
                state.badges[b.id] = Date.now();
                changed = true;
            }
        });

        if (changed) writeState(state);

        // queue notifications for badges that were never shown yet
        var notifyAdded = false;
        BADGES.forEach(function (b) {
            if (state.badges[b.id] && !state.notified[b.id]) {
                state.notified[b.id] = true;
                notifyAdded = true;
                queueUnlockPopup(b);
            }
        });
        if (changed || notifyAdded) writeState(state);

        if (changed && !opts.silent) {
            renderProfile();
        }
        return changed;
    }

    /* ==================================================================== */
    /* TRIGGERS — navbar button + side-menu link                            */
    /* ==================================================================== */

    function buildNavTrigger() {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'gami-nav-btn';
        btn.id = 'gamiRouletteNavBtn';
        btn.title = 'انیمه شانسی';
        btn.setAttribute('aria-label', 'انیمه شانسی — گردونه شانس');
        btn.innerHTML = '<span class="gami-nav-dice">🎲</span><span>انیمه شانسی</span>';
        btn.addEventListener('click', function () { openRoulette(); });
        return btn;
    }

    function buildSideTrigger() {
        var a = document.createElement('a');
        a.href = '#gami-roulette';
        a.className = 'gami-side-link';
        a.id = 'gamiRouletteSideLink';
        a.title = 'گردونه شانس انیمه';
        a.innerHTML = '<span class="icon">🎲</span> انیمه شانسی <span class="gami-side-plus">' + toFa('+۵') + ' XP</span>';
        a.addEventListener('click', function (e) {
            e.preventDefault();
            // close the drawer the same way script.js does
            if (a.closest && a.closest('#sideMenu')) {
                var menu = document.getElementById('sideMenu');
                var backdrop = document.getElementById('mobileBackdrop');
                var burger = document.getElementById('hamburgerBtn');
                if (menu) menu.classList.remove('active');
                if (backdrop) backdrop.classList.remove('active');
                if (burger) { burger.classList.remove('active'); burger.setAttribute('aria-expanded', 'false'); }
                document.body.style.overflow = '';
            }
            openRoulette();
        });
        return a;
    }

    function injectTriggers() {
        if (!data() || !data().list || !data().list.length) return;

        var navRight = document.querySelector('#navbar .nav-right') ||
                       document.querySelector('.main-nav .nav-right');
        if (navRight && !document.getElementById('gamiRouletteNavBtn')) {
            navRight.insertBefore(buildNavTrigger(), navRight.firstChild);
        }

        var sideLinks = document.querySelector('#sideMenu .side-menu-links');
        if (sideLinks && !document.getElementById('gamiRouletteSideLink')) {
            sideLinks.appendChild(buildSideTrigger());
        }
    }

    /* ==================================================================== */
    /* 1) ROULETTE — «انیمه شانسی»                                          */
    /* ==================================================================== */

    var roulette = { built: false, spinning: false, rotation: 0, overlay: null, wheel: null, status: null, result: null };

    function buildRoulette() {
        if (roulette.built) return;
        var D = data();
        if (!D || !D.list || !D.list.length) return;

        var list = D.list;
        var seg = 360 / list.length;

        var overlay = document.createElement('div');
        overlay.className = 'gami-roulette-overlay';
        overlay.id = 'gamiRouletteOverlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'گردونه شانس انیمه');

        var segsHtml = '';
        var bulbsHtml = '';
        list.forEach(function (anime, i) {
            var color = WHEEL_COLORS[i % WHEEL_COLORS.length][0];
            var from = i * seg - seg / 2;
            segsHtml +=
                '<div class="gami-wheel-seg" style="transform: rotate(' + (i * seg) + 'deg);' +
                'background: conic-gradient(from ' + from + 'deg at 50% 50%, ' + color + ' 0deg ' + seg + 'deg, transparent ' + seg + 'deg);">' +
                '<span class="gami-seg-icon">' + (WHEEL_ICONS[anime.id] || '🎬') + '</span>' +
                '</div>';
        });
        for (var b = 0; b < 12; b++) {
            var angle = (b / 12) * Math.PI * 2 - Math.PI / 2;
            var x = 50 + 48.5 * Math.cos(angle);
            var y = 50 + 48.5 * Math.sin(angle);
            bulbsHtml += '<span style="left:' + x + '%; top:' + y + '%; animation-delay:' + (b * 0.1) + 's;"></span>';
        }

        overlay.innerHTML =
            '<div class="gami-roulette-modal">' +
            '  <div class="gami-roulette-head">' +
            '    <h3><span class="gami-title-neon">🎲 انیمه شانسی</span></h3>' +
            '    <button type="button" class="gami-close-btn" aria-label="بستن">✕</button>' +
            '  </div>' +
            '  <p>گردونه را بچرخان و بگذار سرنوشت، انیمه امشبت را انتخاب کند!</p>' +
            '  <div class="gami-wheel-stage">' +
            '    <div class="gami-wheel-lights">' + bulbsHtml + '</div>' +
            '    <div class="gami-wheel" id="gamiWheel">' + segsHtml + '</div>' +
            '    <div class="gami-wheel-hub">🎲</div>' +
            '    <div class="gami-wheel-pointer"></div>' +
            '  </div>' +
            '  <div class="gami-spin-status" id="gamiSpinStatus">آماده‌ی چرخش هستی؟</div>' +
            '  <div class="gami-roulette-result" id="gamiRouletteResult"></div>' +
            '</div>';

        document.body.appendChild(overlay);

        overlay.querySelector('.gami-close-btn').addEventListener('click', closeRoulette);
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeRoulette();
        });

        roulette.overlay = overlay;
        roulette.wheel = overlay.querySelector('#gamiWheel');
        roulette.status = overlay.querySelector('#gamiSpinStatus');
        roulette.result = overlay.querySelector('#gamiRouletteResult');
        roulette.built = true;
    }

    function openRoulette() {
        buildRoulette();
        if (!roulette.built) return;
        if (!roulette.overlay.classList.contains('open')) {
            roulette.overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
        if (!roulette.result.innerHTML) {
            setStatus('آماده‌ی چرخش هستی؟ روی گردونه بزن!', false);
        }
    }

    function closeRoulette() {
        if (!roulette.built) return;
        roulette.overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    function setStatus(text, highlight) {
        if (!roulette.status) return;
        roulette.status.textContent = text;
        roulette.status.classList.toggle('highlight', !!highlight);
    }

    function spinRoulette() {
        buildRoulette();
        if (!roulette.built || roulette.spinning) return;
        var D = data();
        var list = D.list;
        var seg = 360 / list.length;

        roulette.spinning = true;

        // hide previous result
        roulette.result.classList.remove('show');
        setTimeout(function () { if (roulette.spinning) roulette.result.innerHTML = ''; }, 300);

        // pick winner + compute a landing rotation (pointer sits at the top / 0deg)
        var winnerIndex = Math.floor(Math.random() * list.length);
        var jitter = (Math.random() - 0.5) * (seg - 12);
        var targetMod = ((360 - winnerIndex * seg + jitter) % 360 + 360) % 360;
        var currentMod = ((roulette.rotation % 360) + 360) % 360;
        var delta = (targetMod - currentMod + 360) % 360;
        roulette.rotation += 360 * (5 + Math.floor(Math.random() * 2)) + delta;

        setStatus('در حال چرخش...', false);
        roulette.overlay.classList.add('spinning');
        roulette.wheel.classList.add('spinning');
        // force reflow so consecutive spins always animate
        void roulette.wheel.offsetWidth;
        roulette.wheel.style.transform = 'rotate(' + roulette.rotation + 'deg)';

        var finished = false;
        function finish() {
            if (finished) return;
            finished = true;
            roulette.spinning = false;
            roulette.overlay.classList.remove('spinning');
            roulette.wheel.classList.remove('spinning');
            onSpinDone(list[winnerIndex]);
        }
        roulette.wheel.addEventListener('transitionend', function onEnd() {
            roulette.wheel.removeEventListener('transitionend', onEnd);
            setTimeout(finish, 140);
        });
        setTimeout(finish, SPIN_DURATION_MS + 900); // safety net
    }

    function onSpinDone(anime) {
        var D = data();

        // record the spin (+XP) and check badges (e.g. «خوش‌شانس نئونی»)
        var state = readState();
        state.spins += 1;
        writeState(state);
        evaluateBadges({ silent: true });

        setStatus('سرنوشتت مشخص شد! ✨', true);

        var firstEp = anime.episodes && anime.episodes[0] ? anime.episodes[0].number : null;
        var watchHref = D.watchUrl ? D.watchUrl(anime, firstEp) : 'watch.html?anime=' + encodeURIComponent(anime.id);
        var dlHref = D.downloadUrl ? D.downloadUrl(anime, firstEp) : 'download.html?anime=' + encodeURIComponent(anime.id);

        roulette.result.innerHTML =
            '<span class="gami-result-tag">🍀 انیمه شانسی تو</span>' +
            '<div class="gami-result-body">' +
            '  <img class="gami-result-poster" src="' + esc(anime.poster) + '" alt="' + esc(anime.title) + '" loading="lazy" decoding="async">' +
            '  <div class="gami-result-info">' +
            '    <h4>' + esc(anime.title) + '</h4>' +
            '    <div class="gami-result-title-en">' + esc(anime.titleEn) + '</div>' +
            '    <span class="gami-result-rating">★ ' + toFa(anime.rating.toFixed(1)) + '</span>' +
            '    <div class="gami-result-genre">' + esc(anime.genreLabel || '') + '</div>' +
            '    <div class="gami-result-meta">' +
            '      <span>' + toFa(anime.year) + '</span>' +
            '      <span>' + esc(anime.quality || '') + '</span>' +
            '      <span>' + esc(anime.age || '') + '</span>' +
            '      <span>' + esc(anime.statusLabel || '') + '</span>' +
            '    </div>' +
            '    <p class="gami-result-desc">' + esc(anime.desc || '') + '</p>' +
            '  </div>' +
            '</div>' +
            '<div class="gami-result-actions">' +
            '  <a class="gami-btn gami-btn-play" href="' + esc(watchHref) + '">▶ پخش آنلاین</a>' +
            '  <a class="gami-btn gami-btn-download" href="' + esc(dlHref) + '">⬇ دانلود</a>' +
            '  <button type="button" class="gami-btn gami-btn-again" id="gamiSpinAgainBtn">🔄 دوباره بچرخون</button>' +
            '</div>';

        roulette.result.querySelector('#gamiSpinAgainBtn').addEventListener('click', spinRoulette);
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                roulette.result.classList.add('show');
            });
        });
    }

    /* ==================================================================== */
    /* 2) MOOD & VIBE EXPLORER                                              */
    /* ==================================================================== */

    function moodById(id) {
        for (var i = 0; i < MOODS.length; i++) if (MOODS[i].id === id) return MOODS[i];
        return null;
    }

    function animeForMood(mood) {
        var D = data();
        if (!D || !D.list) return [];
        return D.list.filter(function (anime) {
            return (anime.genres || []).some(function (g) { return mood.genres.indexOf(g) !== -1; });
        }).sort(function (a, b) { return (b.rating || 0) - (a.rating || 0); });
    }

    function renderMoodResults(mood) {
        var results = document.getElementById('moodResults');
        if (!results) return;

        var list = animeForMood(mood);
        var D = data();
        results.hidden = false;
        results.style.setProperty('--mood-glow', moodGlow(mood.id));

        if (!list.length) {
            results.innerHTML = '<p class="mood-empty" style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:26px 0;">فعلاً انیمه‌ای برای این حس و حال داریم — به‌زودی اضافه می‌شود!</p>';
            return;
        }

        results.innerHTML = list.map(function (anime, i) {
            var firstEp = anime.episodes && anime.episodes[0] ? anime.episodes[0].number : null;
            var watchHref = D.watchUrl ? D.watchUrl(anime, firstEp) : 'watch.html?anime=' + encodeURIComponent(anime.id);
            var detailHref = D.detailUrl ? D.detailUrl(anime) : 'anime.html?id=' + encodeURIComponent(anime.id);
            return (
                '<article class="mood-anime-card" style="animation-delay:' + (i * 90) + 'ms;">' +
                '  <div class="mood-anime-poster">' +
                '    <img src="' + esc(anime.poster) + '" alt="' + esc(anime.title) + '" loading="lazy" decoding="async">' +
                '    <span class="mood-anime-rating">★ ' + toFa((anime.rating || 0).toFixed(1)) + '</span>' +
                '    <span class="mood-anime-status' + (anime.status === 'finished' ? ' finished' : '') + '">' + esc(anime.statusLabel || '') + '</span>' +
                '  </div>' +
                '  <div class="mood-anime-body">' +
                '    <h4>' + esc(anime.title) + '</h4>' +
                '    <div class="mood-anime-sub">' + esc(anime.titleEn) + '</div>' +
                '    <div class="mood-anime-genres">' + esc(anime.genreLabel || '') + '</div>' +
                '    <div class="mood-anime-actions">' +
                '      <a class="gami-btn gami-btn-play" href="' + esc(watchHref) + '">▶ پخش</a>' +
                '      <a class="gami-btn gami-btn-details" href="' + esc(detailHref) + '">جزئیات</a>' +
                '    </div>' +
                '  </div>' +
                '</article>'
            );
        }).join('') +
        '<div style="grid-column:1/-1;text-align:center;">' +
        '  <button type="button" class="mood-clear-btn" id="moodClearBtn">✕ پاک کردن فیلتر حس و حال</button>' +
        '</div>';

        var clearBtn = document.getElementById('moodClearBtn');
        if (clearBtn) clearBtn.addEventListener('click', function () {
            results.hidden = true;
            results.innerHTML = '';
            document.querySelectorAll('.mood-card.active').forEach(function (c) { c.classList.remove('active'); });
        });
    }

    function moodGlow(id) {
        switch (id) {
            case 'adrenaline': return 'rgba(255, 0, 60, 0.35)';
            case 'mystery':    return 'rgba(45, 212, 191, 0.32)';
            case 'epic':       return 'rgba(255, 200, 60, 0.32)';
            case 'cyber':      return 'rgba(0, 240, 255, 0.35)';
            case 'feels':      return 'rgba(252, 70, 107, 0.32)';
            default:           return 'rgba(138, 43, 226, 0.32)';
        }
    }

    function initMoodExplorer() {
        var grid = document.getElementById('moodGrid');
        if (!grid || !data()) return;

        grid.addEventListener('click', function (e) {
            var card = e.target.closest ? e.target.closest('.mood-card') : null;
            if (!card) return;
            var mood = moodById(card.getAttribute('data-mood'));
            if (!mood) return;

            grid.querySelectorAll('.mood-card.active').forEach(function (c) { c.classList.remove('active'); });
            card.classList.add('active');
            renderMoodResults(mood);

            // first exploration of a mood rewards a bit of XP
            var state = readState();
            if (state.moods.indexOf(mood.id) === -1) {
                state.moods.push(mood.id);
                writeState(state);
                evaluateBadges({ silent: true });
            }
        });
    }

    /* ==================================================================== */
    /* 3) OTAKU LEVEL + BADGES — profile page                               */
    /* ==================================================================== */

    function renderProfile() {
        var levelBox = document.getElementById('otakuLevelBox');
        var showcase = document.getElementById('badgeShowcase');
        if (!levelBox && !showcase) return;

        var stats = collectStats();
        var xp = computeXP(stats);
        var level = levelFor(xp);
        var state = readState();

        if (levelBox) {
            var pct = 100;
            var nextInfo = 'به بالاترین سطح اوتاکو رسیدی! 👑';
            if (level.next) {
                pct = Math.min(100, Math.round(((xp - level.def.xp) / (level.next.xp - level.def.xp)) * 100));
                nextInfo = 'تا سطح «' + level.next.name + '» ' + toFa(level.next.xp - xp) + ' XP دیگر';
            }

            levelBox.innerHTML =
                '<div class="otaku-level-top">' +
                '  <div class="otaku-level-emblem">' + level.def.emoji + '</div>' +
                '  <div class="otaku-level-copy">' +
                '    <div class="otaku-level-name">' + level.def.name +
                '      <span class="otaku-level-tag">سطح ' + toFa(level.index + 1) + ' از ' + toFa(LEVELS.length) + '</span>' +
                '    </div>' +
                '    <p class="otaku-level-sub">' + nextInfo + '</p>' +
                '  </div>' +
                '  <div class="otaku-xp-total">' + toFa(xp) + ' <small>XP امتیاز اوتاکو</small></div>' +
                '</div>' +
                '<div class="otaku-xp-track"><div class="otaku-xp-fill" id="otakuXpFill"></div></div>' +
                '<div class="otaku-xp-labels">' +
                '  <span>' + level.def.name + ' — ' + toFa(level.def.xp) + ' XP</span>' +
                '  <span class="otaku-xp-next">' + (level.next ? level.next.name + ' — ' + toFa(level.next.xp) + ' XP' : 'امپراتور 👑') + '</span>' +
                '</div>' +
                '<div class="otaku-ladder">' +
                LEVELS.map(function (l, i) {
                    var cls = 'otaku-ladder-step';
                    if (xp >= l.xp) cls += ' done';
                    if (i === level.index) cls += ' current';
                    return '<div class="' + cls + '">' +
                        '<span class="ladder-emoji">' + l.emoji + '</span>' +
                        '<span class="ladder-name">' + l.name + '</span>' +
                        '<span class="ladder-xp">' + toFa(l.xp) + ' XP</span>' +
                        '</div>';
                }).join('') +
                '</div>';

            // animate the neon XP bar in
            var fill = document.getElementById('otakuXpFill');
            if (fill) {
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () { fill.style.width = pct + '%'; });
                });
            }
        }

        if (showcase) {
            showcase.innerHTML = BADGES.map(function (b) {
                var earned = !!state.badges[b.id];
                return (
                    '<article class="badge-card ' + (earned ? 'unlocked' : 'locked') + '">' +
                    '  <span class="badge-xp">+' + toFa(b.xp) + ' XP</span>' +
                    '  <div class="badge-medal">' + b.emoji + '</div>' +
                    '  <h4>' + b.name + '</h4>' +
                    '  <p class="badge-desc">' + b.desc + '</p>' +
                    (earned
                        ? '<span class="badge-state">🏅 باز شد</span>' +
                          (state.badges[b.id] ? '<span class="badge-date">' + faDate(state.badges[b.id]) + '</span>' : '')
                        : '<span class="badge-state">🔒 قفل است</span>') +
                    '</article>'
                );
            }).join('');

            var countEl = document.getElementById('otakuBadgeCount');
            if (countEl) {
                var earnedCount = BADGES.filter(function (b) { return !!state.badges[b.id]; }).length;
                countEl.textContent = toFa(earnedCount) + ' از ' + toFa(BADGES.length) + ' نشان';
            }
        }
    }

    /* ==================================================================== */
    /* BADGE UNLOCK POPUP (graphraphic notification)                        */
    /* ==================================================================== */

    var unlockQueue = [];
    var unlockActive = false;
    var unlockOverlay = null;

    function queueUnlockPopup(badge) {
        unlockQueue.push(badge);
        pumpUnlockQueue();
    }

    function ensureUnlockOverlay() {
        if (unlockOverlay) return unlockOverlay;
        unlockOverlay = document.createElement('div');
        unlockOverlay.className = 'gami-unlock-overlay';
        unlockOverlay.id = 'gamiUnlockOverlay';
        unlockOverlay.setAttribute('role', 'dialog');
        unlockOverlay.setAttribute('aria-modal', 'true');
        unlockOverlay.setAttribute('aria-label', 'نشان دستاورد جدید');
        unlockOverlay.innerHTML =
            '<div class="gami-unlock-card">' +
            '  <div class="gami-confetti-layer"></div>' +
            '  <div class="gami-unlock-kicker">ACHIEVEMENT UNLOCKED</div>' +
            '  <div class="gami-unlock-medal"></div>' +
            '  <h3 class="gami-unlock-name"></h3>' +
            '  <p class="gami-unlock-desc"></p>' +
            '  <span class="gami-unlock-xp"></span>' +
            '  <button type="button" class="gami-unlock-close">عالیه! 🎉</button>' +
            '</div>';
        document.body.appendChild(unlockOverlay);
        unlockOverlay.querySelector('.gami-unlock-close').addEventListener('click', function () {
            hideUnlockPopup();
        });
        unlockOverlay.addEventListener('click', function (e) {
            if (e.target === unlockOverlay) hideUnlockPopup();
        });
        return unlockOverlay;
    }

    function buildConfetti(layer) {
        var html = '';
        for (var i = 0; i < 16; i++) {
            var angle = (Math.PI * 2 * i) / 16 + Math.random() * 0.4;
            var dist = 90 + Math.random() * 110;
            html += '<span class="gami-confetti" style="' +
                '--dx:' + (Math.cos(angle) * dist).toFixed(0) + 'px;' +
                '--dy:' + (Math.sin(angle) * dist - 30).toFixed(0) + 'px;' +
                '--rot:' + Math.floor(Math.random() * 540 - 270) + 'deg;' +
                '--d:' + (Math.random() * 0.25).toFixed(2) + 's;' +
                'background:' + CONFETTI_COLORS[i % CONFETTI_COLORS.length] + ';"></span>';
        }
        layer.innerHTML = html;
    }

    function showUnlockPopup(badge) {
        var overlay = ensureUnlockOverlay();
        overlay.querySelector('.gami-unlock-medal').textContent = badge.emoji;
        overlay.querySelector('.gami-unlock-name').textContent = 'نشان «' + badge.name + '» باز شد!';
        overlay.querySelector('.gami-unlock-desc').textContent = badge.desc;
        overlay.querySelector('.gami-unlock-xp').textContent = '+' + toFa(badge.xp) + ' XP پاداش دستاورد';
        buildConfetti(overlay.querySelector('.gami-confetti-layer'));

        overlay.classList.add('open');
        unlockActive = true;

        // auto dismiss
        clearTimeout(showUnlockPopup._timer);
        showUnlockPopup._timer = setTimeout(hideUnlockPopup, 7000);
    }

    function hideUnlockPopup() {
        if (!unlockOverlay) return;
        clearTimeout(showUnlockPopup._timer);
        unlockOverlay.classList.remove('open');
        unlockActive = false;
        setTimeout(pumpUnlockQueue, 450);
    }

    function pumpUnlockQueue() {
        if (unlockActive || !unlockQueue.length) return;
        var badge = unlockQueue.shift();
        // small delay so the popup never collides with a just-closed modal
        setTimeout(function () { showUnlockPopup(badge); }, 600);
    }

    /* ==================================================================== */
    /* INIT                                                                 */
    /* ==================================================================== */

    function init() {
        injectTriggers();

        // clicking anywhere on the wheel spins it
        document.addEventListener('click', function (e) {
            if (!roulette.built) return;
            if (e.target.closest && e.target.closest('.gami-wheel-stage')) {
                spinRoulette();
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            if (unlockOverlay && unlockOverlay.classList.contains('open')) { hideUnlockPopup(); return; }
            if (roulette.built && roulette.overlay.classList.contains('open')) closeRoulette();
        });

        initMoodExplorer();
        renderProfile();
        evaluateBadges();

        // keep badges/XP fresh while the page stays open (e.g. watch.html player
        // stores progress continuously; other tabs fire the storage event).
        setInterval(function () { evaluateBadges(); }, RECHECK_INTERVAL_MS);
        window.addEventListener('storage', function (e) {
            if (!e.key || e.key.indexOf('neon_') === 0) evaluateBadges();
        });
        window.addEventListener('focus', function () { evaluateBadges(); });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    /* Public surface (handy for debugging in the console) */
    window.NEON_GAMI = {
        spin: spinRoulette,
        open: openRoulette,
        stats: collectStats,
        xp: function () { return computeXP(collectStats()); },
        level: function () { return levelFor(computeXP(collectStats())); },
        badges: BADGES,
        levels: LEVELS,
        moods: MOODS,
        evaluate: evaluateBadges
    };
})();
