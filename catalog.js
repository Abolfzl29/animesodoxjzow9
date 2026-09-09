/* Catalogue landing + focused "view all" pages. Data comes from data/anime.js for now. */
(function () {
    document.addEventListener('DOMContentLoaded', () => {
        const DATA = window.NEON_ANIME;
        const root = document.documentElement;
        const landing = document.getElementById('catalogLanding');
        const results = document.getElementById('catalogResults');
        const sectionsRoot = document.getElementById('catalogSections');
        const allGrid = document.getElementById('catalogAllGrid');
        const emptyState = document.getElementById('catalogEmpty');
        const sortSelect = document.getElementById('catalogSortSelect');
        const params = new URLSearchParams(window.location.search);
        const requestedGenre = params.get('genre') || '';
        const query = (params.get('q') || '').trim();
        const showAll = params.get('view') === 'all';
        const genreMap = new Map((DATA && DATA.genres || []).map(genre => [genre.id, genre]));
        const landingGenreIds = (DATA && DATA.genres || []).map(genre => genre.id);
        let resultItems = [];

        function element(tag, className, text) {
            const node = document.createElement(tag);
            if (className) node.className = className;
            if (typeof text === 'string') node.textContent = text;
            return node;
        }

        function toFa(value) {
            return DATA ? DATA.toFa(value) : String(value);
        }

        function createAnimeCard(anime) {
            const card = element('a', 'anime-card landscape catalog-anime-card');
            card.href = DATA.watchUrl(anime);
            card.dataset.anime = anime.id;
            card.setAttribute('aria-label', `تماشای ${anime.title}`);

            const image = element('img', 'card-static-img');
            image.src = anime.banner;
            image.alt = anime.title;
            image.width = 640;
            image.height = 360;
            image.loading = 'lazy';
            image.decoding = 'async';
            card.appendChild(image);

            const badges = element('div', 'lang-badges');
            badges.appendChild(element('span', 'lang-badge dub', 'دوبله'));
            badges.appendChild(element('span', 'lang-badge sub', 'زیرنویس'));
            card.appendChild(badges);

            const rating = element('span', 'catalog-card-rating');
            rating.appendChild(element('span', '', '★'));
            rating.appendChild(document.createTextNode(` ${toFa(anime.rating.toFixed(1))}`));
            card.appendChild(rating);

            card.appendChild(element('div', 'catalog-card-gradient'));
            card.appendChild(element('span', 'catalog-card-play', '▶'));

            const copy = element('div', 'catalog-card-copy');
            copy.appendChild(element('h3', '', anime.title));
            copy.appendChild(element('span', 'catalog-card-en en-text', anime.titleEn));
            const meta = element('div', 'catalog-card-meta');
            meta.appendChild(element('span', '', toFa(anime.year)));
            meta.appendChild(element('i', '', '•'));
            meta.appendChild(element('span', '', anime.genreLabel));
            copy.appendChild(meta);
            card.appendChild(copy);

            return card;
        }

        function itemsForGenre(genreId) {
            return DATA.list.filter(anime => anime.genres.includes(genreId));
        }

        function renderGenreNav() {
            const nav = document.getElementById('catalogGenreNav');
            nav.replaceChildren();

            const allLink = element('a', 'catalog-genre-chip', 'همه ژانرها');
            allLink.href = 'catalog.html';
            if (!requestedGenre && !query && !showAll) allLink.classList.add('active');
            nav.appendChild(allLink);

            DATA.genres.forEach(genre => {
                const count = itemsForGenre(genre.id).length;
                if (!count) return;
                const link = element('a', 'catalog-genre-chip');
                link.href = `catalog.html?genre=${encodeURIComponent(genre.id)}`;
                link.appendChild(document.createTextNode(genre.label));
                link.appendChild(element('small', '', toFa(count)));
                if (!query && genre.id === requestedGenre) link.classList.add('active');
                nav.appendChild(link);
            });
        }

        function renderLanding() {
            landing.hidden = false;
            results.hidden = true;
            sectionsRoot.replaceChildren();

            landingGenreIds.forEach((genreId, index) => {
                const genre = genreMap.get(genreId);
                const items = itemsForGenre(genreId);
                if (!genre || !items.length) return;

                const section = element('section', 'catalog-genre-section');
                section.style.setProperty('--section-order', index);
                const header = element('div', 'catalog-section-header');
                const titleWrap = element('div');
                titleWrap.appendChild(element('span', 'catalog-section-index en-text', String(index + 1).padStart(2, '0')));
                const titleCopy = element('div');
                titleCopy.appendChild(element('h3', '', genre.label));
                titleCopy.appendChild(element('p', '', genre.description));
                titleWrap.appendChild(titleCopy);
                header.appendChild(titleWrap);

                const viewAll = element('a', 'catalog-view-all', 'مشاهده همه');
                viewAll.href = `catalog.html?genre=${encodeURIComponent(genre.id)}`;
                viewAll.appendChild(element('span', '', '←'));
                header.appendChild(viewAll);
                section.appendChild(header);

                const track = element('div', 'catalog-row-track');
                track.setAttribute('aria-label', `انیمه‌های ژانر ${genre.label}`);
                items.slice(0, 5).forEach(anime => track.appendChild(createAnimeCard(anime)));
                section.appendChild(track);
                sectionsRoot.appendChild(section);
            });
        }

        function sorted(items, mode) {
            const copy = items.slice();
            if (mode === 'rating') return copy.sort((a, b) => b.rating - a.rating);
            if (mode === 'newest') return copy.sort((a, b) => b.year - a.year);
            if (mode === 'title') return copy.sort((a, b) => a.title.localeCompare(b.title, 'fa'));
            return copy;
        }

        function renderResultGrid() {
            allGrid.replaceChildren();
            const items = sorted(resultItems, sortSelect.value);
            items.forEach(anime => allGrid.appendChild(createAnimeCard(anime)));
            document.getElementById('catalogResultCount').textContent = `${toFa(items.length)} عنوان`;
            allGrid.hidden = items.length === 0;
            emptyState.hidden = items.length !== 0;
        }

        function renderResults() {
            document.body.classList.add('catalog-focused');
            landing.hidden = true;
            results.hidden = false;
            const title = document.getElementById('catalogResultsTitle');
            const eyebrow = document.getElementById('catalogResultsEyebrow');
            const description = document.getElementById('catalogResultsDescription');

            if (query) {
                resultItems = DATA.search(query);
                eyebrow.textContent = 'نتایج جستجو';
                title.textContent = `نتیجه برای «${query}»`;
                description.textContent = 'جستجو در نام فارسی و انگلیسی، شخصیت‌ها و ژانرها.';
                document.title = `جستجوی ${query} | نئون انیمه`;
            } else if (requestedGenre) {
                const genre = genreMap.get(requestedGenre);
                resultItems = genre ? itemsForGenre(requestedGenre) : [];
                eyebrow.textContent = 'آرشیو ژانری';
                title.textContent = genre ? `انیمه‌های ${genre.label}` : 'ژانر پیدا نشد';
                description.textContent = genre ? genre.description : 'این دسته‌بندی در آرشیو وجود ندارد.';
                document.title = `${title.textContent} | نئون انیمه`;
            } else {
                resultItems = DATA.list.slice();
                eyebrow.textContent = 'کل آرشیو';
                title.textContent = 'همه انیمه‌ها';
                description.textContent = 'تمام عنوان‌های موجود در آرشیو، یک‌جا برای مرور دقیق‌تر.';
                document.title = 'همه انیمه‌ها | نئون انیمه';
            }
            renderResultGrid();
        }

        function setupSearch() {
            const form = document.getElementById('catalogSearchForm');
            const input = document.getElementById('catalogSearchInput');
            input.value = query;
            form.addEventListener('submit', event => {
                event.preventDefault();
                const value = input.value.trim();
                if (!value) {
                    window.location.href = 'catalog.html';
                    return;
                }
                window.location.href = `catalog.html?q=${encodeURIComponent(value)}`;
            });

            function focusSearch() {
                document.querySelector('.catalog-hero').scrollIntoView({ behavior: 'smooth', block: 'start' });
                window.setTimeout(() => input.focus(), 350);
            }
            document.getElementById('catalogSearchTrigger').addEventListener('click', focusSearch);
            document.getElementById('bottomCatalogSearch').addEventListener('click', focusSearch);
        }

        function setupShell() {
            const navbar = document.getElementById('navbar');
            const menu = document.getElementById('sideMenu');
            const backdrop = document.getElementById('mobileBackdrop');
            const hamburger = document.getElementById('hamburgerBtn');
            const closeButton = document.getElementById('closeSideBtn');
            const themeButton = document.getElementById('themeToggleBtn');

            function setMenu(open) {
                menu.classList.toggle('active', open);
                backdrop.classList.toggle('active', open);
                hamburger.classList.toggle('active', open);
                hamburger.setAttribute('aria-expanded', String(open));
                document.body.style.overflow = open ? 'hidden' : '';
            }
            hamburger.addEventListener('click', () => setMenu(!menu.classList.contains('active')));
            closeButton.addEventListener('click', () => setMenu(false));
            backdrop.addEventListener('click', () => setMenu(false));
            menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));

            function applyTheme(theme) {
                root.toggleAttribute('data-theme', theme === 'light');
                if (theme === 'light') root.setAttribute('data-theme', 'light');
                try { localStorage.setItem('neon_theme', theme); } catch (e) {}
                const meta = document.querySelector('meta[name="theme-color"]');
                if (meta) meta.content = theme === 'light' ? '#f4f1f9' : '#0a0a0c';
                themeButton.setAttribute('aria-pressed', String(theme === 'light'));
                themeButton.title = theme === 'light' ? 'حالت شب' : 'حالت روز';
            }
            applyTheme(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
            themeButton.addEventListener('click', () => {
                applyTheme(root.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
            });

            const updateNav = () => navbar.classList.toggle('scrolled', window.scrollY > 30);
            window.addEventListener('scroll', updateNav, { passive: true });
            updateNav();

            document.addEventListener('keydown', event => {
                if (event.key === 'Escape' && menu.classList.contains('active')) setMenu(false);
            });

            const footerYear = document.getElementById('footerYear');
            try {
                footerYear.textContent = new Intl.DateTimeFormat('fa-IR', { year: 'numeric' }).format(new Date());
            } catch (e) {}
        }

        if (!DATA) {
            landing.hidden = true;
            results.hidden = false;
            allGrid.hidden = true;
            emptyState.hidden = false;
            document.getElementById('catalogResultsTitle').textContent = 'آرشیو در دسترس نیست';
            document.getElementById('catalogResultsDescription').textContent = 'لطفاً صفحه را دوباره بارگذاری کنید.';
            return;
        }

        document.getElementById('catalogTitleCount').textContent = toFa(DATA.list.length);
        document.getElementById('catalogGenreCount').textContent = toFa(DATA.genres.filter(genre => itemsForGenre(genre.id).length).length);
        renderGenreNav();
        setupSearch();
        setupShell();
        sortSelect.addEventListener('change', renderResultGrid);

        if (query || requestedGenre || showAll) renderResults();
        else renderLanding();
    });
})();
