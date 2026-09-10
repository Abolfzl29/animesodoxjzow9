/* ==========================================================================
 * favorites.html — «علاقه‌مندی‌های من»
 * Data source: neon_watchlist (the "My list" feature, NOT the neon_like_* keys)
 * Deleting here only removes the id from neon_watchlist.
 * ========================================================================== */
(function () {
    'use strict';

    var L = window.NeonLibrary;

    L.initPage({
        page: 'favorites',
        unit: 'عنوان',
        defaultSort: 'recent',
        sorts: ['recent', 'oldest', 'title', 'rating', 'year'],
        load: function () { return L.buildFavoriteItems(); },
        keyOf: function (item) { return item.key; },
        labelOf: function (item) { return item.title; },
        card: function (item) { return L.specs.favorite(item); },

        manage: {
            actionLabel: 'حذف از علاقه‌مندی‌ها',
            confirmTitle: 'حذف از علاقه‌مندی‌ها؟',
            confirmMessage: function (count) {
                return count === 1
                    ? 'این عنوان فقط از «لیست من» (neon_watchlist) حذف می‌شود. پیشرفت تماشا و تاریخچه‌ی شما دست‌نخورده می‌ماند.'
                    : L.toFa(count) + ' عنوان فقط از «لیست من» (neon_watchlist) حذف می‌شوند. پیشرفت تماشا و تاریخچه‌ی شما دست‌نخورده می‌ماند.';
            },
            perform: function (items) {
                var ids = items.map(function (i) { return i.animeId; });
                var next = L.readWatchlist().filter(function (id) { return ids.indexOf(id) === -1; });
                if (!L.writeWatchlist(next)) {
                    return { ok: false, message: 'تغییرات ذخیره نشد؛ حافظه‌ی مرورگر در دسترس نیست.' };
                }
                return { ok: true, message: L.toFa(ids.length) + ' عنوان از علاقه‌مندی‌ها حذف شد.' };
            }
        }
    });
})();
