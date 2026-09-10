/* ==========================================================================
 * history.html — «تاریخچه تماشا»
 * Full episode history (neon_watch_history), not just neon_last_watched.
 * Deleting here removes the history record only — progress is never touched.
 * ========================================================================== */
(function () {
    'use strict';

    var L = window.NeonLibrary;

    L.initPage({
        page: 'history',
        unit: 'رکورد',
        defaultSort: 'recent',
        sorts: ['recent', 'oldest', 'title', 'rating', 'year', 'progress-desc', 'progress-asc'],
        load: function () { return L.buildHistoryItems(); },
        keyOf: function (item) { return item.key; },
        labelOf: function (item) { return item.title + ' — قسمت ' + L.toFa(item.episodeNumber); },
        card: function (item) { return L.specs.history(item); },

        manage: {
            actionLabel: 'حذف از تاریخچه',
            confirmTitle: 'حذف از تاریخچه تماشا؟',
            confirmMessage: function (count) {
                return count === 1
                    ? 'فقط این رکورد از «تاریخچه تماشا» حذف می‌شود. پیشرفت قسمت دست‌نخورده می‌ماند و می‌توانید تماشا را ادامه دهید.'
                    : 'این ' + L.toFa(count) + ' رکورد از «تاریخچه تماشا» حذف می‌شوند. پیشرفت قسمت‌ها دست‌نخورده می‌ماند و می‌توانید تماشا را ادامه دهید.';
            },
            perform: function (items) {
                var pairs = items.map(function (i) { return { anime: i.animeId, ep: i.episodeNumber }; });
                if (!L.removeHistoryRecords(pairs)) {
                    return { ok: false, message: 'تغییرات ذخیره نشد؛ حافظه‌ی مرورگر در دسترس نیست.' };
                }
                return {
                    ok: true,
                    message: L.toFa(pairs.length) + ' رکورد از تاریخچه حذف شد (پیشرفت پاک نشد).'
                };
            }
        }
    });
})();
