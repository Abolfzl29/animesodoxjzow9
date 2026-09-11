/* Data-driven download page. Reads ?anime=<id>&ep=<n> (also accepts ?id=) and fills from data/anime.js. */
(function () {
    document.addEventListener('DOMContentLoaded', () => {
        const DATA = window.NEON_ANIME;
        const root = document.documentElement;
        const params = new URLSearchParams(window.location.search);
        const requestedId = (params.get('anime') || params.get('id') || params.get('title') || '').trim();
        const wantedEp = parseInt(params.get('ep'), 10);
        const page = document.getElementById('downloadPage');
        const notFound = document.getElementById('downloadNotFound');
        const vipModal = document.getElementById('vipModal');
        const toastContainer = document.getElementById('toastContainer');
        let lastFocus = null;
        let anime = null;
        let episode = null;

        // Demo-only quality table. Real backends should serve one file per row.
        const QUALITIES = [
            { q: '480p', size: '۱۸۰ مگابایت', vip: false, tags: ['زیرنویس فارسی', 'حجم کم'] },
            { q: '720p', size: '۴۲۰ مگابایت', vip: false, tags: ['زیرنویس فارسی', 'دوبله اختصاصی'] },
            { q: '1080p', size: '۹۵۰ مگابایت', vip: true, tags: ['زیرنویس فارسی', 'دوبله اختصاصی'], best: true },
            { q: '4K HDR', size: '۲.۴ گیگابایت', vip: true, tags: ['زیرنویس فارسی', 'دوبله اختصاصی', 'بهترین کیفیت'] }
        ];

        function element(tag, className, text) {
            const node = document.createElement(tag);
            if (className) node.className = className;
            if (typeof text === 'string') node.textContent = text;
            return node;
        }

        function toFa(value) {
            return DATA ? DATA.toFa(value) : String(value);
        }

        function showToast(message) {
            if (!toastContainer) return;
            const toast = element('div', 'toast');
            toast.appendChild(element('span', '', '✔️'));
            toast.appendChild(document.createTextNode(' ' + message));
            toastContainer.appendChild(toast);
            window.setTimeout(() => toast.classList.add('show'), 10);
            window.setTimeout(() => {
                toast.classList.remove('show');
                window.setTimeout(() => toast.remove(), 400);
            }, 3000);
        }
        window.showToast = showToast;

        function isVip() {
            return localStorage.getItem('neon_is_vip') === 'true';
        }

        function setMenu(open) {
            const menu = document.getElementById('sideMenu');
            const backdrop = document.getElementById('mobileBackdrop');
            const hamburger = document.getElementById('hamburgerBtn');
            const closeBtn = document.getElementById('closeSideBtn');
            if (!menu || !backdrop || !hamburger) return;
            menu.classList.toggle('active', open);
            backdrop.classList.toggle('active', open);
            hamburger.classList.toggle('active', open);
            hamburger.setAttribute('aria-expanded', String(open));
            const vipOpen = vipModal && vipModal.classList.contains('active');
            document.body.style.overflow = open || vipOpen ? 'hidden' : '';
            if (open && closeBtn) setTimeout(() => closeBtn.focus(), 100);
            else if (!open && hamburger && document.activeElement === closeBtn) hamburger.focus();
        }

        function applyTheme(theme) {
            if (theme === 'light') root.setAttribute('data-theme', 'light');
            else root.removeAttribute('data-theme');
            try { localStorage.setItem('neon_theme', theme); } catch (e) {}
            const meta = document.querySelector('meta[name="theme-color"]');
            if (meta) meta.content = theme === 'light' ? '#f4f1f9' : '#0a0a0c';
            const themeButton = document.getElementById('themeToggleBtn');
            themeButton.setAttribute('aria-pressed', String(theme === 'light'));
            themeButton.title = theme === 'light' ? 'حالت شب' : 'حالت روز';
        }

        function setupShell() {
            const navbar = document.getElementById('navbar');
            const hamburger = document.getElementById('hamburgerBtn');
            const closeButton = document.getElementById('closeSideBtn');
            const backdrop = document.getElementById('mobileBackdrop');
            const themeButton = document.getElementById('themeToggleBtn');
            hamburger.addEventListener('click', () => setMenu(!document.getElementById('sideMenu').classList.contains('active')));
            closeButton.addEventListener('click', () => setMenu(false));
            backdrop.addEventListener('click', () => setMenu(false));
            document.getElementById('sideMenu').querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
            const moreBtn = document.getElementById('threeDotsBtn');
            const moreMenu = document.getElementById('moreMenuDropdown');
            if (moreBtn && moreMenu) {
                moreBtn.addEventListener('click', event => {
                    event.stopPropagation();
                    moreMenu.classList.toggle('open');
                });
                document.addEventListener('click', () => moreMenu.classList.remove('open'));
            }
            applyTheme(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
            themeButton.addEventListener('click', () => {
                applyTheme(root.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
            });
            const updateNav = () => navbar.classList.toggle('scrolled', window.scrollY > 30);
            window.addEventListener('scroll', updateNav, { passive: true });
            updateNav();
            const footerYear = document.getElementById('footerYear');
            try {
                footerYear.textContent = new Intl.DateTimeFormat('fa-IR', { year: 'numeric' }).format(new Date());
            } catch (e) {}
        }

        function openVip() {
            lastFocus = document.activeElement;
            vipModal.hidden = false;
            vipModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            window.setTimeout(() => document.getElementById('vipCloseBtn').focus(), 40);
        }

        function closeVip() {
            vipModal.hidden = true;
            vipModal.classList.remove('active');
            if (!document.getElementById('sideMenu').classList.contains('active')) {
                document.body.style.overflow = '';
            }
            if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
        }

        function setupOverlays() {
            document.getElementById('vipOpenBtn').addEventListener('click', openVip);
            document.getElementById('vipCloseBtn').addEventListener('click', closeVip);
            document.getElementById('vipCloseBackdrop').addEventListener('click', closeVip);
            const mobileVip = document.getElementById('mobileVipBtn');
            mobileVip.addEventListener('click', () => { setMenu(false); openVip(); });
            mobileVip.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setMenu(false); openVip(); }
            });
            document.querySelectorAll('.plan-select-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const plan = btn.dataset.plan || '';
                    const auth = window.NeonAuth;
                    if (!auth || !auth.isLoggedIn()) {
                        showToast('برای خرید اشتراک ابتدا وارد حساب شوید.');
                        window.setTimeout(() => {
                            window.location.href = 'login.html?next=' + encodeURIComponent(window.location.pathname.split('/').pop() + window.location.search);
                        }, 900);
                        return;
                    }
                    if (auth.currentUser().vip) {
                        showToast('اشتراک ویژه شما هم‌اکنون فعال است.');
                        closeVip();
                        return;
                    }
                    auth.setVip(true);
                    if (typeof auth.applyToChrome === 'function') auth.applyToChrome();
                    showToast('اشتراک ' + plan + ' (نسخه نمایشی) فعال شد.');
                    closeVip();
                    renderEpisodes();
                    renderQualities();
                });
            });
            document.addEventListener('keydown', event => {
                if (event.key !== 'Escape') return;
                if (vipModal.classList.contains('active')) { closeVip(); return; }
                if (document.getElementById('sideMenu').classList.contains('active')) setMenu(false);
            });
        }

        function showNotFound() {
            page.hidden = true;
            notFound.hidden = false;
            document.title = 'عنوان پیدا نشد | نئون انیمه';
            const copy = document.getElementById('downloadNotFoundCopy');
            if (requestedId) {
                copy.textContent = 'شناسه «' + requestedId + '» در آرشیو وجود ندارد. به آرشیو برگرد و یکی از عنوان‌ها را انتخاب کن.';
            }
            const desc = document.querySelector('meta[name="description"]');
            if (desc) desc.setAttribute('content', 'این عنوان در آرشیو نئون انیمه پیدا نشد.');
        }

        function selectEpisode(ep, announce) {
            episode = ep;
            renderEpisodes();
            renderQualities();
            document.getElementById('downloadPlayBtn').href = DATA.watchUrl(anime, ep.number);
            document.getElementById('dlQualityDescription').textContent =
                'دانلود قسمت ' + toFa(ep.number) + (ep.title ? ' — ' + ep.title : '');
            document.title = 'دانلود ' + anime.title + ' قسمت ' + toFa(ep.number) + ' | نئون انیمه';
            try {
                history.replaceState(null, '', DATA.downloadUrl(anime, ep.number));
            } catch (e) {}
            if (announce) showToast('قسمت ' + toFa(ep.number) + ' انتخاب شد.');
        }

        function renderEpisodes() {
            const grid = document.getElementById('dlEpisodeGrid');
            grid.replaceChildren();
            const vip = isVip();
            anime.episodes.forEach(ep => {
                const locked = ep.vip && !vip;
                const button = element('button', 'dl-ep' + (ep.number === episode.number ? ' is-selected' : '') + (locked ? ' is-locked' : ''));
                button.type = 'button';
                button.appendChild(element('span', 'dl-ep-num', locked ? '🔒' : toFa(ep.number)));
                const copy = element('span', 'dl-ep-copy');
                copy.appendChild(element('strong', '', 'قسمت ' + toFa(ep.number)));
                copy.appendChild(element('span', '', ep.title || anime.title));
                button.appendChild(copy);
                button.setAttribute('aria-label', locked
                    ? `قسمت ${toFa(ep.number)} قفل است. نیاز به اشتراک ویژه.`
                    : `انتخاب قسمت ${toFa(ep.number)}: ${ep.title}`);
                button.setAttribute('aria-pressed', String(ep.number === episode.number));
                button.addEventListener('click', () => {
                    if (locked) { openVip(); return; }
                    if (ep.number !== episode.number) selectEpisode(ep, true);
                });
                grid.appendChild(button);
            });
            document.getElementById('dlEpisodeCountLabel').textContent = toFa(anime.episodes.length) + ' قسمت';
            document.getElementById('dlEpisodesDescription').textContent =
                'فصل ' + toFa(anime.currentSeason) + ' از استودیو ' + anime.studio + '. قسمتی که می‌خواهی دانلود کنی را انتخاب کن.';
        }

        function renderQualities() {
            const grid = document.getElementById('dlQualityGrid');
            grid.replaceChildren();
            const vip = isVip();
            QUALITIES.forEach(item => {
                const locked = item.vip && !vip;
                const card = element('div', 'dl-quality' + (item.best && !locked ? ' is-best' : '') + (locked ? ' is-locked' : ''));
                if (item.best && !locked) card.appendChild(element('span', 'dl-quality-badge', 'پیشنهاد نئون ✦'));

                const info = element('div', 'dl-quality-info');
                info.appendChild(element('strong', '', item.q));
                info.appendChild(element('span', '', item.size + (item.vip ? ' · ویژه' : '')));
                const tags = element('div', 'dl-quality-tags');
                item.tags.forEach(tag => tags.appendChild(element('i', '', tag)));
                info.appendChild(tags);
                card.appendChild(info);

                if (locked) {
                    const button = element('button', 'dl-quality-btn', '🔒 VIP');
                    button.type = 'button';
                    button.setAttribute('aria-label', `دانلود با کیفیت ${item.q} نیاز به اشتراک ویژه دارد.`);
                    button.addEventListener('click', openVip);
                    card.appendChild(button);
                } else {
                    const link = element('a', 'dl-quality-btn', '⬇ دانلود');
                    link.href = episode.src;
                    link.setAttribute('download', anime.id + '-ep' + episode.number + '-' + item.q.replace(/\s+/g, '') + '.mp4');
                    link.setAttribute('aria-label', `دانلود قسمت ${toFa(episode.number)} با کیفیت ${item.q}`);
                    link.addEventListener('click', () => {
                        showToast('دانلود قسمت ' + toFa(episode.number) + ' با کیفیت ' + item.q + ' شروع شد (فایل نمایشی).');
                    });
                    card.appendChild(link);
                }
                grid.appendChild(card);
            });
        }

        function renderPage() {
            document.getElementById('downloadHeroArt').style.backgroundImage = 'url("' + anime.banner + '")';
            const poster = document.getElementById('downloadPoster');
            poster.src = anime.poster;
            poster.alt = 'پوستر ' + anime.title;
            document.getElementById('downloadStudio').textContent = anime.studio;
            document.getElementById('downloadTitle').textContent = 'دانلود ' + anime.title;
            document.getElementById('downloadTitleEn').textContent = anime.titleEn;
            document.getElementById('downloadCrumb').textContent = 'دانلود ' + anime.title;
            const crumbAnime = document.getElementById('downloadCrumbAnime');
            crumbAnime.href = DATA.detailUrl(anime);
            crumbAnime.textContent = anime.title;
            document.getElementById('downloadDetailsBtn').href = DATA.detailUrl(anime);
            const canonical = document.getElementById('canonicalLink');
            if (canonical) canonical.setAttribute('href', DATA.downloadUrl(anime, episode.number));

            const meta = document.getElementById('downloadMeta');
            meta.replaceChildren();
            [
                { text: '★ ' + toFa(anime.rating.toFixed(1)), className: 'rating' },
                { text: toFa(anime.year) },
                { text: anime.age },
                { text: 'فصل ' + toFa(anime.currentSeason) },
                { text: toFa(anime.episodes.length) + ' قسمت' },
                { text: anime.statusLabel || '' }
            ].filter(item => item.text).forEach(item => {
                meta.appendChild(element('li', item.className || '', item.text));
            });

            renderEpisodes();
            renderQualities();
            document.getElementById('downloadPlayBtn').href = DATA.watchUrl(anime, episode.number);
            document.getElementById('dlQualityDescription').textContent =
                'دانلود قسمت ' + toFa(episode.number) + (episode.title ? ' — ' + episode.title : '');
            document.title = 'دانلود ' + anime.title + ' قسمت ' + toFa(episode.number) + ' | نئون انیمه';
            notFound.hidden = true;
            page.hidden = false;
        }

        setupShell();
        setupOverlays();

        if (!DATA) {
            showNotFound();
            document.getElementById('downloadNotFoundCopy').textContent = 'لطفاً صفحه را دوباره بارگذاری کنید.';
            return;
        }

        anime = DATA.byId[requestedId] || DATA.findByTitle(requestedId);
        if (!anime) {
            showNotFound();
            return;
        }

        episode = anime.episodes.find(e => e.number === wantedEp)
            || anime.episodes.find(e => !e.vip)
            || anime.episodes[0];
        if (episode.vip && !isVip()) {
            episode = anime.episodes.find(e => !e.vip) || episode;
        }

        renderPage();
    });
})();
