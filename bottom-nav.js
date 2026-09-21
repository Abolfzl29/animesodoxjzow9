/* ==========================================================================
 * Neon Anime — shared mobile bottom navigation (v2 «Neon Bar»)
 *
 * ONE definition of the mobile tab bar. Every page keeps an empty
 * <nav class="mobile-bottom-nav"> placeholder and this file renders the same
 * five tabs into it, in the same order, with the same icons:
 *
 *     خانه | آرشیو | جستجو | ویژه | پروفایل
 *
 * Why it exists: the bar used to be hand-copied into every HTML file, and the
 * copies drifted (home had 5 tabs, the archive only 4 — the «ویژه» tab was
 * missing there, some pages used SVG icons and others text glyphs, and the
 * highlighted tab was hard-coded per file). Now the markup lives here once and
 * the highlighted tab is derived from the page you are on. This file is the
 * ONLY source — never hand-write `.bottom-nav-item` markup in a page.
 *
 * Active tab:
 *   - a page can pin one with <nav class="mobile-bottom-nav" data-active="catalog">
 *   - otherwise it comes from the file name (index → خانه, catalog → آرشیو,
 *     profile → پروفایل). Pages that are not one of the five destinations
 *     highlight nothing — never two.
 *
 * جستجو opens the search UI the current page already has (#searchBtnIcon modal,
 * or the archive search field) and otherwise sends you to catalog.html#search.
 * ویژه opens the VIP modal when the page has one, and otherwise sends you to
 * the subscription page.
 *
 * v2 upgrades (rendered by the same render() — the contract is unchanged):
 *   - a sliding «pill» indicator that glides behind the active tab (RTL-safe),
 *   - ripple + haptic tick on tap, springy icon pop for the active tab,
 *   - scroll-aware auto-hide (scroll down hides, scroll up reveals),
 *   - bfcache (`pageshow`) re-render so a restored page always shows the
 *     correct bar — this is what used to let a stale bar «lose a tab».
 *   All motion is disabled under prefers-reduced-motion (see style.css).
 * ========================================================================== */
(function (global) {
    'use strict';

    var ICON_ATTRS = 'viewBox="0 0 24 24" width="24" height="24" fill="none" ' +
        'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

    var ICONS = {
        home: '<svg ' + ICON_ATTRS + '><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
        catalog: '<svg ' + ICON_ATTRS + '><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg>',
        search: '<svg ' + ICON_ATTRS + '><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
        vip: '<svg ' + ICON_ATTRS + '><path d="M2 22h20"></path><path d="M4 22l-1-14 5 4 4-8 4 8 5-4-1 14"></path></svg>',
        profile: '<svg ' + ICON_ATTRS + '><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'
    };

    /* Tab order is part of the contract: tests compare it on every page. */
    var TABS = [
        { key: 'home', label: 'خانه', href: 'index.html', icon: ICONS.home },
        { key: 'catalog', label: 'آرشیو', href: 'catalog.html', icon: ICONS.catalog },
        { key: 'search', label: 'جستجو', id: 'bottomNavSearch', icon: ICONS.search },
        { key: 'vip', label: 'ویژه', id: 'bottomNavVIP', className: 'vip-item', icon: ICONS.vip },
        { key: 'profile', label: 'پروفایل', href: 'profile.html', icon: ICONS.profile }
    ];

    /* Tab a page is on when it does not pin one itself. */
    var PAGE_TAB = {
        'index.html': 'home',
        'catalog.html': 'catalog',
        'profile.html': 'profile'
    };

    var KEYS = TABS.map(function (t) { return t.key; });

    function currentFile() {
        var path = (global.location && global.location.pathname) || '';
        return (path.split('/').pop() || '').toLowerCase();
    }

    function isKey(key) { return KEYS.indexOf(key) !== -1; }

    /* The single tab to highlight — null when the page is not a destination. */
    function activeKey(nav) {
        var pinned = nav ? nav.getAttribute('data-active') : null;
        if (pinned) return isKey(pinned) ? pinned : null;
        return PAGE_TAB[currentFile()] || null;
    }

    /* Where the search tab leads on this page. */
    function searchTarget(doc) {
        if (doc.getElementById('searchBtnIcon')) return 'modal';
        if (doc.getElementById('catalogSearchTrigger')) return 'catalog';
        return 'archive';
    }

    function openSearch(doc) {
        var target = searchTarget(doc);
        if (target === 'modal') {
            doc.getElementById('searchBtnIcon').click();
        } else if (target === 'catalog') {
            doc.getElementById('catalogSearchTrigger').click();
        } else {
            global.location.assign('catalog.html#search');
        }
        return target;
    }

    /* Where the ویژه tab leads on this page. */
    function vipTarget(doc) {
        return doc.getElementById('vipOpenBtn') ? 'modal' : 'page';
    }

    function openVip(doc) {
        var target = vipTarget(doc);
        if (target === 'modal') doc.getElementById('vipOpenBtn').click();
        else global.location.assign('subscribe.html');
        return target;
    }

    /* ---- v2: the sliding pill -------------------------------------------- */

    /* rAF may be missing in very plain embedders — degrade to a timeout. */
    function nextFrame(fn) {
        if (typeof global.requestAnimationFrame === 'function') {
            global.requestAnimationFrame(fn);
        } else {
            global.setTimeout(fn, 32);
        }
    }

    function reducedMotion() {
        try {
            return global.matchMedia &&
                global.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (e) { return false; }
    }

    /* Position the pill behind the active tab. Measured geometry (offsetLeft)
       is direction-agnostic, so this is safe under RTL. */
    function placePill(nav) {
        var pill = nav.querySelector('.bottom-nav-pill');
        if (!pill) return;
        var active = nav.querySelector('.bottom-nav-item.active');
        if (!active) { pill.style.opacity = '0'; return; }
        var w = active.offsetWidth, left = active.offsetLeft;
        if (!w) { pill.style.opacity = '0'; return; } // hidden/layout not ready
        pill.style.opacity = '1';
        pill.style.width = w + 'px';
        pill.style.transform = 'translateX(' + left + 'px)';
    }

    function makePill(doc) {
        var pill = doc.createElement('span');
        pill.className = 'bottom-nav-pill';
        pill.setAttribute('aria-hidden', 'true');
        return pill;
    }

    /* Ripple + haptic tick on tap. Kept inert in tests/jsdom (no rAF/measure). */
    function attachFeedback(nav) {
        nav.addEventListener('pointerdown', function (ev) {
            var item = ev.target && ev.target.closest
                ? ev.target.closest('.bottom-nav-item') : null;
            if (!item || reducedMotion()) return;
            try { if (typeof navigator.vibrate === 'function') navigator.vibrate(8); } catch (e) {}
            var rect = item.getBoundingClientRect();
            var r = doc_ripple(nav, ev.clientX - rect.left, ev.clientY - rect.top);
            item.appendChild(r);
        }, { passive: true });

        function doc_ripple(nav, x, y) {
            var doc = nav.ownerDocument || global.document;
            var span = doc.createElement('span');
            span.className = 'bottom-nav-ripple';
            span.setAttribute('aria-hidden', 'true');
            span.style.left = x + 'px';
            span.style.top = y + 'px';
            global.setTimeout(function () { span.remove(); }, 650);
            return span;
        }
    }

    /* Scroll-aware auto-hide: down hides, up reveals. Only on real pages. */
    function attachScrollBehavior(nav) {
        var lastY = 0, ticking = false;
        function onScroll() {
            if (ticking) return;
            ticking = true;
            nextFrame(function () {
                ticking = false;
                var y = global.pageYOffset || 0;
                var doc = nav.ownerDocument || global.document;
                if (doc.body && doc.body.scrollHeight <= global.innerHeight + 40) {
                    nav.classList.remove('nav-hidden'); // short page: always show
                    return;
                }
                if (y > lastY + 6 && y > 120) nav.classList.add('nav-hidden');
                else if (y < lastY - 4) nav.classList.remove('nav-hidden');
                lastY = y;
            });
        }
        global.addEventListener('scroll', onScroll, { passive: true });
    }

    function render(doc) {
        doc = doc || global.document;
        var nav = doc.querySelector('.mobile-bottom-nav');
        if (!nav) return null;

        var active = activeKey(nav);
        nav.innerHTML = '';
        nav.appendChild(makePill(doc));

        TABS.forEach(function (tab) {
            var el;
            if (tab.href) {
                el = doc.createElement('a');
                el.href = tab.href;
            } else {
                el = doc.createElement('button');
                el.type = 'button';
                el.id = tab.id;
            }
            el.className = 'bottom-nav-item' + (tab.className ? ' ' + tab.className : '');
            el.innerHTML = tab.icon;

            var label = doc.createElement('span');
            label.textContent = tab.label;
            el.appendChild(label);

            if (tab.key === active) {
                el.classList.add('active');
                el.setAttribute('aria-current', 'page');
            }

            if (!tab.href) {
                el.addEventListener('click', function () {
                    if (tab.key === 'search') openSearch(doc);
                    else openVip(doc);
                });
            }
            nav.appendChild(el);
        });

        if (!nav.dataset.neonV2) {
            nav.dataset.neonV2 = '1';
            attachFeedback(nav);
            attachScrollBehavior(nav);
            /* Keep the pill glued to the active tab through resize + webfont
               swap (font metrics change tab widths). */
            global.addEventListener('resize', function () {
                nextFrame(function () { placePill(nav); });
            }, { passive: true });
            if (global.document && global.document.fonts && global.document.fonts.ready) {
                global.document.fonts.ready.then(function () { placePill(nav); }).catch(function () {});
            }
            /* bfcache restore (back button): re-render so the bar can never
               come back stale — the original «one tab missing» report. */
            global.addEventListener('pageshow', function (ev) {
                if (ev && ev.persisted) {
                    render(doc);
                } else {
                    placePill(nav);
                }
            });
        }
        /* Initial pill placement — after layout. jsdom has no layout, so the
           width-0 guard in placePill keeps this a safe no-op there. */
        nextFrame(function () { placePill(nav); });

        return nav;
    }

    function init() {
        if (global.document.readyState === 'loading') {
            global.document.addEventListener('DOMContentLoaded', function () { render(); });
        } else {
            render();
        }
    }

    global.NeonBottomNav = {
        TABS: TABS,
        render: render,
        activeKey: activeKey,
        searchTarget: searchTarget,
        openSearch: openSearch,
        vipTarget: vipTarget,
        openVip: openVip
    };

    if (global.document) init();
})(typeof window !== 'undefined' ? window : this);
