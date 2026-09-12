/* Register the service worker (PWA / offline). Safe no-op when unsupported. */
(function () {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function () { /* non-fatal */ });
    });
})();
