/* ==========================================================================
 * continue-watching.html — «ادامه تماشا»
 *
 * Selection rule (exactly one card per title):
 *   - the most recently watched unfinished episode (1% <= ratio < 95%), or
 *   - the next episode after the last finished one,
 *   - titles whose available episodes are all finished move to completed.html
 *
 * Deleting here clears the stored progress of the selected title(s) and fixes
 * neon_last_watched when it points at them.
 * ========================================================================== */
(function () {
    'use strict';

    var L = window.NeonLibrary;

    L.initPage({
        page: 'continue',
        unit: 'عنوان در حال تماشا',
        defaultSort: 'recent',
        sorts: ['recent', 'oldest', 'title', 'rating', 'year', 'progress-desc', 'progress-asc'],
        load: function () { return L.buildContinueItems(); },
        keyOf: function (item) { return item.key; },
        labelOf: function (item) { return item.title; },
        card: function (item) { return L.specs.continueWatching(item); },

        manage: {
            actionLabel: 'پاک‌کردن پیشرفت این عنوان',
            confirmTitle: 'حذف از ادامه تماشا؟',
            confirmMessage: function (count) {
                return count === 1
                    ? 'پیشرفت تمام قسمت‌های این عنوان پاک می‌شود و از «ادامه تماشا» حذف خواهد شد. رکوردهای «تاریخچه تماشا» دست‌نخورده می‌مانند.'
                    : 'پیشرفت تمام قسمت‌های این ' + L.toFa(count) + ' عنوان پاک می‌شود و از «ادامه تماشا» حذف خواهند شد. رکوردهای «تاریخچه تماشا» دست‌نخورده می‌مانند.';
            },
            perform: function (items) {
                var removed = 0;
                items.forEach(function (item) { removed += L.clearAnimeProgress(item.animeId); });
                L.clearLastWatchedFor(items.map(function (i) { return i.animeId; }));
                if (!L.storageAvailable()) {
                    return { ok: false, message: 'تغییرات ذخیره نشد؛ حافظه‌ی مرورگر در دسترس نیست.' };
                }
                return {
                    ok: true,
                    message: L.toFa(items.length) + ' عنوان از ادامه تماشا حذف شد (' + L.toFa(removed) + ' رکورد پیشرفت پاک شد).'
                };
            }
        }
    });
})();
