# بوابة الإدارة اليومية + بريد Supabase

## كيف يعمل النظام
1. الخادم ينشئ **رمزاً يومياً** عشوائياً قوياً ويخزن **بصمة SHA-256 فقط** في `store_admin_daily_access`.
2. يُرسل **رابط تسجيل دخول Supabase Auth** (magic link / OTP) إلى `ADMIN_GATE_EMAIL` مع `emailRedirectTo = https://evoweb.onrender.com/admin/<token>`.
3. بعد فتح الرابط من البريد تُنشأ جلسة Auth، ثم يتحقق الخادم من الدور (`admin` / `super_admin`) والبريد ومسار اليوم وMFA.
4. معرفة الرابط وحدها **لا تكفي** بدون جلسة Auth صالحة + دور إداري + إكمال MFA.

## إعداد Supabase (يدوي — مطلوب لوصول البريد)
1. **Authentication → Users**: تأكد أن `jadoo6922@gmail.com` موجود ومؤكد.
2. **Table `store_profiles`**: نفس `id` مع `role` = `admin` أو `super_admin` و`account_status` = `active` و`email` مطابق.
3. **Authentication → URL Configuration**
   - Site URL: `https://evoweb.onrender.com`
   - Redirect URLs: أضف  
     `https://evoweb.onrender.com/**`  
     و`https://evoweb.onrender.com/admin/**`
4. **Authentication → Emails / SMTP**
   - البريد الافتراضي لـ Supabase محدود وقد يذهب للبريد المهمل.
   - للأرسال الموثوق: فعّل **Custom SMTP** داخل Supabase (هذا إعداد منصة Supabase وليس كود Resend داخل التطبيق).
5. لا تستخدم `service_role` في الواجهة الأمامية.

## متغيرات Render
| المتغير | الوظيفة |
|---------|---------|
| `PUBLIC_APP_URL` | `https://evoweb.onrender.com` |
| `ADMIN_GATE_EMAIL` | `jadoo6922@gmail.com` |
| `ADMIN_GATE_CRON_SECRET` | سر عشوائي ≥ 16 حرف لاستدعاء Cron |
| `SUPABASE_URL` | رابط مشروع Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | مفتاح الخدمة (خادم فقط) |
| `SUPABASE_ANON_KEY` / `VITE_*` | للمتصفح فقط (anon) |

## Cron على Render (موصى به)
لا تعتمد فقط على `setTimeout` داخل العملية (النوم/إعادة التشغيل يوقفها).

أنشئ **Cron Job** يستدعي مرة يومياً:
```http
POST https://evoweb.onrender.com/api/cron/admin-daily-gate
Authorization: Bearer <ADMIN_GATE_CRON_SECRET>
```

اختبار إرسال (يعيد توليد رابط اليوم ويرسل بريداً):
```http
POST https://evoweb.onrender.com/api/cron/admin-gate-test
Authorization: Bearer <ADMIN_GATE_CRON_SECRET>
```

لا تضع السر في query string. لا تسجّل الرمز في اللوجات.

## SQL المطلوب
نفّذ migration:
`supabase/migrations/20261016_admin_gate_send_meta.sql`
