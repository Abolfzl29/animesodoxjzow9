/* mag.js — logic for mag.html and article.html (also anime suggestion) */
(function () {
    var MAG = window.NEON_MAG;
    var ANIME = window.NEON_ANIME;
    if (!MAG || !ANIME) return;

    function toFa(n) { return ANIME.toFa ? ANIME.toFa(n) : String(n); }
    function esc(str) { return String(str); }

    function createEl(tag, cls, text) {
        var el = document.createElement(tag);
        if (cls) el.className = cls;
        if (text !== undefined) el.textContent = text;
        return el;
    }

    function catLabel(cat) {
        if (cat === 'news') return 'خبر';
        if (cat === 'review') return 'نقد';
        if (cat === 'intro') return 'معرفی';
        return cat;
    }
    function catClass(cat) {
        if (cat === 'news') return 'mag-badge--news';
        if (cat === 'review') return 'mag-badge--review';
        return 'mag-badge--intro';
    }
    function articleCatClass(cat) {
        if (cat === 'news') return 'article-cat-badge--news';
        if (cat === 'review') return 'article-cat-badge--review';
        return 'article-cat-badge--intro';
    }

    function getParams() {
        var p = new URLSearchParams(window.location.search);
        return {
            cat: (p.get('cat') || 'all').trim(),
            q: (p.get('q') || '').trim(),
            tag: (p.get('tag') || '').trim(),
            slug: (p.get('slug') || '').trim()
        };
    }

    function updateQuery(params) {
        var url = new URL(window.location.href);
        var sp = url.searchParams;
        if (params.cat && params.cat !== 'all') sp.set('cat', params.cat); else sp.delete('cat');
        if (params.q) sp.set('q', params.q); else sp.delete('q');
        if (params.tag) sp.set('tag', params.tag); else sp.delete('tag');
        // keep slug for article pages? no
        history.replaceState(null, '', url.pathname + (sp.toString() ? '?' + sp.toString() : '') + window.location.hash);
    }

    /* -------------------- MAG LIST PAGE -------------------- */
    var magGrid = document.getElementById('magGrid');
    if (magGrid) {
        var searchInput = document.getElementById('magSearch');
        var searchClear = document.getElementById('magSearchClear');
        var tabsWrap = document.getElementById('magTabs');
        var featuredWrap = document.getElementById('magFeatured');
        var emptyEl = document.getElementById('magEmpty');
        var moreBtn = document.getElementById('magMoreBtn');
        var activeFilterWrap = document.getElementById('magActiveFilter');
        var resultInfo = document.getElementById('magResultInfo');

        var params = getParams();
        var currentCat = ['all','news','review','intro'].indexOf(params.cat) !== -1 ? params.cat : 'all';
        var currentQ = params.q;
        var currentTag = params.tag;
        var pageSize = 6;
        var visibleCount = pageSize;

        if (searchInput) searchInput.value = currentQ;

        // build tabs with counters
        function renderTabs() {
            if (!tabsWrap) return;
            tabsWrap.replaceChildren();
            var cats = [
                { id: 'all', label: 'همه' },
                { id: 'news', label: 'خبر' },
                { id: 'review', label: 'نقد' },
                { id: 'intro', label: 'معرفی' }
            ];
            cats.forEach(function (c) {
                var count = c.id === 'all' ? MAG.list.length : MAG.byCategory(c.id).length;
                var a = createEl('a', 'mag-tab' + (currentCat === c.id ? ' is-active' : ''));
                a.href = MAG.catUrl(c.id) + (currentQ ? (c.id === 'all' ? '?q=' : '&q=') + encodeURIComponent(currentQ) : '') + (currentTag ? ((c.id === 'all' && !currentQ ? '?' : '&') + 'tag=' + encodeURIComponent(currentTag)) : '');
                // For JS handling without reload we intercept
                a.addEventListener('click', function (e) {
                    e.preventDefault();
                    currentCat = c.id;
                    visibleCount = pageSize;
                    updateQuery({ cat: currentCat, q: currentQ, tag: currentTag });
                    render();
                });
                var label = createEl('span', '', c.label);
                var cnt = createEl('span', 'mag-tab__count', toFa(count));
                a.appendChild(label);
                a.appendChild(cnt);
                tabsWrap.appendChild(a);
            });
        }

        function getFiltered() {
            var list = currentCat === 'all' ? MAG.list.slice() : MAG.byCategory(currentCat);
            // tag filter (exact tag)
            if (currentTag) {
                var nt = MAG.normalize(currentTag);
                list = list.filter(function (a) { return a.tags.some(function (t) { return MAG.normalize(t) === nt; }); });
            }
            // search filter (simultaneous)
            if (currentQ) {
                var terms = MAG.normalize(currentQ).split(' ').filter(Boolean);
                list = list.filter(function (a) {
                    var hay = MAG.normalize([a.title, a.excerpt, a.tags.join(' ')].join(' '));
                    return terms.every(function (t) { return hay.indexOf(t) !== -1; });
                });
            }
            // sort newest first by date
            list.sort(function (a, b) { return b.date.localeCompare(a.date); });
            return list;
        }

        function renderFeatured(filtered) {
            if (!featuredWrap) return;
            featuredWrap.replaceChildren();
            if (currentQ || currentTag || currentCat !== 'all') {
                featuredWrap.hidden = true;
                return;
            }
            var feat = MAG.getFeatured();
            if (!feat) { featuredWrap.hidden = true; return; }
            featuredWrap.hidden = false;
            var media = createEl('div', 'mag-featured__media');
            var img = createEl('img');
            img.src = feat.image;
            img.alt = feat.title;
            img.loading = 'lazy';
            media.appendChild(img);
            var badge = createEl('span', 'mag-featured__badge ' + catClass(feat.category), catLabel(feat.category));
            media.appendChild(badge);
            var body = createEl('div', 'mag-featured__body');
            var meta = createEl('div', 'mag-featured__meta');
            var dateSpan = createEl('span', '', feat.dateLabel + ' • ' + feat.readTime);
            var authorSpan = createEl('span', '', 'نویسنده: ' + feat.author);
            meta.appendChild(dateSpan);
            meta.appendChild(authorSpan);
            if (feat.score) {
                var score = createEl('span', 'article-score', '★ ' + toFa(feat.score));
                meta.appendChild(score);
            }
            var title = createEl('a', 'mag-featured__title', feat.title);
            title.href = MAG.articleUrl(feat);
            var excerpt = createEl('p', 'mag-featured__excerpt', feat.excerpt);
            var link = createEl('a', 'mag-featured__link', 'مطالعه مطلب ›');
            link.href = MAG.articleUrl(feat);
            body.appendChild(meta);
            body.appendChild(title);
            body.appendChild(excerpt);
            body.appendChild(link);
            featuredWrap.appendChild(media);
            featuredWrap.appendChild(body);
        }

        function renderCards(list) {
            magGrid.replaceChildren();
            if (!list.length) {
                emptyEl.hidden = false;
                if (moreBtn) moreBtn.hidden = true;
                if (resultInfo) resultInfo.textContent = 'نتیجه‌ای یافت نشد';
                return;
            }
            emptyEl.hidden = true;
            var toShow = list.slice(0, visibleCount);
            toShow.forEach(function (a) {
                var card = createEl('a', 'mag-card');
                card.href = MAG.articleUrl(a);
                var media = createEl('div', 'mag-card__media');
                var img = createEl('img');
                img.src = a.image;
                img.alt = a.title;
                img.loading = 'lazy';
                media.appendChild(img);
                var badge = createEl('span', 'mag-badge ' + catClass(a.category), catLabel(a.category));
                media.appendChild(badge);
                var body = createEl('div', 'mag-card__body');
                var title = createEl('h3', 'mag-card__title', a.title);
                var excerpt = createEl('p', 'mag-card__excerpt', a.excerpt);
                var footer = createEl('div', 'mag-card__footer');
                var dateEl = createEl('span', '', a.dateLabel);
                var read = createEl('span', '', a.readTime);
                footer.appendChild(dateEl);
                footer.appendChild(read);
                body.appendChild(title);
                body.appendChild(excerpt);
                // tags row
                if (a.tags && a.tags.length) {
                    var tagsWrap = createEl('div', 'mag-card__tags');
                    a.tags.slice(0,3).forEach(function (t) {
                        var tagLink = createEl('a', 'mag-tag', '#' + t);
                        tagLink.href = 'mag.html?tag=' + encodeURIComponent(t);
                        tagLink.addEventListener('click', function (e) {
                            e.preventDefault();
                            e.stopPropagation();
                            currentTag = t;
                            currentQ = '';
                            if (searchInput) searchInput.value = '';
                            visibleCount = pageSize;
                            updateQuery({ cat: currentCat, q: currentQ, tag: currentTag });
                            render();
                        });
                        tagsWrap.appendChild(tagLink);
                    });
                    body.appendChild(tagsWrap);
                }
                if (a.score) {
                    var scoreRow = createEl('div', 'article-score', '★ ' + toFa(a.score));
                    scoreRow.style.marginTop = '6px';
                    scoreRow.style.alignSelf = 'flex-start';
                    scoreRow.style.fontSize = '0.78rem';
                    body.appendChild(scoreRow);
                }
                body.appendChild(footer);
                card.appendChild(media);
                card.appendChild(body);
                magGrid.appendChild(card);
            });
            if (moreBtn) {
                if (list.length > visibleCount) {
                    moreBtn.hidden = false;
                    moreBtn.textContent = 'نمایش بیشتر (' + toFa(list.length - visibleCount) + ' مطلب دیگر)';
                } else {
                    moreBtn.hidden = true;
                }
            }
            if (resultInfo) {
                var totalFa = toFa(list.length);
                var shownFa = toFa(toShow.length);
                if (currentQ || currentTag || currentCat !== 'all') {
                    resultInfo.textContent = shownFa + ' از ' + totalFa + ' مطلب';
                } else {
                    resultInfo.textContent = totalFa + ' مطلب';
                }
            }
        }

        function renderActiveFilter() {
            if (!activeFilterWrap) return;
            activeFilterWrap.replaceChildren();
            if (currentTag) {
                var chip = createEl('div', 'mag-active-filter');
                var label = createEl('span', '', 'تگ: #' + currentTag);
                var btn = createEl('button', '', '✕');
                btn.type = 'button';
                btn.setAttribute('aria-label', 'حذف فیلتر تگ');
                btn.addEventListener('click', function () {
                    currentTag = '';
                    visibleCount = pageSize;
                    updateQuery({ cat: currentCat, q: currentQ, tag: currentTag });
                    render();
                });
                chip.appendChild(label);
                chip.appendChild(btn);
                activeFilterWrap.appendChild(chip);
            }
            if (currentQ) {
                var qChip = createEl('div', 'mag-active-filter');
                var qLabel = createEl('span', '', 'جستجو: «' + currentQ + '»');
                var qBtn = createEl('button', '', '✕');
                qBtn.type = 'button';
                qBtn.setAttribute('aria-label', 'حذف جستجو');
                qBtn.addEventListener('click', function () {
                    currentQ = '';
                    if (searchInput) searchInput.value = '';
                    visibleCount = pageSize;
                    updateQuery({ cat: currentCat, q: currentQ, tag: currentTag });
                    render();
                });
                qChip.appendChild(qLabel);
                qChip.appendChild(qBtn);
                activeFilterWrap.appendChild(qChip);
            }
        }

        function render() {
            renderTabs();
            var filtered = getFiltered();
            renderFeatured(filtered);
            renderActiveFilter();
            renderCards(filtered);
        }

        // Search handling
        var searchDebounce = null;
        if (searchInput) {
            searchInput.addEventListener('input', function () {
                clearTimeout(searchDebounce);
                searchDebounce = setTimeout(function () {
                    currentQ = searchInput.value.trim();
                    visibleCount = pageSize;
                    updateQuery({ cat: currentCat, q: currentQ, tag: currentTag });
                    render();
                    if (searchClear) {
                        if (currentQ) searchClear.classList.add('visible');
                        else searchClear.classList.remove('visible');
                    }
                }, 250);
            });
            // Enter navigates anyway, we already handle live
            searchInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    currentQ = searchInput.value.trim();
                    visibleCount = pageSize;
                    updateQuery({ cat: currentCat, q: currentQ, tag: currentTag });
                    render();
                }
            });
            if (searchClear) {
                searchClear.addEventListener('click', function () {
                    searchInput.value = '';
                    currentQ = '';
                    visibleCount = pageSize;
                    updateQuery({ cat: currentCat, q: currentQ, tag: currentTag });
                    render();
                    searchClear.classList.remove('visible');
                    searchInput.focus();
                });
                if (currentQ) searchClear.classList.add('visible');
            }
            // wrap in form? prevent submit reload
            var searchForm = document.getElementById('magSearchForm');
            if (searchForm) {
                searchForm.addEventListener('submit', function (e) {
                    e.preventDefault();
                    currentQ = searchInput.value.trim();
                    visibleCount = pageSize;
                    updateQuery({ cat: currentCat, q: currentQ, tag: currentTag });
                    render();
                });
            }
        }

        if (moreBtn) {
            moreBtn.addEventListener('click', function () {
                visibleCount += pageSize;
                renderCards(getFiltered());
            });
        }

        render();
    }

    /* -------------------- ARTICLE PAGE -------------------- */
    var articleRoot = document.getElementById('articleRoot');
    if (articleRoot) {
        var params2 = getParams();
        var slug = params2.slug;
        var article = MAG.bySlug[slug] || null;
        var notFoundWrap = document.getElementById('articleNotFound');
        var latestGrid = document.getElementById('articleLatestGrid');

        function renderArticle(a) {
            var catBadge = document.getElementById('articleCatBadge');
            if (catBadge) {
                catBadge.textContent = catLabel(a.category);
                catBadge.className = 'article-cat-badge ' + articleCatClass(a.category);
            }
            var titleEl = document.getElementById('articleTitle');
            if (titleEl) titleEl.textContent = a.title;
            var excerptEl = document.getElementById('articleExcerpt');
            if (excerptEl) excerptEl.textContent = a.excerpt;
            var authorEl = document.getElementById('articleAuthor');
            if (authorEl) authorEl.textContent = a.author;
            var dateEl = document.getElementById('articleDate');
            if (dateEl) dateEl.textContent = a.dateLabel;
            var readEl = document.getElementById('articleReadTime');
            if (readEl) readEl.textContent = a.readTime;
            var scoreWrap = document.getElementById('articleScoreWrap');
            if (scoreWrap) {
                if (a.score) {
                    scoreWrap.hidden = false;
                    var scoreVal = document.getElementById('articleScore');
                    if (scoreVal) scoreVal.textContent = '★ ' + toFa(a.score) + ' / ' + toFa(10);
                } else {
                    scoreWrap.hidden = true;
                }
            }
            var imgEl = document.getElementById('articleImage');
            if (imgEl) {
                imgEl.src = a.image;
                imgEl.alt = a.title;
            }
            // breadcrumb
            var bcCat = document.getElementById('articleBcCat');
            if (bcCat) { bcCat.textContent = catLabel(a.category); bcCat.href = MAG.catUrl(a.category); }

            // body
            var bodyWrap = document.getElementById('articleBody');
            if (bodyWrap) {
                bodyWrap.replaceChildren();
                a.body.forEach(function (block) {
                    if (block.h) {
                        var h = createEl('h2', '', block.h);
                        bodyWrap.appendChild(h);
                    } else if (block.p) {
                        var p = createEl('p', '', block.p);
                        bodyWrap.appendChild(p);
                    } else if (block.q) {
                        var q = createEl('blockquote', '', block.q);
                        bodyWrap.appendChild(q);
                    } else if (block.ul) {
                        var ul = createEl('ul');
                        block.ul.forEach(function (liText) {
                            var li = createEl('li', '', liText);
                            ul.appendChild(li);
                        });
                        bodyWrap.appendChild(ul);
                    }
                });
            }
            // tags
            var tagsWrap = document.getElementById('articleTags');
            if (tagsWrap) {
                tagsWrap.replaceChildren();
                a.tags.forEach(function (t) {
                    var link = createEl('a', 'mag-tag', '#' + t);
                    link.href = 'mag.html?tag=' + encodeURIComponent(t);
                    tagsWrap.appendChild(link);
                });
            }
            // anime box
            var animeBox = document.getElementById('articleAnimeBox');
            if (animeBox) {
                var animeData = ANIME.byId[a.anime];
                if (animeData) {
                    animeBox.hidden = false;
                    var animeImg = document.getElementById('articleAnimeImg');
                    if (animeImg) { animeImg.src = animeData.poster; animeImg.alt = animeData.title; }
                    var animeTitle = document.getElementById('articleAnimeTitle');
                    if (animeTitle) animeTitle.textContent = animeData.title;
                    var animeDesc = document.getElementById('articleAnimeDesc');
                    if (animeDesc) animeDesc.textContent = animeData.desc;
                    var watchBtn = document.getElementById('articleAnimeWatch');
                    if (watchBtn) watchBtn.href = ANIME.watchUrl(animeData);
                    var detailBtn = document.getElementById('articleAnimeDetail');
                    if (detailBtn) detailBtn.href = ANIME.detailUrl(animeData);
                } else {
                    animeBox.hidden = true;
                }
            }
            // related
            var relatedWrap = document.getElementById('articleRelated');
            var relatedGrid = document.getElementById('articleRelatedGrid');
            if (relatedWrap && relatedGrid) {
                var rel = MAG.related(a, 3);
                if (rel.length) {
                    relatedWrap.hidden = false;
                    relatedGrid.replaceChildren();
                    rel.forEach(function (ra) {
                        var card = createEl('a', 'mag-card');
                        card.href = MAG.articleUrl(ra);
                        var media = createEl('div', 'mag-card__media');
                        var img = createEl('img');
                        img.src = ra.image;
                        img.alt = ra.title;
                        img.loading = 'lazy';
                        media.appendChild(img);
                        var badge = createEl('span', 'mag-badge ' + catClass(ra.category), catLabel(ra.category));
                        media.appendChild(badge);
                        var body = createEl('div', 'mag-card__body');
                        var title = createEl('h3', 'mag-card__title', ra.title);
                        var excerpt = createEl('p', 'mag-card__excerpt', ra.excerpt);
                        var footer = createEl('div', 'mag-card__footer');
                        footer.appendChild(createEl('span', '', ra.dateLabel));
                        footer.appendChild(createEl('span', '', ra.readTime));
                        body.appendChild(title);
                        body.appendChild(excerpt);
                        body.appendChild(footer);
                        card.appendChild(media);
                        card.appendChild(body);
                        relatedGrid.appendChild(card);
                    });
                } else {
                    relatedWrap.hidden = true;
                }
            }
            document.title = a.title + ' | مجله نئون انیمه';
            try {
                var hist = JSON.parse(localStorage.getItem('neon_mag_history') || '[]');
                hist = hist.filter(function (s) { return s !== a.slug; });
                hist.unshift(a.slug);
                localStorage.setItem('neon_mag_history', JSON.stringify(hist.slice(0, 50)));
            } catch (e) {}
            var saveBtn = document.getElementById('articleSaveBtn');
            if (!saveBtn) {
                saveBtn = createEl('button', 'btn btn-info', 'ذخیره برای بعد');
                saveBtn.id = 'articleSaveBtn';
                saveBtn.type = 'button';
                var headAct = document.querySelector('.article-actions') || document.getElementById('articleTitle');
                if (headAct && headAct.parentNode) headAct.parentNode.appendChild(saveBtn);
            }
            function savedList() {
                try { return JSON.parse(localStorage.getItem('neon_mag_saved') || '[]'); } catch (e) { return []; }
            }
            function refreshSave() {
                var s = savedList();
                saveBtn.textContent = s.indexOf(a.slug) !== -1 ? '✓ ذخیره شده' : 'ذخیره برای بعد';
            }
            refreshSave();
            saveBtn.onclick = function () {
                var s = savedList();
                var i = s.indexOf(a.slug);
                if (i === -1) s.push(a.slug); else s.splice(i, 1);
                localStorage.setItem('neon_mag_saved', JSON.stringify(s));
                refreshSave();
                if (window.showToast) window.showToast(i === -1 ? 'مقاله ذخیره شد.' : 'از ذخیره‌ها حذف شد.');
            };
            var exp = document.getElementById('articleExportSaved');
            if (!exp) {
                exp = createEl('button', 'btn btn-info', 'پشتیبان مقالات ذخیره‌شده');
                exp.type = 'button';
                exp.id = 'articleExportSaved';
                saveBtn.parentNode && saveBtn.parentNode.appendChild(exp);
                exp.addEventListener('click', function () {
                    var blob = new Blob([localStorage.getItem('neon_mag_saved') || '[]'], { type: 'application/json' });
                    var x = document.createElement('a');
                    x.href = URL.createObjectURL(blob);
                    x.download = 'neon-saved-articles.json';
                    x.click();
                });
            }
        }

        function renderNotFound() {
            if (notFoundWrap) notFoundWrap.hidden = false;
            articleRoot.hidden = true;
            var copy = document.getElementById('articleNotFoundCopy');
            if (copy && slug) copy.textContent = 'مطلب با شناسه «' + slug + '» پیدا نشد. تازه‌ترین مطالب را ببینید.';
            if (latestGrid) {
                latestGrid.replaceChildren();
                var latest = MAG.list.slice().sort(function (a, b) { return b.date.localeCompare(a.date); }).slice(0, 6);
                latest.forEach(function (a) {
                    var card = createEl('a', 'mag-card');
                    card.href = MAG.articleUrl(a);
                    var media = createEl('div', 'mag-card__media');
                    var img = createEl('img');
                    img.src = a.image;
                    img.alt = a.title;
                    img.loading = 'lazy';
                    media.appendChild(img);
                    var badge = createEl('span', 'mag-badge ' + catClass(a.category), catLabel(a.category));
                    media.appendChild(badge);
                    var body = createEl('div', 'mag-card__body');
                    body.appendChild(createEl('h3', 'mag-card__title', a.title));
                    body.appendChild(createEl('p', 'mag-card__excerpt', a.excerpt));
                    var footer = createEl('div', 'mag-card__footer');
                    footer.appendChild(createEl('span', '', a.dateLabel));
                    footer.appendChild(createEl('span', '', a.readTime));
                    body.appendChild(footer);
                    card.appendChild(media);
                    card.appendChild(body);
                    latestGrid.appendChild(card);
                });
            }
            document.title = 'مطلب پیدا نشد | مجله نئون انیمه';
        }

        if (article) {
            renderArticle(article);
            // copy link
            var copyBtn = document.getElementById('articleCopyLink');
            if (copyBtn) {
                copyBtn.addEventListener('click', function () {
                    var url = window.location.href;
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(url).then(function () {
                            if (window.showToast) window.showToast('لینک مطلب کپی شد.');
                        }).catch(function () {
                            fallbackCopy(url);
                        });
                    } else {
                        fallbackCopy(url);
                    }
                    function fallbackCopy(text) {
                        var ta = document.createElement('textarea');
                        ta.value = text;
                        ta.style.position = 'fixed';
                        ta.style.opacity = '0';
                        document.body.appendChild(ta);
                        ta.select();
                        try { document.execCommand('copy'); if (window.showToast) window.showToast('لینک مطلب کپی شد.'); } catch (e) { if (window.showToast) window.showToast('کپی لینک ممکن نشد.'); }
                        document.body.removeChild(ta);
                    }
                });
            }
            initComments(article.slug);
        } else {
            renderNotFound();
        }
    }

    /* -------------------- COMMENTS -------------------- */
    function initComments(slug) {
        var form = document.getElementById('commentForm');
        var textarea = document.getElementById('commentText');
        var list = document.getElementById('commentList');
        var empty = document.getElementById('commentEmpty');
        if (!form || !textarea || !list) return;
        var key = 'neon_mag_comments_' + slug;

        function getUserName() {
            try {
                if (window.NeonAuth && window.NeonAuth.isLoggedIn && window.NeonAuth.isLoggedIn()) {
                    var u = window.NeonAuth.currentUser();
                    if (u && u.name) return u.name;
                }
            } catch (e) {}
            return 'مهمان';
        }

        function loadComments() {
            try {
                var raw = localStorage.getItem(key);
                if (!raw) return [];
                var arr = JSON.parse(raw);
                return Array.isArray(arr) ? arr : [];
            } catch (e) { return []; }
        }
        function saveComments(arr) {
            localStorage.setItem(key, JSON.stringify(arr));
        }
        function formatTime(ts) {
            try {
                var d = new Date(ts);
                // Persian locale time
                return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
            } catch (e) { return String(ts); }
        }

        function render() {
            var comments = loadComments();
            list.replaceChildren();
            if (!comments.length) {
                if (empty) empty.hidden = false;
                return;
            }
            if (empty) empty.hidden = true;
            comments.slice().reverse().forEach(function (c, idxRev) {
                // original index
                var idx = comments.length - 1 - idxRev;
                var item = createEl('div', 'comment-item');
                var head = createEl('div', 'comment-head');
                var author = createEl('span', 'comment-author', c.name);
                var time = createEl('span', 'comment-time', formatTime(c.time));
                head.appendChild(author);
                head.appendChild(time);
                var text = createEl('p', 'comment-text', c.text);
                // secure: textContent already escaped, no innerHTML
                item.appendChild(head);
                item.appendChild(text);
                // delete only if own comment (name matches current user and is not مهمان? spec says حذف نظر خود کاربر ; implement as if name matches current user)
                var currentName = getUserName();
                if (c.name === currentName) {
                    var del = createEl('button', 'comment-delete', 'حذف');
                    del.type = 'button';
                    del.addEventListener('click', function () {
                        var arr = loadComments();
                        arr.splice(idx, 1);
                        saveComments(arr);
                        render();
                        if (window.showToast) window.showToast('نظر حذف شد.');
                    });
                    item.appendChild(del);
                }
                list.appendChild(item);
            });
        }

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var text = textarea.value.trim();
            if (!text) {
                if (window.showToast) window.showToast('متن نظر نمی‌تواند خالی باشد.');
                return;
            }
            var comments = loadComments();
            comments.push({ name: getUserName(), text: text, time: Date.now() });
            saveComments(comments);
            textarea.value = '';
            render();
            if (window.showToast) window.showToast('نظر شما ثبت شد.');
        });

        render();
    }

    /* -------------------- ANIME PAGE SUGGESTION -------------------- */
    // Run on anime.html detail pages
    var animeSuggestionAttempted = false;
    function tryAnimeSuggestion() {
        if (animeSuggestionAttempted) return;
        // Detect anime page by existence of #animeMain or URL param id
        var main = document.getElementById('animeMain');
        var episodeGrid = document.getElementById('episodeGrid');
        if (!main && !episodeGrid) return;
        var urlParams = new URLSearchParams(window.location.search);
        var animeId = urlParams.get('id');
        if (!animeId) {
            // try from page's JS global? fallback: try to parse from rendered title?
            return;
        }
        var articlesForAnime = MAG.list.filter(function (a) { return a.anime === animeId; });
        if (!articlesForAnime.length) return;
        animeSuggestionAttempted = true;
        // Find insertion point: after #episodeGrid or .anime-body
        var body = document.querySelector('.anime-body');
        var after = document.getElementById('relatedSection') || episodeGrid;
        // Create section
        var section = createEl('section', 'anime-section anime-mag-section');
        section.id = 'animeMagSection';
        var heading = createEl('div', 'catalog-page-heading');
        var headingInner = createEl('div');
        headingInner.appendChild(createEl('span', 'catalog-eyebrow', 'مجله'));
        headingInner.appendChild(createEl('h2', '', 'مطالب پیشنهادی'));
        var p = createEl('p', '', 'مقالات مرتبط با این انیمه در مجله نئون');
        headingInner.appendChild(p);
        heading.appendChild(headingInner);
        var link = createEl('a', 'catalog-outline-btn', 'همه مطالب مجله');
        link.href = 'mag.html?tag=' + encodeURIComponent(articlesForAnime[0].anime ? ANIME.byId[animeId] ? ANIME.byId[animeId].title : '' : '');
        link.href = 'mag.html';
        heading.appendChild(link);
        section.appendChild(heading);
        var grid = createEl('div', 'catalog-all-grid anime-related-grid');
        grid.id = 'animeMagGrid';
        section.appendChild(grid);
        // Insert after episode section if possible
        var epSection = episodeGrid ? episodeGrid.closest('.anime-section') : null;
        if (epSection && epSection.parentNode) {
            epSection.parentNode.insertBefore(section, epSection.nextSibling);
        } else if (body) {
            body.appendChild(section);
        } else {
            document.body.appendChild(section);
        }
        // Render up to 3
        var toShow = articlesForAnime.slice().sort(function (a, b) { return b.date.localeCompare(a.date); }).slice(0, 3);
        toShow.forEach(function (a) {
            var card = createEl('a', 'mag-card');
            card.href = MAG.articleUrl(a);
            card.style.textDecoration = 'none';
            var media = createEl('div', 'mag-card__media');
            var img = createEl('img');
            img.src = a.image;
            img.alt = a.title;
            img.loading = 'lazy';
            media.appendChild(img);
            var badge = createEl('span', 'mag-badge ' + catClass(a.category), catLabel(a.category));
            media.appendChild(badge);
            var bodyCard = createEl('div', 'mag-card__body');
            bodyCard.appendChild(createEl('h3', 'mag-card__title', a.title));
            bodyCard.appendChild(createEl('p', 'mag-card__excerpt', a.excerpt));
            var footer = createEl('div', 'mag-card__footer');
            footer.appendChild(createEl('span', '', a.dateLabel));
            footer.appendChild(createEl('span', '', a.readTime));
            bodyCard.appendChild(footer);
            card.appendChild(media);
            card.appendChild(bodyCard);
            grid.appendChild(card);
        });
    }

    // Try immediately and after DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryAnimeSuggestion);
    } else {
        tryAnimeSuggestion();
    }
    // Also retry after a short delay in case anime.js hasn't set URL yet (but URL already there)
    setTimeout(tryAnimeSuggestion, 600);
})();
