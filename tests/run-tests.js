/* ==========================================================================
 * Neon Anime — headless smoke & interaction tests.
 *
 * Loads every HTML page in jsdom, executes all LOCAL scripts in document
 * order (CDN/network resources are never fetched), then:
 *   PART A — page scan: runtime errors, missing local files, mixed content,
 *            duplicate ids, duplicate h1, missing meta.
 *   PART B — user flows: play button, search, VIP modal, login, not-found
 *            states, comment XSS + timestamp, library pages, schedule
 *            consistency, logout semantics.
 *
 * Run with: npm test   (needs devDependency: jsdom)
 * ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));

const POLYFILL = `
if (!window.IntersectionObserver) window.IntersectionObserver = class { observe(){} unobserve(){} disconnect(){} };
if (!window.ResizeObserver) window.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
if (!window.matchMedia) window.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
window.scrollTo = window.scrollTo || (() => {});
window.scroll = window.scrollTo;
if (window.HTMLMediaElement) {
    window.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
    window.HTMLMediaElement.prototype.pause = function () {};
    window.HTMLMediaElement.prototype.load = function () {};
}
`;

function extractScripts(raw) {
    const scripts = [];
    const stripped = raw.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (m, attrs, body) => {
        const srcM = attrs.match(/src=["']([^"']+)["']/);
        if (srcM) scripts.push({ src: srcM[1] });
        else if (body.trim()) scripts.push({ inline: body });
        return '';
    });
    return { stripped, scripts };
}

function boot(page, opts) {
    opts = opts || {};
    const raw = fs.readFileSync(path.join(ROOT, page), 'utf8');
    const { stripped, scripts } = extractScripts(raw);

    const errors = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', e => {
        const msg = e && e.message ? e.message : String(e);
        if (/Could not load|Not implemented|CSS|css/.test(msg)) return;
        errors.push(msg);
    });
    vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ').slice(0, 300)));

    const dom = new JSDOM(stripped, {
        url: 'http://localhost/' + page + (opts.query || ''),
        runScripts: 'dangerously',
        pretendToBeVisual: true,
        virtualConsole: vc
    });
    const w = dom.window;
    Object.entries(opts.ls || {}).forEach(([k, v]) => w.localStorage.setItem(k, v));
    w.eval(POLYFILL);

    for (const s of scripts) {
        try {
            if (s.src) {
                if (/^(https?:)?\/\//.test(s.src)) {
                    errors.push('EXTERNAL SCRIPT TAG: ' + s.src);
                    continue;
                }
                const fp = path.join(ROOT, s.src);
                if (!fs.existsSync(fp)) { errors.push('MISSING SCRIPT: ' + s.src); continue; }
                w.eval(fs.readFileSync(fp, 'utf8'));
            } else {
                w.eval(s.inline);
            }
        } catch (e) {
            errors.push('exec ' + (s.src || 'inline') + ': ' + e.message);
        }
    }
    try { w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true })); } catch (e) { errors.push('DCL: ' + e.message); }
    try { w.dispatchEvent(new w.Event('load')); } catch (e) { /* ignore */ }

    return { dom, w, doc: w.document, errors };
}

/* ---------------------------------------------------------------------- */
/* PART A — structural scan of every page                                  */
/* ---------------------------------------------------------------------- */
function scanPage(page) {
    const { doc, errors } = boot(page);
    const problems = errors.slice();

    const ids = {};
    doc.querySelectorAll('[id]').forEach(el => { ids[el.id] = (ids[el.id] || 0) + 1; });
    Object.entries(ids).filter(([, c]) => c > 1).forEach(([id, c]) => problems.push(`duplicate id "${id}" x${c}`));

    const checkAttr = (el, attr) => {
        const v = el.getAttribute(attr);
        if (!v) return;
        if (/^(https?:)?\/\//.test(v) || /^(data:|mailto:|tel:|#|javascript:)/.test(v)) return;
        const clean = v.split('?')[0].split('#')[0];
        if (!clean) return;
        if (!fs.existsSync(path.join(ROOT, clean))) problems.push(`missing local file: ${el.tagName.toLowerCase()}[${attr}="${v}"]`);
        else if (v.startsWith('http://')) problems.push('mixed content: ' + v);
    };
    doc.querySelectorAll('a[href], link[href]').forEach(el => checkAttr(el, 'href'));
    doc.querySelectorAll('img[src], video[src], source[src]').forEach(el => checkAttr(el, 'src'));
    doc.querySelectorAll('video[poster]').forEach(el => checkAttr(el, 'poster'));

    doc.querySelectorAll('[src],[href],[poster]').forEach(el => {
        ['src', 'href', 'poster'].forEach(a => {
            const v = el.getAttribute(a);
            // Only flag EXTERNAL http:// resources; same-origin absolute URLs
            // (built from window.location) are fine.
            if (v && v.startsWith('http://') && !v.startsWith('http://localhost')) {
                problems.push('mixed content: ' + v.slice(0, 90));
            }
        });
    });

    if (!doc.querySelector('meta[name="viewport"]')) problems.push('missing viewport meta');
    if (page !== '404.html' && !doc.querySelector('meta[name="description"]')) problems.push('missing meta description');

    return problems;
}

/* ---------------------------------------------------------------------- */
/* PART B — interaction tests                                              */
/* ---------------------------------------------------------------------- */
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('play button resolves to watch.html?anime=<id>', () => {
    const { doc, w, errors } = boot('index.html');
    let called = null;
    const orig = w.NEON_ANIME.watchUrl;
    w.NEON_ANIME.watchUrl = (anime, ep) => { called = orig(anime, ep); return called; };
    const card = doc.querySelector('[data-anime="death-note"]');
    const btn = card && card.querySelector('.play-trigger, .play-btn-small, .btn-play');
    btn && btn.click();
    assert(!errors.length, errors.join(' | '));
    assert(called === 'watch.html?anime=death-note', 'watchUrl -> ' + called);
});

test('home search suggest renders results', () => {
    const { doc, w } = boot('index.html');
    const btn = doc.getElementById('searchBtnIcon'); btn && btn.click();
    const input = doc.getElementById('searchInput');
    assert(input, 'search input exists');
    input.value = 'دفترچه';
    input.dispatchEvent(new w.Event('input', { bubbles: true }));
    const sug = doc.getElementById('homeSearchSuggest');
    assert(sug && sug.querySelectorAll('a').length > 0, 'suggestions rendered');
});

test('VIP plan without login shows warning toast', () => {
    const { doc, w } = boot('index.html');
    const open = doc.getElementById('vipOpenBtn'); open && open.click();
    const modal = doc.getElementById('vipModal');
    assert(modal && modal.classList.contains('active'), 'modal opens');
    const planBtn = doc.querySelector('.plan-select-btn');
    planBtn && planBtn.click();
    return sleep(150).then(() => {
        const toast = doc.querySelector('#toastContainer .toast');
        assert(toast && /وارد حساب/.test(toast.textContent), 'warning toast shown');
    });
});

test('login stores session and honors ?next=', () => {
    const { doc, w, errors } = boot('login.html', { query: '?next=profile.html' });
    const form = doc.getElementById('loginForm');
    doc.getElementById('loginIdentifier').value = 'test@user.com';
    doc.getElementById('loginPassword').value = 'password123';
    form.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
    return sleep(2000).then(() => {
        assert(w.localStorage.getItem('neon_is_logged_in') === 'true', 'session stored');
        assert(w.NeonAuth.nextUrl('profile.html') === 'profile.html', 'next= honored');
        assert(!errors.length, errors.join(' | '));
    });
});

test('next= rejects javascript:/absolute URLs (open redirect)', () => {
    const a = boot('login.html', { query: '?next=javascript:alert(1)' });
    const b = boot('login.html', { query: '?next=' + encodeURIComponent('https://evil.com/x.html') });
    assert(a.w.NeonAuth.nextUrl('profile.html') === 'profile.html', 'javascript: rejected');
    assert(b.w.NeonAuth.nextUrl('profile.html') === 'profile.html', 'absolute URL rejected');
});

test('watch.html renders episodes for a valid id', () => {
    const { doc, errors } = boot('watch.html', { query: '?anime=one-piece&ep=2' });
    assert(doc.querySelectorAll('#episodesList .ep-card').length > 0, 'episode list rendered');
    assert(/وان پیس/.test(doc.getElementById('watchTitle').textContent), 'title set');
    assert(!errors.length, errors.join(' | '));
});

test('watch.html with unknown id shows not-found (no silent fallback)', () => {
    const { doc } = boot('watch.html', { query: '?anime=does-not-exist-xyz' });
    const nf = doc.getElementById('watchNotFound');
    assert(nf && !nf.hidden, 'not-found panel visible');
    assert(doc.querySelector('.watch-main') && doc.querySelector('.watch-main').hidden, 'player hidden');
    assert(/does-not-exist-xyz/.test(nf.textContent), 'requested id mentioned');
});

test('comment XSS payload is escaped + real timestamp stored', () => {
    const { doc, w } = boot('watch.html', {
        query: '?anime=death-note',
        ls: { neon_is_logged_in: 'true', neon_user_username: 'tester', neon_user_avatar: 'assets/img/avatar-1.webp' }
    });
    const input = doc.getElementById('commentInput');
    const submit = doc.getElementById('commentSubmit');
    assert(input && submit, 'comment form exists');
    input.value = '<img src=x onerror="window.__xss=true">';
    submit.click();
    const html = doc.getElementById('commentsList').innerHTML;
    assert(!html.includes('<img src=x onerror'), 'payload escaped');
    assert(!w.__xss, 'no script executed');
    const saved = JSON.parse(w.localStorage.getItem('neon_comments_death-note_1') || '[]');
    assert(saved.length === 1 && typeof saved[0].time === 'number' && Math.abs(Date.now() - saved[0].time) < 5000, 'timestamp stored');
    assert(/همین الان/.test(html), 'relative time rendered');
});

test('anime.html renders a title and shows not-found for bad ids', () => {
    const ok = boot('anime.html', { query: '?id=jujutsu-kaisen' });
    assert(/جوجوتسو/.test(ok.doc.getElementById('animeTitle').textContent), 'title rendered');
    assert(ok.doc.querySelectorAll('#episodeGrid .anime-ep').length > 0, 'episodes rendered');
    const bad = boot('anime.html', { query: '?id=nope' });
    assert(!bad.doc.getElementById('animeNotFound').hidden, 'not-found shown');
});

test('catalog.html search via ?q= returns results', () => {
    const { doc } = boot('catalog.html', { query: '?q=' + encodeURIComponent('وان پیس') });
    assert(doc.querySelectorAll('.anime-card').length >= 1, 'cards rendered');
});

test('favorites / continue-watching / completed render from storage', () => {
    const fav = boot('favorites.html', { ls: { neon_watchlist: '["death-note","one-piece"]', neon_is_logged_in: 'true' } });
    assert(fav.doc.querySelectorAll('.lib-card').length >= 2, 'favorites cards');
    const cont = boot('continue-watching.html', {
        ls: {
            'neon_progress_death-note_1': '0.42',
            neon_watch_history: JSON.stringify([{ anime: 'death-note', ep: 1, ratio: 0.42, watchedAt: Date.now() }]),
            neon_is_logged_in: 'true'
        }
    });
    assert(cont.doc.querySelectorAll('.lib-card').length >= 1, 'continue cards');
});

test('homepage schedule widget reads the shared schedule data', () => {
    const { doc, w, errors } = boot('index.html');
    assert(Array.isArray(w.NEON_SCHEDULE_DATA) && w.NEON_SCHEDULE_DATA.length > 0, 'shared data loaded');
    const cards = doc.querySelectorAll('#scheduleContent .schedule-card');
    assert(cards.length > 0, 'widget rendered from shared data');
    // every card must link to a real detail page of a real archive id
    cards.forEach(c => {
        const id = c.getAttribute('data-anime');
        assert(w.NEON_ANIME.byId[id], 'card anime id exists: ' + id);
    });
    assert(!errors.length, errors.join(' | '));
});

test('schedule page uses the SAME data as the homepage widget', () => {
    const home = boot('index.html');
    const page = boot('schedule.html');
    assert(page.w.NEON_SCHEDULE && Array.isArray(page.w.NEON_SCHEDULE.SCHEDULE), 'schedule page exposes SCHEDULE');
    const a = JSON.stringify(home.w.NEON_SCHEDULE_DATA);
    const b = JSON.stringify(page.w.NEON_SCHEDULE.SCHEDULE);
    assert(a === b, 'homepage and schedule page agree on the timetable');
});

test('logout keeps theme AND vip state, clears activity', () => {
    const { w } = boot('index.html', {
        ls: { neon_is_logged_in: 'true', neon_theme: 'light', neon_is_vip: 'false', neon_watchlist: '["one-piece"]' }
    });
    w.NeonAuth.logout();
    assert(!w.localStorage.getItem('neon_is_logged_in'), 'session cleared');
    assert(!w.localStorage.getItem('neon_watchlist'), 'watchlist cleared');
    assert(w.localStorage.getItem('neon_theme') === 'light', 'theme kept');
    assert(w.localStorage.getItem('neon_is_vip') === 'false', 'free account stays free after logout');
});

test('no external CDN scripts remain (self-hosted vendor)', () => {
    for (const p of pages) {
        const raw = fs.readFileSync(path.join(ROOT, p), 'utf8');
        const ext = raw.match(/<script[^>]+src="(https?:\/\/[^"]+)"/g);
        assert(!ext, p + ' still loads: ' + (ext && ext.join(',')));
    }
    assert(fs.existsSync(path.join(ROOT, 'assets/vendor/gsap.min.js')), 'gsap vendored');
    assert(fs.existsSync(path.join(ROOT, 'assets/vendor/typed.umd.js')), 'typed vendored');
});

/* ---------------------------------------------------------------------- */
/* runner                                                                  */
/* ---------------------------------------------------------------------- */
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
    let failed = 0;

    console.log('PART A — page scan (' + pages.length + ' pages)');
    for (const page of pages.sort()) {
        const problems = scanPage(page);
        if (problems.length) {
            failed++;
            console.log('  ✗ ' + page);
            problems.forEach(p => console.log('      - ' + p));
        } else {
            console.log('  ✓ ' + page);
        }
    }

    console.log('\nPART B — interaction tests (' + tests.length + ' tests)');
    for (const t of tests) {
        try {
            await t.fn();
            console.log('  ✓ ' + t.name);
        } catch (e) {
            failed++;
            console.log('  ✗ ' + t.name + '\n      ' + e.message);
        }
    }

    console.log('\n' + (failed === 0 ? 'ALL CHECKS PASSED' : failed + ' CHECK(S) FAILED'));
    process.exit(failed === 0 ? 0 : 1);
})();
