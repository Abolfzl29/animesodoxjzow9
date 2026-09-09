document.addEventListener("DOMContentLoaded", () => {
    
    // 1. MOBILE MENU (HALF-SCREEN ULTRA GRAPHIC DRAWER)
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sideMenu = document.getElementById('sideMenu');
    const mobileBackdrop = document.getElementById('mobileBackdrop');
    const closeSideBtn = document.getElementById('closeSideBtn');
    const mobileVipBtn = document.getElementById('mobileVipBtn');

    function toggleMenu() {
        if(!sideMenu) return;
        const isActive = sideMenu.classList.contains('active');
        if (isActive) {
            sideMenu.classList.remove('active');
            if(mobileBackdrop) mobileBackdrop.classList.remove('active');
            if(hamburgerBtn) { hamburgerBtn.classList.remove('active'); hamburgerBtn.setAttribute('aria-expanded', 'false'); }
            document.body.style.overflow = '';
        } else {
            sideMenu.classList.add('active');
            if(mobileBackdrop) mobileBackdrop.classList.add('active');
            if(hamburgerBtn) { hamburgerBtn.classList.add('active'); hamburgerBtn.setAttribute('aria-expanded', 'true'); }
            document.body.style.overflow = 'hidden';
        }
    }

    if (hamburgerBtn) hamburgerBtn.addEventListener('click', toggleMenu);
    if (closeSideBtn) closeSideBtn.addEventListener('click', toggleMenu);
    if (mobileBackdrop) mobileBackdrop.addEventListener('click', toggleMenu);

    if(mobileVipBtn) {
        mobileVipBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleMenu();
            openVipModal();
        });
    }

    // 2. LIVE COUNTER ANIMATION
    const onlineCounter = document.getElementById('onlineCounter');
    if (onlineCounter) {
        let currentCount = 0;
        const targetCount = 12450;
        const duration = 3000;
        const step = targetCount / (duration / 16);

        function updateCounter() {
            currentCount += step;
            if (currentCount < targetCount) {
                onlineCounter.innerText = Math.floor(currentCount).toLocaleString();
                requestAnimationFrame(updateCounter);
            } else {
                onlineCounter.innerText = targetCount.toLocaleString();
                setInterval(() => {
                    const fluctuation = Math.floor(Math.random() * 10) - 5;
                    onlineCounter.innerText = (targetCount + fluctuation).toLocaleString();
                }, 3000);
            }
        }
        updateCounter();
    }

    // 3. TYPED.JS EFFECT (optional CDN enhancement)
    const typedTarget = document.querySelector('.typed-text');
    if (typedTarget && typeof window.Typed === 'function') {
        new window.Typed('.typed-text', {
            strings: ['اکشن خالص', 'سایبرپانک', 'شاهکار بصری', 'فانتزی تاریک'],
            typeSpeed: 50,
            backSpeed: 30,
            backDelay: 2000,
            loop: true,
            showCursor: true,
            cursorChar: '|'
        });
    } else if (typedTarget) {
        // Keep the rest of the homepage (especially search) functional if the
        // optional third-party script is unavailable.
        typedTarget.textContent = 'انیمه';
    }

    // 4. INTERACTIVE SCHEDULE TABS
    const scheduleTabs = document.querySelectorAll('.day-btn');
    const scheduleContent = document.getElementById('scheduleContent');

    const scheduleData = {
        0: [ 
            { title: "وان پیس", time: "۱۴:۳۰", img: "assets/img/one-piece.webp" },
            { title: "حمله به تایتان", time: "۱۶:۰۰", img: "assets/img/attack-on-titan-wallpaper.webp" },
            { title: "جوجوتسو کایسن", time: "۱۹:۳۰", img: "assets/img/jujutsu-kaisen.webp" }
        ],
        1: [ 
            { title: "دفترچه مرگ", time: "۱۸:۰۰", img: "assets/img/death-note.webp" },
            { title: "مرد اره‌ای", time: "۲۱:۰۰", img: "assets/img/chainsaw-man.webp" }
        ],
        2: [
            { title: "جوجوتسو کایسن", time: "۲۱:۳۰", img: "assets/img/jujutsu-kaisen.webp" },
            { title: "مرد اره‌ای", time: "۲۳:۰۰", img: "assets/img/chainsaw-man.webp" },
            { title: "سایبرپانک: اج‌رانرز", time: "۰۰:۳۰", img: "assets/img/cyberpunk-edgerunners-2.webp" }
        ],
        3: [ 
            { title: "شیطان کش", time: "۲۰:۰۰", img: "assets/img/demon-slayer.webp" },
            { title: "وان پیس", time: "۲۲:۰۰", img: "assets/img/one-piece.webp" }
        ],
        4: [ 
            { title: "اتک آن تایتان", time: "۲۲:۱۵", img: "assets/img/attack-on-titan-wallpaper.webp" },
            { title: "دفترچه مرگ", time: "۲۳:۳۰", img: "assets/img/death-note.webp" }
        ]
    };

    function renderSchedule(dayIndex) {
        if(!scheduleContent) return;
        scheduleContent.innerHTML = '';
        const items = scheduleData[dayIndex];
        
        if(items && items.length > 0) {
            items.forEach(item => {
                const catalog = window.NEON_ANIME;
                const match = catalog ? catalog.findByTitle(item.title) : null;
                const href = match && catalog.detailUrl ? catalog.detailUrl(match) : 'catalog.html';
                scheduleContent.innerHTML += `
                    <a class="schedule-card" href="${href}" data-anime="${match ? match.id : ''}">
                        <img src="${item.img}" alt="${item.title}">
                        <div class="schedule-info">
                            <h4>${item.title}</h4>
                            <p>ساعت ${item.time}</p>
                        </div>
                    </a>
                `;
            });
        } else {
            scheduleContent.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">پخشی برای این روز برنامه‌ریزی نشده است.</p>';
        }
    }

    if(scheduleTabs.length > 0) {
        renderSchedule(2);
        scheduleTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                scheduleTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderSchedule(tab.getAttribute('data-day'));
            });
        });
    }

    // 5. TOAST NOTIFICATIONS
    const toastContainer = document.getElementById('toastContainer');

    function showToast(message) {
        if(!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<span>✔️</span> ${message}`;
        toastContainer.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }
    window.showToast = showToast;

    const DATA = window.NEON_ANIME || null;
    function resolveAnimeFromElement(el) {
        if (!DATA) return null;
        const scope = el.closest('[data-anime]');
        if (scope && DATA.byId[scope.dataset.anime]) return DATA.byId[scope.dataset.anime];
        const container = el.closest('.anime-card, .slide, .details-content, .progress-card, .schedule-card') || document;
        const titleEl = container.querySelector('.sleek-title, .slide-title, #modalTitle, h3, h4');
        return titleEl ? DATA.findByTitle(titleEl.innerText) : null;
    }
    function getWatchlist() { try { return JSON.parse(localStorage.getItem('neon_watchlist') || '[]'); } catch (e) { return []; } }
    function toggleWatchlist(anime) {
        let list = getWatchlist();
        const inList = list.includes(anime.id);
        list = inList ? list.filter(id => id !== anime.id) : list.concat(anime.id);
        localStorage.setItem('neon_watchlist', JSON.stringify(list));
        return !inList;
    }

    document.querySelectorAll('.add-list-trigger, .action-btn[title="افزودن به لیست من"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const anime = resolveAnimeFromElement(btn);
            if (anime) {
                const added = toggleWatchlist(anime);
                showToast(added ? `«${anime.title}» به لیست تماشای شما اضافه شد.` : `«${anime.title}» از لیست تماشای شما حذف شد.`);
            } else {
                showToast('با موفقیت به لیست تماشای شما اضافه شد.');
            }
        });
    });

    // Play buttons -> go to the player page. The card/slide title is passed along
    // so watch.html can show the right anime (until a real backend provides ids).
    document.querySelectorAll('.play-trigger, .play-btn-small, .btn-play').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Buttons inside the pricing modal are not "play" buttons
            if (btn.closest('.pricing-card')) return;
            const anime = resolveAnimeFromElement(btn);
            if (anime) {
                const epAttr = btn.closest('[data-ep]');
                window.location.href = DATA.watchUrl(anime, epAttr ? parseInt(epAttr.dataset.ep, 10) : null);
                return;
            }
            const scope = btn.closest('.anime-card, .slide, .details-content, .progress-card') || document;
            const titleEl = scope.querySelector('.sleek-title, .slide-title, #modalTitle, h3, h4');
            const title = titleEl ? titleEl.innerText.trim() : '';
            window.location.href = 'watch.html' + (title ? '?title=' + encodeURIComponent(title) : '');
        });
    });

    document.querySelectorAll('.more-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const anime = resolveAnimeFromElement(btn);
            if (anime && DATA.detailUrl) window.location.href = DATA.detailUrl(anime);
        });
    });

    // 5a. CONTINUE WATCHING ROW ON THE HOME PAGE (from saved player progress)
    const continueSection = document.getElementById('continueSection');
    if (continueSection && DATA) {
        const row = document.getElementById('continueCards');
        const items = [];
        Object.keys(localStorage).forEach(k => {
            const m = k.match(/^neon_progress_(.+)_(\d+)$/);
            if (!m || !DATA.byId[m[1]]) return;
            const anime = DATA.byId[m[1]];
            const ep = anime.episodes.find(e => e.number === parseInt(m[2], 10)) || { number: parseInt(m[2], 10), season: anime.currentSeason };
            items.push({ anime, ep, ratio: parseFloat(localStorage.getItem(k)) || 0 });
        });
        if (items.length) {
            items.slice(0, 8).forEach(it => {
                const a = document.createElement('a');
                a.className = 'anime-card landscape';
                a.href = DATA.watchUrl(it.anime, it.ep.number);
                a.dataset.anime = it.anime.id;
                a.style.cssText = 'display:block; text-decoration:none; color:inherit;';
                a.innerHTML = `
                    <img src="${it.anime.banner}" alt="" class="card-static-img" loading="lazy" decoding="async">
                    <div class="card-overlay">
                        <div class="card-actions" style="margin-bottom: 5px;">
                            <span class="action-btn play-btn-small" title="ادامه پخش">▶</span>
                        </div>
                        <div class="card-details-sleek">
                            <h3 class="sleek-title"></h3>
                            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;"></div>
                        </div>
                    </div>
                    <div style="position:absolute; bottom:0; left:0; width:100%; height:4px; background:rgba(255,255,255,0.2); z-index:4;">
                        <div style="width: ${Math.round(it.ratio * 100)}%; height: 100%; background: var(--accent);"></div>
                    </div>`;
                a.querySelector('.sleek-title').textContent = it.anime.title;
                a.querySelector('.card-details-sleek div').textContent = `فصل ${DATA.toFa(it.ep.season)} - قسمت ${DATA.toFa(it.ep.number)}`;
                row.appendChild(a);
            });
            continueSection.style.display = '';
        }
    }

    // 5b. HOVER PREVIEW VIDEOS ON CARDS (lazy: only load/play while hovered, desktop only)
    if (window.matchMedia && window.matchMedia('(hover: hover)').matches) {
        document.querySelectorAll('.anime-card').forEach(card => {
            const vid = card.querySelector('.card-hover-video');
            if (!vid) return;
            let hoverTimer = null;
            card.addEventListener('mouseenter', () => {
                hoverTimer = setTimeout(() => {
                    if (vid.preload === 'none') vid.preload = 'metadata';
                    vid.play().catch(() => {});
                }, 400);
            });
            card.addEventListener('mouseleave', () => {
                clearTimeout(hoverTimer);
                vid.pause();
                vid.currentTime = 0;
            });
        });
    }

    // 6. Navbar Glass Effect
    const navbar = document.getElementById('navbar');
    if (navbar) {
        const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 30);
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    // 7. VIP MODAL LOGIC WITH GSAP ANIMATIONS
    const vipOpenBtn = document.getElementById('vipOpenBtn');
    const vipModal = document.getElementById('vipModal');
    const vipCloseBtn = document.getElementById('vipCloseBtn');
    const vipCloseBackdrop = document.getElementById('vipCloseBackdrop');

    function openVipModal() {
        if(!vipModal) return;
        vipModal.classList.add('active');
        document.body.style.overflow = 'hidden';

        const tl = gsap.timeline();
        tl.fromTo(vipCloseBackdrop, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.out" });
        tl.fromTo('.vip-header', { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, "-=0.2");
        tl.fromTo('.pricing-card', { y: 50, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: (i, target) => target.classList.contains('premium') ? 1.05 : 1, duration: 0.6, stagger: 0.1, ease: "back.out(1.5)" }, "-=0.3");
        tl.fromTo(vipCloseBtn, { scale: 0, opacity: 0, rotation: -90 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.5, ease: "back.out(1.5)" }, "-=0.5");
    }

    function closeVipModal() {
        gsap.to('.vip-modal-content', { y: 30, opacity: 0, duration: 0.3, ease: "power2.in" });
        gsap.to(vipCloseBackdrop, { opacity: 0, duration: 0.4, ease: "power2.in", onComplete: () => {
            vipModal.classList.remove('active');
            document.body.style.overflow = '';
            gsap.set('.vip-modal-content', { clearProps: "all" });
            gsap.set('.vip-header', { clearProps: "all" });
            gsap.set('.pricing-card', { clearProps: "all" });
            gsap.set(vipCloseBtn, { clearProps: "all" });
        }});
    }

    if (vipOpenBtn) vipOpenBtn.addEventListener('click', openVipModal);
    if (vipCloseBtn) vipCloseBtn.addEventListener('click', closeVipModal);
    if (vipCloseBackdrop) vipCloseBackdrop.addEventListener('click', closeVipModal);

    // 7b. PLAN SELECTION (demo checkout)
    // TODO(backend): replace with a redirect to the real payment gateway / checkout API.
    document.querySelectorAll('.plan-select-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const plan = btn.dataset.plan || '';
            const auth = window.NeonAuth;
            if (!auth || !auth.isLoggedIn()) {
                showToast('برای خرید اشتراک ابتدا وارد حساب شوید.');
                setTimeout(() => { window.location.href = 'login.html?next=' + encodeURIComponent('index.html?vip=1'); }, 900);
                return;
            }
            if (auth.currentUser().vip) { showToast('اشتراک ویژه شما هم‌اکنون فعال است.'); closeVipModal(); return; }
            auth.setVip(true);
            if (typeof auth.applyToChrome === 'function') auth.applyToChrome();
            showToast(`اشتراک ${plan} (نسخه نمایشی) فعال شد؛ درگاه پرداخت هنوز متصل نیست.`);
            closeVipModal();
        });
    });
    // Deep link: index.html?vip=1 opens the plans modal (used after login redirect).
    if (new URLSearchParams(window.location.search).get('vip') === '1') setTimeout(openVipModal, 400);

    // 8. THREE DOTS MENU
    const threeDotsBtn = document.getElementById('threeDotsBtn');
    const moreMenuDropdown = document.getElementById('moreMenuDropdown');
    
    if (threeDotsBtn && moreMenuDropdown) {
        threeDotsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            moreMenuDropdown.classList.toggle('active');
        });
        document.addEventListener('click', (e) => {
            if(!moreMenuDropdown.contains(e.target)) {
                moreMenuDropdown.classList.remove('active');
            }
        });
    }

    // 9. HERO SLIDER SWIPE LOGIC & AUTO-PLAY
    const heroSlider = document.getElementById('heroSlider');
    const slides = document.querySelectorAll('.hero-slider .slide');
    const dots = document.querySelectorAll('.slider-controls .dot');
    let currentSlide = 0;
    let sliderInterval;

    if (slides.length > 0) {
        function goToSlide(index) {
            slides.forEach(s => s.classList.remove('active'));
            dots.forEach(d => d.classList.remove('active'));

            slides[index].classList.add('active');
            if (dots[index]) dots[index].classList.add('active');

            slides.forEach((slide, i) => {
                const video = slide.querySelector('video');
                if (video) {
                    if (i === index) {
                        Promise.resolve(video.play()).catch(() => {});
                    } else {
                        video.pause();
                        video.currentTime = 0;
                    }
                }
            });
            currentSlide = index;
        }

        function nextSlide() {
            let next = (currentSlide + 1) % slides.length;
            goToSlide(next);
        }
        
        function prevSlide() {
            let prev = (currentSlide - 1 + slides.length) % slides.length;
            goToSlide(prev);
        }

        function startSlider() {
            clearInterval(sliderInterval);
            sliderInterval = setInterval(nextSlide, 7000);
        }

        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                goToSlide(index);
                startSlider(); // reset timer
            });
        });

        // Touch & Swipe Logic
        let touchStartX = 0;
        let touchEndX = 0;

        heroSlider.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        }, {passive: true});

        heroSlider.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, {passive: true});
        
        // Mouse drag logic
        let isDragging = false;
        heroSlider.addEventListener('mousedown', e => {
            isDragging = true;
            touchStartX = e.screenX;
        });
        heroSlider.addEventListener('mouseup', e => {
            if(!isDragging) return;
            touchEndX = e.screenX;
            isDragging = false;
            handleSwipe();
        });
        heroSlider.addEventListener('mouseleave', () => {
            isDragging = false;
        });

        function handleSwipe() {
            const threshold = 50; // minimum distance to be considered a swipe
            if (touchStartX - touchEndX > threshold) {
                // Swiped Left (Next) -> For RTL this might intuitively mean Prev, but usually swipe left = next slide
                nextSlide();
                startSlider();
            } else if (touchEndX - touchStartX > threshold) {
                // Swiped Right (Prev)
                prevSlide();
                startSlider();
            }
        }

        // Initialize
        goToSlide(0);
        startSlider();
    }

    // 10. FAQ ACCORDION LOGIC
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const questionBtn = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        
        questionBtn.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all others
            faqItems.forEach(otherItem => {
                otherItem.classList.remove('active');
                otherItem.querySelector('.faq-answer').style.maxHeight = null;
            });

            if (!isActive) {
                item.classList.add('active');
                answer.style.maxHeight = answer.scrollHeight + "px";
            }
        });
    });

    // 11. SEARCH MODAL LOGIC
    const searchBtnIcon = document.getElementById('searchBtnIcon');
    const searchModal = document.getElementById('searchModal');
    const searchCloseBtn = document.getElementById('searchCloseBtn');
    const searchInput = document.getElementById('searchInput');

    function openSearch() {
        if(!searchModal) return;
        searchModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        if (searchInput) setTimeout(() => searchInput.focus(), 400);
    }
    function closeSearch() {
        if(!searchModal) return;
        searchModal.classList.remove('active');
        document.body.style.overflow = '';
        if (searchInput) searchInput.value = '';
    }
    function submitSearch(query) {
        const q = (query || '').trim();
        if (!q) return;
        // Full-site search belongs to the dedicated catalogue, not only the
        // handful of cards rendered on the homepage.
        window.location.href = 'catalog.html?q=' + encodeURIComponent(q) + '#catalogResults';
    }

    if(searchBtnIcon) searchBtnIcon.addEventListener('click', openSearch);
    if(searchCloseBtn) searchCloseBtn.addEventListener('click', closeSearch);
    if (searchModal) {
        if (searchInput) {
            searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitSearch(searchInput.value); });
        }
        const searchSubmitBtn = searchModal.querySelector('.search-submit-btn');
        if (searchSubmitBtn) searchSubmitBtn.addEventListener('click', () => submitSearch(searchInput && searchInput.value));
        searchModal.querySelectorAll('.search-tag').forEach(tag => {
            tag.addEventListener('click', () => submitSearch(tag.innerText));
        });
    }

    // Client-side filtering of the trending row: ?q= from the search modal + genre chips
    const trendingSection = document.getElementById('trendingSection');
    if (trendingSection) {
        const cards = [...trendingSection.querySelectorAll('.anime-card')];
        const chips = [...trendingSection.querySelectorAll('.chip')];
        const rowTitle = trendingSection.querySelector('.row-title');
        const defaultTitle = rowTitle ? rowTitle.innerHTML : '';

        function applyFilter({ genre = 'all', query = '' } = {}) {
            const q = query.trim().toLowerCase();
            let visible = 0;
            cards.forEach(card => {
                const title = (card.querySelector('.sleek-title') || {}).innerText || '';
                const genres = (card.dataset.genre || '').split(/\s+/);
                const genreOk = genre === 'all' || genres.includes(genre);
                const queryOk = !q || title.toLowerCase().includes(q) || (card.dataset.keywords || '').toLowerCase().includes(q);
                const show = genreOk && queryOk;
                card.style.display = show ? '' : 'none';
                if (show) visible++;
            });
            let empty = trendingSection.querySelector('.filter-empty');
            if (!visible) {
                if (!empty) {
                    empty = document.createElement('p');
                    empty.className = 'filter-empty';
                    empty.style.cssText = 'color: var(--text-muted); padding: 30px 0; text-align: center;';
                    trendingSection.appendChild(empty);
                }
                empty.innerText = q ? `نتیجه‌ای برای «${query.trim()}» پیدا نشد.` : 'موردی در این دسته وجود ندارد.';
            } else if (empty) {
                empty.remove();
            }
            if (rowTitle) rowTitle.innerHTML = q ? `نتایج جستجو برای: <span class="accent">${query.trim().replace(/</g, '&lt;')}</span>` : defaultTitle;
        }

        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                chips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                applyFilter({ genre: chip.dataset.genre || 'all' });
            });
        });

        const params = new URLSearchParams(window.location.search);
        if (params.get('q')) {
            applyFilter({ query: params.get('q') });
            setTimeout(() => trendingSection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
        } else if (params.get('genre')) {
            const chip = chips.find(c => c.dataset.genre === params.get('genre'));
            if (chip) chip.click();
            setTimeout(() => trendingSection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
        }
    }

    // 12. "COMING SOON" LINKS
    document.querySelectorAll('a[href="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showToast(link.classList.contains('coming-soon') ? 'این بخش به‌زودی راه‌اندازی می‌شود.' : 'این بخش هنوز فعال نیست.');
            // Close side menu if it's open
            if (sideMenu && sideMenu.classList.contains('active')) toggleMenu();
        });
    });

    // 20. NOTIFICATION DROPDOWN LOGIC
    const bellBtnIcon = document.getElementById('bellBtnIcon');
    const notificationDropdown = document.getElementById('notificationDropdown');
    
    if(bellBtnIcon && notificationDropdown) {
        bellBtnIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationDropdown.classList.toggle('active');
            
            // Remove red dot when opened
            const dot = bellBtnIcon.querySelector('.notification-dot');
            if(dot) dot.style.display = 'none';
        });
        
        document.addEventListener('click', (e) => {
            if(!notificationDropdown.contains(e.target) && !bellBtnIcon.contains(e.target)) {
                notificationDropdown.classList.remove('active');
            }
        });
        
        // Mark all as read
        const markRead = document.querySelector('.mark-read');
        if(markRead) {
            markRead.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.notif-item.unread').forEach(item => {
                    item.classList.remove('unread');
                });
                showToast('همه اعلانات خوانده شدند.');
            });
        }
    }

    // 13. SUBSCRIBE FORM LOGIC
    const subscribeForm = document.getElementById('subscribeForm');
    const subscribeBtn = document.getElementById('subscribeBtn');
    if(subscribeForm) {
        subscribeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const originalText = subscribeBtn.innerText;
            subscribeBtn.innerText = 'در حال ثبت...';
            subscribeBtn.style.opacity = '0.8';
            
            setTimeout(() => {
                subscribeBtn.innerText = 'ثبت شد ✔️';
                subscribeBtn.style.background = '#46d369';
                subscribeBtn.style.opacity = '1';
                showToast('ایمیل شما با موفقیت در خبرنامه ثبت شد!');
                
                setTimeout(() => {
                    subscribeBtn.innerText = originalText;
                    subscribeBtn.style.background = '';
                    subscribeForm.reset();
                }, 3000);
            }, 1500);
        });
    }

    // 14. SCROLL REVEAL ANIMATIONS (Intersection Observer)
    const revealElements = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if(entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target); // Reveal only once
            }
        });
    }, { threshold: 0.15, rootMargin: "0px 0px -50px 0px" });

    revealElements.forEach(el => revealObserver.observe(el));

    // 16. BACK TO TOP BUTTON
    const backToTopBtn = document.getElementById('backToTop');
    if(backToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 500) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        });

        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // 17. RADIO WIDGET LOGIC (the widget markup does not exist yet -> only a toast for now)
    const radioVisualizer = document.querySelector('.audio-visualizer');
    const radioWidget = document.getElementById('radioWidget');
    const radioCloseBtn = document.getElementById('radioCloseBtn');
    const radioPlayBtn = document.getElementById('radioPlayBtn');

    if (radioVisualizer) {
        radioVisualizer.addEventListener('click', () => {
            if (!radioWidget) {
                showToast('رادیو انیمه به‌زودی فعال می‌شود 🎵');
                return;
            }
            radioWidget.classList.toggle('active');
            showToast('رادیو انیمه فعال شد 🎵');
        });
    }
    if (radioWidget && radioCloseBtn) {
        radioCloseBtn.addEventListener('click', () => radioWidget.classList.remove('active'));
    }
    if (radioWidget && radioPlayBtn && radioVisualizer) {
        let isPlaying = true;
        radioPlayBtn.addEventListener('click', () => {
            isPlaying = !isPlaying;
            radioPlayBtn.innerText = isPlaying ? '⏸' : '▶';
            const img = radioWidget.querySelector('img');
            if (img) img.style.animationPlayState = isPlaying ? 'running' : 'paused';
            radioVisualizer.querySelectorAll('span').forEach(span => {
                span.style.animationPlayState = isPlaying ? 'running' : 'paused';
            });
        });
    }

    // 18. DRAG TO SCROLL FOR HORIZONTAL GRIDS (desktop mouse)
    const sliders = document.querySelectorAll('.cards-container, .top-10-row, .characters-row, .reviews-row, .schedule-days');
    sliders.forEach(slider => {
        let isDown = false;
        let startX = 0;
        let scrollLeft = 0;
        let moved = false;

        slider.addEventListener('mousedown', (e) => {
            isDown = true;
            moved = false;
            slider.classList.add('dragging');
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
        });
        const stop = () => {
            isDown = false;
            slider.classList.remove('dragging');
        };
        slider.addEventListener('mouseleave', stop);
        slider.addEventListener('mouseup', stop);
        slider.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 2;
            if (Math.abs(walk) > 5) moved = true;
            slider.scrollLeft = scrollLeft - walk;
        });
        // Swallow the click that follows a drag so cards don't open accidentally
        slider.addEventListener('click', (e) => {
            if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; }
        }, true);
    });

    // 19. ANIME DETAILS MODAL LOGIC
    const detailsModal = document.getElementById('detailsModal');
    const detailsCloseBtn = document.getElementById('detailsCloseBtn');
    const detailsBackdrop = document.getElementById('detailsBackdrop');

    if (detailsModal) {
        const modalTitle = document.getElementById('modalTitle');
        const modalHeroImg = document.getElementById('modalHeroImg');

        document.querySelectorAll('.anime-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.action-btn')) return;
                // Resume / player links must keep going to watch.html.
                if (card.closest('#continueSection, #continueCards, #continueRow')) return;
                if (card.getAttribute('href') && /watch\.html/.test(card.getAttribute('href'))) return;
                const anime = resolveAnimeFromElement(card);
                if (anime && DATA && DATA.detailUrl) {
                    e.preventDefault();
                    window.location.href = DATA.detailUrl(anime);
                    return;
                }
                const titleEl = card.querySelector('.sleek-title, .glass-card-title');
                const imgEl = card.querySelector('img');
                if (titleEl && modalTitle) modalTitle.innerText = titleEl.innerText;
                if (imgEl && modalHeroImg) modalHeroImg.src = imgEl.src;
                detailsModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        });

        const closeDetails = () => {
            detailsModal.classList.remove('active');
            document.body.style.overflow = '';
        };
        if (detailsCloseBtn) detailsCloseBtn.addEventListener('click', closeDetails);
        if (detailsBackdrop) detailsBackdrop.addEventListener('click', closeDetails);

        // Tabs inside the details modal
        const dTabs = detailsModal.querySelectorAll('.d-tab');
        dTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                dTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
            });
        });
    }

    // Footer year (Persian calendar)
    const footerYear = document.getElementById('footerYear');
    if (footerYear) {
        try { footerYear.textContent = new Intl.DateTimeFormat('fa-IR', { year: 'numeric' }).format(new Date()); } catch (e) {}
    }

    // 19b. DAY / NIGHT THEME TOGGLE
    (function initThemeToggle() {
        const root = document.documentElement;
        function currentTheme() {
            return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        }
        function applyTheme(theme) {
            if (theme === 'light') root.setAttribute('data-theme', 'light');
            else root.removeAttribute('data-theme');
            try { localStorage.setItem('neon_theme', theme); } catch (e) {}
            const metaTheme = document.querySelector('meta[name="theme-color"]');
            if (metaTheme) metaTheme.setAttribute('content', theme === 'light' ? '#f4f1f9' : '#0a0a0c');
            document.querySelectorAll('#themeToggleBtn').forEach(btn => {
                btn.setAttribute('aria-pressed', String(theme === 'light'));
                btn.title = theme === 'light' ? 'حالت شب' : 'حالت روز';
            });
        }
        // Keep buttons in sync with the theme already applied by the head script
        applyTheme(currentTheme());
        document.querySelectorAll('#themeToggleBtn').forEach(btn => {
            btn.addEventListener('click', () => {
                applyTheme(currentTheme() === 'light' ? 'dark' : 'light');
            });
        });
    })();

    // 20. CLOSE ANY OPEN OVERLAY WITH ESCAPE
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (searchModal && searchModal.classList.contains('active')) closeSearch();
        if (vipModal && vipModal.classList.contains('active')) closeVipModal();
        if (detailsModal && detailsModal.classList.contains('active')) {
            detailsModal.classList.remove('active');
            document.body.style.overflow = '';
        }
        if (sideMenu && sideMenu.classList.contains('active')) toggleMenu();
        if (notificationDropdown) notificationDropdown.classList.remove('active');
        if (moreMenuDropdown) moreMenuDropdown.classList.remove('active');
    });

});
