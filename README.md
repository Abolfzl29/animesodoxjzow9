# Neon Anime VOD Platform 🎬

پلتفرم استریم انیمه (فارسی / RTL) — فرانت‌اند Vanilla به‌همراه یک سرور Node.js بدون وابستگی خارجی. نسخه‌ی APK و پنل مدیریت (`admin.html`) آماده‌اند؛ در حالت بدون تنظیم محیط، پنل به‌صورت preview محلی کار می‌کند و با تنظیم `server.mjs` به داده‌های واقعی سایت وصل می‌شود.

## 🛠 Tech Stack
- **HTML5** (semantic, `lang="fa" dir="rtl"`), **CSS3** با CSS Variables و Glassmorphism، **Vanilla JS**.
- کتابخانه‌های خارجی: GSAP و typed.js (CDN)، فونت Vazirmatn/Orbitron.
- تصاویر بهینه‌شده (WebP) در `assets/img/` — کل تصاویر ≈ ۱ مگابایت.

## 📁 ساختار
| فایل | نقش |
|---|---|
| `index.html` | صفحه‌ی اصلی: هیرو اسلایدر، ردیف‌های کارت، «الان تو چه حس و حالی هستی؟» (Mood Explorer)، تقویم پخش، Top10، FAQ، خبرنامه؛ کلیک روی کارت به صفحه جزئیات می‌رود |
| `catalog.html` | آرشیو ژانری؛ کارت‌ها به `anime.html?id=<id>` می‌روند |
| `anime.html` / `anime.css` / `anime.js` | صفحه اختصاصی هر عنوان (`anime.html?id=<id>`): داستان، تریلر، لیست قسمت، Watchlist، ادامه تماشا، قفل VIP |
| `watch.html` | پلیر: از URL می‌خواند (`watch.html?anime=<id>&ep=<n>`)، لیست قسمت‌ها، قفل VIP، ادامه‌ی تماشا، پخش خودکار قسمت بعد، میانبرهای کیبورد، بنر دانلود |
| `download.html` / `download.css` / `download.js` | صفحه دانلود (`download.html?anime=<id>&ep=<n>`): انتخاب قسمت، ۴ کیفیت (480p تا 4K با قفل VIP)، راهنما |
| `schedule.html` / `schedule.css` / `schedule.js` | «تقویم پخش هفتگی» مستقل: ۷ روز هفته (شنبه تا جمعه)، «پخش امروز» با شمارش معکوس زنده، ساعت انتشار هر قسمت، فیلتر دوبله/زیرنویس و یادآوری انتشار (`neon_schedule_reminders` + Notification API) |
| `login.html` | ورود / ثبت‌نام با اعتبارسنجی + ریدایرکت `?next=` |
| `profile.html` | **نمای کلی (Overview)** کتابخانه: آمار چهار بخش + **سطح اوتاکو** (XP و نوار پیشرفت نئونی) + **ویترین ۷ نشان دستاورد** + چند کارت اخیر هر بخش + «مشاهده همه»، ویرایش پروفایل، خروج |
| `favorites.html` | «علاقه‌مندی‌های من» — مدیریت و مرتب‌سازی `neon_watchlist` (حذف فقط از لیست) |
| `continue-watching.html` | «ادامه تماشا» — برای هر عنوان فقط یک کارت (آخرین قسمت نیمه‌تمام یا قسمت بعدی) با لینک دقیق `watch.html?anime=<id>&ep=<n>` |
| `history.html` | «تاریخچه تماشا» — همه‌ی رکوردهای `neon_watch_history` با زمان فارسی (حذف فقط رکورد را پاک می‌کند) |
| `completed.html` | «تکمیل‌شده‌ها» — عنوان‌هایی که **تمام قسمت‌های موجود** آن‌ها ≥ ۹۵٪ دیده شده؛ دکمه‌ی «بازنشانی پیشرفت» |
| `library.js` / `library.css` | هسته‌ی مشترک کتابخانه: قراردادهای storage، Migration داده‌های قدیمی، کارت‌ها، حالت مدیریت، دیالوگ تأیید (Focus trap)، Toast، مرتب‌سازی |
| `404.html` | صفحه‌ی خطا |
| `data/anime.js` | **منبع داده‌ی واحد** کاتالوگ (`window.NEON_ANIME`) — همه‌ی کارت‌ها/پلیر/جستجو از این پر می‌شوند؛ بعداً با API جایگزین می‌شود |
| `auth.js` | لایه‌ی سشن (`NeonAuth`) — تنها جایی که برای اتصال به بک‌اند واقعی باید عوض شود |
| `script.js` | منطق مشترک: منوها، مودال‌ها، جستجو، فیلتر، اسلایدر، توست، ... |
| `gamification.js` / `gamification.css` | **پکیج گیمیفیکیشن** (در همه‌ی صفحات دارای نوبار): دکمه «🎲 انیمه شانسی» در نوبار و منوی کناری + مودال گردونه شانس (چرخش، پوستر/امتیاز/ژانر، پخش/دانلود/دوباره بچرخون)، ۵ مود «حس و حال» در صفحه اصلی، سطح اوتاکو (۵ سطح با XP) و ۷ نشان دستاورد با پاپ‌آپ گرافیکی در پروفایل |
| `admin.html` / `admin.css` / `admin.js` | **پنل مدیریت کامل سایت**: داشبورد، کاتالوگ، مقاله‌ها، کاربران/VIP، نظرات، برنامه پخش، تنظیمات و انتشار؛ نسخه فعلی با داده‌ی preview محلی کار می‌کند |
| `control-center.html` / `control-center.css` / `control-center.js` | **کنسول عملیات امن**: داشبورد وضعیت هاست، تنظیم metadata اتصال، قرارداد endpointهای health/actions، عملیات محدود و خروجی `.env.example`/راهنمای GitHub بدون secret |
| `server.mjs` | سرور Node.js بدون dependency: سرو استاتیک، احراز هویت مدیر، API مدیریت کاتالوگ/مقاله/کاربر/نظرات/تنظیمات، audit log و داده‌ی زنده برای صفحات عمومی |
| `package.json` / `scripts/hash-password.mjs` | اجرای سرور و ساخت hash امن `scrypt` برای رمز مدیر |
| `style.css` | استایل سراسری |
| `assets/` | تصاویر WebP، favicon، آیکون‌های PWA، og-image |
| `manifest.webmanifest`, `robots.txt`, `sitemap.xml` | متادیتای سایت |

## 🚀 اجرا
برای فقط دیدن نسخه‌ی استاتیک:

```bash
python3 -m http.server 8080
# http://localhost:8080
```

برای **اتصال واقعی پنل مدیریت به سایت**، سرور Node را اجرا کن:

```bash
npm start
# http://localhost:8080/admin.html
```

سرور `server.mjs` هم فایل‌های سایت را سرو می‌کند و هم API مدیریت را در همان origin ارائه می‌دهد؛ بنابراین پنل، صفحات عمومی و داده‌ی کاتالوگ از یک منبع استفاده می‌کنند.

## 🚂 دیپلوی کامل روی Railway
ریپو با `Dockerfile` و `railway.json` برای یک سرویس full-stack آماده است:

1. در Railway گزینه‌ی **Deploy from GitHub repo** را بزن و این ریپو را انتخاب کن.
2. از **Settings → Networking** یک دامنه بساز.
3. در **Variables** این متغیرها را تنظیم کن:

```env
NODE_ENV=production
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=scrypt$...$...
SESSION_SECRET=یک-مقدار-تصادفی-طولانی
DATA_DIR=/data
```

4. برای رمز مدیر، روی سیستم امن خودت اجرا کن و خروجی را فقط در Variables قرار بده:

```bash
npm run hash-password
```

5. اگر از `DATA_DIR=/data` استفاده می‌کنی، برای سرویس یک **persistent volume** روی `/data` بساز تا تغییرات کاتالوگ بعد از deploy از بین نروند.
6. بعد از deploy، آدرس `https://دامنه-تو/admin.html` را باز کن و وارد شو.

Health check سرویس روی `GET /api/health` است. تست Docker:

```bash
docker build -t neon-anime .
docker run --rm -p 8080:8080 \
  -e ADMIN_PASSWORD_HASH='...' \
  -e SESSION_SECRET='...' neon-anime
```

## 📱 ساخت APK اندروید
پروژه‌ی `android/` پنل مدیریت `admin.html` را به‌عنوان صفحه‌ی اصلی APK باز می‌کند و کل سایت را داخل یک WebView امن بسته‌بندی می‌کند؛ از داخل پنل می‌توان به سایت عمومی و کنسول زیرساخت رفت. برای ساخت محلی، Android SDK، Java 17 و Gradle 8.7 لازم است:

```bash
gradle -p android assembleDebug
# خروجی: android/app/build/outputs/apk/debug/app-debug.apk
```

با هر push مرتبط، workflow گیت‌هاب به نام `Build Android APK` هم APK را می‌سازد و در بخش **Actions → Artifacts** قابل دانلود می‌کند. برای اینکه APK به سرور واقعی وصل شود، Repository Variable به نام `NEON_ADMIN_URL` را روی آدرس `https://دامنه-تو/admin.html` بگذار؛ در غیر این صورت APK نسخه‌ی preview آفلاین را باز می‌کند.

## 🛡️ API مدیریت، احراز هویت و secret
`server.mjs` اتصال واقعی پنل و سایت را فراهم می‌کند. پنل قبل از خواندن یا نوشتن داده به `/api/auth/login` وارد می‌شود و سرور با cookie امن، انقضا و rate limit ساده از endpointها محافظت می‌کند.

Endpointهای مدیریتی اصلی:

- `POST /api/auth/login`، `GET /api/auth/me`، `POST /api/auth/logout`
- `GET/POST /api/v1/catalog` و `PATCH/DELETE /api/v1/catalog/:id`
- `GET/POST /api/v1/articles` و `PATCH /api/v1/articles/:slug`
- `GET/PATCH /api/v1/users/:id`
- `GET/POST /api/v1/moderation/:id`
- `GET/PATCH /api/v1/settings`
- `GET /api/v1/dashboard` و `POST /api/v1/actions`

کنسول زیرساخت هم از این مسیرها استفاده می‌کند:

- `GET /api/ops/health`
- `POST /api/ops/actions` با بدنه‌ی `{ "action": "health|deploy|cache|restart|rotate_api_key" }`

عملیات سرور allowlist شده‌اند و endpoint اجرای shell آزاد وجود ندارد. API key، رمز عبور، کلید SSH و session secret هیچ‌وقت از API به پنل برگردانده نمی‌شوند؛ مقدار واقعی را فقط در Secret Manager / Environment Variables نگه دار. فایل `server-data/state.json` داده‌ی runtime را نگه می‌دارد و باید روی volume پایدار قرار بگیرد.

اگر APK را با آدرس سایت live بسازی، صفحه‌ی hosted پنل را باز می‌کند و تغییرات مستقیماً به همین API می‌رسند:

```bash
NEON_ADMIN_URL=https://your-domain.example/admin.html gradle -p android assembleDebug
```

در GitHub Actions هم متغیر Repository Variable با نام `NEON_ADMIN_URL` توسط workflow خوانده می‌شود. اگر خالی باشد، APK در حالت preview آفلاین باز می‌شود.

## 🧠 شبیه‌سازی بک‌اند (موقت)
کلیدهای `localStorage` با پیشوند `neon_` (ورود، نام، آواتار، VIP، لیست تماشا، پیشرفت تماشا، تاریخچه، نظرات). **این‌ها امنیتی نیستند** — قفل VIP و لینک ویدیو باید سمت سرور اعمال شود.

### قرارداد ذخیره‌سازی کتابخانه

| کلید | مقدار | توضیح |
|---|---|---|
| `neon_watchlist` | `["attack-on-titan", ...]` | علاقه‌مندی‌ها (= «لیست من») |
| `neon_progress_<anime-id>_<ep>` | `"0.4213"` | نسبت پیشرفت (۰..۱)؛ ≥ ۰.۹۵ یعنی قسمت کامل شده |
| `neon_watch_history` | `[{anime, ep, ratio, watchedAt}, ...]` | تاریخچه‌ی کامل؛ برای هر anime+episode فقط یک رکورد؛ حداکثر ۲۰۰ رکورد (قدیمی‌ترین حذف می‌شود) |
| `neon_last_watched` | `{anime, ep, title, banner, ratio, at}` | فقط برای سازگاری با نسخه‌های قبل (backward compatibility) |
| `neon_sort_<page>` | `"title"` | انتخاب مرتب‌سازی هر صفحه (در URL هم با `?sort=` نگه داشته می‌شود) |
| `neon_gami` | `{spins, moods, badges, notified}` | وضعیت گیمیفیکیشن: تعداد چرخش گردونه، مودهای کاوش‌شده، نشان‌های باز‌شده (با timestamp) و نشان‌هایی که پاپ‌آپ‌شان نشان داده شده. XP و سطح همیشه از کلیدهای واقعی بالا *محاسبه* می‌شود و جدا ذخیره نمی‌شود |
| `neon_is_vip` / `neon_is_logged_in` | `"true"` | وضعیت اشتراک و ورود |

قوانین مهم:
- **Migration فقط یک‌بار** اجرا می‌شود (وقتی کلید `neon_watch_history` وجود نداشته باشد) و رکوردهای قدیمی را از `neon_progress_*` و `neon_last_watched` می‌سازد؛ چیزی که کاربر حذف کرده دوباره ظاهر نمی‌شود.
- عنوان/پوستر/بنر هیچ‌وقت در storage کپی نمی‌شوند؛ همیشه از `data/anime.js` خوانده می‌شوند.
- داده‌ی خراب (JSON نامعتبر) باعث Crash نمی‌شود؛ صفحه با هشدار نمایش داده می‌شود.

## ✅ تغییرات این نسخه (خلاصه)
1. تعمیر `watch.html` خراب (`\n`های متنی، تگ‌های اضافه) و اضافه‌شدن اجزای مشترک به آن
2. بازسازی `script.js`؛ دکمه‌های پخش واقعاً به پلیر می‌روند؛ جستجو، فیلتر، تب‌ها و Escape کار می‌کنند
3. منبع داده‌ی واحد + پلیر واقعی با لیست قسمت و ادامه‌ی تماشا
4. تصاویر: حذف بلااستفاده‌ها، WebP، lazy-load (۷.۱MB → ۱.۰MB)، ویدیوها `https`
5. احراز هویت شبیه‌سازی‌شده‌ی تمیز (`auth.js`)، پروفایل واقعی، خروج در موبایل
6. SEO/متا، favicon، فوتر، 404، manifest، اصلاحات موبایل
7. کتابخانه‌ی کاربر با چهار صفحه‌ی مستقل (`favorites` / `continue-watching` / `history` / `completed`)، قرارداد `neon_watch_history`، انتخاب چندتایی و دیالوگ تأیید، و تبدیل `profile.html` به نمای کلی
8. افزودن `control-center.html`: داشبورد عملیات، اتصال health check هم‌دامنه، محافظ کلیدها و خروجی امن برای GitHub بدون secret
9. افزودن `admin.html` و `server.mjs`: پنل مدیریت live برای کاتالوگ، مقاله‌ها، کاربران، نظرات، تنظیمات و انتشار با API احراز هویت‌شده

جزئیات و آنچه هنوز مانده (بک‌اند، پرداخت، HLS، ادمین): `CODE-REVIEW.md`
