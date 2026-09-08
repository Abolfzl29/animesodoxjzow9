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
            if(hamburgerBtn) hamburgerBtn.classList.remove('active');
            document.body.style.overflow = '';
        } else {
            sideMenu.classList.add('active');
            if(mobileBackdrop) mobileBackdrop.classList.add('active');
            if(hamburgerBtn) hamburgerBtn.classList.add('active');
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

    // 3. TYPED.JS EFFECT
    if (document.querySelector('.typed-text')) {
        new Typed('.typed-text', {
            strings: ['اکشن خالص', 'سایبرپانک', 'شاهکار بصری', 'فانتزی تاریک'],
            typeSpeed: 50,
            backSpeed: 30,
            backDelay: 2000,
            loop: true,
            showCursor: true,
            cursorChar: '|'
        });
    }

    // 4. INTERACTIVE SCHEDULE TABS
    const scheduleTabs = document.querySelectorAll('.day-btn');
    const scheduleContent = document.getElementById('scheduleContent');

    const scheduleData = {
        0: [ 
            { title: "وان پیس", time: "۱۴:۳۰", img: "image-search/one-piece-anime-poster-high-quality-2.webp" },
            { title: "حمله به تایتان", time: "۱۶:۰۰", img: "image-search/attack-on-titan-final-season-desktop-wal-1.jpg" },
            { title: "جوجوتسو کایسن", time: "۱۹:۳۰", img: "image-search/jujutsu-kaisen-anime-poster-high-quality-1.jpg" }
        ],
        1: [ 
            { title: "دفترچه مرگ", time: "۱۸:۰۰", img: "image-search/death-note-anime-poster-high-quality-1.webp" },
            { title: "مرد اره‌ای", time: "۲۱:۰۰", img: "image-search/chainsaw-man-anime-poster-high-quality-1.webp" }
        ],
        2: [
            { title: "جوجوتسو کایسن", time: "۲۱:۳۰", img: "image-search/jujutsu-kaisen-anime-poster-high-quality-1.jpg" },
            { title: "مرد اره‌ای", time: "۲۳:۰۰", img: "image-search/chainsaw-man-anime-poster-high-quality-1.webp" },
            { title: "سایبرپانک: اج‌رانرز", time: "۰۰:۳۰", img: "image-search/cyberpunk-edgerunners-official-desktop-w-1.webp" }
        ],
        3: [ 
            { title: "شیطان کش", time: "۲۰:۰۰", img: "image-search/demon-slayer-anime-poster-high-quality-1.png" },
            { title: "وان پیس", time: "۲۲:۰۰", img: "image-search/one-piece-anime-poster-high-quality-2.webp" }
        ],
        4: [ 
            { title: "اتک آن تایتان", time: "۲۲:۱۵", img: "image-search/attack-on-titan-final-season-desktop-wal-1.jpg" },
            { title: "دفترچه مرگ", time: "۲۳:۳۰", img: "image-search/death-note-anime-poster-high-quality-1.webp" }
        ]
    };

    function renderSchedule(dayIndex) {
        if(!scheduleContent) return;
        scheduleContent.innerHTML = '';
        const items = scheduleData[dayIndex];
        
        if(items && items.length > 0) {
            items.forEach(item => {
                scheduleContent.innerHTML += `
                    <div class="schedule-card">
                        <img src="${item.img}" alt="${item.title}">
                        <div class="schedule-info">
                            <h4>${item.title}</h4>
                            <p>ساعت ${item.time}</p>
                        </div>
                    </div>
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
    const playerModal = document.getElementById('playerModal');

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

    document.querySelectorAll('.add-list-trigger, .action-btn[title="افزودن به لیست من"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showToast('با موفقیت به لیست تماشای شما اضافه شد.');
        });
    });

    document.querySelectorAll('.play-trigger, .play-btn-small, .btn-play').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if(playerModal) {
                playerModal.classList.add('active');
                setTimeout(() => {
                    playerModal.classList.remove('active');
                    showToast('شبیه‌سازی: انتقال به صفحه پخش انجام شد.');
                }, 2000);
            }
        });
    });

    // 6. Navbar Glass Effect
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 30) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
    });

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
                        video.play().catch(e => console.log('Auto-play prevented', e));
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
        setTimeout(() => searchInput.focus(), 400);
    }
    function closeSearch() {
        if(!searchModal) return;
        searchModal.classList.remove('active');
        document.body.style.overflow = '';
        searchInput.value = '';
    }

    if(searchBtnIcon) searchBtnIcon.addEventListener('click', openSearch);
    if(searchCloseBtn) searchCloseBtn.addEventListener('click', closeSearch);

    // 12. DUMMY LINKS & NOTIFICATIONS HANDLER
    document.querySelectorAll('a[href="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showToast('این بخش در نسخه دمو غیرفعال است.');
            // Close side menu if it's open
            if(document.getElementById('sideMenu').classList.contains('active')) {
                document.getElementById('closeSideBtn').click();
            }
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

});
    // 17. RADIO WIDGET LOGIC
    const radioVisualizer = document.querySelector('.audio-visualizer');
    const radioWidget = document.getElementById('radioWidget');
    const radioCloseBtn = document.getElementById('radioCloseBtn');
    const radioPlayBtn = document.getElementById('radioPlayBtn');
    
    if(radioVisualizer && radioWidget) {
        radioVisualizer.addEventListener('click', () => {
            radioWidget.classList.toggle('active');
            showToast('رادیو انیمه فعال شد 🎵');
        });
        radioCloseBtn.addEventListener('click', () => {
            radioWidget.classList.remove('active');
        });
        
        let isPlaying = true;
        radioPlayBtn.addEventListener('click', () => {
            isPlaying = !isPlaying;
            radioPlayBtn.innerText = isPlaying ? '⏸' : '▶';
            const img = radioWidget.querySelector('img');
            
            if(isPlaying) {
                img.style.animationPlayState = 'running';
            } else {
                img.style.animationPlayState = 'paused';
            }
            
            // Toggle visualizer animation in navbar
            const spans = radioVisualizer.querySelectorAll('span');
            spans.forEach(span => {
                span.style.animationPlayState = isPlaying ? 'running' : 'paused';
            });
        
    // 18. DRAG TO SCROLL FOR HORIZONTAL GRIDS
    const sliders = document.querySelectorAll('.cards-container, .top-10-row, .characters-row, .reviews-row, .schedule-nav');
    let isDown = false;
    let startX;
    let scrollLeft;

    sliders.forEach(slider => {
        slider.addEventListener('mousedown', (e) => {
            isDown = true;
            slider.style.cursor = 'grabbing';
            slider.style.scrollSnapType = 'none';
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
        });
        slider.addEventListener('mouseleave', () => {
            isDown = false;
            slider.style.cursor = 'grab';
            slider.style.scrollSnapType = 'x mandatory';
        });
        slider.addEventListener('mouseup', () => {
            isDown = false;
            slider.style.cursor = 'grab';
            slider.style.scrollSnapType = 'x mandatory';
        });
        slider.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 2;
            slider.scrollLeft = scrollLeft - walk;
        });
    });

});
    }

    // 19. ANIME DETAILS MODAL LOGIC
    const detailsModal = document.getElementById('detailsModal');
    const detailsCloseBtn = document.getElementById('detailsCloseBtn');
    const detailsBackdrop = document.getElementById('detailsBackdrop');
    
    if(detailsModal) {
        // Open modal when clicking on any anime card
        const allCards = document.querySelectorAll('.anime-card');
        allCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't open if clicking on play/add buttons
                if(e.target.closest('.action-btn')) return;
                
                // Get data from card to populate modal
                const titleEl = card.querySelector('.sleek-title, .glass-card-title');
                const imgEl = card.querySelector('img');
                
                if(titleEl && imgEl) {
                    document.getElementById('modalTitle').innerText = titleEl.innerText;
                    document.getElementById('modalHeroImg').src = imgEl.src;
                }
                
                detailsModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        });

        const closeDetails = () => {
            detailsModal.classList.remove('active');
            document.body.style.overflow = '';
        };

        if(detailsCloseBtn) detailsCloseBtn.addEventListener('click', closeDetails);
        if(detailsBackdrop) detailsBackdrop.addEventListener('click', closeDetails);
    }

    