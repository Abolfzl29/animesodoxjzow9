/* Data-driven anime detail page. Reads ?id= from the URL and fills from data/anime.js. */
(function () {
    document.addEventListener('DOMContentLoaded', () => {
        const DATA = window.NEON_ANIME;
        const root = document.documentElement;
        const params = new URLSearchParams(window.location.search);
        const requestedId = (params.get('id') || params.get('anime') || '').trim();
        const page = document.getElementById('animePage');
        const notFound = document.getElementById('animeNotFound');
        const vipModal = document.getElementById('vipModal');
        const trailerModal = document.getElementById('trailerModal');
        const trailerVideo = document.getElementById('trailerVideo');
        const toastContainer = document.getElementById('toastContainer');
        let lastFocus = null;
        let anime = null;

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

        function getWatchlist() {
            try { return JSON.parse(localStorage.getItem('neon_watchlist') || '[]'); } catch (e) { return []; }
        }

        function isVip() {
            return localStorage.getItem('neon_is_vip') === 'true';
        }

        function progressRatio(episodeNumber) {
            if (!anime || !DATA) return 0;
            return parseFloat(localStorage.getItem(DATA.progressKey(anime, episodeNumber)) || '0') || 0;
        }

        function lastWatched() {
            if (!anime) return null;
            let last = null;
            try { last = JSON.parse(localStorage.getItem('neon_last_watched') || 'null'); } catch (e) {}
            if (last && last.anime === anime.id) {
                const ep = anime.episodes.find(item => item.number === last.ep);
                if (ep) return { episode: ep, ratio: last.ratio || progressRatio(ep.number) };
            }
            let best = null;
            anime.episodes.forEach(ep => {
                const ratio = progressRatio(ep.number);
                if (ratio > 0.02 && ratio < 0.97 && (!best || ratio > best.ratio)) {
                    best = { episode: ep, ratio: ratio };
                }
            });
            return best;
        }

        function firstPlayableEpisode() {
            if (!anime) return null;
            const vip = isVip();
            return anime.episodes.find(ep => !ep.vip || vip) || anime.episodes[0] || null;
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
            const trailerOpen = trailerModal && !trailerModal.hidden;
            document.body.style.overflow = open || vipOpen || trailerOpen ? 'hidden' : '';
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

        function openDialog(modal, focusEl) {
            lastFocus = document.activeElement;
            modal.hidden = false;
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            if (focusEl) window.setTimeout(() => focusEl.focus(), 40);
        }

        function closeDialog(modal) {
            modal.hidden = true;
            modal.classList.remove('active');
            if (!document.getElementById('sideMenu').classList.contains('active')) {
                document.body.style.overflow = '';
            }
            if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
        }

        function openVip() {
            openDialog(vipModal, document.getElementById('vipCloseBtn'));
        }

        function closeVip() {
            closeDialog(vipModal);
        }

        function openTrailer() {
            if (!anime || !anime.trailer) {
                showToast('تریلر این عنوان هنوز آماده نیست.');
                return;
            }
            trailerVideo.poster = anime.banner;
            trailerVideo.src = anime.trailer;
            document.getElementById('trailerTitle').textContent = 'تریلر «' + anime.title + '»';
            openDialog(trailerModal, document.getElementById('trailerCloseBtn'));
            const playPromise = trailerVideo.play();
            if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {});
        }

        function closeTrailer() {
            trailerVideo.pause();
            trailerVideo.removeAttribute('src');
            trailerVideo.load();
            closeDialog(trailerModal);
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
            document.getElementById('trailerCloseBtn').addEventListener('click', closeTrailer);
            document.getElementById('trailerBackdrop').addEventListener('click', closeTrailer);
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
                    renderHeroActions();
                });
            });
            document.addEventListener('keydown', event => {
                if (event.key !== 'Escape') return;
                if (!trailerModal.hidden) { closeTrailer(); return; }
                if (vipModal.classList.contains('active')) { closeVip(); return; }
                if (document.getElementById('sideMenu').classList.contains('active')) setMenu(false);
            });
        }

        function showNotFound() {
            page.hidden = true;
            notFound.hidden = false;
            document.title = 'عنوان پیدا نشد | نئون انیمه';
            const copy = document.getElementById('animeNotFoundCopy');
            if (requestedId) {
                copy.textContent = 'شناسه «' + requestedId + '» در آرشیو وجود ندارد. به آرشیو برگرد و یکی از ۷ عنوان موجود را انتخاب کن.';
            }
            const desc = document.querySelector('meta[name="description"]');
            if (desc) desc.setAttribute('content', 'این عنوان در آرشیو نئون انیمه پیدا نشد.');
        }

        function updateWatchlistButton() {
            const button = document.getElementById('animeWatchlistBtn');
            const inList = getWatchlist().includes(anime.id);
            button.classList.toggle('active', inList);
            button.setAttribute('aria-pressed', String(inList));
            button.textContent = inList ? '✓ در لیست من' : '+ لیست من';
        }

        function renderHeroActions() {
            const play = document.getElementById('animePlayBtn');
            const resume = lastWatched();
            const target = resume ? resume.episode : firstPlayableEpisode();
            play.href = target ? DATA.watchUrl(anime, target.number) : DATA.watchUrl(anime);
            play.textContent = resume ? '▶ ادامه تماشا' : '▶ پخش';
            play.setAttribute('aria-label', resume
                ? `ادامه تماشای ${anime.title} از قسمت ${toFa(resume.episode.number)}`
                : `پخش ${anime.title}`);

            const download = document.getElementById('animeDownloadBtn');
            if (download) {
                download.href = target ? DATA.downloadUrl(anime, target.number) : DATA.downloadUrl(anime);
                download.setAttribute('aria-label', target
                    ? `دانلود ${anime.title} از قسمت ${toFa(target.number)}`
                    : `دانلود ${anime.title}`);
            }

            const continueBox = document.getElementById('animeContinue');
            if (resume) {
                continueBox.hidden = false;
                document.getElementById('animeContinueLabel').textContent = 'ادامه از قسمت ' + toFa(resume.episode.number);
                document.getElementById('animeContinueMeta').textContent = (resume.episode.title || '') + ' • ' + toFa(Math.round(resume.ratio * 100)) + '٪';
                document.getElementById('animeContinueFill').style.width = Math.round(resume.ratio * 100) + '%';
            } else {
                continueBox.hidden = true;
            }
            updateWatchlistButton();
        }

        function renderMeta() {
            const meta = document.getElementById('animeMeta');
            meta.replaceChildren();
            const items = [
                { text: '★ ' + toFa(anime.rating.toFixed(1)), className: 'rating' },
                { text: toFa(anime.year) },
                { text: anime.age },
                { text: anime.quality },
                { text: toFa(anime.seasons) + ' فصل' },
                { text: toFa(anime.episodes.length) + ' قسمت' },
                { text: anime.statusLabel || '' }
            ];
            items.filter(item => item.text).forEach(item => {
                meta.appendChild(element('li', item.className || '', item.text));
            });

            const genres = document.getElementById('animeGenres');
            genres.replaceChildren();
            anime.genres.forEach(id => {
                const genre = DATA.genres.find(item => item.id === id);
                const link = element('a', '', genre ? genre.label : id);
                link.href = 'catalog.html?genre=' + encodeURIComponent(id) + '#catalogResults';
                genres.appendChild(link);
            });
        }

        function renderEpisodes() {
            const grid = document.getElementById('episodeGrid');
            grid.replaceChildren();
            const vip = isVip();
            anime.episodes.forEach(ep => {
                const locked = ep.vip && !vip;
                const ratio = progressRatio(ep.number);
                const card = element(locked ? 'button' : 'a', 'anime-ep');
                if (locked) {
                    card.type = 'button';
                    card.classList.add('locked');
                    card.setAttribute('aria-label', `قسمت ${toFa(ep.number)} قفل است. نیاز به اشتراک ویژه.`);
                    card.addEventListener('click', openVip);
                } else {
                    card.href = DATA.watchUrl(anime, ep.number);
                    card.setAttribute('aria-label', `پخش قسمت ${toFa(ep.number)}: ${ep.title}`);
                }
                if (ratio > 0.02) card.classList.add('in-progress');

                const thumb = element('div', 'anime-ep-thumb');
                const img = element('img');
                img.src = anime.banner;
                img.alt = '';
                img.loading = 'lazy';
                img.decoding = 'async';
                thumb.appendChild(img);
                thumb.appendChild(element('span', locked ? 'lock' : 'play', locked ? '🔒' : '▶'));
                if (ratio > 0.02) {
                    const bar = element('div', 'anime-ep-progress');
                    const fill = element('i');
                    fill.style.width = Math.round(ratio * 100) + '%';
                    bar.appendChild(fill);
                    thumb.appendChild(bar);
                }
                card.appendChild(thumb);

                const copy = element('div');
                copy.appendChild(element('h3', '', 'قسمت ' + toFa(ep.number) + ': ' + ep.title));
                copy.appendChild(element('p', '', ep.desc || anime.desc));
                if (locked) copy.appendChild(element('span', 'vip-pill', 'VIP'));
                else if (ratio > 0.02) copy.appendChild(element('span', 'vip-pill', toFa(Math.round(ratio * 100)) + '٪ تماشا شده'));
                card.appendChild(copy);
                card.appendChild(element('span', 'anime-ep-duration', ep.duration));
                grid.appendChild(card);
            });
            document.getElementById('episodeCountLabel').textContent = toFa(anime.episodes.length) + ' قسمت';
        }

        function renderCast() {
            const section = document.getElementById('castSection');
            const row = document.getElementById('castRow');
            const list = anime.characters || [];
            if (!list.length) {
                section.hidden = true;
                return;
            }
            section.hidden = false;
            row.replaceChildren();
            list.forEach(person => {
                const item = element('div', 'anime-cast');
                const img = element('img');
                img.src = person.img;
                img.alt = person.name;
                img.width = 118;
                img.height = 118;
                img.loading = 'lazy';
                img.decoding = 'async';
                item.appendChild(img);
                item.appendChild(element('strong', '', person.name));
                item.appendChild(element('span', '', person.role + (person.nameEn ? ' · ' + person.nameEn : '')));
                row.appendChild(item);
            });
        }

        function renderRelated() {
            const section = document.getElementById('relatedSection');
            const grid = document.getElementById('relatedGrid');
            const related = DATA.list.filter(item => item.id !== anime.id && item.genres.some(genre => anime.genres.includes(genre))).slice(0, 4);
            const fallback = related.length ? related : DATA.list.filter(item => item.id !== anime.id).slice(0, 4);
            if (!fallback.length) {
                section.hidden = true;
                return;
            }
            section.hidden = false;
            grid.replaceChildren();
            fallback.forEach(item => {
                const card = element('a', 'anime-card landscape catalog-anime-card');
                card.href = DATA.detailUrl(item);
                card.setAttribute('aria-label', 'جزئیات ' + item.title);
                const image = element('img', 'card-static-img');
                image.src = item.banner;
                image.alt = item.title;
                image.width = 640;
                image.height = 360;
                image.loading = 'lazy';
                image.decoding = 'async';
                card.appendChild(image);
                const rating = element('span', 'catalog-card-rating');
                rating.appendChild(element('span', '', '★'));
                rating.appendChild(document.createTextNode(' ' + toFa(item.rating.toFixed(1))));
                card.appendChild(rating);
                card.appendChild(element('div', 'catalog-card-gradient'));
                const copy = element('div', 'catalog-card-copy');
                copy.appendChild(element('h3', '', item.title));
                copy.appendChild(element('span', 'catalog-card-en en-text', item.titleEn));
                card.appendChild(copy);
                grid.appendChild(card);
            });
        }

        function renderPage() {
            document.title = anime.title + ' | نئون انیمه';
            const desc = document.querySelector('meta[name="description"]');
            if (desc) desc.setAttribute('content', anime.desc);
            const ogTitle = document.querySelector('meta[property="og:title"]');
            if (ogTitle) ogTitle.setAttribute('content', anime.title + ' | نئون انیمه');
            const ogDesc = document.querySelector('meta[property="og:description"]');
            if (ogDesc) ogDesc.setAttribute('content', anime.desc);
            const canonical = document.getElementById('canonicalLink');
            if (canonical) canonical.setAttribute('href', DATA.detailUrl(anime));

            document.getElementById('animeHeroArt').style.backgroundImage = 'url("' + anime.banner + '")';
            const poster = document.getElementById('animePoster');
            poster.src = anime.poster;
            poster.alt = 'پوستر ' + anime.title;
            document.getElementById('animeStatusBadge').textContent = anime.statusLabel || '';
            document.getElementById('animeStudio').textContent = anime.studio;
            document.getElementById('animeTitle').textContent = anime.title;
            document.getElementById('animeTitleEn').textContent = anime.titleEn;
            document.getElementById('animeCrumb').textContent = anime.title;
            document.getElementById('animeDesc').textContent = anime.desc;
            document.getElementById('episodesDescription').textContent =
                'فصل ' + toFa(anime.currentSeason) + ' از استودیو ' + anime.studio + '. یک قسمت را انتخاب کن تا وارد پلیر شوی.';

            renderMeta();
            renderHeroActions();
            renderEpisodes();
            renderCast();
            renderRelated();
            notFound.hidden = true;
            page.hidden = false;
        }

        setupShell();
        setupOverlays();

        if (!DATA) {
            showNotFound();
            document.getElementById('animeNotFoundCopy').textContent = 'لطفاً صفحه را دوباره بارگذاری کنید.';
            return;
        }

        anime = DATA.byId[requestedId] || DATA.findByTitle(requestedId);
        if (!anime) {
            showNotFound();
            return;
        }

        renderPage();

        document.getElementById('animeWatchlistBtn').addEventListener('click', () => {
            let list = getWatchlist();
            const inList = list.includes(anime.id);
            list = inList ? list.filter(id => id !== anime.id) : list.concat(anime.id);
            localStorage.setItem('neon_watchlist', JSON.stringify(list));
            updateWatchlistButton();
            showToast(inList ? '«' + anime.title + '» از لیست تماشا حذف شد.' : '«' + anime.title + '» به لیست تماشا اضافه شد.');
        });
        document.getElementById('animeTrailerBtn').addEventListener('click', openTrailer);
    });
})();
