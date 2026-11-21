# راهنمای استقرار Cloudflare Worker برای TURN (اتصال پایدار با VPN)

این Worker کوچک، اعتبارنامه موقت (Ephemeral) سرویس **Cloudflare Calls TURN** را سمت سرور می‌گیرد و با پشتیبانی کامل از **UDP، TCP و TLS روی پورت 443** در اختیار بازی قرار می‌دهد تا حتی وقتی فیلترشکن (VPN) یا فایروال شبکه پورت UDP را مسدود کرده باشد، بازیکنان بتوانند به هم وصل شوند.

- **امنیت:** کلید API کلودفلر هرگز داخل کد بازی (کلاینت) قرار نمی‌گیرد.
- **CORS سخت‌گیرانه:** فقط دامنه دقیق بازی شما اجازه دریافت اعتبارنامه دارد.
- **محدودیت نرخ (Rate Limit):** از سوءاستفاده و مصرف بی‌رویه ترافیک جلوگیری می‌کند.
- **Fallback خودکار:** اگر این Worker را راه‌اندازی نکنید یا موقتاً در دسترس نباشد، بازی خودکار فقط با STUN ادامه می‌دهد.

---

## پیش‌نیازها
1. یک حساب رایگان در [Cloudflare](https://dash.cloudflare.com/) (سرویس TURN کلودفلر در پلن رایگان سهمیه ماهانه بسیار بالایی دارد).
2. نصب بودن Node.js (نسخه ۱۸ یا بالاتر).

---

## مراحل راه‌اندازی به ترتیب

### مرحله ۱: ساخت کلید TURN در داشبورد کلودفلر
1. وارد داشبورد کلودفلر شوید و از منوی سمت چپ به بخش **Calls** (یا **Realtime → TURN Server**) بروید.
2. روی **Create TURN App / Create TURN Key** کلیک کنید و یک نام (مثلاً `bodycam-vanguard`) انتخاب کنید.
3. پس از ساخت، دو مقدار زیر را کپی کرده و جای امن نگه دارید:
   - **TURN Token ID** (`CF_TURN_TOKEN_ID`)
   - **API Token** (`CF_TURN_API_TOKEN`)

### مرحله ۲: تنظیم دامنه مجاز (CORS)
فایل `worker/wrangler.toml` را باز کنید و مقدار `ALLOWED_ORIGINS` را به آدرس دقیق محل میزبانی بازی تغییر دهید (بدون `/` انتهایی):

```toml
ALLOWED_ORIGINS = "https://your-username.github.io"
```
اگر چند دامنه دارید (مثلاً دامنه اصلی و تست محلی)، با کاما جدا کنید:
```toml
ALLOWED_ORIGINS = "https://your-username.github.io,https://your-custom-domain.com"
```

### مرحله ۳: ورود به حساب کلودفلر و ثبت کلیدهای مخفی (Secrets)
در ترمینال وارد پوشه `worker/` شوید و دستورات زیر را اجرا کنید:

```bash
cd worker
npx wrangler login
npx wrangler secret put CF_TURN_TOKEN_ID
npx wrangler secret put CF_TURN_API_TOKEN
```
در هر دستور، مقدار مربوطه از مرحله ۱ را وارد (Paste) و Enter بزنید.

### مرحله ۴: انتشار (Deploy) روی کلودفلر
```bash
npx wrangler deploy
```
پس از پایان، Wrangler آدرس Worker شما را چاپ می‌کند، مثلاً:
```
https://bodycam-vanguard-turn.your-subdomain.workers.dev
```

### مرحله ۵: معرفی آدرس Worker به بازی
در تنظیمات بیلد بازی (فایل `.env` محلی یا **GitHub Actions Secrets / Repository Variables** در ریپازیتوری پروژه)، متغیر زیر را اضافه کنید:

```env
VITE_TURN_WORKER_URL="https://bodycam-vanguard-turn.your-subdomain.workers.dev"
```

و اگر سرور شخصی PeerJS (برای سیگنالینگ) هم دارید، می‌توانید آدرس آن را در اولویت اول قرار دهید:
```env
VITE_PEER_HOST="peer.your-domain.com"
VITE_PEER_PORT="443"
VITE_PEER_PATH="/peerjs"
VITE_PEER_SECURE="true"
```

سپس یک‌بار `npm run build` / استقرار جدید انجام دهید.

---

## تست سریع عملکرد Worker
1. آدرس `https://<worker-url>/health` را در مرورگر باز کنید؛ باید `{ "ok": true, "service": "bodycam-turn-worker" }` برگردد.
2. داخل بازی بخش **آنلاین ← تشخیص اتصال** را باز کنید؛ باید وضعیت **TURN (UDP/TCP/TLS 443)** سبز شود و در صورت نیاز با VPN، اتصال روی حالت **رله (TURN Relay)** برقرار گردد.
