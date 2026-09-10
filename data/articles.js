/* data/articles.js — مجله نئون انیمه (DEMO). IIFE -> window.NEON_MAG */
(function () {
    var ARTICLES = [
        {
            slug: 'attack-on-titan-finale',
            category: 'news',
            title: 'پایان حماسی اتک آن تایتان؛ شاهکاری که تاریخ‌ساز شد',
            excerpt: 'بررسی کامل و موشکافانه بخش نهایی انیمه حمله به تایتان و نگاهی به پیام‌های پنهان هاجیمه ایسایاما در واپسین قسمت‌ها.',
            image: 'assets/img/attack-on-titan-wallpaper.webp',
            date: '1403-06-15',
            dateLabel: '۱۵ شهریور ۱۴۰۳',
            readTime: '۶ دقیقه',
            author: 'علی رضایی',
            anime: 'attack-on-titan',
            tags: ['اتک آن تایتان', 'پایان‌بندی', 'MAPPA', 'حماسی'],
            featured: true,
            body: [
                { h: 'چرا پایان اتک آن تایتان مهم است؟' },
                { p: 'پس از ده سال انتظار، فصل نهایی اتک آن تایتان به سرانجام رسید و با روایت جسورانه‌اش توانست یکی از بحث‌برانگیزترین پایان‌های تاریخ انیمه را رقم بزند. ایسایاما در این قسمت تصمیم گرفت به جای یک پایان ساده و قهرمان‌محور، سراغ حقیقتی تلخ و انسانی برود.' },
                { p: 'این انتخاب باعث شد بسیاری از طرفداران ابتدا غافلگیر شوند اما با گذر زمان، عمق پیام ضدجنگ اثر بیش از پیش آشکار شد.' },
                { q: 'آزادی بهایی دارد؛ هیچکس بدون از دست دادن چیزی به آن نمی‌رسد.' },
                { h: 'پیام پنهان در آخرین نما' },
                { p: 'در نمای پایانی، دوربین به آرامی از روی درخت غول‌پیکر عبور می‌کند و به کودکی می‌رسد که به سوی آن می‌دود؛ اشاره‌ای ظریف به چرخه‌ی خشونت که هرگز پایان نمی‌یابد مگر با درک متقابل.' },
                { ul: ['کارگردانی اپیزود آخر بر عهده یوئیچیرو هایاشی بود', 'موسیقی متن توسط KOHTA YAMAMOTO و Hiroyuki Sawano ساخته شد', 'قسمت پایانی ۸۵ دقیقه زمان داشت'] }
            ]
        },
        {
            slug: 'jujutsu-kaisen-season3-date',
            category: 'news',
            title: 'اعلام تاریخ پخش فصل سوم جوجوتسو کایسن',
            excerpt: 'استودیو ماپا بالاخره پس از مدت‌ها انتظار، تاریخ دقیق پخش فصل جدید این انیمه پرطرفدار را رسماً تایید کرد.',
            image: 'assets/img/jujutsu-kaisen-gojo-wallpaper.webp',
            date: '1403-06-12',
            dateLabel: '۱۲ شهریور ۱۴۰۳',
            readTime: '۳ دقیقه',
            author: 'سارا احمدی',
            anime: 'jujutsu-kaisen',
            tags: ['جوجوتسو کایسن', 'گوجو ساتورو', 'MAPPA', 'فصل جدید'],
            featured: false,
            body: [
                { h: 'تاریخ انتشار رسمی' },
                { p: 'حساب رسمی جوجوتسو کایسن در شبکه اجتماعی X اعلام کرد فصل سوم این مجموعه از دی ۱۴۰۳ روی آنتن خواهد رفت و آرک «مرگ و خون» را پوشش خواهد داد.' },
                { p: 'تیزر کوتاه منتشر شده، صحنه‌هایی از نبرد سرنوشت‌ساز گوجو و سوکونا را نشان می‌دهد که پیش‌تر در مانگا طرفداران را شوکه کرده بود.' },
                { ul: ['کارگردان: شوتا گوسوزونو', 'تعداد قسمت‌های اعلام شده: ۲۳ قسمت', 'پخش همزمان با دوبله اختصاصی نئون انیمه'] },
                { q: 'قوی‌ترین همیشه تنهاست؛ اما این تنهایی بهای قدرت است.' }
            ]
        },
        {
            slug: 'best-anime-fall-1403',
            category: 'intro',
            title: 'معرفی برترین انیمه‌های پاییز امسال',
            excerpt: 'فصل پاییز امسال پر از شگفتی است. از بازگشت شیطان‌کش تا انیمه‌های اورجینال جدید که نباید از دست بدهید.',
            image: 'assets/img/demon-slayer.webp',
            date: '1403-06-10',
            dateLabel: '۱۰ شهریور ۱۴۰۳',
            readTime: '۵ دقیقه',
            author: 'نیما حسینی',
            anime: 'demon-slayer',
            tags: ['شیطان کش', 'پاییز ۱۴۰۳', 'معرفی', 'فانتزی'],
            featured: false,
            body: [
                { h: 'چرا پاییز ۱۴۰۳ خاص است؟' },
                { p: 'این فصل شاهد بازگشت عناوین بزرگی مانند شیطان‌کش و همچنین معرفی آثار اورجینال جسورانه از استودیوهایی چون Bones و Wit هستیم.' },
                { p: 'در این مطلب سه اثر پیشنهادی را مرور می‌کنیم که هر سلیقه‌ای را راضی خواهند کرد.' },
                { h: '۱. شیطان‌کش: تمرین هاشیرا' },
                { p: 'تانجیرو و دوستانش وارد سخت‌ترین تمرینات هاشیراها می‌شوند تا برای نبرد نهایی با موزان آماده شوند. انیمیشن یوفوتیبل بار دیگر استانداردها را جابجا کرده است.' },
                { h: '۲. آثار اورجینال' },
                { ul: ['Dan Da Dan — اکشن ماوراءطبیعی با چاشنی کمدی', 'Re:Zero فصل سوم — بازگشت سوبارو به دنیای رنج و انتخاب', 'Bleach: جنگ خونین هزارساله — نبرد شینیگامی‌ها ادامه دارد'] },
                { q: 'هر فصلی قهرمان خودش را دارد؛ پاییز امسال نوبت شیطان‌کش است.' }
            ]
        },
        {
            slug: 'review-cyberpunk-edgerunners',
            category: 'review',
            title: 'نقد و بررسی انیمه سایبرپانک: اج‌رانرز',
            excerpt: 'چگونه استودیو تریگر توانست یکی از بهترین اقتباس‌های تاریخ ویدیوگیم را به دنیای انیمه بیاورد؟',
            image: 'assets/img/cyberpunk-edgerunners-wallpaper.webp',
            date: '1403-06-05',
            dateLabel: '۵ شهریور ۱۴۰۳',
            readTime: '۷ دقیقه',
            author: 'مریم کاظمی',
            anime: 'cyberpunk-edgerunners',
            tags: ['سایبرپانک', 'تریگر', 'نقد', 'علمی‌تخیلی'],
            featured: false,
            score: 9.2,
            body: [
                { h: 'اقتباسی فراتر از انتظار' },
                { p: 'زمانی که CD Projekt RED خبر ساخت انیمه‌ای بر اساس بازی Cyberpunk 2077 را اعلام کرد، بسیاری تردید داشتند. اما تریگر با کارگردانی هیرویوکی ایماشی ثابت کرد که می‌توان روح سایبرپانک را بدون تقلید مستقیم، دوباره خلق کرد.' },
                { q: 'در نایت‌سیتی، تنها چیزی که ارزش دارد، آرزوهایی است که برایش می‌میری.' },
                { h: 'نقاط قوت' },
                { ul: ['انیمیشن پرانرژی و رنگ‌های نئونی خیره‌کننده', 'موسیقی متن احساسی با تم اصلی I Really Want to Stay At Your House', 'شخصیت‌پردازی عمیق دیوید و لوسی'] },
                { h: 'آیا ضعف دارد؟' },
                { p: 'ریتم سریع ۱۰ قسمتی ممکن است برای برخی تماشاگران فرصت کافی برای ارتباط عمیق با شخصیت‌های فرعی باقی نگذارد، اما همین فشردگی باعث شده اثر هرگز خسته‌کننده نشود.' },
                { p: 'امتیاز نهایی ما ۹.۲ از ۱۰ است؛ اج‌رانرز نه تنها یک انیمه عالی، بلکه بهترین تبلیغ ممکن برای دنیای سایبرپانک است.' }
            ]
        },
        {
            slug: 'review-death-note',
            category: 'review',
            title: 'نقد دفترچه مرگ؛ وقتی عدالت به وسوسه تبدیل می‌شود',
            excerpt: 'آیا لایت یاگامی قهرمان است یا هیولا؟ مروری بر نبرد فکری لایت و ال و فلسفه عدالت در دفترچه مرگ.',
            image: 'assets/img/death-note-wallpaper.webp',
            date: '1403-06-02',
            dateLabel: '۲ شهریور ۱۴۰۳',
            readTime: '۸ دقیقه',
            author: 'رضا شریفی',
            anime: 'death-note',
            tags: ['دفترچه مرگ', 'نقد', 'روان‌شناختی', 'ال'],
            featured: false,
            score: 9.0,
            body: [
                { h: 'شروع یک بازی مرگبار' },
                { p: 'دفترچه مرگ با ایده‌ای ساده اما نبوغ‌آمیز آغاز می‌شود: اگر بتوانی هر کسی را تنها با نوشتن نامش بکشی، چه می‌کنی؟ لایت یاگامی، دانش‌آموز نابغه، این قدرت را می‌یابد و تصمیم می‌گیرد دنیایی بدون جنایت بسازد.' },
                { p: 'اما هر قدرتی بهایی دارد و لایت به تدریج در گرداب غرور و خودبرتربینی فرو می‌رود.' },
                { h: 'نبرد لایت و ال' },
                { p: 'هسته اصلی سریال، تقابل دو ذهن برتر است. ال، کارآگاهی مرموز که حتی نام واقعی‌اش را کسی نمی‌داند، تنها کسی است که می‌تواند لایت را به چالش بکشد.' },
                { q: 'عدالت بدون قدرت، تنها یک آرزوی کودکانه است.' },
                { ul: ['کارگردانی: تتسورو آراکی', 'استودیو: MADHOUSE', 'تعداد قسمت‌ها: ۳۷'] },
                { p: 'با امتیاز ۹.۰، دفترچه مرگ همچنان یکی از هوشمندانه‌ترین تریلرهای روان‌شناختی تاریخ انیمه باقی می‌ماند.' }
            ]
        },
        {
            slug: 'one-piece-wano-battle',
            category: 'news',
            title: 'فصل جدید وان پیس با نبرد وانو ادامه می‌یابد',
            excerpt: 'مانکی دی لوفی در گیر پنجم خود به اوج قدرت می‌رسد؛ جزئیات قسمت‌های جدید و زمان پخش هفتگی.',
            image: 'assets/img/one-piece-wano-wallpaper.webp',
            date: '1403-06-08',
            dateLabel: '۸ شهریور ۱۴۰۳',
            readTime: '۴ دقیقه',
            author: 'امیر طاهری',
            anime: 'one-piece',
            tags: ['وان پیس', 'لافی', 'وانو', 'ماجراجویی'],
            featured: false,
            body: [
                { h: 'وانو به پایان می‌رسد' },
                { p: 'آرک طولانی وانو که نزدیک به چهار سال مخاطبان را همراه خود کرده بود، بالاخره به نبرد نهایی لوفی و کایدو رسید. قسمت ۱۰۷۱ که گیر پنجم لوفی را معرفی کرد، رکورد بازدید را شکست.' },
                { p: 'استودیو Toei Animation اعلام کرد کیفیت انیمیشن در قسمت‌های پایانی وانو به لطف تیم جدید کارگردانی به شکل چشمگیری افزایش یافته است.' },
                { ul: ['قسمت ۱۰۷۱: گیر پنجم — پربازدیدترین قسمت سال', 'پایان وانو: سپیده‌دم جدید', 'آرک بعدی: جزیره آینده (Egghead)'] },
                { q: 'من پادشاه دزدان دریایی خواهم شد!' }
            ]
        },
        {
            slug: 'intro-chainsaw-man',
            category: 'intro',
            title: 'آشنایی با دنیای مرد اره‌ای؛ خون، هیولا و امید',
            excerpt: 'چرا مرد اره‌ای فراتر از یک انیمه اکشن ساده است؟ معرفی شخصیت‌ها، دنیای تلخ و طنز سیاه تاتسوکی فوجیموتو.',
            image: 'assets/img/chainsaw-man.webp',
            date: '1403-06-01',
            dateLabel: '۱ شهریور ۱۴۰۳',
            readTime: '۶ دقیقه',
            author: 'زینب موسوی',
            anime: 'chainsaw-man',
            tags: ['مرد اره‌ای', 'ماپا', 'معرفی', 'دنجی'],
            featured: false,
            body: [
                { h: 'دنجی؛ قهرمان متفاوت' },
                { p: 'برخلاف قهرمانان کلاسیک شونن، دنجی آرزوهای بزرگی ندارد. او فقط می‌خواهد غذای گرم بخورد، دوست داشته شود و زندگی عادی داشته باشد. همین سادگی او را به یکی از انسانی‌ترین شخصیت‌های سال‌های اخیر تبدیل کرده است.' },
                { h: 'دنیای شیاطین' },
                { p: 'در دنیای مرد اره‌ای، هر ترسی می‌تواند به شیطانی تبدیل شود. شیطان تفنگ، شیطان تاریکی و شیطان کنترل تنها نمونه‌هایی از این کابوس‌های مجسم هستند.' },
                { q: 'رویاهای عادی، در دنیای غیرعادی، خود یک معجزه‌اند.' },
                { ul: ['نویسنده: تاتسوکی فوجیموتو', 'استودیو: MAPPA', 'ژانر: اکشن، فانتزی تاریک، درام'] }
            ]
        },
        {
            slug: 'review-jujutsu-kaisen-s2',
            category: 'review',
            title: 'بررسی جوجوتسو کایسن فصل دوم؛ تاریک‌تر و هیجان‌انگیزتر',
            excerpt: 'فصل دوم جوجوتسو کایسن با آرک شیبویا استانداردهای اکشن را جابجا کرد؛ نگاهی به نقاط قوت و ضعف آن.',
            image: 'assets/img/jujutsu-kaisen-2.webp',
            date: '1403-05-28',
            dateLabel: '۲۸ مرداد ۱۴۰۳',
            readTime: '۷ دقیقه',
            author: 'پدرام نوری',
            anime: 'jujutsu-kaisen',
            tags: ['جوجوتسو کایسن', 'نقد', 'شیبویا', 'گوجو'],
            featured: false,
            score: 8.9,
            body: [
                { h: 'آرک شیبویا؛ نقطه عطف' },
                { p: 'فصل دوم با فلش‌بکی احساسی به گذشته گوجو و گتو آغاز می‌شود اما به سرعت به یکی از خشن‌ترین و بی‌رحمانه‌ترین آرک‌های شونن مدرن یعنی حادثه شیبویا می‌رسد.' },
                { p: 'کارگردانی اکشن در این فصل به طرز چشمگیری پیشرفت کرده و هر قسمت مانند یک فیلم سینمایی کوتاه به نظر می‌رسد.' },
                { h: 'نقاط قوت و ضعف' },
                { ul: ['طراحی مبارزات بی‌نقص و انیمیشن سیال', 'مرگ شخصیت‌های محبوب و شوک احساسی', 'ریتم بسیار سریع که ممکن است برخی را خسته کند'] },
                { q: 'در دنیای جوجوتسو، هیچ پیروزی بدون قربانی نیست.' },
                { p: 'امتیاز ۸.۹ نشان می‌دهد این فصل، با وجود نقص‌های کوچک، یکی از بهترین دنباله‌های سال است.' }
            ]
        }
    ];

    var bySlug = Object.create(null);
    ARTICLES.forEach(function (a) { bySlug[a.slug] = a; });

    function normalize(str) {
        return String(str || '').toLowerCase()
            .replace(/[\u200c\u200f\u200e]/g, ' ')
            .replace(/[ي]/g, 'ی').replace(/[ك]/g, 'ک')
            .replace(/[-_:،,.!؟?]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function byCategory(cat) {
        if (!cat || cat === 'all') return ARTICLES.slice();
        return ARTICLES.filter(function (a) { return a.category === cat; });
    }

    function related(article, n) {
        var slug = typeof article === 'string' ? article : article.slug;
        var base = typeof article === 'string' ? bySlug[article] : article;
        if (!base) return [];
        var limit = n || 3;
        var others = ARTICLES.filter(function (a) { return a.slug !== slug; });
        others.sort(function (a, b) {
            var rankA = (a.anime === base.anime) ? 0 : (a.category === base.category ? 1 : 2);
            var rankB = (b.anime === base.anime) ? 0 : (b.category === base.category ? 1 : 2);
            if (rankA !== rankB) return rankA - rankB;
            if (b.date !== a.date) return b.date.localeCompare(a.date);
            return a.slug.localeCompare(b.slug);
        });
        return others.slice(0, limit);
    }

    function articleUrl(article) {
        var slug = typeof article === 'string' ? article : article.slug;
        return 'article.html?slug=' + encodeURIComponent(slug);
    }

    function catUrl(cat) {
        if (!cat || cat === 'all') return 'mag.html';
        return 'mag.html?cat=' + encodeURIComponent(cat);
    }

    function search(query) {
        var q = normalize(query);
        if (!q) return ARTICLES.slice();
        var terms = q.split(' ');
        return ARTICLES.filter(function (a) {
            var haystack = normalize([a.title, a.excerpt, a.tags.join(' ')].join(' '));
            return terms.every(function (term) { return haystack.indexOf(term) !== -1; });
        });
    }

    function byTag(tag) {
        var q = normalize(tag);
        if (!q) return [];
        return ARTICLES.filter(function (a) {
            return a.tags.some(function (t) { return normalize(t) === q; });
        });
    }

    function getFeatured() {
        return ARTICLES.find(function (a) { return a.featured; }) || ARTICLES[0];
    }

    window.NEON_MAG = {
        list: ARTICLES,
        bySlug: bySlug,
        byCategory: byCategory,
        related: related,
        articleUrl: articleUrl,
        catUrl: catUrl,
        search: search,
        byTag: byTag,
        getFeatured: getFeatured,
        normalize: normalize
    };
})();
