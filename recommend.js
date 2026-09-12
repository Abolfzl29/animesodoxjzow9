/* ==========================================================================
 * recommend.html — «پیشنهادهای هوشمند» (Smart Picks)
 *
 * Builds a personal, always-working recommendation feed from:
 *   - watch history (neon_watch_history)
 *   - watchlist (neon_watchlist)
 *   - user ratings (neon_user_ratings)
 * using the shared recommendation engine in data/recommend.js (NEON_REC) plus
 * a thin "reason" layer that explains *why* each title is suggested.
 *
 * Guests (no history/watchlist) get the most popular titles + genre explorer,
 * so the page is never empty.
 * ========================================================================== */
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        var DATA = window.NEON_ANIME;
        var REC = window.NEON_REC;

        if (!DATA) {
            var empty = document.getElementById('recEmpty');
            if (empty) { empty.hidden = false; }
            return;
        }

        var FA = '۰۱۲۳۴۵۶۷۸۹';
        function toFa(value) {
            return DATA && DATA.toFa ? DATA.toFa(value)
                : String(value).replace(/\d/g, function (d) { return FA[d]; });
        }
        function esc(str) {
            return String(str).replace(/[&<>"']/g, function (c) {
                return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
            });
        }

        /* ---------------- personalization signals ---------------- */
        function readJson(key, fallback) {
            try {
                var raw = localStorage.getItem(key);
                return raw ? JSON.parse(raw) : fallback;
            } catch (e) { return fallback; }
        }
        function historyIds() { return REC && REC.historyIds ? REC.historyIds() : []; }
        function watchlist() { return REC && REC.watchlist ? REC.watchlist() : []; }
        function ratings() { return readJson('neon_user_ratings', {}); }

        function topGenreId() {
            var weights = {};
            function bump(anime, n) {
                if (!anime) return;
                anime.genres.forEach(function (g) { weights[g] = (weights[g] || 0) + n; });
            }
            historyIds().forEach(function (id) { bump(DATA.byId[id], 3); });
            watchlist().forEach(function (id) { bump(DATA.byId[id], 2); });
            var r = ratings();
            Object.keys(r).forEach(function (id) {
                var score = Number(r[id]) || 0;
                bump(DATA.byId[id], score >= 8 ? 3 : score >= 5 ? 1 : 0);
            });
            var best = null, bestScore = 0;
            Object.keys(weights).forEach(function (g) {
                if (weights[g] > bestScore) { bestScore = weights[g]; best = g; }
            });
            return best;
        }

        function genreLabel(id) {
            for (var i = 0; i < DATA.genres.length; i++) {
                if (DATA.genres[i].id === id) return DATA.genres[i].label;
            }
            return id;
        }

        function mostRecentAnime() {
            var ids = historyIds();
            return ids.length && DATA.byId[ids[0]] ? DATA.byId[ids[0]] : null;
        }

        function hasPersonalSignals() {
            return historyIds().length > 0 || watchlist().length > 0 || Object.keys(ratings()).length > 0;
        }

        /* ---------------- card builder ---------------- */
        function el(tag, className, text) {
            var node = document.createElement(tag);
            if (className) node.className = className;
            if (typeof text === 'string') node.textContent = text;
            return node;
        }

        function buildCard(anime, reason) {
            var card = el('a', 'anime-card landscape catalog-anime-card');
            card.href = DATA.detailUrl(anime);
            card.dataset.anime = anime.id;
            card.setAttribute('aria-label', 'جزئیات ' + anime.title);

            var image = el('img', 'card-static-img');
            image.src = anime.banner;
            image.alt = anime.title;
            image.width = 640;
            image.height = 360;
            image.loading = 'lazy';
            image.decoding = 'async';
            card.appendChild(image);

            var badges = el('div', 'lang-badges');
            badges.appendChild(el('span', 'lang-badge dub', 'دوبله'));
            badges.appendChild(el('span', 'lang-badge sub', 'زیرنویس'));
            card.appendChild(badges);

            var rating = el('span', 'catalog-card-rating');
            rating.appendChild(el('span', '', '★'));
            rating.appendChild(document.createTextNode(' ' + toFa(anime.rating.toFixed(1))));
            card.appendChild(rating);

            card.appendChild(el('div', 'catalog-card-gradient'));
            card.appendChild(el('span', 'catalog-card-play', '▶'));

            var copy = el('div', 'catalog-card-copy');
            copy.appendChild(el('h3', '', anime.title));
            copy.appendChild(el('span', 'catalog-card-en en-text', anime.titleEn));
            var meta = el('div', 'catalog-card-meta');
            meta.appendChild(el('span', '', toFa(anime.year)));
            meta.appendChild(el('i', '', '•'));
            meta.appendChild(el('span', '', anime.genreLabel));
            copy.appendChild(meta);
            card.appendChild(copy);

            if (reason) {
                var chip = el('span', 'rec-card-reason');
                chip.title = reason;
                chip.appendChild(el('span', 'rec-dot', '✦'));
                chip.appendChild(document.createTextNode(' ' + reason));
                card.appendChild(chip);
            }
            return card;
        }

        /* ---------------- shelf builder ---------------- */
        function addShelf(host, opts) {
            var title = opts.title, eyebrow = opts.eyebrow, items = opts.items, reason = opts.reason;
            if (!items || !items.length) return;

            var section = el('section', 'rec-shelf');
            var header = el('div', 'catalog-section-header');
            var headInner = el('div');
            if (eyebrow) headInner.appendChild(el('span', 'catalog-section-index en-text', eyebrow));
            var copy = el('div');
            copy.appendChild(el('h3', '', title));
            if (opts.subtitle) copy.appendChild(el('p', '', opts.subtitle));
            headInner.appendChild(copy);
            header.appendChild(headInner);
            section.appendChild(header);

            var grid = el('div', 'rec-grid');
            items.forEach(function (anime) {
                grid.appendChild(buildCard(anime, typeof reason === 'function' ? reason(anime) : reason));
            });
            section.appendChild(grid);
            host.appendChild(section);
        }

        /* ---------------- hero (today pick) ---------------- */
        function renderTodayPick(pick) {
            var heroArt = document.getElementById('recHeroArt');
            var cta = document.getElementById('recHeroCta');
            var sub = document.getElementById('recHeroSub');
            if (!pick) return;

            if (heroArt) heroArt.style.backgroundImage = 'url("' + pick.banner + '")';
            if (cta) {
                cta.href = DATA.detailUrl(pick);
                cta.textContent = '▶ تماشای «' + pick.title + '»';
                cta.setAttribute('aria-label', 'تماشای ' + pick.title);
            }
            if (sub) {
                sub.textContent = 'امروز برای تو «' + pick.title + '» را پیشنهاد می‌کنیم — ' +
                    (hasPersonalSignals()
                        ? 'بر اساس تاریخچه تماشا و سلیقه‌ی تو انتخاب شده است.'
                        : 'برای پیشنهاد شخصی‌تر، چند قسمت تماشا کن یا به «لیست من» اضافه کن.');
            }
        }

        /* ---------------- lucky button ---------------- */
        function bindLucky() {
            var btn = document.getElementById('recLuckyBtn');
            if (!btn) return;
            btn.addEventListener('click', function () {
                var pick = REC && REC.lucky ? REC.lucky(DATA) : DATA.list[Math.floor(Math.random() * DATA.list.length)];
                if (pick) window.location.href = DATA.detailUrl(pick);
            });
        }

        /* ---------------- genre chips ---------------- */
        function renderGenreChips() {
            var host = document.getElementById('recGenreChips');
            if (!host) return;
            host.replaceChildren();
            DATA.genres.forEach(function (genre) {
                var a = el('a', 'rec-genre-chip', genre.label);
                a.href = 'catalog.html?genre=' + encodeURIComponent(genre.id) + '#catalogResults';
                a.appendChild(el('span', 'rec-dot', '→'));
                host.appendChild(a);
            });
        }

        /* ---------------- main render ---------------- */
        function render() {
            var host = document.getElementById('recSections');
            var empty = document.getElementById('recEmpty');
            if (!host) return;

            host.replaceChildren();
            var personal = hasPersonalSignals();
            var seed = mostRecentAnime();
            var topGenre = topGenreId();

            if (empty) empty.hidden = personal;

            if (personal) {
                var because = REC && REC.becauseYouWatched ? REC.becauseYouWatched(DATA, 10) : null;
                if (because && because.seed && because.items.length) {
                    addShelf(host, {
                        eyebrow: 'BECAUSE YOU WATCHED',
                        title: 'چون «' + because.seed.title + '» را تماشا کردی',
                        subtitle: 'عنوان‌هایی که حال‌وهوای مشابهی دارند و احتمالاً دوستشان خواهی داشت.',
                        items: because.items,
                        reason: function () { return 'چون «' + because.seed.title + '» را تماشا کردی'; }
                    });
                }

                if (seed) {
                    var similar = REC && REC.similar ? REC.similar(DATA, seed, 10) : [];
                    if (similar.length) {
                        addShelf(host, {
                            eyebrow: 'MORE LIKE THIS',
                            title: 'مشابه «' + seed.title + '»',
                            subtitle: 'از نظر ژانر، استودیو و امتیاز نزدیک‌ترین‌ها به آنچه اخیراً دیده‌ای.',
                            items: similar,
                            reason: function () { return 'مشابه «' + seed.title + '»'; }
                        });
                    }
                }

                var forYou = REC && REC.forYou ? REC.forYou(DATA, 12) : DATA.list.slice(0, 12);
                var genreReason = topGenre ? ('چون ژانر «' + genreLabel(topGenre) + '» را دوست داری') : 'منتخب سلیقه‌ی تو';
                addShelf(host, {
                    eyebrow: 'FOR YOU',
                    title: 'مخصوص تو',
                    subtitle: 'چیده‌شده بر اساس تاریخچه تماشا، علاقه‌مندی‌ها و امتیازهایی که داده‌ای.',
                    items: forYou,
                    reason: genreReason
                });

                if (!because && !similar && !forYou.length) { /* safety net below */ }
            }

            // Always render a fallback so the page is never bare.
            var alreadyShown = host.children.length > 0;
            if (!alreadyShown) {
                var popular = DATA.list.slice().sort(function (a, b) { return b.rating - a.rating; }).slice(0, 12);
                addShelf(host, {
                    eyebrow: 'TRENDING',
                    title: 'محبوب‌ترین‌های نئون',
                    subtitle: 'بالاترین امتیازها در آرشیو — نقطه‌ی شروع خوبی برای تازه‌واردها.',
                    items: popular,
                    reason: 'محبوب در نئون انیمه'
                });
            }

            renderTodayPick(
                (REC && REC.todayPick ? REC.todayPick(DATA) : null) ||
                (seed) ||
                DATA.list[Math.floor(Math.random() * DATA.list.length)]
            );
        }

        renderGenreChips();
        render();
        bindLucky();
    });
})();
