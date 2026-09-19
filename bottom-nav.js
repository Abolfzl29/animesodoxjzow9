/* ==========================================================================
 * Neon Anime — shared mobile bottom navigation
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
 * the highlighted tab is derived from the page you are on.
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

    function render(doc) {
        doc = doc || global.document;
        var nav = doc.querySelector('.mobile-bottom-nav');
        if (!nav) return null;

        var active = activeKey(nav);
        nav.innerHTML = '';

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
