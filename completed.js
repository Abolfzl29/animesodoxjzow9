/* ==========================================================================
 * completed.html — «تکمیل‌شده‌ها»
 *
 * A title counts as completed when every episode that actually exists in
 * data/anime.js has been watched to at least 95%. Seasons that are announced
 * but have no episode data are never claimed to be finished — the copy always
 * says "تمام قسمت‌های موجود".
 *
 * The management action is «بازنشانی پیشرفت»: it deletes the stored progress
 * of that title (after confirmation) so the title really leaves this page.
 * ========================================================================== */
(function () {
    'use strict';

    var L = window.NeonLibrary;

    L.initPage({
        page: 'completed',
        unit: 'عنوان تکمیل‌شده',
        defaultSort: 'recent',
        sorts: ['recent', 'oldest', 'title', 'rating', 'year'],
        load: function () { return L.buildCompletedItems(); },
        keyOf: function (item) { return item.key; },
        labelOf: function (item) { return item.title; },
        card: function (item) { return L.specs.completed(item); },

        manage: {
            actionLabel: 'بازنشانی پیشرفت',
            confirmTitle: 'بازنشانی پیشرفت این عنوان؟',
            confirmMessage: function (count) {
                return count === 1
                    ? 'پیشرفت تمام قسمت‌های موجود این عنوان پاک می‌شود و از «تکمیل‌شده‌ها» خارج خواهد شد. رکوردهای «تاریخچه تماشا» باقی می‌مانند.'
                    : 'پیشرفت تمام قسمت‌های موجود این ' + L.toFa(count) + ' عنوان پاک می‌شود و از «تکمیل‌شده‌ها» خارج خواهند شد. رکوردهای «تاریخچه تماشا» باقی می‌مانند.';
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
                    message: removed
                        ? 'پیشرفت ' + L.toFa(items.length) + ' عنوان بازنشانی شد (' + L.toFa(removed) + ' رکورد پاک شد).'
                        : 'پیشرفتی برای این عنوان ثبت نشده بود؛ عنوان از تکمیل‌شده‌ها خارج شد.'
                };
            }
        }
    });
})();
