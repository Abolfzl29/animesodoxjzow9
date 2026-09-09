/*
 * Single source of truth for catalogue data (temporary, until a real API exists).
 * Loaded as a plain script -> exposes window.NEON_ANIME.
 *
 * Every anime has a stable `id` (slug). Pages link to the player with watch.html?anime=<id>&ep=<n>.
 * Video URLs are public demo clips (Blender open movies) — replace with real HLS streams later.
 */
(function () {
    const DEMO_VIDEO = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';
    const DEMO_VIDEO_2 = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    const DEMO_VIDEO_3 = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4';

    const GENRES = [
        { id: 'action', label: 'اکشن', aliases: ['action'], description: 'نبردهای نفس‌گیر و قهرمان‌های فراموش‌نشدنی' },
        { id: 'dark-fantasy', label: 'فانتزی تاریک', aliases: ['dark fantasy'], description: 'جهان‌های رازآلود با داستان‌های تیره و حماسی' },
        { id: 'fantasy', label: 'فانتزی', aliases: ['fantasy'], description: 'قدرت‌های شگفت‌انگیز و دنیاهای خیال‌انگیز' },
        { id: 'drama', label: 'درام', aliases: ['drama'], description: 'داستان‌های عمیق، شخصیت‌محور و احساسی' },
        { id: 'scifi', label: 'علمی‌تخیلی', aliases: ['علمی تخیلی', 'sci fi', 'sci-fi', 'science fiction', 'cyberpunk'], description: 'آینده، فناوری و دنیاهای سایبرپانکی' },
        { id: 'mystery', label: 'معمایی', aliases: ['رازآلود', 'mystery'], description: 'پرونده‌ها و رازهایی که باید کشف شوند' },
        { id: 'psychological', label: 'روان‌شناختی', aliases: ['روانشناختی', 'psychological'], description: 'نبردهای ذهنی و روایت‌های چندلایه' },
        { id: 'adventure', label: 'ماجراجویی', aliases: ['adventure'], description: 'سفرهای بزرگ و سرزمین‌های ناشناخته' },
        { id: 'supernatural', label: 'ماوراءطبیعی', aliases: ['ماورایی', 'supernatural'], description: 'نفرین‌ها، ارواح و نیروهای ناشناخته' }
    ];

    function episodes(season, list) {
        return list.map((e, i) => ({
            season: season,
            number: e.number || i + 1,
            title: e.title,
            duration: e.duration || '۲۴ دقیقه',
            vip: !!e.vip,
            src: e.src || DEMO_VIDEO,
            desc: e.desc || ''
        }));
    }

    const ANIME = [
        {
            id: 'attack-on-titan',
            title: 'حمله به تایتان',
            titleEn: 'ATTACK ON TITAN',
            aliases: ['اتک آن تایتان', 'shingeki no kyojin', 'aot', 'attack on titan', 'ارن', 'ارن یگر', 'میکاسا', 'لیوای'],
            rating: 9.1,
            year: 2023,
            age: '+۱۶',
            quality: '4K HDR',
            genres: ['action', 'dark-fantasy', 'drama'],
            genreLabel: 'اکشن، فانتزی تاریک، درام',
            studio: 'MAPPA',
            seasons: 4,
            poster: 'assets/img/attack-on-titan.webp',
            banner: 'assets/img/attack-on-titan-wallpaper.webp',
            desc: 'زمانی که تایتان‌های انسان‌خوار بشریت را به مرز انقراض می‌کشانند، بازماندگان در پشت دیوارهای عظیم پناه می‌گیرند. ارن یگر پس از سقوط دیوار ماریا سوگند می‌خورد تمام تایتان‌ها را نابود کند.',
            currentSeason: 4,
            episodes: episodes(4, [
                { number: 19, title: 'دو برادر' },
                { number: 20, title: 'خاطرات آینده', src: DEMO_VIDEO_2 },
                { number: 21, title: 'از تو، ۲۰۰۰ سال پیش', desc: 'ارن و متحدانش در تلاشند تا جلوی نقشه‌های تاریک مارلی را بگیرند. اما خیانتی بزرگ در راه است که سرنوشت تمام الدیایی‌ها را برای همیشه تغییر می‌دهد.' },
                { number: 22, title: 'آب شدن یخ‌ها', vip: true, src: DEMO_VIDEO_3 }
            ])
        },
        {
            id: 'demon-slayer',
            title: 'شیطان کش',
            titleEn: 'DEMON SLAYER',
            aliases: ['دیمن اسلیر', 'kimetsu no yaiba', 'demon slayer', 'تانجیرو', 'نزوکو', 'موزان'],
            rating: 8.7,
            year: 2024,
            age: '+۱۳',
            quality: '4K HDR',
            genres: ['action', 'fantasy'],
            genreLabel: 'اکشن، فانتزی',
            studio: 'ufotable',
            seasons: 4,
            poster: 'assets/img/demon-slayer-tanjiro.webp',
            banner: 'assets/img/demon-slayer.webp',
            desc: 'تانجیرو کامادو پس از قتل‌عام خانواده‌اش و تبدیل شدن خواهرش نزوکو به شیطان، به سپاه شیطان‌کش‌ها می‌پیوندد تا درمانی برای او پیدا کند.',
            currentSeason: 4,
            episodes: episodes(4, [
                { title: 'برای شکست موزان کیبوتسوجی' },
                { title: 'ملاقات با هاشیراها', src: DEMO_VIDEO_2 },
                { title: 'تمرینات هاشیرا' },
                { title: 'رئیس شیطان‌کش‌ها', vip: true, src: DEMO_VIDEO_3 }
            ])
        },
        {
            id: 'jujutsu-kaisen',
            title: 'جوجوتسو کایسن',
            titleEn: 'JUJUTSU KAISEN',
            aliases: ['jjk', 'jujutsu kaisen', 'گوجو', 'گوجو ساتورو', 'gojo', 'یوجی', 'ایتادوری', 'سوکونا'],
            rating: 8.8,
            year: 2023,
            age: '+۱۶',
            quality: '1080p',
            genres: ['action', 'fantasy', 'supernatural'],
            genreLabel: 'اکشن، فانتزی، ماوراءطبیعی',
            studio: 'MAPPA',
            seasons: 2,
            poster: 'assets/img/jujutsu-kaisen-2.webp',
            banner: 'assets/img/jujutsu-kaisen-gojo-wallpaper.webp',
            desc: 'یوجی ایتادوری با بلعیدن انگشت نفرین‌شده‌ی سوکونا، به دنیای جادوگران جوجوتسو کشیده می‌شود و باید تحت نظر ساتورو گوجو با نفرین‌ها بجنگد.',
            currentSeason: 2,
            episodes: episodes(2, [
                { title: 'پنهان‌کاری و قتل' },
                { title: 'اتفاق شیبویا', src: DEMO_VIDEO_2 },
                { title: 'مهر و موم شدن' },
                { title: 'خون سیاه', vip: true, src: DEMO_VIDEO_3 }
            ])
        },
        {
            id: 'chainsaw-man',
            title: 'مرد اره‌ای',
            titleEn: 'CHAINSAW MAN',
            aliases: ['chainsaw man', 'csm', 'دنجی', 'ماکیما', 'makima', 'پوچیتا', 'پاور'],
            rating: 8.5,
            year: 2022,
            age: '+۱۸',
            quality: '1080p',
            genres: ['action', 'dark-fantasy', 'drama'],
            genreLabel: 'اکشن، فانتزی تاریک، درام',
            studio: 'MAPPA',
            seasons: 1,
            poster: 'assets/img/chainsaw-man-2.webp',
            banner: 'assets/img/chainsaw-man.webp',
            desc: 'دنجی، نوجوانی فقیر که با شیطان اره‌ای‌اش پوچیتا شکارچی شیطان است، پس از خیانت یاکوزا با پوچیتا یکی می‌شود و به «مرد اره‌ای» تبدیل می‌شود.',
            currentSeason: 1,
            episodes: episodes(1, [
                { title: 'سگ و اره‌برقی' },
                { title: 'رسیدن به توکیو', src: DEMO_VIDEO_2 },
                { title: 'ملاقات با میکو' },
                { title: 'نجات', vip: true, src: DEMO_VIDEO_3 }
            ])
        },
        {
            id: 'one-piece',
            title: 'وان پیس',
            titleEn: 'ONE PIECE',
            aliases: ['one piece', 'لوفی', 'luffy', 'زورو', 'وانو', 'نامی', 'سانجی'],
            rating: 9.0,
            year: 2024,
            age: '+۱۳',
            quality: '1080p',
            genres: ['action', 'adventure'],
            genreLabel: 'اکشن، ماجراجویی',
            studio: 'Toei Animation',
            seasons: 21,
            poster: 'assets/img/one-piece-thumb.webp',
            banner: 'assets/img/one-piece-wano-wallpaper.webp',
            desc: 'مانکی دی. لوفی و خدمه‌ی کلاه‌حصیری‌ها در جست‌وجوی گنج افسانه‌ای «وان پیس» دریاها را درمی‌نوردند تا لوفی پادشاه دزدان دریایی شود.',
            currentSeason: 21,
            episodes: episodes(21, [
                { number: 1071, title: 'لوفی به اوج می‌رسد! گیر پنجم' },
                { number: 1072, title: 'وزن خاطرات', src: DEMO_VIDEO_2 },
                { number: 1073, title: 'پایان کایدو' },
                { number: 1074, title: 'سپیده‌دم وانو', vip: true, src: DEMO_VIDEO_3 }
            ])
        },
        {
            id: 'death-note',
            title: 'دفترچه مرگ',
            titleEn: 'DEATH NOTE',
            aliases: ['death note', 'دث نوت', 'لایت', 'لایت یاگامی', 'یاگامی', 'ال', 'ریوک', 'ryuk'],
            rating: 9.0,
            year: 2006,
            age: '+۱۶',
            quality: '1080p',
            genres: ['drama', 'mystery', 'psychological'],
            genreLabel: 'درام، معمایی، روان‌شناختی',
            studio: 'MADHOUSE',
            seasons: 1,
            poster: 'assets/img/death-note-poster.webp',
            banner: 'assets/img/death-note-wallpaper.webp',
            desc: 'لایت یاگامی دفترچه‌ای پیدا می‌کند که هرکس نامش در آن نوشته شود می‌میرد. او تصمیم می‌گیرد دنیایی بدون جنایتکار بسازد؛ کارآگاه مرموز «ال» سد راهش می‌شود.',
            currentSeason: 1,
            episodes: episodes(1, [
                { title: 'تولد دوباره' },
                { title: 'رویارویی', src: DEMO_VIDEO_2 },
                { title: 'معامله' },
                { title: 'تعقیب', vip: true, src: DEMO_VIDEO_3 }
            ])
        },
        {
            id: 'cyberpunk-edgerunners',
            title: 'سایبرپانک: اج‌رانرز',
            titleEn: 'CYBERPUNK: EDGERUNNERS',
            aliases: ['سایبرپانک', 'cyberpunk', 'edgerunners', 'cyberpunk: edgerunners', 'لوسی', 'دیوید'],
            rating: 8.9,
            year: 2022,
            age: '+۱۸',
            quality: '4K HDR',
            genres: ['scifi', 'action'],
            genreLabel: 'سایبرپانک، علمی‌تخیلی',
            studio: 'TRIGGER',
            seasons: 1,
            poster: 'assets/img/cyberpunk-edgerunners.webp',
            banner: 'assets/img/cyberpunk-edgerunners-wallpaper.webp',
            desc: 'در یک شهر پادآرمان‌شهری که درگیر فساد و وسواس سایبرنتیک است، یک پسر خیابانی با استعداد تلاش می‌کند با تبدیل شدن به یک مزدور قانون‌شکن زنده بماند.',
            currentSeason: 1,
            episodes: episodes(1, [
                { title: 'بیایید یک نمایش بسازیم' },
                { title: 'مثل یک پسر', src: DEMO_VIDEO_2 },
                { title: 'مرد شهر' },
                { title: 'لوسی', vip: true, src: DEMO_VIDEO_3 }
            ])
        }
    ];

    const byId = Object.create(null);
    ANIME.forEach(a => { byId[a.id] = a; });
    const genreById = new Map(GENRES.map(genre => [genre.id, genre]));

    function normalize(str) {
        return String(str || '')
            .toLowerCase()
            .replace(/[\u200c\u200f\u200e]/g, ' ')  // ZWNJ / RTL marks
            .replace(/[ي]/g, 'ی').replace(/[ك]/g, 'ک')
            .replace(/[-_:،,.!؟?]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function findByTitle(str) {
        const q = normalize(str);
        if (!q) return null;
        return ANIME.find(a => normalize(a.title) === q || normalize(a.titleEn) === q || a.aliases.some(al => normalize(al) === q))
            || ANIME.find(a => normalize(a.title).includes(q) || a.aliases.some(al => normalize(al).includes(q)))
            || null;
    }

    function search(query) {
        const q = normalize(query);
        if (!q) return ANIME.slice();

        const terms = q.split(' ');
        return ANIME.filter(anime => {
            const genreTerms = anime.genres.flatMap(id => {
                const genre = genreById.get(id);
                return genre ? [genre.id, genre.label, ...(genre.aliases || [])] : [id];
            });
            const haystack = normalize([
                anime.title,
                anime.titleEn,
                anime.genreLabel,
                anime.studio,
                anime.year,
                anime.quality,
                anime.desc,
                ...anime.aliases,
                ...genreTerms
            ].join(' '));

            // Multi-word searches may match across title, character and genre
            // fields instead of requiring one pre-composed display label.
            return terms.every(term => haystack.includes(term));
        });
    }

    const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
    function toFa(num) {
        return String(num).replace(/\d/g, d => FA_DIGITS[d]);
    }

    function watchUrl(anime, episodeNumber) {
        const id = typeof anime === 'string' ? anime : anime.id;
        return 'watch.html?anime=' + encodeURIComponent(id) + (episodeNumber ? '&ep=' + episodeNumber : '');
    }

    window.NEON_ANIME = { list: ANIME, genres: GENRES, byId, findByTitle, search, toFa, watchUrl, normalize };
})();
