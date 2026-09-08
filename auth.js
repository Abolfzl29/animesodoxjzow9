/*
 * Client-side session helper (DEMO ONLY).
 * Everything here lives in localStorage and can be edited by the user — it is a UI simulation,
 * NOT security. When the real backend arrives, replace the bodies of these functions with API calls
 * (login/logout/me) and keep the same interface so the pages don't need to change.
 */
(function () {
    const KEYS = {
        loggedIn: 'neon_is_logged_in',
        vip: 'neon_is_vip',
        name: 'neon_user_name',
        username: 'neon_user_username',
        avatar: 'neon_user_avatar',
        email: 'neon_user_email',
        joined: 'neon_user_joined'
    };
    const DEFAULT_AVATAR = 'assets/img/avatar-1.webp';

    function get(key) { return localStorage.getItem(KEYS[key]); }

    function isLoggedIn() { return get('loggedIn') === 'true'; }

    function currentUser() {
        if (!isLoggedIn()) return null;
        return {
            name: get('name') || 'کاربر',
            username: get('username') || 'otaku_fan',
            avatar: get('avatar') || DEFAULT_AVATAR,
            email: get('email') || '',
            vip: get('vip') === 'true',
            joined: get('joined') ? new Date(parseInt(get('joined'), 10)) : null
        };
    }

    function login(user) {
        localStorage.setItem(KEYS.loggedIn, 'true');
        if (user.name) localStorage.setItem(KEYS.name, user.name);
        if (user.username) localStorage.setItem(KEYS.username, user.username);
        if (user.avatar) localStorage.setItem(KEYS.avatar, user.avatar);
        if (user.email) localStorage.setItem(KEYS.email, user.email);
        if (typeof user.vip === 'boolean') localStorage.setItem(KEYS.vip, String(user.vip));
        if (!localStorage.getItem(KEYS.joined)) localStorage.setItem(KEYS.joined, String(Date.now()));
    }

    function logout() {
        // Remove the whole neon_* namespace (session, likes, progress, comments, watchlist).
        Object.keys(localStorage).forEach(k => { if (k.indexOf('neon_') === 0) localStorage.removeItem(k); });
    }

    function setVip(flag) { localStorage.setItem(KEYS.vip, flag ? 'true' : 'false'); }

    // Where to go after login: ?next=... (same-origin relative paths only) or the profile page.
    function nextUrl(fallback) {
        const next = new URLSearchParams(window.location.search).get('next') || '';
        const safe = /^[a-z0-9_\-]+\.html(\?[^#]*)?(#.*)?$/i.test(next);
        return safe ? next : (fallback || 'profile.html');
    }

    function requireLogin() {
        if (isLoggedIn()) return true;
        const here = window.location.pathname.split('/').pop() + window.location.search;
        window.location.replace('login.html?next=' + encodeURIComponent(here));
        return false;
    }

    // Apply the session to the shared navbar/side-menu on any page.
    function applyToChrome() {
        const user = currentUser();
        const desktopImg = document.querySelector('.user-profile img');
        const desktopLink = document.querySelector('a.user-profile');
        const mobileProfile = document.getElementById('loginTriggerBtn2');

        if (!user) {
            if (desktopLink) { desktopLink.href = 'login.html'; desktopLink.title = 'ورود / ثبت‌نام'; }
            return;
        }
        if (desktopImg) desktopImg.src = user.avatar;
        if (desktopLink) { desktopLink.href = 'profile.html'; desktopLink.title = user.name; }
        if (mobileProfile) {
            mobileProfile.href = 'profile.html';
            const img = mobileProfile.querySelector('img');
            if (img) img.src = user.avatar;
            const h4 = mobileProfile.querySelector('h4');
            if (h4) h4.textContent = user.name;
            const badge = mobileProfile.querySelector('.status-badge');
            if (badge) {
                badge.textContent = user.vip ? 'کاربر ویژه (VIP)' : 'کاربر عادی';
                badge.style.background = user.vip ? '#ffd700' : '#46d369';
                badge.style.color = user.vip ? '#000' : '#fff';
            }
        }
        // Logout entry inside the mobile side menu (the desktop sidebar is hidden on phones)
        const links = document.querySelector('.side-menu-links');
        if (links && !links.querySelector('.side-logout')) {
            const a = document.createElement('a');
            a.href = 'login.html';
            a.className = 'side-logout';
            a.innerHTML = '<span class="icon">🚪</span> خروج از حساب';
            a.style.color = '#ff4757';
            a.addEventListener('click', (e) => { e.preventDefault(); logout(); window.location.href = 'index.html'; });
            links.appendChild(a);
        }
    }

    document.addEventListener('DOMContentLoaded', applyToChrome);

    window.NeonAuth = { isLoggedIn, currentUser, login, logout, setVip, nextUrl, requireLogin, applyToChrome, DEFAULT_AVATAR };
})();
