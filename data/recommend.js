/* Client-side recommendations from watch history, watchlist and genres. */
(function () {
    function readJson(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) { return fallback; }
    }

    function historyIds() {
        var hist = readJson('neon_watch_history', []);
        var ids = [];
        hist.forEach(function (h) {
            if (h && h.anime && ids.indexOf(h.anime) === -1) ids.push(h.anime);
        });
        return ids;
    }

    function watchlist() {
        var list = readJson('neon_watchlist', []);
        return Array.isArray(list) ? list : [];
    }

    function userRatings() {
        return readJson('neon_user_ratings', {});
    }

    function genreWeights(DATA) {
        var weights = {};
        function bump(id, n) {
            var a = DATA.byId[id];
            if (!a) return;
            a.genres.forEach(function (g) { weights[g] = (weights[g] || 0) + n; });
        }
        historyIds().forEach(function (id) { bump(id, 3); });
        watchlist().forEach(function (id) { bump(id, 2); });
        var ratings = userRatings();
        Object.keys(ratings).forEach(function (id) {
            var r = Number(ratings[id]) || 0;
            bump(id, r >= 8 ? 3 : r >= 5 ? 1 : 0);
        });
        return weights;
    }

    function scoreAnime(anime, weights, seen) {
        var s = 0;
        anime.genres.forEach(function (g) { s += (weights[g] || 0) * 2; });
        s += anime.rating;
        if (anime.status === 'airing') s += 1.2;
        if (seen[anime.id]) s -= 40;
        return s;
    }

    function similar(DATA, anime, limit) {
        if (!DATA || !anime) return [];
        var seen = {};
        seen[anime.id] = true;
        return DATA.list
            .filter(function (a) { return a.id !== anime.id; })
            .map(function (a) {
                var overlap = a.genres.filter(function (g) { return anime.genres.indexOf(g) !== -1; }).length;
                return { a: a, s: overlap * 10 + a.rating + (a.studio === anime.studio ? 2 : 0) };
            })
            .sort(function (x, y) { return y.s - x.s; })
            .slice(0, limit || 8)
            .map(function (x) { return x.a; });
    }

    function becauseYouWatched(DATA, limit) {
        var ids = historyIds();
        if (!ids.length || !DATA) return { seed: null, items: [] };
        var seed = DATA.byId[ids[0]];
        if (!seed) return { seed: null, items: [] };
        return { seed: seed, items: similar(DATA, seed, limit || 8) };
    }

    function forYou(DATA, limit) {
        if (!DATA) return [];
        var seen = {};
        historyIds().concat(watchlist()).forEach(function (id) { seen[id] = true; });
        var weights = genreWeights(DATA);
        var ranked = DATA.list.slice().sort(function (a, b) {
            return scoreAnime(b, weights, seen) - scoreAnime(a, weights, seen);
        });
        var fresh = ranked.filter(function (a) { return !seen[a.id]; });
        return (fresh.length ? fresh : ranked).slice(0, limit || 10);
    }

    function todayPick(DATA) {
        if (!DATA || !DATA.list.length) return null;
        var day = new Date().toISOString().slice(0, 10);
        var n = 0;
        for (var i = 0; i < day.length; i++) n += day.charCodeAt(i);
        return DATA.list[n % DATA.list.length];
    }

    function lucky(DATA) {
        if (!DATA || !DATA.list.length) return null;
        return DATA.list[Math.floor(Math.random() * DATA.list.length)];
    }

    function suggest(DATA, query, limit) {
        if (!DATA) return [];
        var q = DATA.normalize(query);
        if (!q) return DATA.list.slice(0, limit || 8);
        return DATA.search(query).slice(0, limit || 8);
    }

    window.NEON_REC = {
        similar: similar,
        becauseYouWatched: becauseYouWatched,
        forYou: forYou,
        todayPick: todayPick,
        lucky: lucky,
        suggest: suggest,
        historyIds: historyIds,
        watchlist: watchlist
    };
})();
