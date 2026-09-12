import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8080);
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'server-data'));
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const AUTH_FILE = path.join(DATA_DIR, 'auth.json');
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 2 * 1024 * 1024;
let ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
let SESSION_SECRET = process.env.SESSION_SECRET || '';
let ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
let bootstrapToken = '';
const PUBLIC_ROOT = path.resolve(ROOT);
const sessions = new Map();
const loginAttempts = new Map();
let writeQueue = Promise.resolve();

const ALLOWED_ACTIONS = new Set(['health', 'deploy', 'cache', 'restart', 'rotate_api_key']);
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
    '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8'
};

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function safeJson(value) {
    return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

function text(value, fallback = '', max = 500) {
    const output = String(value == null ? '' : value).trim();
    return (output || fallback).slice(0, max);
}

function number(value, fallback, min, max) {
    const output = Number(value);
    return Number.isFinite(output) ? Math.min(max, Math.max(min, output)) : fallback;
}

function safeSlug(value) {
    const slug = text(value).toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, '-').replace(/^-+|-+$/g, '');
    return slug || `item-${Date.now()}`;
}

function nowIso() {
    return new Date().toISOString();
}

function loadWindowData(fileName, key) {
    try {
        const source = fsSync.readFileSync(path.join(ROOT, 'data', fileName), 'utf8');
        const sandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
        vm.runInNewContext(source, sandbox, { filename: fileName });
        return clone(sandbox.window[key]?.list || []);
    } catch (error) {
        console.error(`Unable to load ${fileName}:`, error.message);
        return [];
    }
}

const seedAnime = loadWindowData('anime.js', 'NEON_ANIME');
const seedArticles = loadWindowData('articles.js', 'NEON_MAG');
const seedGenres = (() => {
    try {
        const source = fsSync.readFileSync(path.join(ROOT, 'data', 'anime.js'), 'utf8');
        const sandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
        vm.runInNewContext(source, sandbox, { filename: 'anime.js' });
        return clone(sandbox.window.NEON_ANIME?.genres || []);
    } catch (error) { return []; }
})();

function initialState() {
    return {
        catalog: seedAnime,
        articles: seedArticles,
        users: [
            { id: 'usr-arman', name: 'آرمان نادری', email: 'arman@neon.example', role: 'user', plan: 'vip', status: 'active', lastActive: 'امروز، ۱۰:۴۳', initial: 'آ' },
            { id: 'usr-sara', name: 'سارا احمدی', email: 'sara@neon.example', role: 'editor', plan: 'vip', status: 'active', lastActive: 'امروز، ۰۹:۱۲', initial: 'س' },
            { id: 'usr-kianoosh', name: 'کیانوش اوتاکو', email: 'kianoosh@neon.example', role: 'user', plan: 'basic', status: 'active', lastActive: 'دیروز، ۲۲:۰۸', initial: 'ک' },
            { id: 'usr-admin', name: 'مدیر سایت', email: 'admin@neon.example', role: 'owner', plan: 'vip', status: 'active', lastActive: 'اکنون', initial: 'A' },
            { id: 'usr-mehrdad', name: 'مهرداد کریمی', email: 'mehrdad@neon.example', role: 'user', plan: 'basic', status: 'restricted', lastActive: '۳ روز پیش', initial: 'م' }
        ],
        moderation: [
            { id: 'report-1', user: 'مهدی رستمی', initial: 'م', anime: 'حمله به تایتان', time: '۱۲ دقیقه پیش', text: 'این قسمت پخش نمی‌شود و لینک مشکل دارد.' },
            { id: 'report-2', user: 'luna_otaku', initial: 'L', anime: 'جوجوتسو کایسن', time: '۳۸ دقیقه پیش', text: 'اسپویل قسمت جدید در کامنت نوشته شده است.' },
            { id: 'report-3', user: 'رضا ۷۷', initial: 'ر', anime: 'شیطان کش', time: '۱ ساعت پیش', text: 'این پیام حاوی محتوای نامناسب است.' },
            { id: 'report-4', user: 'saman_neo', initial: 'S', anime: 'وان پیس', time: '۲ ساعت پیش', text: 'درخواست دوبله قسمت بعدی.' }
        ],
        settings: {
            name: 'Neon Anime',
            description: 'پلتفرم تماشای آنلاین انیمه با دوبله و زیرنویس فارسی.',
            language: 'fa', timezone: 'Asia/Tehran', registration: true, comments: true, maintenance: false
        },
        audit: [
            { id: 'audit-1', action: 'catalog.episode_added', target: 'شیطان کش', actor: 'system', at: nowIso(), status: 'success' },
            { id: 'audit-2', action: 'article.updated', target: 'نقد سایبرپانک', actor: 'admin', at: nowIso(), status: 'success' }
        ]
    };
}

async function loadState() {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
        const parsed = JSON.parse(await fs.readFile(STATE_FILE, 'utf8'));
        const fresh = initialState();
        return {
            ...fresh, ...parsed,
            catalog: Array.isArray(parsed.catalog) ? parsed.catalog : fresh.catalog,
            articles: Array.isArray(parsed.articles) ? parsed.articles : fresh.articles,
            users: Array.isArray(parsed.users) ? parsed.users : fresh.users,
            moderation: Array.isArray(parsed.moderation) ? parsed.moderation : fresh.moderation,
            audit: Array.isArray(parsed.audit) ? parsed.audit : fresh.audit,
            settings: { ...fresh.settings, ...(parsed.settings || {}) }
        };
    } catch (error) {
        const fresh = initialState();
        await persistState(fresh);
        return fresh;
    }
}

async function persistState(nextState) {
    writeQueue = writeQueue.then(async () => {
        await fs.mkdir(DATA_DIR, { recursive: true });
        const temp = `${STATE_FILE}.tmp`;
        await fs.writeFile(temp, JSON.stringify(nextState, null, 2) + '\n', 'utf8');
        await fs.rename(temp, STATE_FILE);
    });
    return writeQueue;
}

async function persistAuthConfig() {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const temp = `${AUTH_FILE}.tmp`;
    await fs.writeFile(temp, JSON.stringify({
        username: ADMIN_USERNAME,
        sessionSecret: SESSION_SECRET,
        passwordHash: ADMIN_PASSWORD_HASH,
        bootstrapToken: bootstrapToken || null,
        updatedAt: nowIso()
    }, null, 2) + '\n', 'utf8');
    await fs.rename(temp, AUTH_FILE);
}

async function loadAuthConfig() {
    await fs.mkdir(DATA_DIR, { recursive: true });
    let saved = {};
    try { saved = JSON.parse(await fs.readFile(AUTH_FILE, 'utf8')); } catch (error) {}

    ADMIN_USERNAME = process.env.ADMIN_USERNAME || text(saved.username, 'admin', 80);
    SESSION_SECRET = process.env.SESSION_SECRET || text(saved.sessionSecret, '', 300);
    ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || text(saved.passwordHash, '', 300);
    bootstrapToken = text(saved.bootstrapToken, '', 300);

    if (!SESSION_SECRET) SESSION_SECRET = crypto.randomBytes(32).toString('hex');
    const localPasswordReady = process.env.NODE_ENV !== 'production' && ADMIN_PASSWORD;
    if (!ADMIN_PASSWORD_HASH && !localPasswordReady && !bootstrapToken) bootstrapToken = crypto.randomBytes(32).toString('hex');
    if (!process.env.ADMIN_PASSWORD_HASH || !process.env.SESSION_SECRET || !process.env.ADMIN_USERNAME) await persistAuthConfig();

    if (!ADMIN_PASSWORD_HASH && !localPasswordReady) {
        console.warn('Admin setup required. One-time setup token (keep private):');
        console.warn(`ADMIN_BOOTSTRAP_TOKEN=${bootstrapToken}`);
    }
}

function setupRequired() {
    return !ADMIN_PASSWORD_HASH && !(process.env.NODE_ENV !== 'production' && ADMIN_PASSWORD);
}

function safeSecretEqual(actualValue, expectedValue) {
    const actual = Buffer.from(String(actualValue || ''));
    const expected = Buffer.from(String(expectedValue || ''));
    return actual.length > 0 && actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function addAudit(state, action, target, actor = 'admin', status = 'success') {
    state.audit.unshift({ id: crypto.randomUUID(), action, target: text(target, 'workspace', 160), actor, at: nowIso(), status });
    state.audit = state.audit.slice(0, 80);
}

function parseCookies(request) {
    const header = request.headers.cookie || '';
    return Object.fromEntries(header.split(';').map(item => item.trim().split('=').map(decodeURIComponent)).filter(pair => pair.length === 2));
}

function sessionFrom(request) {
    const id = parseCookies(request).neon_admin_session;
    if (!id || !validSessionId(id)) return null;
    const session = sessions.get(id);
    if (!session || session.expiresAt < Date.now()) {
        if (id) sessions.delete(id);
        return null;
    }
    session.expiresAt = Date.now() + SESSION_TTL_MS;
    return session;
}

function createSessionId() {
    const nonce = crypto.randomBytes(32).toString('hex');
    const signature = crypto.createHmac('sha256', SESSION_SECRET).update(nonce).digest('hex');
    return `${nonce}.${signature}`;
}

function validSessionId(id) {
    const [nonce, signature] = String(id || '').split('.');
    if (!nonce || !signature || !SESSION_SECRET) return false;
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(nonce).digest('hex');
    const actual = Buffer.from(signature, 'hex');
    const wanted = Buffer.from(expected, 'hex');
    return actual.length === wanted.length && crypto.timingSafeEqual(actual, wanted);
}

function createPasswordHash(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    return `scrypt$${salt}$${hashWithSalt(password, salt)}`;
}

function hashWithSalt(password, salt) {
    return crypto.scryptSync(password, salt, 32).toString('hex');
}

function verifyPassword(password) {
    if (ADMIN_PASSWORD_HASH.startsWith('scrypt$')) {
        const [, salt, digest] = ADMIN_PASSWORD_HASH.split('$');
        if (!salt || !digest) return false;
        const actual = Buffer.from(hashWithSalt(password, salt), 'hex');
        const expected = Buffer.from(digest, 'hex');
        return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
    }
    // Plain ADMIN_PASSWORD is accepted only for local development. Use the
    // scrypt hash in production and never put either value in the repository.
    if (process.env.NODE_ENV !== 'production' && ADMIN_PASSWORD) {
        const actual = Buffer.from(password);
        const expected = Buffer.from(ADMIN_PASSWORD);
        return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
    }
    return false;
}

function authReady() {
    return Boolean((ADMIN_PASSWORD_HASH || (process.env.NODE_ENV !== 'production' && ADMIN_PASSWORD)) && SESSION_SECRET);
}

function clientIp(request) {
    return String(request.headers['x-forwarded-for'] || request.socket.remoteAddress || 'unknown').split(',')[0].trim();
}

function loginAllowed(ip) {
    const entry = loginAttempts.get(ip);
    if (!entry || entry.resetAt < Date.now()) {
        loginAttempts.set(ip, { count: 1, resetAt: Date.now() + 60_000 });
        return true;
    }
    entry.count += 1;
    return entry.count <= 10;
}

function securityHeaders(contentType) {
    return {
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'Referrer-Policy': 'same-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    };
}

function sendJson(response, status, payload, extraHeaders = {}) {
    const body = JSON.stringify(payload);
    response.writeHead(status, { ...securityHeaders('application/json; charset=utf-8'), 'Cache-Control': 'no-store', ...extraHeaders });
    response.end(body);
}

function sendText(response, status, body, contentType = 'text/plain; charset=utf-8', extraHeaders = {}) {
    response.writeHead(status, { ...securityHeaders(contentType), ...extraHeaders });
    response.end(body);
}

function fail(response, status, code, message) {
    sendJson(response, status, { ok: false, error: code, message });
}

async function readJson(request) {
    let total = 0;
    const chunks = [];
    for await (const chunk of request) {
        total += chunk.length;
        if (total > MAX_BODY_BYTES) throw Object.assign(new Error('Request body too large'), { statusCode: 413 });
        chunks.push(chunk);
    }
    if (!chunks.length) return {};
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch (error) { throw Object.assign(new Error('Invalid JSON body'), { statusCode: 400 }); }
}

function sameOrigin(request) {
    const origin = request.headers.origin;
    if (!origin) return true;
    const forwarded = request.headers['x-forwarded-proto'] || 'http';
    return origin === `${forwarded}://${request.headers.host}`;
}

function authenticate(request, response) {
    if (!authReady()) {
        fail(response, 503, 'auth_not_configured', 'احراز هویت مدیر هنوز راه‌اندازی نشده است.');
        return null;
    }
    const session = sessionFrom(request);
    if (!session) {
        fail(response, 401, 'auth_required', 'ورود مدیر لازم است.');
        return null;
    }
    if (!sameOrigin(request)) {
        fail(response, 403, 'origin_rejected', 'مبدأ درخواست مجاز نیست.');
        return null;
    }
    return session;
}

function publicUser(session) {
    return { username: session.username, role: 'owner', expiresAt: session.expiresAt };
}

function buildDashboard(state) {
    const episodes = state.catalog.reduce((sum, item) => sum + (Array.isArray(item.episodes) ? item.episodes.length : 0), 0);
    const vip = state.users.filter(user => user.plan === 'vip').length;
    return {
        ok: true,
        mode: 'live',
        stats: { titles: state.catalog.length, episodes, users: state.users.length, vip, reports: state.moderation.length },
        service: { name: 'neon-prod-01', status: 'healthy', version: 'v2.8.4', region: 'EU / Frankfurt' },
        audit: state.audit.slice(0, 10)
    };
}

function sanitizeCatalogItem(body, existing = {}) {
    const title = text(body.title, existing.title, 160);
    const titleEn = text(body.titleEn, existing.titleEn, 160);
    const id = safeSlug(text(body.id, existing.id || titleEn));
    const genres = Array.isArray(body.genres) ? body.genres.map(item => text(item, '', 40)).filter(Boolean).slice(0, 12) : (existing.genres || []);
    const next = {
        ...existing,
        id, title, titleEn,
        status: ['airing', 'finished', 'draft'].includes(body.status) ? body.status : (existing.status || 'draft'),
        rating: number(body.rating, existing.rating || 0, 0, 10),
        genres,
        genreLabel: text(body.genreLabel, existing.genreLabel || genres.join('، '), 240),
        desc: text(body.desc, existing.desc, 1200),
        poster: text(body.poster, existing.poster || 'assets/img/attack-on-titan.webp', 300),
        banner: text(body.banner, existing.banner || 'assets/img/attack-on-titan-wallpaper.webp', 300),
        episodes: Array.isArray(body.episodes) ? body.episodes.slice(0, 500) : (existing.episodes || []),
        updatedAt: nowIso()
    };
    if (!next.title || !next.titleEn) throw Object.assign(new Error('title and titleEn are required'), { statusCode: 422 });
    return next;
}

function sanitizeArticle(body, existing = {}) {
    const title = text(body.title, existing.title, 240);
    const slug = safeSlug(text(body.slug, existing.slug || title));
    return { ...existing, slug, title, excerpt: text(body.excerpt, existing.excerpt, 800), category: text(body.category, existing.category || 'news', 40), image: text(body.image, existing.image || 'assets/img/og-image.jpg', 300), date: text(body.date, existing.date || new Date().toISOString().slice(0, 10), 20), dateLabel: text(body.dateLabel, existing.dateLabel || '', 40), readTime: text(body.readTime, existing.readTime || '۵ دقیقه', 40), author: text(body.author, existing.author || 'مدیر سایت', 120), anime: text(body.anime, existing.anime || '', 120), tags: Array.isArray(body.tags) ? body.tags.map(item => text(item, '', 40)).filter(Boolean).slice(0, 20) : (existing.tags || []), featured: Boolean(body.featured ?? existing.featured), body: Array.isArray(body.body) ? body.body.slice(0, 100) : (existing.body || []), updatedAt: nowIso() };
}

function dynamicAnimeScript(state) {
    const anime = safeJson(state.catalog);
    const genres = safeJson(seedGenres);
    return `(function(){\nconst ANIME=${anime};\nconst GENRES=${genres};\nconst byId=Object.create(null); ANIME.forEach(a=>{byId[a.id]=a;});\nconst genreById=new Map(GENRES.map(g=>[g.id,g]));\nfunction normalize(str){return String(str||'').toLowerCase().replace(/[\\u200c\\u200f\\u200e]/g,' ').replace(/[ي]/g,'ی').replace(/[ك]/g,'ک').replace(/[-_:،,.!؟?]/g,' ').replace(/\\s+/g,' ').trim();}\nfunction findByTitle(str){const q=normalize(str);return ANIME.find(a=>normalize(a.title)===q||normalize(a.titleEn)===q||(a.aliases||[]).some(x=>normalize(x)===q))||ANIME.find(a=>normalize(a.title).includes(q))||null;}\nfunction search(query){const terms=normalize(query).split(' ').filter(Boolean);if(!terms.length)return ANIME.slice();return ANIME.filter(a=>terms.every(t=>normalize([a.title,a.titleEn,a.genreLabel,a.studio,a.desc,...(a.aliases||[]),...(a.genres||[]),...((a.genres||[]).map(id=>(genreById.get(id)||{}).label||id))].join(' ')).includes(t)));}\nfunction idOf(a){return typeof a==='string'?a:a.id;}\nfunction watchUrl(a,e){return 'watch.html?anime='+encodeURIComponent(idOf(a))+(e?'&ep='+e:'');}\nfunction detailUrl(a){return 'anime.html?id='+encodeURIComponent(idOf(a));}\nfunction downloadUrl(a,e){return 'download.html?anime='+encodeURIComponent(idOf(a))+(e?'&ep='+e:'');}\nfunction progressKey(a,e){return 'neon_progress_'+idOf(a)+'_'+e;}\nwindow.NEON_ANIME={list:ANIME,genres:GENRES,byId,findByTitle,search,toFa:n=>String(n).replace(/\\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]),watchUrl,detailUrl,downloadUrl,progressKey,normalize};\n})();\n`;
}

function dynamicArticlesScript(state) {
    const articles = safeJson(state.articles);
    return `(function(){\nvar ARTICLES=${articles}; var bySlug=Object.create(null); ARTICLES.forEach(function(a){bySlug[a.slug]=a;});\nfunction normalize(str){return String(str||'').toLowerCase().replace(/[\\u200c\\u200f\\u200e]/g,' ').replace(/[ي]/g,'ی').replace(/[ك]/g,'ک').replace(/[-_:،,.!؟?]/g,' ').replace(/\\s+/g,' ').trim();}\nfunction byCategory(cat){return !cat||cat==='all'?ARTICLES.slice():ARTICLES.filter(function(a){return a.category===cat;});}\nfunction related(article,n){var slug=typeof article==='string'?article:article.slug;var base=typeof article==='string'?bySlug[article]:article;if(!base)return [];return ARTICLES.filter(function(a){return a.slug!==slug;}).sort(function(a,b){return (a.category===base.category?0:1)-(b.category===base.category?0:1);}).slice(0,n||3);}\nfunction articleUrl(a){return 'article.html?slug='+encodeURIComponent(typeof a==='string'?a:a.slug);}\nfunction catUrl(cat){return !cat||cat==='all'?'mag.html':'mag.html?cat='+encodeURIComponent(cat);}\nfunction search(q){var terms=normalize(q).split(' ').filter(Boolean);if(!terms.length)return ARTICLES.slice();return ARTICLES.filter(function(a){var h=normalize([a.title,a.excerpt,(a.tags||[]).join(' ')].join(' '));return terms.every(function(t){return h.includes(t);});});}\nfunction byTag(tag){var q=normalize(tag);return ARTICLES.filter(function(a){return (a.tags||[]).some(function(t){return normalize(t)===q;});});}\nwindow.NEON_MAG={list:ARTICLES,bySlug,byCategory,related,articleUrl,catUrl,search,byTag,getFeatured:function(){return ARTICLES.find(function(a){return a.featured;})||ARTICLES[0];},normalize};\n})();\n`;
}

async function serveStatic(request, response, pathname, state) {
    if (pathname === '/data/anime.js') return sendText(response, 200, dynamicAnimeScript(state), MIME_TYPES['.js'], { 'Cache-Control': 'no-store' });
    if (pathname === '/data/articles.js') return sendText(response, 200, dynamicArticlesScript(state), MIME_TYPES['.js'], { 'Cache-Control': 'no-store' });
    let decoded;
    try { decoded = decodeURIComponent(pathname); } catch (error) { return fail(response, 400, 'bad_path', 'مسیر نامعتبر است.'); }
    const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
    const filePath = path.resolve(PUBLIC_ROOT, relative);
    if (filePath !== PUBLIC_ROOT && !filePath.startsWith(PUBLIC_ROOT + path.sep)) return fail(response, 403, 'forbidden', 'مسیر مجاز نیست.');
    if (relative.startsWith('.git') || relative.startsWith('server-data') || relative.startsWith('android')) return fail(response, 404, 'not_found', 'فایل پیدا نشد.');
    try {
        const stat = await fs.stat(filePath);
        if (!stat.isFile()) return fail(response, 404, 'not_found', 'فایل پیدا نشد.');
        const body = await fs.readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const headers = { ...securityHeaders(MIME_TYPES[ext] || 'application/octet-stream'), 'Cache-Control': ext === '.html' || ext === '.js' || ext === '.css' ? 'no-cache' : 'public, max-age=86400' };
        response.writeHead(200, headers);
        response.end(body);
    } catch (error) {
        fail(response, error.code === 'ENOENT' ? 404 : 500, error.code === 'ENOENT' ? 'not_found' : 'static_error', error.code === 'ENOENT' ? 'فایل پیدا نشد.' : 'خطای خواندن فایل.');
    }
}

async function handleApi(request, response, urlObject, state) {
    const pathname = urlObject.pathname;
    if (pathname === '/api/health' && request.method === 'GET') return sendJson(response, 200, { ok: true, service: 'neon-anime', version: '1.0.0', time: nowIso() });
    if (pathname === '/api/setup/status' && request.method === 'GET') return sendJson(response, 200, { ok: true, setupRequired: setupRequired(), username: ADMIN_USERNAME });
    if (pathname === '/api/setup/admin' && request.method === 'POST') {
        if (!setupRequired()) return fail(response, 409, 'setup_complete', 'راه‌اندازی مدیر قبلاً انجام شده است.');
        if (!sameOrigin(request)) return fail(response, 403, 'origin_rejected', 'مبدأ درخواست مجاز نیست.');
        try {
            const body = await readJson(request);
            const token = request.headers['x-setup-token'] || body.token;
            const username = text(body.username, ADMIN_USERNAME, 80);
            const password = String(body.password || '');
            if (!safeSecretEqual(token, bootstrapToken)) return fail(response, 403, 'invalid_setup_token', 'توکن راه‌اندازی نامعتبر است.');
            if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(username)) return fail(response, 422, 'invalid_username', 'نام کاربری باید ۳ تا ۴۰ کاراکتر باشد.');
            if (password.length < 12) return fail(response, 422, 'weak_password', 'رمز مدیر باید حداقل ۱۲ کاراکتر باشد.');
            ADMIN_USERNAME = username;
            ADMIN_PASSWORD_HASH = createPasswordHash(password);
            bootstrapToken = '';
            await persistAuthConfig();
            return sendJson(response, 201, { ok: true, message: 'حساب مدیر ساخته شد؛ حالا وارد شو.' });
        } catch (error) { return fail(response, error.statusCode || 400, 'setup_failed', error.message); }
    }
    if (pathname === '/api/auth/me' && request.method === 'GET') {
        const session = sessionFrom(request);
        return session ? sendJson(response, 200, { ok: true, user: publicUser(session) }) : fail(response, 401, 'auth_required', 'ورود مدیر لازم است.');
    }
    if (pathname === '/api/auth/login' && request.method === 'POST') {
        if (!authReady()) return fail(response, 503, 'auth_not_configured', 'احراز هویت مدیر روی سرور تنظیم نشده است.');
        const ip = clientIp(request);
        if (!loginAllowed(ip)) return fail(response, 429, 'too_many_attempts', 'تعداد تلاش‌ها زیاد است؛ یک دقیقه بعد دوباره امتحان کن.');
        try {
            const body = await readJson(request);
            const username = text(body.username, '', 80);
            const password = String(body.password || '');
            if (username !== ADMIN_USERNAME || !verifyPassword(password)) return fail(response, 401, 'invalid_credentials', 'نام کاربری یا رمز عبور اشتباه است.');
            const id = createSessionId();
            const session = { username, expiresAt: Date.now() + SESSION_TTL_MS };
            sessions.set(id, session);
            const secure = process.env.NODE_ENV === 'production' || request.headers['x-forwarded-proto'] === 'https';
            const cookie = `neon_admin_session=${encodeURIComponent(id)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_MS / 1000}${secure ? '; Secure' : ''}`;
            return sendJson(response, 200, { ok: true, user: publicUser(session) }, { 'Set-Cookie': cookie });
        } catch (error) { return fail(response, error.statusCode || 500, 'login_error', error.message); }
    }
    if (pathname === '/api/auth/logout' && request.method === 'POST') {
        const id = parseCookies(request).neon_admin_session; if (id) sessions.delete(id);
        return sendJson(response, 200, { ok: true }, { 'Set-Cookie': 'neon_admin_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0' });
    }

    const session = authenticate(request, response);
    if (!session) return;

    if (pathname === '/api/v1/dashboard' && request.method === 'GET') return sendJson(response, 200, buildDashboard(state));
    if (pathname === '/api/v1/catalog' && request.method === 'GET') return sendJson(response, 200, { ok: true, items: state.catalog, genres: seedGenres });
    if (pathname === '/api/v1/catalog' && request.method === 'POST') {
        try {
            const item = sanitizeCatalogItem(await readJson(request));
            if (state.catalog.some(existing => existing.id === item.id)) return fail(response, 409, 'duplicate_id', 'این شناسه قبلاً وجود دارد.');
            state.catalog.unshift(item); addAudit(state, 'catalog.created', item.title, session.username); await persistState(state);
            return sendJson(response, 201, { ok: true, item });
        } catch (error) { return fail(response, error.statusCode || 400, 'catalog_create_failed', error.message); }
    }
    const catalogMatch = pathname.match(/^\/api\/v1\/catalog\/([^/]+)$/);
    if (catalogMatch && ['PATCH', 'DELETE'].includes(request.method)) {
        const id = decodeURIComponent(catalogMatch[1]); const index = state.catalog.findIndex(item => item.id === id);
        if (index === -1) return fail(response, 404, 'catalog_not_found', 'عنوان پیدا نشد.');
        if (request.method === 'DELETE') { const removed = state.catalog.splice(index, 1)[0]; addAudit(state, 'catalog.deleted', removed.title, session.username); await persistState(state); return sendJson(response, 200, { ok: true }); }
        try { const item = sanitizeCatalogItem(await readJson(request), state.catalog[index]); state.catalog[index] = item; addAudit(state, 'catalog.updated', item.title, session.username); await persistState(state); return sendJson(response, 200, { ok: true, item }); }
        catch (error) { return fail(response, error.statusCode || 400, 'catalog_update_failed', error.message); }
    }
    if (pathname === '/api/v1/articles' && request.method === 'GET') return sendJson(response, 200, { ok: true, items: state.articles });
    if (pathname === '/api/v1/articles' && request.method === 'POST') {
        try { const article = sanitizeArticle(await readJson(request)); if (state.articles.some(item => item.slug === article.slug)) return fail(response, 409, 'duplicate_slug', 'این slug قبلاً وجود دارد.'); state.articles.unshift(article); addAudit(state, 'article.created', article.title, session.username); await persistState(state); return sendJson(response, 201, { ok: true, item: article }); }
        catch (error) { return fail(response, error.statusCode || 400, 'article_create_failed', error.message); }
    }
    const articleMatch = pathname.match(/^\/api\/v1\/articles\/([^/]+)$/);
    if (articleMatch && request.method === 'PATCH') {
        const slug = decodeURIComponent(articleMatch[1]); const index = state.articles.findIndex(item => item.slug === slug); if (index === -1) return fail(response, 404, 'article_not_found', 'مقاله پیدا نشد.');
        try { const article = sanitizeArticle(await readJson(request), state.articles[index]); state.articles[index] = article; addAudit(state, 'article.updated', article.title, session.username); await persistState(state); return sendJson(response, 200, { ok: true, item: article }); }
        catch (error) { return fail(response, error.statusCode || 400, 'article_update_failed', error.message); }
    }
    if (pathname === '/api/v1/users' && request.method === 'GET') return sendJson(response, 200, { ok: true, items: state.users.map(({ id, name, email, role, plan, status, lastActive, initial }) => ({ id, name, email, role, plan, status, lastActive, initial })) });
    const userMatch = pathname.match(/^\/api\/v1\/users\/([^/]+)$/);
    if (userMatch && request.method === 'PATCH') {
        const user = state.users.find(item => item.id === decodeURIComponent(userMatch[1])); if (!user) return fail(response, 404, 'user_not_found', 'کاربر پیدا نشد.');
        const body = await readJson(request); if (['user', 'editor', 'owner'].includes(body.role)) user.role = body.role; if (['basic', 'vip'].includes(body.plan)) user.plan = body.plan; if (['active', 'restricted'].includes(body.status)) user.status = body.status; addAudit(state, 'user.updated', user.email, session.username); await persistState(state); return sendJson(response, 200, { ok: true, item: user });
    }
    if (pathname === '/api/v1/moderation' && request.method === 'GET') return sendJson(response, 200, { ok: true, items: state.moderation });
    const moderationMatch = pathname.match(/^\/api\/v1\/moderation\/([^/]+)$/);
    if (moderationMatch && request.method === 'POST') {
        const index = state.moderation.findIndex(item => item.id === decodeURIComponent(moderationMatch[1])); if (index === -1) return fail(response, 404, 'report_not_found', 'گزارش پیدا نشد.'); const body = await readJson(request); const report = state.moderation.splice(index, 1)[0]; addAudit(state, `moderation.${text(body.action, 'review', 30)}`, report.anime, session.username); await persistState(state); return sendJson(response, 200, { ok: true });
    }
    if (pathname === '/api/v1/settings' && request.method === 'GET') return sendJson(response, 200, { ok: true, settings: state.settings });
    if (pathname === '/api/v1/settings' && request.method === 'PATCH') {
        const body = await readJson(request); const allowed = ['name', 'description', 'language', 'timezone', 'registration', 'comments', 'maintenance']; for (const key of allowed) if (body[key] !== undefined) state.settings[key] = typeof state.settings[key] === 'boolean' ? Boolean(body[key]) : text(body[key], state.settings[key], 600); addAudit(state, 'settings.updated', 'workspace', session.username); await persistState(state); return sendJson(response, 200, { ok: true, settings: state.settings });
    }
    if (pathname === '/api/v1/actions' && request.method === 'POST') {
        const body = await readJson(request); const action = text(body.action, '', 40); if (!ALLOWED_ACTIONS.has(action)) return fail(response, 422, 'action_not_allowed', 'این عملیات در allowlist وجود ندارد.'); addAudit(state, `ops.${action}`, 'neon-prod-01', session.username, 'queued'); await persistState(state); return sendJson(response, 202, { ok: true, status: 'queued', action, note: action === 'rotate_api_key' ? 'کلید به UI برگردانده نمی‌شود؛ rotation باید توسط Secret Manager انجام شود.' : 'عملیات در صف امن ثبت شد.' });
    }
    if (pathname === '/api/ops/health' && request.method === 'GET') return sendJson(response, 200, { ok: true, status: 'سرویس سالم', service: 'neon-prod-01', version: 'v2.8.4', time: nowIso() });
    if (pathname === '/api/ops/actions' && request.method === 'POST') {
        const body = await readJson(request); const action = text(body.action, '', 40); if (!ALLOWED_ACTIONS.has(action)) return fail(response, 422, 'action_not_allowed', 'این عملیات در allowlist وجود ندارد.'); addAudit(state, `ops.${action}`, 'neon-prod-01', session.username, 'queued'); await persistState(state); return sendJson(response, 202, { ok: true, status: 'queued', action });
    }
    return fail(response, 404, 'api_not_found', 'مسیر API پیدا نشد.');
}

async function main() {
    await loadAuthConfig();
    const state = await loadState();
    const server = http.createServer(async (request, response) => {
        try {
            const urlObject = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
            if (request.method === 'OPTIONS') {
                response.writeHead(204, { 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Credentials': 'true' });
                return response.end();
            }
            if (urlObject.pathname.startsWith('/api/')) return await handleApi(request, response, urlObject, state);
            if (request.method !== 'GET' && request.method !== 'HEAD') return fail(response, 405, 'method_not_allowed', 'متد مجاز نیست.');
            return await serveStatic(request, response, urlObject.pathname, state);
        } catch (error) {
            console.error(error);
            if (!response.headersSent) fail(response, error.statusCode || 500, 'server_error', 'خطای داخلی سرور.');
            else response.end();
        }
    });
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Neon Anime server listening on 0.0.0.0:${PORT}`);
        if (!authReady()) console.warn('Admin auth is not configured. Open /admin.html and use the one-time setup token, or provide ADMIN_PASSWORD_HASH and SESSION_SECRET.');
    });
    const cleanup = () => { server.close(() => process.exit(0)); };
    process.on('SIGTERM', cleanup); process.on('SIGINT', cleanup);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main();
