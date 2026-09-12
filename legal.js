(function () {
    var p = new URLSearchParams(location.search).get('p') || 'about';
    var main = document.getElementById('legalMain');
    var pages = {
        about: { t: 'درباره ما', html: '<h1>درباره نئون انیمه</h1><p>نئون انیمه یک پلتفرم نمایشی تماشای انیمه با رابط فارسی و راست‌چین است. این نسخه بدون سرور کار می‌کند و داده‌ها در مرورگر شما ذخیره می‌شود.</p><h2>ماموریت</h2><p>جستجوی سریع، پیشنهاد شخصی و تقویم پخش؛ بدون پرداخت واقعی و بدون ورود اجباری.</p>' },
        contact: { t: 'تماس با ما', html: '<h1>تماس با ما</h1><p>پیام شما فقط در همین مرورگر ذخیره می‌شود (نسخه نمایشی).</p><form class="legal-form" id="contactForm"><input required name="name" placeholder="نام"><input required type="email" name="email" placeholder="ایمیل"><textarea required name="msg" rows="5" placeholder="پیام"></textarea><button type="submit">ارسال</button></form>' },
        terms: { t: 'قوانین استفاده', html: '<h1>قوانین استفاده</h1><p>این سایت دمو است. محتوا آموزشی است و ویدیوها نمونهٔ عمومی‌اند. استفاده تجاری از برند بدون اجازه مجاز نیست. قفل VIP نمایشی است و امنیت ندارد.</p><h2>حساب</h2><p>ورود شبیه‌سازی‌شده است و رمزها به سرور نمی‌روند.</p>' },
        privacy: { t: 'حریم خصوصی', html: '<h1>حریم خصوصی</h1><p>هیچ داده‌ای به سرور ما ارسال نمی‌شود. تاریخچه تماشا، لیست من، مقالات ذخیره‌شده و تنظیمات در localStorage مرورگر شماست. می‌توانید از تنظیمات پشتیبان بگیرید یا پاک کنید.</p>' },
        help: { t: 'راهنمای استفاده', html: '<h1>راهنما</h1><ul><li>جستجو: آرشیو → نام فارسی/انگلیسی/شخصیت</li><li>ادامه تماشا از پروفایل</li><li>پلیر: فاصله پخش، ← → ده ثانیه، اعداد کیفیت</li><li>مجله: ذخیره برای بعد در localStorage</li><li>انیمه شانسی در آرشیو</li></ul>' },
        report: { t: 'گزارش مشکل پخش', html: '<h1>گزارش مشکل پخش</h1><form class="legal-form" id="reportForm"><select name="kind"><option>ویدئو پخش نمی‌شود</option><option>کیفیت اشتباه</option><option>زیرنویس</option><option>سایر</option></select><input name="anime" placeholder="نام انیمه / قسمت"><textarea name="msg" rows="4" placeholder="توضیح"></textarea><button type="submit">ثبت گزارش</button></form>' },
        settings: { t: 'تنظیمات', html: '<h1>تنظیمات</h1><div class="settings-row"><span>اعلان مرورگر برای قسمت جدید</span><button type="button" id="btnNotif">فعال‌سازی</button></div><div class="settings-row"><span>پخش خودکار قسمت بعد</span><button type="button" id="btnAuto">تغییر</button></div><div class="settings-row"><span>حالت کم‌مصرف (بدون پیش‌نمایش ویدئو)</span><button type="button" id="btnSaver">تغییر</button></div><div class="settings-row"><span>خروجی پشتیبان داده‌ها</span><button type="button" id="btnExport">دانلود JSON</button></div><div class="settings-row"><span>بازیابی پشتیبان</span><input type="file" id="btnImport" accept="application/json"></div>' }
    };
    var page = pages[p] || pages.about;
    document.title = page.t + ' | نئون انیمه';
    main.innerHTML = page.html;

    function toast(m) { alert(m); }
    var cf = document.getElementById('contactForm');
    if (cf) cf.addEventListener('submit', function (e) {
        e.preventDefault();
        var msgs = [];
        try { msgs = JSON.parse(localStorage.getItem('neon_contact') || '[]'); } catch (err) {}
        msgs.push({ at: Date.now(), name: cf.name.value, email: cf.email.value, msg: cf.msg.value });
        localStorage.setItem('neon_contact', JSON.stringify(msgs));
        toast('پیام ذخیره شد (فقط روی این دستگاه).');
        cf.reset();
    });
    var rf = document.getElementById('reportForm');
    if (rf) rf.addEventListener('submit', function (e) {
        e.preventDefault();
        var msgs = [];
        try { msgs = JSON.parse(localStorage.getItem('neon_reports') || '[]'); } catch (err) {}
        msgs.push({ at: Date.now(), kind: rf.kind.value, anime: rf.anime.value, msg: rf.msg.value });
        localStorage.setItem('neon_reports', JSON.stringify(msgs));
        toast('گزارش ثبت شد.');
        rf.reset();
    });
    function getSet() {
        try { return JSON.parse(localStorage.getItem('neon_settings') || '{}'); } catch (e) { return {}; }
    }
    function putSet(s) { localStorage.setItem('neon_settings', JSON.stringify(s)); }
    var s = getSet();
    var bn = document.getElementById('btnNotif');
    if (bn) bn.addEventListener('click', function () {
        if (!('Notification' in window)) { toast('مرورگر اعلان ندارد.'); return; }
        Notification.requestPermission().then(function (r) {
            s.notify = r === 'granted';
            putSet(s);
            toast(s.notify ? 'اعلان فعال شد.' : 'اجازه داده نشد.');
        });
    });
    var ba = document.getElementById('btnAuto');
    if (ba) {
        ba.textContent = s.autoplay === false ? 'خاموش' : 'روشن';
        ba.addEventListener('click', function () {
            s.autoplay = s.autoplay === false;
            putSet(s);
            ba.textContent = s.autoplay === false ? 'خاموش' : 'روشن';
        });
    }
    var bs = document.getElementById('btnSaver');
    if (bs) {
        bs.textContent = s.saver ? 'روشن' : 'خاموش';
        bs.addEventListener('click', function () {
            s.saver = !s.saver;
            putSet(s);
            bs.textContent = s.saver ? 'روشن' : 'خاموش';
        });
    }
    var ex = document.getElementById('btnExport');
    if (ex) ex.addEventListener('click', function () {
        var dump = {};
        for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && k.indexOf('neon_') === 0) dump[k] = localStorage.getItem(k);
        }
        var blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'neon-backup.json';
        a.click();
    });
    var im = document.getElementById('btnImport');
    if (im) im.addEventListener('change', function () {
        var f = im.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () {
            try {
                var dump = JSON.parse(reader.result);
                Object.keys(dump).forEach(function (k) {
                    if (k.indexOf('neon_') === 0) localStorage.setItem(k, dump[k]);
                });
                toast('بازیابی شد.');
            } catch (e) { toast('فایل نامعتبر است.'); }
        };
        reader.readAsText(f);
    });
})();
