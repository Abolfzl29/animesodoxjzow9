/* ==========================================================================
 * Neon Anime — service worker registration + self-healing update flow
 *
 * Registers the SW as a PWA (safe no-op when unsupported) and — the important
 * part — makes sure a returning visitor can NEVER stay stuck on a stale
 * cached app shell (the «old 4-tab bar on آرشیو» class of bug):
 *
 *   1. updateViaCache:'none' → the browser always checks sw.js itself over
 *      the network, instead of trusting up to 24h of HTTP cache.
 *   2. update checks on load, on every tab-visible, and every 30 minutes.
 *   3. when a new SW takes over (controllerchange), the page reloads ONCE so
 *      the fresh HTML/CSS/JS is actually rendered — with a toast first.
 *   4. offline/online toasts so «offline» is never mistaken for «broken».
 * ========================================================================== */
(function () {
    'use strict';
    if (!('serviceWorker' in navigator)) return;

    var reloaded = false;
    /* The very first controller is the first install — no reload needed then. */
    var hadController = !!navigator.serviceWorker.controller;

    function toast(message, icon) {
        try {
            var doc = document;
            var container = doc.getElementById('toastContainer');
            if (!container) {
                container = doc.createElement('div');
                container.id = 'toastContainer';
                container.setAttribute('aria-live', 'polite');
                doc.body.appendChild(container);
            }
            var t = doc.createElement('div');
            t.className = 'toast';
            t.innerHTML = '<span>' + (icon || '✔️') + '</span> ' + message;
            container.appendChild(t);
            setTimeout(function () { t.classList.add('show'); }, 10);
            setTimeout(function () {
                t.classList.remove('show');
                setTimeout(function () { t.remove(); }, 400);
            }, 3600);
        } catch (e) { /* toasts are decorative — never fatal */ }
    }

    function applyUpdate() {
        /* A new SW has taken control: swap in the fresh app shell once. */
        if (reloaded) return;
        reloaded = true;
        try { toast('نسخه جدید نئون انیمه فعال شد — در حال بازخوانی…', '✨'); } catch (e) {}
        setTimeout(function () { window.location.reload(); }, 900);
    }

    function register() {
        navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
            .then(function (reg) {
                /* Periodic + visibility-triggered update checks. */
                setInterval(function () { reg.update().catch(function () {}); }, 30 * 60 * 1000);
                document.addEventListener('visibilitychange', function () {
                    if (document.visibilityState === 'visible') {
                        reg.update().catch(function () {});
                    }
                });
            })
            .catch(function () { /* offline / private mode — non-fatal */ });
    }

    navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (hadController) applyUpdate();
        hadController = true;
    });

    /* Some browsers fire an updatefound whose installing worker activates
       without a controllerchange (claim path) — cover that too. */
    navigator.serviceWorker.ready.then(function (reg) {
        if (reg.waiting && navigator.serviceWorker.controller &&
            reg.waiting !== navigator.serviceWorker.controller) {
            /* An updated SW is waiting: skipWaiting inside sw.js handles it,
               but nudge it in case it was queued before this hardening. */
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
    }).catch(function () {});

    window.addEventListener('offline', function () {
        toast('اتصال اینترنت قطع شد — حالت آفلاین فعال است', '📴');
    });
    window.addEventListener('online', function () {
        toast('اتصال برقرار شد — همگام‌سازی با نسخه جدید…', '🌐');
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', register);
    } else {
        register();
    }
})();
