/* Neon Anime PWA bootstrap. Safe to load on every page, including the APK bundle. */
(function () {
    'use strict';

    if (!('serviceWorker' in navigator) || window.location.protocol === 'file:') return;

    window.addEventListener('load', function () {
        navigator.serviceWorker.register('./sw.js', { scope: './' })
            .then(function (registration) {
                // Ask the browser to check for a fresh worker without interrupting the page.
                if (registration && typeof registration.update === 'function') registration.update();
            })
            .catch(function (error) {
                // Offline support is an enhancement; it must never break the site.
                if (window.console && console.info) console.info('Neon offline mode unavailable:', error.message);
            });
    });
})();
