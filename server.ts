import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';

/** Lazy HMAC secret — missing value fails only receipt/signing routes, not process boot /health. */
function getHmacSecret(): string {
  const secret = process.env.RECEIPT_HMAC_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('RECEIPT_HMAC_SECRET must be a strong random secret of at least 32 characters.');
  }
  return secret;
}

export function computeRealHmac(txId: string, amount: number | string): string {
  const numericAmount = Number(amount);
  const normalizedAmount = Number.isFinite(numericAmount) ? numericAmount.toFixed(2) : String(amount);
  return crypto.createHmac('sha256', getHmacSecret()).update(`${txId}:${normalizedAmount}`).digest('hex');
}

// Server-only Supabase client. The service-role key must never use a VITE_ prefix.
let supabaseAdmin: SupabaseClient | null = null;
function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required on the server.');
    supabaseAdmin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return supabaseAdmin;
}

async function verifySupabaseToken(token: string) {
  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data.user) throw new Error('Invalid Supabase access token');
  let claims: any = {};
  try { claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')); } catch { throw new Error('Invalid Supabase access token'); }
  // Server-side session revocation: every protected API request compares the JWT issue time
  // with a server-controlled cutoff. A revoked token cannot keep working until natural expiry.
  const { data: security, error: securityError } = await getSupabaseAdmin()
    .from('store_security_profiles').select('session_revoked_at').eq('user_id', data.user.id).maybeSingle();
  if (securityError) throw new Error('Session security check unavailable');
  if (security?.session_revoked_at && Number(claims.iat || 0) <= Math.floor(new Date(security.session_revoked_at).getTime() / 1000)) {
    throw new Error('session_revoked');
  }
  (data.user as any).aal = claims.aal || 'aal1';
  return data.user;
}


const ADMIN_GATE_EMAIL = 'maybepq22@gmail.com';
const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
const utcDateKey = (date = new Date()) => date.toISOString().slice(0, 10);
const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

// Shared rate limiting uses Upstash Redis when configured. Local fallback is development-only.
const localRateLimitStore = new Map<string, { count: number; resetAt: number }>();
async function isRateLimited(key: string, limit: number, windowMs: number): Promise<boolean> {
  const redisUrl = String(process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '');
  const redisToken = String(process.env.UPSTASH_REDIS_REST_TOKEN || '');
  if (redisUrl && redisToken) {
    try {
      const seconds = Math.max(1, Math.ceil(windowMs / 1000));
      const script = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]); end; if n>tonumber(ARGV[2]) then return 0 else return 1 end";
      const response = await fetch(redisUrl, { method: 'POST', headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(['EVAL', script, '1', `evo-viper:rl:${sha256(key)}`, String(seconds), String(limit)]) });
      if (!response.ok) throw new Error(`Redis rate-limit request failed (${response.status})`);
      const payload: any = await response.json();
      if (payload?.error) throw new Error('Redis rate-limit command failed');
      return Number(payload?.result) !== 1;
    } catch (error) {
      console.error('[RateLimit] Shared limiter unavailable:', error);
      if (process.env.NODE_ENV === 'production') return true;
    }
  } else if (process.env.NODE_ENV === 'production' && process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT === 'true') {
    return true;
  }
  const now = Date.now(); const previous = localRateLimitStore.get(key);
  if (previous && previous.resetAt > now && previous.count >= limit) return true;
  localRateLimitStore.set(key, previous && previous.resetAt > now ? { count: previous.count + 1, resetAt: previous.resetAt } : { count: 1, resetAt: now + windowMs });
  if (localRateLimitStore.size > 10000) for (const [k, value] of localRateLimitStore) if (value.resetAt <= now) localRateLimitStore.delete(k);
  return false;
}
function scryptAsync(password: string, salt: string, length = 64): Promise<Buffer> {
  return new Promise((resolve, reject) => crypto.scrypt(password, salt, length, (error, key) => error ? reject(error) : resolve(key)));
}

async function sendResendHtmlEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ADMIN_EMAIL_FROM;
  if (!apiKey || !from) throw new Error('RESEND_API_KEY and ADMIN_EMAIL_FROM are required for email delivery.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!response.ok) throw new Error(`Email provider rejected the message (${response.status}).`);
}

async function issueMerchantActivationToken(userId: string) {
  const db = getSupabaseAdmin();
  const [{ data: profile }, { data: application }, { data: deposit }] = await Promise.all([
    db.from('store_profiles').select('id,email,display_name,account_status,role').eq('id', userId).maybeSingle(),
    db.from('store_merchant_applications').select('id,status,license_paid').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('store_merchant_deposits').select('id,status,amount').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!profile || profile.account_status !== 'active' || !profile.email) throw new Error('حساب التاجر غير نشط أو لا يملك بريداً صالحاً.');
  if (!application || application.status !== 'approved' || application.license_paid !== true || !deposit || deposit.status !== 'held') throw new Error('التفعيل متوقف حتى اعتماد الطلب وتأكيد رسوم الترخيص والضمان في الدفتر المالي.');
  const rawToken = randomToken(32);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await db.from('store_merchant_activation_tokens').update({ used_at: new Date().toISOString() }).eq('user_id', userId).is('used_at', null);
  const { error } = await db.from('store_merchant_activation_tokens').insert({ user_id: userId, token_hash: sha256(rawToken), expires_at: expiresAt });
  if (error) throw error;
  const appUrl = String(process.env.PUBLIC_APP_URL || '').replace(/\/+$/, '');
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;line-height:1.7;color:#172033"><h2>تفعيل حساب التاجر</h2><p>مرحباً ${String(profile.display_name || 'التاجر').replace(/[&<>"']/g, '')}،</p><p>رمز التفعيل صالح لمدة 30 دقيقة ويُستخدم مرة واحدة:</p><p style="font-family:monospace;font-size:20px;background:#f3f4f6;padding:12px;word-break:break-all">${rawToken}</p><p>انسخ الرمز إلى قسم التفعيل داخل موقعك. لا تشاركه مع أي شخص.</p>${appUrl ? `<p><a href="${appUrl}/?merchant_activation=1">فتح بوابة التاجر</a></p>` : ''}<p style="font-size:12px;color:#64748b">إذا لم تطلب التفعيل، تجاهل هذه الرسالة.</p></div>`;
  await sendResendHtmlEmail(profile.email, 'رمز تفعيل حساب التاجر', html);
  return { expiresAt };
}

async function sendAdminGateEmail(to: string, subject: string, html: string, qrDataUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ADMIN_EMAIL_FROM;
  if (!apiKey || !from) throw new Error('RESEND_API_KEY and ADMIN_EMAIL_FROM are required for daily admin email delivery.');
  const base64 = qrDataUrl.split(',')[1];
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from, to: [to], subject, html,
      attachments: [{ filename: 'admin-daily-qr.png', content: base64, content_type: 'image/png' }],
    }),
  });
  if (!response.ok) throw new Error(`Email provider rejected the daily admin message (${response.status}).`);
}

async function deliverDailyAdminGate() {
  const publicUrl = String(process.env.PUBLIC_APP_URL || '').replace(/\/+$/, '');
  const db = getSupabaseAdmin();
  const today = utcDateKey();
  // Expired daily tokens are removed even if the mail provider is temporarily misconfigured.
  await db.from('store_admin_daily_access').delete().lt('access_date', today);
  if (!publicUrl || !process.env.RESEND_API_KEY || !process.env.ADMIN_EMAIL_FROM) {
    throw new Error('Daily admin email is not configured: set PUBLIC_APP_URL, RESEND_API_KEY, and ADMIN_EMAIL_FROM.');
  }
  const { data: existing, error: existingError } = await db.from('store_admin_daily_access').select('id,sent_at').eq('access_date', today).maybeSingle();
  if (existingError) throw existingError;
  if (existing?.sent_at) return;
  // Recover safely if the process died after reserving today's row but before sending mail.
  if (existing && !existing.sent_at) await db.from('store_admin_daily_access').delete().eq('id', existing.id);
  const pathToken = randomToken(32);
  const dailyKey = randomToken(9).toUpperCase();
  const qrToken = randomToken(32);
  const expiresAt = new Date(`${today}T23:59:59.999Z`).toISOString();
  const { data: inserted, error: insertError } = await db.from('store_admin_daily_access').insert({
    access_date: today,
    path_token_hash: sha256(pathToken),
    key_hash: sha256(dailyKey),
    qr_token_hash: sha256(qrToken),
    expires_at: expiresAt,
  }).select('id').maybeSingle();
  if (insertError) {
    // A concurrent server instance may already have generated today's row.
    if (String((insertError as any).code) === '23505') return;
    throw insertError;
  }
  if (!inserted) return;
  const loginUrl = `${publicUrl}/admin/${encodeURIComponent(pathToken)}`;
  const qrUrl = `${loginUrl}?qr=${encodeURIComponent(qrToken)}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { errorCorrectionLevel: 'H', margin: 2, width: 320 });
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#172033;line-height:1.7">
      <h2>معلومات الدخول اليومية إلى لوحة الإدارة</h2>
      <p>هذه الرسالة مخصصة لبوابة الإدارة على موقعك نفسه. تنتهي صلاحية المعلومات عند نهاية اليوم بالتوقيت العالمي UTC.</p>
      <p><b>رابط بوابة الإدارة:</b><br><a href="${loginUrl}">${loginUrl}</a></p>
      <p><b>مفتاح الدخول اليومي:</b></p><p style="font-family:monospace;font-size:20px;letter-spacing:2px;background:#f3f4f6;padding:12px">${dailyKey}</p>
      <p><b>بريد الحساب الإداري:</b> ${ADMIN_GATE_EMAIL}</p>
      <p>افتح الرابط وأدخل المفتاح، ثم سجّل الدخول بكلمة المرور التي تحتفظ بها أنت. بعد ذلك امسح صورة QR المرفقة من نفس الجهاز/المتصفح الذي سجلت الدخول منه.</p>
      <p>لا يتم إرسال كلمة المرور في البريد. رمز QR اليومي رابط تحقق مؤقت وليس بديلاً عن كلمة المرور أو التحقق متعدد العوامل.</p>
      <p style="color:#64748b;font-size:12px">إذا لم تطلب هذه الرسالة، تجاهلها. لا تشارك الرسالة أو الرابط مع أي شخص.</p>
    </div>`;
  try {
    await sendAdminGateEmail(ADMIN_GATE_EMAIL, `مفتاح بوابة الإدارة اليومي — ${today}`, html, qrDataUrl);
    const { error: sentError } = await db.from('store_admin_daily_access').update({ sent_at: new Date().toISOString() }).eq('id', inserted.id);
    if (sentError) throw sentError;
    console.info(`[Admin Gate] Daily access message sent for ${today}.`);
  } catch (error) {
    await db.from('store_admin_daily_access').delete().eq('id', inserted.id);
    throw error;
  }
}

function scheduleDailyAdminGate() {
  const run = async () => {
    let failed = false;
    try { await deliverDailyAdminGate(); }
    catch (error) { failed = true; console.error('[Admin Gate] Daily delivery failed:', error); }
    const now = new Date();
    const next = failed ? new Date(Date.now() + 15 * 60 * 1000) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 5, 0));
    setTimeout(run, Math.max(1000, next.getTime() - Date.now()));
  };
  // Retry startup failures periodically; the DB uniqueness constraint prevents duplicate daily records.
  void run();
}

// Lazy initialization for Gemini SDK
let genAI: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY is not configured in server environment.');
    }
    genAI = new GoogleGenAI({ apiKey: key });
  }
  return genAI;
}

async function startServer() {
  const app = express();

  // Behind Render / Cloudflare / reverse proxies, trust X-Forwarded-* for rate limits and secure cookies.
  app.set('trust proxy', 1);

  // Liveness for host health checks — no secrets required.
  app.get('/api/health', (_req, res) => {
    const supabaseReady = Boolean(
      (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    res.status(200).json({
      ok: true,
      status: 'ok',
      service: 'evo-viper-supabase',
      supabaseConfigured: supabaseReady,
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      time: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    });
  });

  // Public browser config only (anon/publishable). Never returns service_role / sb_secret_*.
  app.get('/api/public-config', (_req, res) => {
    const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '');
    const anon = String(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
    const looksSecret = anon.startsWith('sb_secret_') || (() => {
      try {
        const part = anon.split('.')[1];
        if (!part) return false;
        const payload = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
        return payload?.role === 'service_role';
      } catch { return false; }
    })();
    if (!url || !anon || looksSecret) {
      return res.status(503).json({
        error: 'Supabase public config is not available. Set SUPABASE_URL and SUPABASE_ANON_KEY (publishable/anon) on the server.',
      });
    }
    res.set('Cache-Control', 'no-store');
    return res.json({ supabaseUrl: url, supabaseAnonKey: anon });
  });


  // Render and other hosts inject PORT. Keep 3000 as the local-development fallback.
  const PORT = Number.parseInt(process.env.PORT || '3000', 10);

  app.use(express.json({ limit: '20mb' }));

  const allowedOrigins = new Set(
    [process.env.PUBLIC_APP_URL, process.env.APP_URL]
      .filter(Boolean)
      .map((u) => String(u).replace(/\/$/, ''))
  );
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.has(origin.replace(/\/$/, ''))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    }
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  app.use(express.urlencoded({ extended: true, limit: '20mb' }));
  app.use((_req, res, next) => { res.setHeader('Referrer-Policy', 'no-referrer'); next(); });


  // 2. Real OCR Verification via Gemini Vision (Supabase-backed Server API)
  app.post('/api/verify-receipt-ocr', async (req, res) => {
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) return res.status(401).json({ error: 'unauthorized' });
    let requester: any;
    try {
      requester = await verifySupabaseToken(idToken);
    } catch {
      return res.status(401).json({ error: 'invalid token' });
    }

    try {
      const { imageBase64, expectedTxId } = req.body || {};
      if (!imageBase64) {
        return res.status(400).json({ error: 'imageBase64 is required' });
      }

      // Max image size 2MB and MIME check
      const sizeInBytes = ((imageBase64 || '').length * 3) / 4;
      if (sizeInBytes > 2 * 1024 * 1024) {
        return res.status(400).json({ error: 'الصورة كبيرة جداً (الحد الأقصى 2MB)' });
      }
      if (!/^data:image\/(png|jpe?g|webp);base64,/.test(imageBase64 || '')) {
        return res.status(400).json({ error: 'صيغة صورة غير مدعومة' });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '').trim();
      const ai = getGenAI();

      // Vision OCR query using Gemini 2.5 Flash
      const prompt = `أنت مدقق مالي وخبير فحص مستندات بنكية وإيصالات تحويل.
قم بتحليل صورة هذا الإيصال المالي أو التحويل بدقة بالغة واستخرج البيانات الآتية بصيغة JSON حصرية، دون أي كود ماركداون أو نصوص تمهيدية:
{
  "amount": رقم أو null,
  "currency": "اسم العملة أو الرمز" أو null,
  "date": "YYYY-MM-DD" أو null,
  "reference": "رقم المرجع أو رقم الحوالة" أو null,
  "senderName": "اسم المرسل" أو null,
  "receiverName": "اسم المستلم" أو null,
  "bankOrApp": "اسم البنك أو التطبيق أو النظام" أو null,
  "isLikelyAltered": false
}`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: cleanBase64,
                },
              },
              { text: prompt },
            ],
          },
        ],
      });

      const rawText = aiResponse.text || '{}';
      let extracted: any = {};
      try {
        const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        extracted = JSON.parse(cleaned);
      } catch (parseErr) {
        console.error('Failed to parse Gemini OCR JSON:', rawText, parseErr);
        return res.status(422).json({
          matchStatus: 'mismatch',
          extracted: null,
          confidence: 0,
          notes: 'تعذر على الذكاء الاصطناعي استخراج نصوص واضحة من الصورة المرفوعة.',
          rawOutput: rawText,
        });
      }

      // Cross-verify with official Supabase transactions
      let targetTx: any = null;
      if (expectedTxId) {
        try {
          const { data, error } = await getSupabaseAdmin().from('store_transactions').select('*').eq('id', expectedTxId).maybeSingle();
          if (!error && data) targetTx = data;
        } catch (dbErr) {
          console.warn('Supabase lookup error in OCR verification:', dbErr);
        }
      }

      // If no targetTx yet, try looking up by extracted reference
      if (!targetTx && extracted.reference) {
        try {
          const { data } = await getSupabaseAdmin().from('store_transactions').select('*').eq('reference', extracted.reference.trim()).limit(1).maybeSingle();
          if (data) targetTx = data;
        } catch {}
      }

      if (targetTx) {
        const isParticipant = targetTx.user_id === requester.id || targetTx.counterparty_user_id === requester.id;
        if (!isParticipant) {
          const { data: requesterProfile } = await getSupabaseAdmin().from('store_profiles').select('role,account_status,mfa_enabled').eq('id', requester.id).maybeSingle();
          const isAdmin = requesterProfile && ['admin', 'super_admin'].includes(requesterProfile.role) && requesterProfile.account_status === 'active' && (!requesterProfile.mfa_enabled || requester.aal === 'aal2');
          if (!isAdmin) return res.status(403).json({ error: 'not authorized to inspect this transaction' });
        }
      }

      if (!targetTx) {
        return res.json({
          matchStatus: 'not_found',
          extracted,
          confidence: extracted.amount ? 50 : 15,
          notes: 'تم استخراج البيانات من الصورة بنجاح، لكن رقم المعاملة أو المرجع غير مسجل في قاعدة بيانات المتجر الرسمية.',
          serverTimestamp: new Date().toISOString(),
        });
      }

      // Honest mathematical and textual comparison
      const extractedAmount = Number(extracted.amount);
      const targetAmount = Number(targetTx.amount);
      const amountMatch =
        !isNaN(extractedAmount) &&
        !isNaN(targetAmount) &&
        Math.abs(extractedAmount - targetAmount) < 0.05;

      const cleanExtRef = (extracted.reference || '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const cleanTargetRef = (targetTx.reference || '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const refMatch =
        cleanExtRef.length > 3 &&
        (cleanExtRef.includes(cleanTargetRef) || cleanTargetRef.includes(cleanExtRef));

      const isExactMatch = amountMatch && refMatch;
      const isPartial = amountMatch || refMatch;

      return res.json({
        matchStatus: isExactMatch ? 'match' : isPartial ? 'partial_match' : 'mismatch',
        extracted,
        transaction: {
          id: targetTx.id,
          reference: targetTx.reference,
          amount: targetTx.amount,
          senderName: targetTx.sender_name || '',
          receiverName: targetTx.receiver_name || '',
          status: targetTx.status,
          timestamp: targetTx.created_at,
          securityVerificationHash: targetTx.security_verification_hash || '',
        },
        confidence: isExactMatch ? 96 : isPartial ? 65 : 20,
        notes: isExactMatch
          ? 'تطابق تام وموثق: يتطابق المبلغ المالي ورقم المرجع المستخرج من الصورة مع السجل المحاسبي الفعلي.'
          : amountMatch
          ? 'تطابق المبلغ المالي مع السجل، ولكن رقم المرجع أو أسماء الأطراف تختلف أو غير واضحة.'
          : 'اختلاف صريح بين بيانات الإيصال المرفوع وبيانات المعاملة المسجلة بالنظام.',
        serverTimestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('OCR Verification error:', err);
      return res.status(500).json({
        error: err?.message || 'Server error during OCR processing',
      });
    }
  });

  // 3. Lightweight IP discovery endpoint
  app.get('/api/my-ip', (req, res) => {
    const realIp = ((req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || 'unknown')
      .split(',')[0]
      .trim();
    res.json({ ip: realIp });
  });

  // 4. Real IP Audit Logging (Strictly authenticated, whitelisted actions)
  app.post('/api/log-secure-event', async (req, res) => {
    try {
      const idToken = req.headers.authorization?.split('Bearer ')[1];
      if (!idToken) {
        return res.status(401).json({ error: 'unauthorized' });
      }
      const decoded = await verifySupabaseToken(idToken);

      const ALLOWED_ACTIONS = ['USER_LOGIN', 'USER_LOGOUT', 'PROFILE_UPDATE', 'SUSPICIOUS_ACTIVITY', 'DISPUTE_OPENED', 'DISPUTE_STATUS_CHANGE', 'EMERGENCY_SETTINGS_CHANGE', 'P2P_TRANSFER', 'PRODUCT_PURCHASE', 'SIGNED_DOWNLOAD_GENERATED', 'USER_STATUS_CHANGE', 'PRODUCT_CREATE', 'PRODUCT_UPDATE', 'WALLET_ADJUST_CREDIT', 'WALLET_ADJUST_DEBIT'];
      const { action, target, metadata } = req.body || {};
      if (!ALLOWED_ACTIONS.includes(action)) {
        return res.status(400).json({ error: 'invalid action' });
      }
      if (JSON.stringify(metadata || {}).length > 2000) {
        return res.status(400).json({ error: 'metadata too large' });
      }

      const realIp = ((req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || 'unknown')
        .split(',')[0]
        .trim();
      const userAgent = req.headers['user-agent'] || 'unknown';

      const { data: profile } = await getSupabaseAdmin().from('store_profiles').select('role').eq('id', decoded.id).maybeSingle();
      const logPayload = {
        actor_id: decoded.id, actor_email: decoded.email || 'unknown', actor_role: profile?.role || 'user',
        action, entity_type: 'audit_event', entity_id: String(target || 'system'), ip_address: realIp,
        user_agent: String(userAgent), details: metadata || {}, metadata: { target: target || 'system' }, result: 'success',
      };
      const { data: savedLog, error: logError } = await getSupabaseAdmin().from('store_audit_logs').insert(logPayload).select('id,action,actor_id,actor_email,actor_role,ip_address,created_at,result').single();
      if (logError) console.warn('Could not write audit log to Supabase:', logError.message);
      const logEntry = savedLog ? { id: savedLog.id, action: savedLog.action, target: target || 'system', actorUid: savedLog.actor_id, actorEmail: savedLog.actor_email, actorRole: savedLog.actor_role, ip: savedLog.ip_address, userAgent, metadata: metadata || {}, result: savedLog.result, timestamp: savedLog.created_at } : { ...logPayload, id: null, target: target || 'system', ip: realIp, timestamp: new Date().toISOString() };
      return res.json({ success: true, log: logEntry });
    } catch (err: any) {
      console.error('Audit Log error:', err);
      return res.status(401).json({ error: 'invalid token or unauthorized' });
    }
  });

  // 5. Public Transaction Verification for QR Code Scans
  app.get('/api/public-verify/:txId', async (req, res) => {
    try {
      const { txId } = req.params;
      const { data: txRow, error: txError } = await getSupabaseAdmin().from('store_transactions').select('id,reference,amount,transaction_type,created_at,status,security_verification_hash').eq('id', txId).maybeSingle();
      if (txError || !txRow) {
        return res.status(404).json({
          found: false,
          message: 'لا توجد معاملة بهذا الرقم في السجل المالي الرسمي.',
        });
      }

      const tx = { ...txRow, securityVerificationHash: txRow.security_verification_hash, timestamp: txRow.created_at, type: txRow.transaction_type, senderName: txRow.sender_name, receiverName: txRow.receiver_name };
      const expectedHmac = computeRealHmac(tx.id, tx.amount);
      const isSignatureValid = Boolean(tx.securityVerificationHash) && tx.securityVerificationHash === expectedHmac;

      return res.json({
        found: true,
        transaction: {
          id: tx.id,
          reference: tx.reference,
          amount: tx.amount,
          type: tx.type,
          senderName: null,
          receiverName: null,
          timestamp: tx.timestamp,
          status: tx.status,
        },
        isCryptographicallyValid: isSignatureValid,
        verifiedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to query transaction' });
    }
  });

  // 5b. Public Merchant License Verification for QR Code Scans
  app.get('/api/public-verify-merchant/:merchantId', async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { data: merchantRow, error: merchantError } = await getSupabaseAdmin().from('store_profiles').select('id,display_name,username,role,account_status,merchant_license_id,merchant_license_revoked_at,merchant_license_revoke_reason,merchant_activated_at,created_at').eq('id', merchantId).maybeSingle();
      if (merchantError || !merchantRow) {
        return res.status(404).json({
          found: false,
          message: 'التاجر غير مسجل في السجل الرسمي للتراخيص.',
        });
      }

      const merchant = { ...merchantRow, displayName: merchantRow.display_name, status: merchantRow.account_status, merchantLicenseId: merchantRow.merchant_license_id, merchantLicenseRevokedAt: merchantRow.merchant_license_revoked_at, merchantLicenseRevokeReason: merchantRow.merchant_license_revoke_reason, merchantActivatedAt: merchantRow.merchant_activated_at, createdAt: merchantRow.created_at }; 
      const isMerchantRole = merchant.role === 'merchant' || merchant.merchantLicenseId;
      const isSuspendedOrBanned =
        merchant.status === 'banned' ||
        merchant.status === 'suspended' ||
        merchant.status === 'suspended_pending_review';

      let licenseStatus: 'active' | 'suspended' | 'revoked' | 'pending' = 'active';
      if (merchant.status === 'banned' || merchant.merchantLicenseRevokedAt) {
        licenseStatus = 'revoked';
      } else if (isSuspendedOrBanned) {
        licenseStatus = 'suspended';
      } else if (!isMerchantRole) {
        licenseStatus = 'pending';
      }

      return res.json({
        found: true,
        merchant: {
          id: merchant.id || merchantId,
          displayName: merchant.displayName || merchant.username || 'تاجر معتمد',
          username: merchant.username,
          licenseId: merchant.merchantLicenseId || `LIC-MCH-${merchantId.slice(0, 6).toUpperCase()}`,
          licenseStatus,
          status: merchant.status,
          role: merchant.role,
          createdAt: merchant.createdAt,
          merchantActivatedAt: merchant.merchantActivatedAt || merchant.createdAt,
          revokeReason: merchant.merchantLicenseRevokeReason || null,
        },
        verifiedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to query merchant license' });
    }
  });

  // Optional external scheduler hook for hosts that sleep between requests (e.g. free Render web services).
  app.post('/api/cron/admin-daily-gate', async (req, res) => {
    const expected = String(process.env.ADMIN_GATE_CRON_SECRET || '');
    const supplied = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (expected.length < 32 || supplied.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return res.status(401).json({ success: false });
    try { await deliverDailyAdminGate(); return res.json({ success: true }); }
    catch (error: any) { console.error('[Admin Gate] Scheduled delivery failed:', error); return res.status(503).json({ success: false, message: 'Daily delivery failed; retry later.' }); }
  });

  // Daily admin gate: one-time path token + emailed daily key + normal Supabase password + QR confirmation.
  app.post('/api/admin/access/verify-key', async (req, res) => {
    try {
      const pathToken = String(req.body?.pathToken || '');
      const dailyKey = String(req.body?.dailyKey || '').trim().toUpperCase();
      if (!/^[A-Za-z0-9_-]{40,60}$/.test(pathToken) || !/^[A-Z0-9_-]{8,40}$/.test(dailyKey)) return res.status(400).json({ success: false, message: 'رابط أو مفتاح غير صالح.' });
      const ip = String(req.ip || req.socket.remoteAddress || 'unknown');
      const rateKey = `admin-gate:${ip}:${sha256(pathToken)}`;
      if (await isRateLimited(rateKey, 8, 10 * 60 * 1000)) return res.status(429).json({ success: false, message: 'محاولات كثيرة؛ حاول لاحقاً.' });
      const now = Date.now(); const db = getSupabaseAdmin();
      const { data: row, error } = await db.from('store_admin_daily_access').select('id,key_hash,expires_at,sent_at,attempts,used_at').eq('access_date', utcDateKey()).eq('path_token_hash', sha256(pathToken)).maybeSingle();
      if (error) throw error;
      if (!row || !row.sent_at || row.used_at || new Date(row.expires_at).getTime() < now || Number(row.attempts || 0) >= 8) return res.status(401).json({ success: false, message: 'الرابط انتهت صلاحيته أو لم يعد صالحاً.' });
      if (sha256(dailyKey) !== row.key_hash) {
        await db.from('store_admin_daily_access').update({ attempts: Number(row.attempts || 0) + 1 }).eq('id', row.id);
        return res.status(401).json({ success: false, message: 'مفتاح الدخول غير صحيح.' });
      }
      const { error: updateError } = await db.from('store_admin_daily_access').update({ key_verified_at: new Date().toISOString() }).eq('id', row.id);
      if (updateError) throw updateError;
      return res.json({ success: true });
    } catch (error) { console.error('[Admin Gate] Key verification failed:', error); return res.status(503).json({ success: false, message: 'تعذر التحقق حالياً.' }); }
  });

  app.post('/api/admin/access/verify-login', async (req, res) => {
    try {
      const user = await requireAuth(req);
      const pathToken = String(req.body?.pathToken || '');
      const db = getSupabaseAdmin();
      const { data: profile, error: profileError } = await db.from('store_profiles').select('id,role,account_status,email').eq('id', user.id).maybeSingle();
      if (profileError || !profile || !['admin','super_admin'].includes(profile.role) || profile.account_status !== 'active' || String(profile.email || '').toLowerCase() !== ADMIN_GATE_EMAIL) return res.status(403).json({ success: false, message: 'الحساب غير مخوّل لبوابة الإدارة.' });
      const { data: gate, error: gateError } = await db.from('store_admin_daily_access').select('id,key_verified_at,expires_at,sent_at,used_at').eq('access_date', utcDateKey()).eq('path_token_hash', sha256(pathToken)).maybeSingle();
      if (gateError) throw gateError;
      if (!gate || !gate.sent_at || !gate.key_verified_at || gate.used_at || new Date(gate.expires_at).getTime() < Date.now()) return res.status(401).json({ success: false, message: 'يجب التحقق من المفتاح اليومي أولاً.' });
      const { error: updateError } = await db.from('store_admin_daily_access').update({ user_id: user.id }).eq('id', gate.id);
      if (updateError) throw updateError;
      return res.json({ success: true });
    } catch (error: any) { return res.status(String(error?.message || '').includes('token') ? 401 : 503).json({ success: false, message: 'تعذر التحقق من حساب الإدارة.' }); }
  });

  app.post('/api/admin/access/complete-qr', async (req, res) => {
    try {
      const user = await requireAuth(req);
      const pathToken = String(req.body?.pathToken || '');
      const qrToken = String(req.body?.qrToken || '');
      if (pathToken.length < 40 || qrToken.length < 30) return res.status(400).json({ success: false, message: 'رمز QR غير صالح.' });
      const db = getSupabaseAdmin();
      const { data: profile, error: profileError } = await db.from('store_profiles').select('id,role,account_status,email').eq('id', user.id).maybeSingle();
      if (profileError || !profile || !['admin','super_admin'].includes(profile.role) || profile.account_status !== 'active' || String(profile.email || '').toLowerCase() !== ADMIN_GATE_EMAIL) return res.status(403).json({ success: false, message: 'الحساب غير مخوّل.' });
      const { data: gate, error } = await db.from('store_admin_daily_access').select('id,qr_token_hash,key_verified_at,user_id,expires_at,sent_at,used_at,qr_verified_at').eq('access_date', utcDateKey()).eq('path_token_hash', sha256(pathToken)).maybeSingle();
      if (error) throw error;
      if (!gate || !gate.sent_at || !gate.key_verified_at || gate.user_id !== user.id || gate.used_at || new Date(gate.expires_at).getTime() < Date.now() || sha256(qrToken) !== gate.qr_token_hash) return res.status(401).json({ success: false, message: 'رمز QR منتهي أو غير صالح. افتح رابط اليوم وسجّل الدخول من جديد.' });
      const { error: verifyError } = await db.from('store_admin_daily_access').update({ qr_verified_at: new Date().toISOString() }).eq('id', gate.id).is('used_at', null);
      if (verifyError) throw verifyError;
      return res.json({ success: true });
    } catch (error: any) { return res.status(String(error?.message || '').includes('token') ? 401 : 503).json({ success: false, message: 'تعذر إكمال التحقق برمز QR.' }); }
  });

  // Legacy password-only admin endpoint intentionally disabled. Admins must authenticate through Supabase Auth and have an authorized store_profiles role.
  app.post('/api/admin/authenticate', (_req, res) => {
    return res.status(410).json({ success: false, message: 'استخدم تسجيل الدخول عبر Supabase Auth؛ تم تعطيل بوابة كلمة المرور القديمة.' });
  });

  // Mark MFA as required for this administrator only after Supabase proves AAL2.
  // The browser cannot update this protected profile column directly.
  app.post('/api/admin/confirm-mfa', async (req, res) => {
    try {
      const user = await requireAuth(req);
      if ((user as any).aal !== 'aal2') return res.status(403).json({ success: false, message: 'MFA assurance level 2 is required.' });
      const db = getSupabaseAdmin();
      const { data: profile, error: profileError } = await db.from('store_profiles').select('id,role,account_status').eq('id', user.id).maybeSingle();
      if (profileError || !profile || !['admin', 'super_admin'].includes(profile.role) || profile.account_status !== 'active') {
        return res.status(403).json({ success: false, message: 'Active administrator role required.' });
      }
      const pathToken = String(req.body?.pathToken || '');
      if (!/^[A-Za-z0-9_-]{40,60}$/.test(pathToken)) return res.status(400).json({ success: false, message: 'رمز بوابة اليوم غير صالح.' });
      const { data: gate, error: gateError } = await db.from('store_admin_daily_access').select('id,user_id,qr_verified_at,expires_at,sent_at,used_at').eq('access_date', utcDateKey()).eq('path_token_hash', sha256(pathToken)).maybeSingle();
      if (gateError) throw gateError;
      if (!gate || gate.user_id !== user.id || !gate.sent_at || !gate.qr_verified_at || gate.used_at || new Date(gate.expires_at).getTime() < Date.now()) {
        return res.status(401).json({ success: false, message: 'يجب إكمال رابط ومفتاح ورمز QR اليوم قبل تأكيد MFA.' });
      }
      const { error: updateError } = await db.from('store_profiles').update({ mfa_enabled: true, updated_at: new Date().toISOString() }).eq('id', user.id);
      if (updateError) throw updateError;
      const { data: consumed, error: consumeError } = await db.from('store_admin_daily_access').update({ used_at: new Date().toISOString() }).eq('id', gate.id).is('used_at', null).select('id').maybeSingle();
      if (consumeError) throw consumeError;
      if (!consumed) return res.status(409).json({ success: false, message: 'تم استخدام بوابة اليوم مسبقاً.' });
      return res.json({ success: true });
    } catch (error: any) {
      const status = String(error?.message || '').toLowerCase().includes('token') ? 401 : 500;
      return res.status(status).json({ success: false, message: status === 401 ? 'Invalid session.' : 'Could not confirm MFA status.' });
    }
  });

  // Username login proxies authentication through Supabase Auth without disclosing the email address.
  app.post('/api/auth/sign-in-username', async (req, res) => {
    try {
      const username = String(req.body?.username || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      const ip = String(req.ip || req.socket.remoteAddress || 'unknown');
      const rateKey = `username-login:${ip}:${username}`;
      if (!/^[a-z0-9_]{3,24}$/.test(username) || !password || password.length > 256) return res.status(400).json({ error: 'invalid credentials' });
      if (await isRateLimited(rateKey, 8, 10 * 60 * 1000)) return res.status(429).json({ error: 'too many attempts' });
      const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
      if (!url || !anonKey) return res.status(503).json({ error: 'auth not configured' });
      const { data: profile, error: profileError } = await getSupabaseAdmin().from('store_profiles').select('email').eq('username', username).maybeSingle();
      if (profileError || !profile?.email) return res.status(401).json({ error: 'invalid credentials' });
      const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await authClient.auth.signInWithPassword({ email: profile.email, password });
      if (error || !data.session) return res.status(401).json({ error: 'invalid credentials' });
      return res.json({ session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token, expires_in: data.session.expires_in, token_type: data.session.token_type } });
    } catch { return res.status(503).json({ error: 'authentication service unavailable' }); }
  });

  async function requireAuth(req: express.Request) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) throw new Error('unauthorized');
    return verifySupabaseToken(token);
  }
  const protectedApiErrorStatus = (error: any) =>
    ['unauthorized', 'Invalid Supabase access token', 'session_revoked'].includes(String(error?.message || '')) ? 401
      : error?.message === 'account_inactive' ? 403 : 503;

  // Browser data boundary: return explicit allowlists only; never serialize full database rows.
  const ownProfileColumns = 'id,email,username,display_name,role,account_status,created_at,security_status,has_pin_set,avatar_url,mfa_enabled,merchant_activated_at,merchant_license_id,merchant_license_revoked_at,merchant_license_revoke_reason,verified_seller,referral_code,referred_by,referral_pending,telegram_chat_id,telegram_username,telegram_linked_at';
  async function getActiveProfile(userId: string) {
    const { data, error } = await getSupabaseAdmin().from('store_profiles').select(ownProfileColumns).eq('id', userId).maybeSingle();
    if (error) throw error;
    if (!data || data.account_status !== 'active') throw new Error('account_inactive');
    return data;
  }

  app.get('/api/me/profile', async (req, res) => {
    try {
      const user = await requireAuth(req);
      const profile = await getActiveProfile(user.id);
      return res.set('Cache-Control', 'no-store').json({ profile });
    } catch (error: any) {
      return res.status(protectedApiErrorStatus(error)).json({ success: false, message: 'تعذر تحميل ملف الحساب.' });
    }
  });

  app.get('/api/me/wallet', async (req, res) => {
    try {
      const user = await requireAuth(req);
      await getActiveProfile(user.id);
      const db = getSupabaseAdmin();
      const [ledgerResult, txResult, walletResult] = await Promise.all([
        db.from('store_ledger_entries').select('id,transaction_id,user_id,entry_type,amount,currency,balance_after,description,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(250),
        db.from('store_transactions').select('id,reference,transaction_type,user_id,counterparty_user_id,sender_id,sender_name,receiver_name,amount,status,created_at,description,product_id,order_id').or(`user_id.eq.${user.id},counterparty_user_id.eq.${user.id}`).order('created_at', { ascending: false }).limit(250),
        db.from('store_wallets').select('balance,frozen').eq('user_id', user.id).maybeSingle(),
      ]);
      if (ledgerResult.error || txResult.error || walletResult.error) throw new Error('wallet_read_failed');
      return res.set('Cache-Control', 'no-store').json({ ledger: ledgerResult.data || [], transactions: txResult.data || [], wallet: walletResult.data || { balance: 0, frozen: false } });
    } catch (error: any) {
      return res.status(protectedApiErrorStatus(error)).json({ success: false, message: 'تعذر تحميل بيانات المحفظة.' });
    }
  });

  app.get('/api/catalog-data', async (req, res) => {
    try {
      const db = getSupabaseAdmin();
      const productsPromise = db.from('store_products').select('id,title,title_en,description,price,category,metadata,image_url,image_urls,demo_video_url,demo_url,file_format,file_name,file_type,file_size,status,downloads_count,rating,rating_count,updated_at,created_at,features,features_en,seller_id,seller_name').eq('status', 'published').order('created_at', { ascending: false }).limit(300);
      let userId: string | null = null;
      const header = req.headers.authorization || '';
      if (header.startsWith('Bearer ')) {
        const user = await verifySupabaseToken(header.slice(7));
        await getActiveProfile(user.id);
        userId = user.id;
      }
      const ordersPromise = userId
        ? db.from('store_orders').select('id,user_id,seller_id,product_id,product_name,product_thumbnail,amount,status,escrow_status,use_escrow,dispute_id,created_at,transaction_id,download_url_expires_at,downloads_count,max_downloads').or(`user_id.eq.${userId},seller_id.eq.${userId}`).order('created_at', { ascending: false }).limit(250)
        : Promise.resolve({ data: [], error: null } as any);
      const [productsResult, ordersResult] = await Promise.all([productsPromise, ordersPromise]);
      if (productsResult.error || ordersResult.error) throw new Error('catalog_read_failed');
      const publicProducts = (productsResult.data || []).map((row: any) => {
        const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
        const safeMetadata = Object.fromEntries(['description_en', 'tags', 'version', 'changelog', 'compatibility', 'terms'].filter((key) => metadata[key] !== undefined).map((key) => [key, metadata[key]]));
        return { ...row, metadata: safeMetadata };
      });
      return res.set('Cache-Control', 'no-store').json({ products: publicProducts, orders: ordersResult.data || [] });
    } catch (error: any) {
      return res.status(protectedApiErrorStatus(error)).json({ success: false, message: 'تعذر تحميل بيانات المتجر.' });
    }
  });

  app.get('/api/me/purchase-result', async (req, res) => {
    try {
      const user = await requireAuth(req);
      await getActiveProfile(user.id);
      const orderId = String(req.query.orderId || '');
      const txId = String(req.query.txId || '');
      if (!/^[0-9a-f-]{36}$/i.test(orderId) || !/^[0-9a-f-]{36}$/i.test(txId)) return res.status(400).json({ success: false });
      const db = getSupabaseAdmin();
      const [orderResult, txResult] = await Promise.all([
        db.from('store_orders').select('id,user_id,seller_id,product_id,product_name,product_thumbnail,amount,status,escrow_status,use_escrow,dispute_id,created_at,transaction_id,download_url_expires_at,downloads_count,max_downloads').eq('id', orderId).eq('user_id', user.id).maybeSingle(),
        db.from('store_transactions').select('id,reference,transaction_type,user_id,counterparty_user_id,sender_id,sender_name,receiver_name,amount,status,created_at,description,product_id,order_id').eq('id', txId).eq('user_id', user.id).maybeSingle(),
      ]);
      if (orderResult.error || txResult.error) throw new Error('purchase_read_failed');
      if (!orderResult.data || !txResult.data) return res.status(404).json({ success: false, message: 'العملية غير موجودة أو لا تملك صلاحية عرضها.' });
      return res.set('Cache-Control', 'no-store').json({ order: orderResult.data, transaction: txResult.data });
    } catch (error: any) {
      return res.status(protectedApiErrorStatus(error)).json({ success: false, message: 'تعذر استرجاع نتيجة الشراء.' });
    }
  });

  // Support tickets: all reads/writes are performed server-side through the service role.
  app.get('/api/support/tickets', async (req, res) => {
    try {
      const user = await requireAuth(req); const db = getSupabaseAdmin();
      const { data: profile } = await db.from('store_profiles').select('role,account_status').eq('id', user.id).maybeSingle();
      if (!profile || profile.account_status !== 'active') return res.status(403).json({ success: false, message: 'الحساب غير نشط.' });
      let query = db.from('store_support_tickets').select('*').order('updated_at', { ascending: false }).limit(200);
      if (!['admin','super_admin','support'].includes(profile.role)) query = query.eq('user_id', user.id);
      const { data, error } = await query; if (error) throw error;
      return res.json({ tickets: data || [], staff: ['admin','super_admin','support'].includes(profile.role) });
    } catch { return res.status(401).json({ success: false, message: 'تعذر تحميل تذاكر الدعم.' }); }
  });

  app.post('/api/support/tickets', async (req, res) => {
    try {
      const user = await requireAuth(req);
      if (await isRateLimited(`support-ticket:${user.id}`, 5, 60 * 60 * 1000)) return res.status(429).json({ success: false, message: 'تم تجاوز عدد التذاكر المسموح خلال الساعة؛ حاول لاحقاً.' });
      const subject = String(req.body?.subject || '').trim().slice(0, 120);
      const message = String(req.body?.message || '').trim().slice(0, 4000);
      if (subject.length < 5 || message.length < 10) return res.status(400).json({ success: false, message: 'اكتب عنواناً واضحاً ورسالة لا تقل عن 10 أحرف.' });
      const db = getSupabaseAdmin();
      const { data: profile } = await db.from('store_profiles').select('account_status').eq('id', user.id).maybeSingle();
      if (!profile || profile.account_status !== 'active') return res.status(403).json({ success: false, message: 'الحساب غير نشط.' });
      const { data: ticket, error } = await db.from('store_support_tickets').insert({ user_id: user.id, subject, message, status: 'open', priority: 'normal', metadata: {} }).select('*').single();
      if (error) throw error;
      const { error: messageError } = await db.from('store_support_messages').insert({ ticket_id: ticket.id, sender_id: user.id, sender_type: 'user', message, metadata: {} });
      if (messageError) { await db.from('store_support_tickets').delete().eq('id', ticket.id).eq('user_id', user.id); throw messageError; }
      return res.json({ success: true, ticket });
    } catch (error: any) { return res.status(error?.message === 'unauthorized' ? 401 : 400).json({ success: false, message: 'تعذر إنشاء تذكرة الدعم.' }); }
  });

  app.get('/api/support/tickets/:ticketId/messages', async (req, res) => {
    try {
      const user = await requireAuth(req); const ticketId = String(req.params.ticketId || '');
      if (!/^[0-9a-f-]{36}$/i.test(ticketId)) return res.status(400).json({ success: false });
      const db = getSupabaseAdmin();
      const [{ data: ticket }, { data: profile }] = await Promise.all([
        db.from('store_support_tickets').select('id,user_id').eq('id', ticketId).maybeSingle(),
        db.from('store_profiles').select('role,account_status').eq('id', user.id).maybeSingle(),
      ]);
      if (!ticket || !profile || profile.account_status !== 'active') return res.status(404).json({ success: false });
      const staff = ['admin','super_admin','support'].includes(profile.role);
      if (!staff && ticket.user_id !== user.id) return res.status(403).json({ success: false });
      const { data, error } = await db.from('store_support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true }).limit(500);
      if (error) throw error;
      return res.json({ messages: data || [], staff });
    } catch { return res.status(401).json({ success: false, message: 'تعذر تحميل المحادثة.' }); }
  });

  app.post('/api/support/tickets/:ticketId/messages', async (req, res) => {
    try {
      const user = await requireAuth(req); const ticketId = String(req.params.ticketId || '');
      const message = String(req.body?.message || '').trim().slice(0, 4000);
      if (!/^[0-9a-f-]{36}$/i.test(ticketId) || message.length < 1) return res.status(400).json({ success: false, message: 'الرسالة غير صالحة.' });
      const db = getSupabaseAdmin();
      const [{ data: ticket }, { data: profile }] = await Promise.all([
        db.from('store_support_tickets').select('id,user_id,status').eq('id', ticketId).maybeSingle(),
        db.from('store_profiles').select('role,account_status').eq('id', user.id).maybeSingle(),
      ]);
      if (!ticket || !profile || profile.account_status !== 'active') return res.status(404).json({ success: false });
      const staff = ['admin','super_admin','support'].includes(profile.role);
      if (!staff && ticket.user_id !== user.id) return res.status(403).json({ success: false });
      if (!staff && ['resolved','closed'].includes(ticket.status)) return res.status(409).json({ success: false, message: 'التذكرة مغلقة؛ افتح تذكرة جديدة إذا استمرت المشكلة.' });
      const { data: saved, error } = await db.from('store_support_messages').insert({ ticket_id: ticketId, sender_id: user.id, sender_type: staff ? 'staff' : 'user', message, metadata: {} }).select('*').single();
      if (error) throw error;
      const nextStatus = staff ? 'waiting_user' : 'waiting_support';
      const { error: updateError } = await db.from('store_support_tickets').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', ticketId);
      if (updateError) throw updateError;
      return res.json({ success: true, message: saved });
    } catch (error: any) { return res.status(error?.message === 'unauthorized' ? 401 : 400).json({ success: false, message: 'تعذر إرسال الرد.' }); }
  });

  app.post('/api/support/tickets/:ticketId/status', async (req, res) => {
    try {
      const user = await requireAuth(req); const ticketId = String(req.params.ticketId || ''); const status = String(req.body?.status || '');
      if (!/^[0-9a-f-]{36}$/i.test(ticketId) || !['open','waiting_user','waiting_support','resolved','closed'].includes(status)) return res.status(400).json({ success: false });
      const db = getSupabaseAdmin();
      const { data: profile } = await db.from('store_profiles').select('role,account_status').eq('id', user.id).maybeSingle();
      if (!profile || profile.account_status !== 'active' || !['admin','super_admin','support'].includes(profile.role)) return res.status(403).json({ success: false, message: 'صلاحية فريق الدعم مطلوبة.' });
      const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (profile.role === 'support') patch.assigned_to = user.id;
      const { error } = await db.from('store_support_tickets').update(patch).eq('id', ticketId);
      if (error) throw error;
      return res.json({ success: true });
    } catch { return res.status(403).json({ success: false, message: 'تعذر تحديث حالة التذكرة.' }); }
  });

  // Reviews are accepted only from users with a paid/completed order for that product.
  app.get('/api/products/:productId/reviews', async (req, res) => {
    try {
      const productId = String(req.params.productId || '');
      if (!/^[0-9a-f-]{36}$/i.test(productId)) return res.status(400).json({ reviews: [] });
      const { data, error } = await getSupabaseAdmin().from('store_reviews').select('id,product_id,reviewer_id,rating,comment,created_at').eq('product_id', productId).eq('status', 'published').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return res.json({ reviews: data || [] });
    } catch { return res.status(503).json({ reviews: [] }); }
  });

  app.post('/api/products/:productId/reviews', async (req, res) => {
    try {
      const user = await requireAuth(req); const productId = String(req.params.productId || '');
      const rating = Number(req.body?.rating); const comment = String(req.body?.comment || '').trim().slice(0, 2000);
      if (!/^[0-9a-f-]{36}$/i.test(productId) || !Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length > 2000) return res.status(400).json({ success: false, message: 'التقييم غير صالح.' });
      const db = getSupabaseAdmin();
      const { data: order } = await db.from('store_orders').select('id,seller_id,status').eq('user_id', user.id).eq('product_id', productId).in('status', ['paid','completed']).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (!order) return res.status(403).json({ success: false, message: 'يمكنك تقييم المنتج بعد شرائه فقط.' });
      const { data: existing } = await db.from('store_reviews').select('id').eq('product_id', productId).eq('reviewer_id', user.id).maybeSingle();
      let saved: any; let error: any;
      if (existing?.id) {
        const result = await db.from('store_reviews').update({ rating, comment: comment || null, status: 'published' }).eq('id', existing.id).select('*').single(); saved = result.data; error = result.error;
      } else {
        const result = await db.from('store_reviews').insert({ product_id: productId, order_id: order.id, reviewer_id: user.id, seller_id: order.seller_id || null, rating, comment: comment || null, status: 'published', metadata: {} }).select('*').single(); saved = result.data; error = result.error;
        // A concurrent request can create the same review after the initial lookup. The
        // unique partial index prevents duplicates; recover by updating that existing row.
        if (error && String((error as any).code) === '23505') {
          const { data: racedReview, error: lookupError } = await db.from('store_reviews').select('id').eq('product_id', productId).eq('reviewer_id', user.id).maybeSingle();
          if (lookupError) throw lookupError;
          if (racedReview?.id) {
            const update = await db.from('store_reviews').update({ rating, comment: comment || null, status: 'published' }).eq('id', racedReview.id).select('*').single();
            saved = update.data; error = update.error;
          }
        }
      }
      if (error) throw error;
      const { data: ratings } = await db.from('store_reviews').select('rating').eq('product_id', productId).eq('status', 'published').limit(5000);
      const values = (ratings || []).map((r: any) => Number(r.rating)).filter((n: number) => Number.isInteger(n) && n >= 1 && n <= 5);
      await db.from('store_products').update({ rating: values.length ? values.reduce((sum: number, n: number) => sum + n, 0) / values.length : 0, rating_count: values.length }).eq('id', productId);
      return res.json({ success: true, review: saved });
    } catch (error: any) { return res.status(error?.message === 'unauthorized' ? 401 : 400).json({ success: false, message: 'تعذر حفظ التقييم.' }); }
  });

  app.post('/api/admin/reviews/:reviewId/status', async (req, res) => {
    try {
      const actor = await requireAuth(req); const actorProfile = await requireAdmin(actor.id, (actor as any).aal);
      if (!['admin','super_admin','product_manager'].includes(actorProfile.role)) return res.status(403).json({ success: false, message: 'صلاحية إدارة المنتجات مطلوبة.' });
      const reviewId = String(req.params.reviewId || ''); const status = String(req.body?.status || '');
      if (!/^[0-9a-f-]{36}$/i.test(reviewId) || !['published','hidden','rejected'].includes(status)) return res.status(400).json({ success: false, message: 'حالة المراجعة غير صالحة.' });
      const db = getSupabaseAdmin();
      const { data: review, error: reviewError } = await db.from('store_reviews').select('id,product_id').eq('id', reviewId).maybeSingle();
      if (reviewError || !review) return res.status(404).json({ success: false, message: 'التقييم غير موجود.' });
      const { error } = await db.from('store_reviews').update({ status }).eq('id', reviewId);
      if (error) throw error;
      if (review.product_id) {
        const { data: ratings } = await db.from('store_reviews').select('rating').eq('product_id', review.product_id).eq('status','published').limit(5000);
        const values = (ratings || []).map((r: any) => Number(r.rating)).filter((n: number) => Number.isInteger(n) && n >= 1 && n <= 5);
        await db.from('store_products').update({ rating: values.length ? values.reduce((sum: number, n: number) => sum + n, 0) / values.length : 0, rating_count: values.length }).eq('id', review.product_id);
      }
      await db.from('store_audit_logs').insert({ actor_id: actor.id, actor_email: actor.email, actor_role: actorProfile.role, action: 'PRODUCT_REVIEW_MODERATED', entity_type: 'review', entity_id: reviewId, details: { status }, result: 'success' });
      return res.json({ success: true });
    } catch { return res.status(403).json({ success: false, message: 'تعذر تعديل حالة التقييم.' }); }
  });

  async function getPlatformFlags() {
    const { data } = await getSupabaseAdmin().from('store_platform_settings').select('value').eq('key', 'emergency').maybeSingle();
    return (data?.value || {}) as Record<string, boolean>;
  }

  app.get('/api/platform-status', async (_req, res) => {
    try {
      const flags = await getPlatformFlags();
      return res.json({ maintenanceMode: Boolean(flags.maintenanceMode), pauseRegistrations: Boolean(flags.pauseRegistrations) });
    } catch { return res.json({ maintenanceMode: false, pauseRegistrations: false }); }
  });

  // Expose only the public escrow threshold; browser roles do not receive direct access to platform settings.
  app.get('/api/escrow-threshold', async (_req, res) => {
    try {
      const { data, error } = await getSupabaseAdmin().from('store_platform_settings').select('value').eq('key', 'escrow').maybeSingle();
      if (error) throw error;
      const threshold = Number(data?.value?.threshold ?? 500);
      return res.json({ threshold: Number.isFinite(threshold) && threshold > 0 ? threshold : 500 });
    } catch { return res.json({ threshold: 500 }); }
  });

  app.post('/api/auth/set-transfer-pin', async (req, res) => {
    try {
      const user = await requireAuth(req);
      if (await isRateLimited(`set-transfer-pin:${user.id}`, 5, 15 * 60 * 1000)) return res.status(429).json({ message: 'محاولات كثيرة؛ حاول لاحقاً.' });
      const newPin = String(req.body?.newPin || '');
      const currentPin = req.body?.currentPin == null ? '' : String(req.body.currentPin);
      if (!/^\d{4,6}$/.test(newPin)) return res.status(400).json({ message: 'PIN must be 4–6 digits.' });
      const db = getSupabaseAdmin();
      const { data: existing } = await db.from('store_security_profiles').select('transfer_pin_hash,transfer_pin_salt,pin_enabled,failed_attempts,locked_until').eq('user_id', user.id).maybeSingle();
      if (existing?.pin_enabled) {
        if (existing.locked_until && new Date(existing.locked_until).getTime() > Date.now()) return res.status(429).json({ message: 'PIN changes are temporarily locked.' });
        if (!/^\d{4,6}$/.test(currentPin)) return res.status(403).json({ message: 'Current PIN is required.' });
        const candidate = (await scryptAsync(currentPin, String(existing.transfer_pin_salt || ''), 64)).toString('hex');
        const stored = String(existing.transfer_pin_hash || '');
        const a = Buffer.from(candidate, 'hex'); const b = Buffer.from(stored, 'hex');
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
          const attempts = Number(existing.failed_attempts || 0) + 1;
          await db.from('store_security_profiles').update({ failed_attempts: attempts, locked_until: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null, updated_at: new Date().toISOString() }).eq('user_id', user.id);
          return res.status(403).json({ message: 'Current PIN is incorrect.' });
        }
      }
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = (await scryptAsync(newPin, salt, 64)).toString('hex');
      const { error } = await db.from('store_security_profiles').upsert({ user_id: user.id, transfer_pin_hash: hash, transfer_pin_salt: salt, pin_enabled: true, failed_attempts: 0, locked_until: null, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) throw error;
      const { error: profileError } = await db.from('store_profiles').update({ has_pin_set: true }).eq('id', user.id);
      if (profileError) throw profileError;
      return res.json({ success: true });
    } catch (err: any) { return res.status(err?.message === 'unauthorized' ? 401 : 400).json({ message: err?.message || 'Could not set PIN.' }); }
  });

  app.post('/api/admin/escrow-threshold', async (req, res) => {
    try {
      const actor = await requireAuth(req);
      const threshold = Number(req.body?.threshold);
      if (!Number.isFinite(threshold) || threshold < 1 || threshold > 50000 || Math.round(threshold * 100) !== threshold * 100) return res.status(400).json({ success: false, message: 'قيمة الحد غير صالحة.' });
      const db = getSupabaseAdmin();
      const { data: profile } = await db.from('store_profiles').select('role,account_status,mfa_enabled').eq('id', actor.id).maybeSingle();
      if (!profile || profile.account_status !== 'active' || !['admin', 'super_admin'].includes(profile.role) || (profile.mfa_enabled && (actor as any).aal !== 'aal2')) return res.status(403).json({ success: false, message: 'غير مصرح أو يلزم إكمال MFA.' });
      const { error } = await db.from('store_platform_settings').upsert({ key: 'escrow', value: { threshold }, updated_by: actor.id, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
      return res.json({ success: true, threshold });
    } catch { return res.status(400).json({ success: false, message: 'تعذر تحديث إعدادات الضمان.' }); }
  });

  app.post('/api/orders/:orderId/confirm-delivery', async (req, res) => {
    try {
      const user = await requireAuth(req);
      const { data: activeProfile } = await getSupabaseAdmin().from('store_profiles').select('account_status').eq('id', user.id).maybeSingle();
      if (!activeProfile || activeProfile.account_status !== 'active') return res.status(403).json({ success: false, message: 'الحساب غير نشط.' });
      const orderId = String(req.params.orderId || '');
      if (!/^[0-9a-f-]{36}$/i.test(orderId)) return res.status(400).json({ success: false, message: 'معرف الطلب غير صالح.' });
      const db = getSupabaseAdmin();
      const { data: order } = await db.from('store_orders').select('id,amount,status,escrow_status,seller_id').eq('id', orderId).eq('user_id', user.id).maybeSingle();
      if (!order) return res.status(404).json({ success: false, message: 'الطلب غير موجود لهذا الحساب.' });
      if (!order.seller_id) return res.status(400).json({ success: false, message: 'الطلب لا يحتوي على بائع صالح.' });
      const { data: sellerProfile } = await getSupabaseAdmin().from('store_profiles').select('account_status').eq('id', order.seller_id).maybeSingle();
      if (!sellerProfile || sellerProfile.account_status !== 'active') return res.status(403).json({ success: false, message: 'حساب البائع غير نشط؛ لم يتم تحرير الضمان.' });
      const txId = crypto.randomUUID(); const ledgerId = crypto.randomUUID(); const reference = 'ESC-' + crypto.randomBytes(6).toString('hex').toUpperCase();
      const { data, error } = await db.rpc('store_confirm_escrow_delivery_service', { p_user_id: user.id, p_order_id: orderId, p_tx_id: txId, p_ledger_id: ledgerId, p_reference: reference, p_security_hash: computeRealHmac(txId, order.amount) });
      if (error) { console.warn('Escrow confirmation rejected:', error.message); return res.status(400).json({ success: false, message: 'تعذر تأكيد التسليم؛ قد لا يكون الطلب ضمن الضمان.' }); }
      if (data?.txId && order.seller_id) {
        const [{ data: seller }, { data: buyer }] = await Promise.all([
          db.from('store_profiles').select('display_name').eq('id', order.seller_id).maybeSingle(),
          db.from('store_profiles').select('display_name').eq('id', user.id).maybeSingle(),
        ]);
        await db.from('store_transactions').update({ sender_id: order.seller_id, sender_name: seller?.display_name || 'Seller', receiver_name: buyer?.display_name || user.email || 'Buyer' }).eq('id', data.txId);
      }
      return res.json({ success: true, result: data });
    } catch { return res.status(400).json({ success: false, message: 'تعذر تأكيد التسليم.' }); }
  });

  app.post('/api/orders/:orderId/dispute', async (req, res) => {
    try {
      const user = await requireAuth(req);
      const orderId = String(req.params.orderId || '');
      const reason = String(req.body?.reason || '').trim().slice(0, 2000);
      if (!/^[0-9a-f-]{36}$/i.test(orderId) || reason.length < 10) return res.status(400).json({ success: false, message: 'معرف الطلب أو سبب النزاع غير صالح.' });
      const db = getSupabaseAdmin();
      const { data: order } = await db.from('store_orders').select('id,user_id,seller_id,status,escrow_status,amount,product_id').eq('id', orderId).maybeSingle();
      if (!order || (order.user_id !== user.id && order.seller_id !== user.id)) return res.status(404).json({ success: false, message: 'الطلب غير موجود.' });
      if (order.escrow_status !== 'held' || !['paid', 'processing', 'completed'].includes(order.status)) return res.status(400).json({ success: false, message: 'هذا الطلب ليس في حالة ضمان قابلة للنزاع.' });
      const { data: dispute, error: disputeError } = await db.from('store_disputes').insert({ order_id: orderId, transaction_id: null, opened_by: user.id, buyer_id: order.user_id, seller_id: order.seller_id, reason, description: reason, reporter_name: user.email || 'User', respondent_name: user.id === order.user_id ? 'Seller' : 'Buyer', reason_label: 'delivery_dispute', amount: order.amount, status: 'open' }).select('id').single();
      if (disputeError) throw disputeError;
      const { error: orderError } = await db.from('store_orders').update({ status: 'disputed', escrow_status: 'disputed', dispute_id: dispute.id, disputed_at: new Date().toISOString() }).eq('id', orderId);
      if (orderError) throw orderError;
      await db.from('store_escrow_holds').update({ status: 'disputed' }).eq('order_id', orderId).eq('status', 'held');
      return res.json({ success: true, disputeId: dispute.id });
    } catch (err: any) { console.warn('Escrow dispute submission failed:', err?.message); return res.status(400).json({ success: false, message: 'تعذر فتح النزاع. لم يتم تغيير رصيد المحفظة.' }); }
  });

  app.get('/api/merchant/portal-data', async (req, res) => {
    try {
      const user = await requireAuth(req);
      const db = getSupabaseAdmin();
      const [profileResult, appResult, depositResult, productsResult] = await Promise.all([
        db.from('store_profiles').select('id,role,account_status,merchant_activated_at,merchant_license_id,merchant_license_revoked_at,merchant_license_revoke_reason,verified_seller').eq('id', user.id).maybeSingle(),
        db.from('store_merchant_applications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        db.from('store_merchant_deposits').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        db.from('store_products').select('*').eq('seller_id', user.id).order('created_at', { ascending: false }).limit(200),
      ]);
      return res.json({ profile: profileResult.data, application: appResult.data, deposit: depositResult.data, products: productsResult.data || [] });
    } catch { return res.status(401).json({ error: 'unauthorized' }); }
  });

  app.post('/api/merchant/request-activation', async (req, res) => {
    try {
      const user = await requireAuth(req);
      const result = await issueMerchantActivationToken(user.id);
      return res.json({ success: true, expiresAt: result.expiresAt });
    } catch (error: any) {
      const message = String(error?.message || '');
      return res.status(message.includes('unauthorized') ? 401 : 409).json({ success: false, message: message || 'تعذر إرسال رمز التفعيل.' });
    }
  });

  app.post('/api/merchant/verify-activation', async (req, res) => {
    try {
      const user = await requireAuth(req);
      const token = String(req.body?.token || '').trim();
      if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return res.status(400).json({ success: false, message: 'رمز التفعيل غير صالح.' });
      const db = getSupabaseAdmin();
      const { data: activation, error: tokenError } = await db.from('store_merchant_activation_tokens').select('id,expires_at,used_at').eq('user_id', user.id).eq('token_hash', sha256(token)).maybeSingle();
      if (tokenError) throw tokenError;
      if (!activation || activation.used_at || new Date(activation.expires_at).getTime() < Date.now()) return res.status(401).json({ success: false, message: 'انتهت صلاحية رمز التفعيل أو تم استخدامه.' });
      const [{ data: application }, { data: deposit }, { data: profile }] = await Promise.all([
        db.from('store_merchant_applications').select('id,status,license_paid').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        db.from('store_merchant_deposits').select('id,status').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        db.from('store_profiles').select('id,role,account_status').eq('id', user.id).maybeSingle(),
      ]);
      if (!profile || profile.account_status !== 'active' || !application || application.status !== 'approved' || application.license_paid !== true || !deposit || deposit.status !== 'held') return res.status(409).json({ success: false, message: 'لم تكتمل الموافقة ورسوم الترخيص والضمان؛ لم يتم تفعيل الحساب.' });
      const { data: consumed, error: consumeError } = await db.from('store_merchant_activation_tokens').update({ used_at: new Date().toISOString() }).eq('id', activation.id).is('used_at', null).select('id').maybeSingle();
      if (consumeError) throw consumeError;
      if (!consumed) return res.status(409).json({ success: false, message: 'تم استخدام رمز التفعيل مسبقاً.' });
      const licenseId = `LIC-MCH-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
      const { error: profileError } = await db.from('store_profiles').update({ role: 'merchant', merchant_activated_at: new Date().toISOString(), merchant_license_id: licenseId, verified_seller: true }).eq('id', user.id).eq('account_status', 'active');
      if (profileError) { await db.from('store_merchant_activation_tokens').update({ used_at: null }).eq('id', activation.id); throw profileError; }
      await db.from('store_audit_logs').insert({ actor_id: user.id, actor_email: user.email, action: 'MERCHANT_ACTIVATED', entity_type: 'profile', entity_id: user.id, details: { licenseId }, result: 'success' });
      return res.json({ success: true, licenseId });
    } catch (error: any) { return res.status(String(error?.message || '').includes('unauthorized') ? 401 : 400).json({ success: false, message: 'تعذر التحقق من رمز التفعيل.' }); }
  });

  app.post('/api/merchant/apply', async (req, res) => {
    try {
      const user = await requireAuth(req);
      const fullName = String(req.body?.fullName || '').trim().slice(0, 160);
      const phone = String(req.body?.phone || '').trim();
      const businessDescription = String(req.body?.businessDescription || '').trim().slice(0, 5000);
      const portfolioUrls = Array.isArray(req.body?.portfolioUrls) ? req.body.portfolioUrls.filter((u: unknown) => typeof u === 'string' && /^https:\/\//i.test(u)).slice(0, 5) : [];
      if (fullName.length < 3 || !/^\+?\d{8,15}$/.test(phone) || businessDescription.length < 20) return res.status(400).json({ success: false, message: 'بيانات طلب التاجر غير صالحة.' });
      const db = getSupabaseAdmin();
      const { data: profile } = await db.from('store_profiles').select('role,account_status').eq('id', user.id).maybeSingle();
      if (!profile || profile.account_status !== 'active') return res.status(403).json({ success: false, message: 'الحساب غير نشط.' });
      const { data: existing } = await db.from('store_merchant_applications').select('id,status').eq('user_id', user.id).in('status', ['pending', 'approved']).limit(1);
      if (existing?.length) return res.status(409).json({ success: false, message: 'يوجد طلب تاجر قائم بالفعل.' });
      const { error } = await db.from('store_merchant_applications').insert({ user_id: user.id, business_name: fullName, full_name: fullName, phone, business_description: businessDescription, portfolio_urls: portfolioUrls, application_data: { submittedFrom: 'merchant_portal' }, status: 'pending' });
      if (error) throw error;
      return res.json({ success: true });
    } catch (err: any) { return res.status(400).json({ success: false, message: err?.message || 'تعذر تقديم الطلب.' }); }
  });

  app.post('/api/merchant/products', async (req, res) => {
    try {
      const user = await requireAuth(req);
      const p = req.body?.product || {};
      const title = String(p.title || p.name || '').trim().slice(0, 160);
      const description = String(p.description || '').trim().slice(0, 10000);
      const price = Number(p.price);
      if (!title || description.length < 10 || !Number.isFinite(price) || price <= 0 || price > 50000 || Math.round(price * 100) !== price * 100) return res.status(400).json({ success: false, message: 'بيانات المنتج غير صالحة.' });
      const db = getSupabaseAdmin();
      const { data: profile } = await db.from('store_profiles').select('role,account_status,merchant_activated_at,merchant_license_revoked_at').eq('id', user.id).maybeSingle();
      if (!profile || profile.role !== 'merchant' || profile.account_status !== 'active' || !profile.merchant_activated_at || profile.merchant_license_revoked_at) return res.status(403).json({ success: false, message: 'يجب أن يكون حساب التاجر مفعلاً ورخصته سارية.' });
      const images = Array.isArray(p.images) ? p.images.filter((v: unknown) => typeof v === 'string' && /^https:\/\//i.test(v)).slice(0, 10) : [];
      const productId = /^[0-9a-f-]{36}$/i.test(String(p.id || '')) ? String(p.id) : crypto.randomUUID();
      const record: any = { id: productId, seller_id: user.id, title, title_en: String(p.titleEn || title).slice(0, 160), description, category: String(p.category || 'development'), price, currency: 'COIN', image_url: images[0] || null, image_urls: images, status: 'pending', is_digital: true, seller_name: user.user_metadata?.display_name || user.email || 'Merchant', metadata: { tags: Array.isArray(p.tags) ? p.tags.slice(0, 30) : [] }, updated_at: new Date().toISOString() };
      const { data: existing } = await db.from('store_products').select('id,seller_id').eq('id', productId).maybeSingle();
      if (existing && existing.seller_id !== user.id) return res.status(403).json({ success: false, message: 'لا يمكنك تعديل منتج لا تملكه.' });
      const { error } = await db.from('store_products').upsert(record, { onConflict: 'id' });
      if (error) throw error;
      return res.json({ success: true, productId });
    } catch (err: any) { return res.status(400).json({ success: false, message: err?.message || 'تعذر حفظ المنتج.' }); }
  });

  app.post('/api/merchant-reports', async (req, res) => {
    try {
      const reporter = await requireAuth(req);
      const merchantId = String(req.body?.merchantId || '');
      const reason = String(req.body?.reason || '').trim();
      const evidence = String(req.body?.evidence || '').trim().slice(0, 8000);
      if (!/^[0-9a-f-]{36}$/i.test(merchantId) || reason.length < 10 || reason.length > 3000) return res.status(400).json({ success: false, message: 'بيانات البلاغ غير مكتملة.' });
      if (merchantId === reporter.id) return res.status(400).json({ success: false, message: 'لا يمكنك الإبلاغ عن حسابك.' });
      const db = getSupabaseAdmin();
      const { data: merchant } = await db.from('store_profiles').select('id,display_name,role,account_status').eq('id', merchantId).maybeSingle();
      if (!merchant || merchant.role !== 'merchant') return res.status(404).json({ success: false, message: 'التاجر غير موجود.' });
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recent } = await db.from('store_merchant_reports').select('id').eq('reporter_id', reporter.id).eq('merchant_id', merchantId).in('status', ['open', 'reviewing']).gte('created_at', since).limit(1);
      if (recent?.length) return res.status(429).json({ success: false, message: 'لديك بلاغ نشط ضد هذا التاجر خلال آخر 24 ساعة.' });
      const { data: reporterProfile } = await db.from('store_profiles').select('display_name').eq('id', reporter.id).maybeSingle();
      const { error } = await db.from('store_merchant_reports').insert({ reporter_id: reporter.id, merchant_id: merchantId, reason: reason.slice(0, 200), description: reason, evidence: evidence || null, merchant_name: merchant.display_name, reporter_name: reporterProfile?.display_name || reporter.email, status: 'open' });
      if (error) throw error;
      await db.from('store_audit_logs').insert({ actor_id: reporter.id, actor_email: reporter.email, action: 'MERCHANT_REPORTED', entity_type: 'merchant', entity_id: merchantId, details: { reasonLength: reason.length, hasEvidence: Boolean(evidence) }, result: 'success' });
      return res.json({ success: true });
    } catch (err: any) { return res.status(err?.message === 'unauthorized' ? 401 : 400).json({ success: false, message: err?.message || 'تعذر إرسال البلاغ.' }); }
  });

  app.post('/api/admin/bootstrap-super-admin', async (req, res) => {
    try {
      const ip = String(req.ip || req.socket.remoteAddress || 'unknown');
      if (await isRateLimited(`bootstrap:${ip}`, 5, 15 * 60 * 1000)) return res.status(429).json({ success: false, message: 'محاولات كثيرة؛ أعد المحاولة لاحقاً.' });
      if (process.env.NODE_ENV === 'production' && process.env.ALLOW_BOOTSTRAP_IN_PRODUCTION !== 'true') return res.status(403).json({ success: false, message: 'بوابة الإعداد الأولي مغلقة في الإنتاج.' });
      const expected = process.env.BOOTSTRAP_SECRET || '';
      const supplied = String(req.body?.secret || '');
      if (!expected || supplied.length < 16) return res.status(403).json({ success: false, message: 'بوابة الإعداد غير مفعلة.' });
      const expectedBuffer = Buffer.from(expected); const suppliedBuffer = Buffer.from(supplied);
      if (expectedBuffer.length !== suppliedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)) return res.status(403).json({ success: false, message: 'رمز الإعداد غير صحيح.' });
      const db = getSupabaseAdmin();
      const { data: existing } = await db.from('store_profiles').select('id').eq('role', 'super_admin').limit(1);
      if (existing?.length) return res.status(409).json({ success: false, message: 'تم إعداد المدير العام مسبقاً؛ بوابة الإعداد مغلقة.' });
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      if (!email.includes('@') || password.length < 12 || password.length > 256) return res.status(400).json({ success: false, message: 'البريد أو كلمة المرور غير صالحين؛ استخدم كلمة مرور من 12 حرفاً على الأقل.' });
      const { data: created, error: createError } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { username: 'super_admin', display_name: 'Super Administrator' } });
      if (createError || !created.user) return res.status(400).json({ success: false, message: 'تعذر إنشاء مستخدم Supabase Auth.' });
      const { error: roleError } = await db.from('store_profiles').update({ role: 'super_admin', account_status: 'active' }).eq('id', created.user.id);
      if (roleError) return res.status(500).json({ success: false, message: 'تم إنشاء حساب Auth لكن تعيين الدور لم يكتمل؛ راجع سجل الخادم.' });
      await db.from('store_audit_logs').insert({ actor_id: created.user.id, actor_email: email, actor_role: 'super_admin', action: 'SUPER_ADMIN_BOOTSTRAPPED', entity_type: 'profile', entity_id: created.user.id, result: 'success' });
      return res.json({ success: true });
    } catch { return res.status(503).json({ success: false, message: 'خدمة إعداد المدير العام غير متاحة.' }); }
  });

  const ADMIN_ROLE_PERMISSIONS: Record<string, string[]> = {
    super_admin: ['dashboard', 'view_core_data', 'view_users', 'manage_users', 'manage_roles', 'manage_disputes', 'view_reports', 'manage_reports', 'wallet_adjust', 'manage_emergency', 'view_dashboard_stats', 'merchant_manager', 'manage_products', 'manage_escrow_settings'],
    admin: ['dashboard', 'view_core_data', 'view_users', 'manage_users', 'manage_disputes', 'view_reports', 'manage_reports', 'wallet_adjust', 'manage_emergency', 'view_dashboard_stats', 'merchant_manager', 'manage_products', 'manage_escrow_settings'],
    finance: ['dashboard', 'view_users', 'wallet_adjust', 'view_dashboard_stats'],
    product_manager: ['dashboard', 'view_dashboard_stats', 'manage_products'],
    moderator: ['dashboard', 'view_core_data', 'view_users', 'manage_users', 'manage_disputes', 'view_reports', 'manage_reports', 'view_dashboard_stats'],
    support: ['dashboard', 'view_core_data', 'manage_disputes', 'view_dashboard_stats'],
  };

  async function requirePermission(userId: string, aal: string = 'aal1', permission: string = 'dashboard') {
    const { data: profile, error } = await getSupabaseAdmin().from('store_profiles').select('role,account_status,mfa_enabled').eq('id', userId).maybeSingle();
    if (error || !profile || profile.account_status !== 'active' || !ADMIN_ROLE_PERMISSIONS[profile.role]?.includes(permission)) throw new Error('forbidden');
    if (['admin', 'super_admin'].includes(profile.role) && aal !== 'aal2') throw new Error('mfa_required');
    return profile;
  }

  async function requireAdmin(userId: string, aal: string = 'aal1') {
    return requirePermission(userId, aal, 'dashboard');
  }

  // Revoke all existing sessions for a user. JWTs issued before this cutoff are rejected
  // by verifySupabaseToken on every protected API request. Super-admin only.
  app.post('/api/admin/users/:userId/revoke-sessions', async (req, res) => {
    try {
      const actor = await requireAuth(req);
      const actorProfile = await requireAdmin(actor.id, (actor as any).aal);
      if (actorProfile.role !== 'super_admin') return res.status(403).json({ success: false, message: 'يتطلب هذا الإجراء صلاحية المدير العام.' });
      const targetUserId = String(req.params.userId || '');
      if (!/^[0-9a-f-]{36}$/i.test(targetUserId)) return res.status(400).json({ success: false, message: 'معرّف الحساب غير صالح.' });
      const db = getSupabaseAdmin();
      const { data: target, error: targetError } = await db.from('store_profiles').select('id,email,role').eq('id', targetUserId).maybeSingle();
      if (targetError || !target) return res.status(404).json({ success: false, message: 'الحساب غير موجود.' });
      if (target.role === 'super_admin' && target.id !== actor.id) return res.status(403).json({ success: false, message: 'لا يمكن إبطال جلسات مدير عام آخر من هذا المسار.' });
      const cutoff = new Date().toISOString();
      const { error: revokeError } = await db.from('store_security_profiles').upsert({ user_id: targetUserId, session_revoked_at: cutoff, updated_at: cutoff }, { onConflict: 'user_id' });
      if (revokeError) throw revokeError;
      await db.from('store_audit_logs').insert({ actor_id: actor.id, actor_email: actor.email, actor_role: actorProfile.role, action: 'USER_SESSIONS_REVOKED', entity_type: 'user', entity_id: targetUserId, details: { targetEmail: target.email || null, revokedAt: cutoff }, result: 'success' });
      return res.json({ success: true, revokedAt: cutoff, message: 'تم إبطال الجلسات السابقة. سيُطلب من الحساب تسجيل الدخول مجدداً عند الطلب التالي.' });
    } catch (error: any) {
      const message = String(error?.message || '');
      return res.status(message === 'session_revoked' || message.toLowerCase().includes('token') ? 401 : message === 'forbidden' || message === 'mfa_required' ? 403 : 503).json({ success: false, message: 'تعذر إبطال الجلسات حالياً.' });
    }
  });

  app.get('/api/admin/core-data', async (req, res) => {
    try {
      const actor = await requireAuth(req); const staffProfile = await requirePermission(actor.id, (actor as any).aal, 'view_core_data');
      const db = getSupabaseAdmin();
      const isPrivilegedAdmin = ['admin', 'super_admin'].includes(staffProfile.role);
      const [logs, disputes, settings] = await Promise.all([
        isPrivilegedAdmin ? db.from('store_audit_logs').select('*').order('created_at', { ascending: false }).limit(500) : Promise.resolve({ data: [], error: null } as any),
        db.from('store_disputes').select('*').order('created_at', { ascending: false }).limit(500),
        isPrivilegedAdmin ? db.from('store_platform_settings').select('value').eq('key', 'emergency').maybeSingle() : Promise.resolve({ data: null, error: null } as any),
      ]);
      return res.json({ logs: logs.data || [], disputes: disputes.data || [], emergencySettings: settings.data?.value || {} });
    } catch { return res.status(403).json({ error: 'forbidden' }); }
  });

  app.post('/api/disputes', async (req, res) => {
    try {
      const user = await requireAuth(req);
      const transactionId = String(req.body?.transactionId || '');
      const reason = String(req.body?.reason || '').trim().slice(0, 120);
      const reasonLabel = String(req.body?.reasonLabel || reason).slice(0, 160);
      const description = String(req.body?.description || '').trim().slice(0, 4000);
      if (!/^[0-9a-f-]{36}$/i.test(transactionId) || description.length < 10) return res.status(400).json({ success: false, message: 'بيانات النزاع غير صالحة.' });
      const db = getSupabaseAdmin();
      const { data: tx } = await db.from('store_transactions').select('*').eq('id', transactionId).maybeSingle();
      if (!tx || (tx.user_id !== user.id && tx.counterparty_user_id !== user.id)) return res.status(404).json({ success: false, message: 'المعاملة غير موجودة لهذا الحساب.' });
      const buyerId = tx.user_id; const sellerId = tx.counterparty_user_id;
      const { data: profile } = await db.from('store_profiles').select('display_name').eq('id', user.id).maybeSingle();
      const { data: dispute, error } = await db.from('store_disputes').insert({ transaction_id: transactionId, order_id: tx.order_id, opened_by: user.id, buyer_id: buyerId, seller_id: sellerId, reason: reasonLabel, reason_label: reason, description, evidence_files: Array.isArray(req.body?.evidenceFiles) ? req.body.evidenceFiles.slice(0, 10) : [], ocr_verification: req.body?.ocrVerification || null, amount: tx.amount, status: 'open', reporter_name: profile?.display_name || user.email, respondent_name: 'Other transaction party' }).select('*').single();
      if (error) throw error;
      await db.from('store_audit_logs').insert({ actor_id: user.id, actor_email: user.email, action: 'DISPUTE_OPENED', entity_type: 'dispute', entity_id: dispute.id, details: { transactionId, amount: tx.amount }, result: 'success' });
      return res.json({ success: true, dispute });
    } catch (err: any) { return res.status(err?.message === 'unauthorized' ? 401 : 400).json({ success: false, message: 'تعذر فتح النزاع.' }); }
  });

  app.post('/api/admin/disputes/resolve', async (req, res) => {
    try {
      const actor = await requireAuth(req); const role = await requirePermission(actor.id, (actor as any).aal, 'manage_disputes');
      const disputeId = String(req.body?.disputeId || ''); const status = String(req.body?.status || ''); const notes = String(req.body?.notes || '').slice(0, 2000);
      if (!/^[0-9a-f-]{36}$/i.test(disputeId) || !['open', 'under_review', 'waiting_user', 'waiting_seller', 'resolved', 'rejected', 'closed'].includes(status)) return res.status(400).json({ success: false, message: 'حالة النزاع غير صالحة.' });
      const db = getSupabaseAdmin();
      if (['resolved', 'rejected', 'closed'].includes(status)) {
        const { data: disputeRow } = await db.from('store_disputes').select('order_id').eq('id', disputeId).maybeSingle();
        if (disputeRow?.order_id) {
          const { data: linkedOrder } = await db.from('store_orders').select('escrow_status').eq('id', disputeRow.order_id).maybeSingle();
          if (['held', 'disputed'].includes(String(linkedOrder?.escrow_status || ''))) return res.status(409).json({ success: false, message: 'هذا النزاع مرتبط بأموال ضمان؛ يجب استخدام التسوية المالية الذرية قبل إغلاقه.' });
        }
      }
      const dbStatus = status === 'resolved' ? 'resolved_seller' : status === 'rejected' ? 'closed' : status === 'waiting_user' || status === 'waiting_seller' ? 'under_review' : status;
      const { error } = await db.from('store_disputes').update({ status: dbStatus, resolution: notes || null, resolved_by: ['resolved', 'rejected', 'closed'].includes(status) ? actor.id : null, resolved_at: ['resolved', 'rejected', 'closed'].includes(status) ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('id', disputeId);
      if (error) throw error;
      await db.from('store_audit_logs').insert({ actor_id: actor.id, actor_email: actor.email, actor_role: role.role, action: 'DISPUTE_RESOLVED', entity_type: 'dispute', entity_id: disputeId, details: { status, notes }, result: 'success' });
      return res.json({ success: true });
    } catch { return res.status(403).json({ success: false, message: 'تعذر تحديث النزاع.' }); }
  });

  app.post('/api/admin/disputes/settle', async (req, res) => {
    try {
      const actor = await requireAuth(req);
      const role = await requirePermission(actor.id, (actor as any).aal, 'manage_disputes');
      if (!['admin', 'super_admin'].includes(role.role)) return res.status(403).json({ success: false, message: 'التسوية المالية للنزاعات تتطلب صلاحية مدير.' });
      const disputeId = String(req.body?.disputeId || '');
      const decision = String(req.body?.decision || '');
      if (!/^[0-9a-f-]{36}$/i.test(disputeId) || !['refund_buyer', 'release_seller'].includes(decision)) return res.status(400).json({ success: false, message: 'بيانات التسوية غير صالحة.' });
      const db = getSupabaseAdmin();
      const { data: disputeInfo } = await db.from('store_disputes').select('order_id').eq('id', disputeId).maybeSingle();
      if (!disputeInfo?.order_id) return res.status(404).json({ success: false, message: 'نزاع الضمان غير موجود.' });
      const { data: holdInfo } = await db.from('store_escrow_holds').select('amount').eq('order_id', disputeInfo.order_id).maybeSingle();
      if (!holdInfo || Number(holdInfo.amount) <= 0) return res.status(409).json({ success: false, message: 'لا توجد أموال ضمان قابلة للتسوية لهذا النزاع.' });
      const txId = crypto.randomUUID();
      const ledgerId = crypto.randomUUID();
      const reference = 'ESC-' + crypto.randomBytes(6).toString('hex').toUpperCase();
      const { data, error } = await db.rpc('store_resolve_escrow_dispute_service', {
        p_actor_id: actor.id, p_dispute_id: disputeId, p_decision: decision, p_tx_id: txId,
        p_ledger_id: ledgerId, p_reference: reference, p_security_hash: computeRealHmac(txId, holdInfo.amount),
      });
      if (error) { console.warn('Escrow dispute settlement rejected:', error.message); return res.status(409).json({ success: false, message: 'تعذرت التسوية؛ لم يتم اعتماد أي تغيير خارج المعاملة الذرية.' }); }
      const settledTxId = String(data?.txId || txId);
      const { data: transaction } = await db.from('store_transactions').select('amount').eq('id', settledTxId).maybeSingle();
      if (!transaction) return res.status(503).json({ success: false, message: 'تمت التسوية، لكن تعذر تحميل سجل المعاملة للتحقق؛ راجع سجل الإدارة قبل إعادة المحاولة.' });
      const correctHash = computeRealHmac(settledTxId, transaction.amount);
      const { error: hashError } = await db.from('store_transactions').update({ security_verification_hash: correctHash }).eq('id', settledTxId);
      if (hashError) console.error('Could not refresh settlement HMAC:', hashError.message);
      await getSupabaseAdmin().from('store_audit_logs').insert({ actor_id: actor.id, actor_email: actor.email, actor_role: role.role, action: decision === 'refund_buyer' ? 'ESCROW_DISPUTE_REFUNDED' : 'ESCROW_DISPUTE_RELEASED', entity_type: 'dispute', entity_id: disputeId, details: { decision, orderId: data?.orderId, reference: data?.reference, amount: data?.amount }, result: 'success' });
      return res.json({ success: true, result: data });
    } catch (err: any) { return res.status(err?.message === 'unauthorized' ? 401 : err?.message === 'forbidden' ? 403 : 400).json({ success: false, message: 'تعذر التحقق من صلاحية التسوية.' }); }
  });

  app.post('/api/admin/wallet-adjust', async (req, res) => {
    try {
      const actor = await requireAuth(req); const actorProfile = await requirePermission(actor.id, (actor as any).aal, 'wallet_adjust');
      const targetUserId = String(req.body?.targetUserId || ''); const amount = Number(req.body?.amount); const entryType = String(req.body?.type || ''); const reason = String(req.body?.reason || '').trim().slice(0, 300); const requestId = String(req.body?.clientRequestId || '');
      if (!/^[0-9a-f-]{36}$/i.test(targetUserId) || !Number.isFinite(amount) || amount <= 0 || amount > 50000 || Math.round(amount * 100) !== amount * 100 || !['credit', 'debit'].includes(entryType) || reason.length < 3 || requestId.length < 8) return res.status(400).json({ success: false, message: 'بيانات تعديل الرصيد غير صالحة.' });
      const txId = crypto.randomUUID(); const ledgerId = crypto.randomUUID(); const reference = 'ADJ-' + crypto.randomBytes(6).toString('hex').toUpperCase();
      const { data, error } = await getSupabaseAdmin().rpc('store_admin_adjust_wallet_service', { p_actor_id: actor.id, p_target_id: targetUserId, p_amount: amount, p_entry_type: entryType, p_reason: reason, p_request_id: requestId, p_tx_id: txId, p_ledger_id: ledgerId, p_reference: reference, p_security_hash: computeRealHmac(txId, amount) });
      if (error) { console.warn('Admin wallet adjustment rejected:', error.message); return res.status(400).json({ success: false, message: 'تعذر تعديل الرصيد؛ تحقق من الرصيد والصلاحيات.' }); }
      return res.json({ success: true, result: data });
    } catch { return res.status(403).json({ success: false, message: 'تعذر التحقق من صلاحية الإدارة.' }); }
  });

  app.post('/api/admin/user-status', async (req, res) => {
    try {
      const actor = await requireAuth(req); const role = await requirePermission(actor.id, (actor as any).aal, 'manage_users');
      const targetId = String(req.body?.targetUserId || ''); const status = String(req.body?.status || '');
      const accountStatus = status === 'active' ? 'active' : status === 'suspended' ? 'suspended' : status === 'banned' ? 'closed' : '';
      if (!/^[0-9a-f-]{36}$/i.test(targetId) || !accountStatus) return res.status(400).json({ success: false, message: 'حالة الحساب غير صالحة.' });
      const { data: targetProfile } = await getSupabaseAdmin().from('store_profiles').select('role').eq('id', targetId).maybeSingle();
      if (!targetProfile) return res.status(404).json({ success: false, message: 'الحساب غير موجود.' });
      const staffRoles = ['admin', 'super_admin', 'finance', 'product_manager', 'support', 'moderator'];
      if (staffRoles.includes(targetProfile.role) && role.role !== 'super_admin') return res.status(403).json({ success: false, message: 'لا يمكن تعديل حالة حساب موظف إداري إلا بواسطة المدير العام.' });
      if (role.role === 'moderator' && staffRoles.includes(targetProfile.role)) return res.status(403).json({ success: false, message: 'المشرف لا يمكنه تعديل حسابات فريق الإدارة.' });
      if (targetId === actor.id && status !== 'active') return res.status(400).json({ success: false, message: 'لا يمكنك إيقاف حسابك من هذه الجلسة.' });
      const { error } = await getSupabaseAdmin().from('store_profiles').update({ account_status: accountStatus }).eq('id', targetId);
      if (error) throw error;
      await getSupabaseAdmin().from('store_audit_logs').insert({ actor_id: actor.id, actor_email: actor.email, actor_role: role.role, action: 'USER_STATUS_CHANGED', entity_type: 'profile', entity_id: targetId, details: { status }, result: 'success' });
      return res.json({ success: true });
    } catch { return res.status(403).json({ success: false, message: 'تعذر تحديث حالة الحساب.' }); }
  });

  app.post('/api/admin/emergency-settings', async (req, res) => {
    try {
      const actor = await requireAuth(req); const role = await requirePermission(actor.id, (actor as any).aal, 'manage_emergency');
      const allowed = ['maintenanceMode', 'pausePurchases', 'pauseTransfers', 'pauseWallet', 'pauseRegistrations'];
      const incoming = req.body?.settings || {};
      const safe: Record<string, boolean> = {};
      for (const key of allowed) if (typeof incoming[key] === 'boolean') safe[key] = incoming[key];
      const db = getSupabaseAdmin();
      const { data: old } = await db.from('store_platform_settings').select('value').eq('key', 'emergency').maybeSingle();
      const merged = { ...(old?.value || {}), ...safe };
      const { error } = await db.from('store_platform_settings').upsert({ key: 'emergency', value: merged, updated_by: actor.id, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
      return res.json({ success: true, settings: merged });
    } catch { return res.status(403).json({ success: false, message: 'تعذر تحديث إعدادات الطوارئ.' }); }
  });

  app.get('/api/admin/users', async (req, res) => {
    try {
      const actor = await requireAuth(req); const permissionProfile = await requirePermission(actor.id, (actor as any).aal, 'view_users');
      const db = getSupabaseAdmin();
      const { data: profiles, error } = await db.from('store_profiles').select('id,username,display_name,email,role,account_status,created_at,security_status,has_pin_set,mfa_enabled,merchant_activated_at,merchant_license_id,merchant_license_revoked_at,merchant_license_revoke_reason,verified_seller').order('created_at', { ascending: false }).limit(2000);
      if (error) throw error;
      const ids = (profiles || []).map((p: any) => p.id);
      const mayViewBalances = ['super_admin', 'admin', 'finance'].includes(permissionProfile.role);
      const { data: wallets } = mayViewBalances && ids.length ? await db.from('store_wallets').select('user_id,balance,frozen').in('user_id', ids) : { data: [] };
      const walletMap = new Map<string, any>((wallets || []).map((w: any) => [w.user_id, w] as [string, any]));
      return res.json({ users: (profiles || []).map((p: any) => ({ id: p.id, username: p.username || '', displayName: p.display_name || p.username || '', email: p.email || '', role: p.role === 'user' ? 'customer' : p.role, status: p.account_status === 'closed' ? 'banned' : p.account_status, createdAt: p.created_at, securityStatus: p.security_status, hasPinSet: p.has_pin_set, mfaEnabled: p.mfa_enabled, merchantActivatedAt: p.merchant_activated_at, merchantLicenseId: p.merchant_license_id, merchantLicenseRevokedAt: p.merchant_license_revoked_at, merchantLicenseRevokeReason: p.merchant_license_revoke_reason, verifiedSeller: p.verified_seller, balance: Number(walletMap.get(p.id)?.balance || 0), walletFrozen: Boolean(walletMap.get(p.id)?.frozen) })) });
    } catch { return res.status(403).json({ error: 'forbidden' }); }
  });

  app.get('/api/admin/reports', async (req, res) => {
    try {
      const actor = await requireAuth(req);
      await requirePermission(actor.id, (actor as any).aal, 'view_reports');
      const { data, error } = await getSupabaseAdmin().from('store_merchant_reports').select('id,reporter_id,merchant_id,reason,description,evidence,status,created_at,merchant_name,reporter_name,resolution_note,resolved_at').order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      return res.json({ reports: data || [] });
    } catch (err: any) { return res.status(err?.message === 'unauthorized' ? 401 : 403).json({ success: false, message: 'غير مصرح بعرض البلاغات.' }); }
  });

  app.post('/api/admin/reports/resolve', async (req, res) => {
    try {
      const actor = await requireAuth(req);
      await requirePermission(actor.id, (actor as any).aal, 'manage_reports');
      const reportId = String(req.body?.reportId || '');
      const decision = String(req.body?.decision || '');
      const note = String(req.body?.note || '').trim().slice(0, 2000);
      if (!/^[0-9a-f-]{36}$/i.test(reportId) || !['upheld','dismissed'].includes(decision)) return res.status(400).json({ success: false, message: 'بيانات قرار البلاغ غير صالحة.' });
      const { data, error } = await getSupabaseAdmin().rpc('store_resolve_merchant_report_service', { p_actor_id: actor.id, p_report_id: reportId, p_decision: decision, p_note: note });
      if (error) { console.warn('Merchant report resolution rejected:', error.message); return res.status(409).json({ success: false, message: 'تعذر معالجة البلاغ؛ قد يكون تمت معالجته مسبقاً.' }); }
      return res.json({ success: true, result: data, sanctionApplied: Boolean(data?.sanctionApplied) });
    } catch (err: any) { return res.status(err?.message === 'unauthorized' ? 401 : err?.message === 'forbidden' ? 403 : 400).json({ success: false, message: 'تعذر حفظ قرار البلاغ.' }); }
  });

  app.get('/api/admin/dashboard-stats', async (req, res) => {
    try {
      const actor = await requireAuth(req); const statsRole = await requirePermission(actor.id, (actor as any).aal, 'view_dashboard_stats');
      const db = getSupabaseAdmin();
      const [users, activeUsers, products, orders, disputes, reports, transactions] = await Promise.all([
        db.from('store_profiles').select('id', { count: 'exact', head: true }),
        db.from('store_profiles').select('id', { count: 'exact', head: true }).eq('account_status', 'active'),
        db.from('store_products').select('id', { count: 'exact', head: true }),
        db.from('store_orders').select('id', { count: 'exact', head: true }),
        db.from('store_disputes').select('id', { count: 'exact', head: true }).in('status', ['open', 'under_review']),
        db.from('store_merchant_reports').select('id', { count: 'exact', head: true }).in('status', ['open', 'reviewing']),
        db.from('store_transactions').select('id', { count: 'exact', head: true }),
      ]);
      let circulatingCoins: number | null = null;
      if (['super_admin', 'admin', 'finance'].includes(statsRole.role)) {
        const { data: wallets } = await db.from('store_wallets').select('balance').limit(10000);
        circulatingCoins = (wallets || []).reduce((sum: number, wallet: any) => sum + Number(wallet.balance || 0), 0);
      }
      return res.json({ users: users.count || 0, activeUsers: activeUsers.count || 0, products: products.count || 0, orders: orders.count || 0, transactions: transactions.count || 0, circulatingCoins, openDisputes: disputes.count || 0, openMerchantReports: reports.count || 0 });
    } catch { return res.status(403).json({ error: 'forbidden' }); }
  });

  app.get('/api/admin/merchant-manager', async (req, res) => {
    try {
      const actor = await requireAuth(req);
      await requirePermission(actor.id, (actor as any).aal, 'merchant_manager');
      const db = getSupabaseAdmin();
      const [apps, deposits, reports, products] = await Promise.all([
        db.from('store_merchant_applications').select('*').order('created_at', { ascending: false }).limit(500),
        db.from('store_merchant_deposits').select('*').order('created_at', { ascending: false }).limit(500),
        db.from('store_merchant_reports').select('*').order('created_at', { ascending: false }).limit(500),
        db.from('store_products').select('*').not('seller_id', 'is', null).order('created_at', { ascending: false }).limit(500),
      ]);
      return res.json({ applications: apps.data || [], deposits: deposits.data || [], reports: reports.data || [], products: products.data || [] });
    } catch { return res.status(403).json({ error: 'forbidden' }); }
  });

  app.post('/api/admin/merchant-manager/action', async (req, res) => {
    try {
      const actor = await requireAuth(req);
      const actorProfile = await requireAdmin(actor.id, (actor as any).aal);
      const action = String(req.body?.action || '');
      const id = String(req.body?.id || '');
      const decision = String(req.body?.decision || '');
      const reason = String(req.body?.reason || '').trim().slice(0, 1000);
      const db = getSupabaseAdmin();
      if (['review_application', 'resolve_report', 'revoke_license', 'regenerate_license'].includes(action) && !['admin', 'super_admin'].includes(actorProfile.role)) return res.status(403).json({ success: false, message: 'يتطلب هذا الإجراء صلاحية مدير.' });
      if (action === 'review_product' && !['admin', 'super_admin', 'product_manager'].includes(actorProfile.role)) return res.status(403).json({ success: false, message: 'غير مصرح بمراجعة المنتجات.' });
      if (action === 'review_application') {
        if (!/^[0-9a-f-]{36}$/i.test(id) || !['approved', 'rejected'].includes(decision)) return res.status(400).json({ success: false, message: 'بيانات المراجعة غير صالحة.' });
        const { error } = await db.from('store_merchant_applications').update({ status: decision, reviewed_by: actor.id, reviewed_at: new Date().toISOString(), review_note: decision === 'rejected' ? (reason || 'لم يستوفِ الشروط') : null, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
      } else if (action === 'review_product') {
        if (!/^[0-9a-f-]{36}$/i.test(id) || !['published', 'rejected', 'unpublished'].includes(decision)) return res.status(400).json({ success: false, message: 'بيانات مراجعة المنتج غير صالحة.' });
        const { error } = await db.from('store_products').update({ status: decision === 'unpublished' ? 'archived' : decision, rejection_reason: decision === 'rejected' ? (reason || 'Rejected by review') : null, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
      } else if (action === 'resolve_report') {
        if (!/^[0-9a-f-]{36}$/i.test(id) || !['upheld', 'dismissed'].includes(decision)) return res.status(400).json({ success: false, message: 'بيانات البلاغ غير صالحة.' });
        const { data: resolution, error } = await db.rpc('store_resolve_merchant_report_service', { p_actor_id: actor.id, p_report_id: id, p_decision: decision, p_note: reason });
        if (error) return res.status(409).json({ success: false, message: 'تعذر معالجة البلاغ؛ قد يكون تمت معالجته مسبقاً.' });
        return res.json({ success: true, result: resolution, sanctionApplied: Boolean(resolution?.sanctionApplied) });
      } else if (action === 'revoke_license') {
        if (!/^[0-9a-f-]{36}$/i.test(id) || reason.length < 3) return res.status(400).json({ success: false, message: 'سبب إلغاء الترخيص مطلوب.' });
        const { error } = await db.from('store_profiles').update({ account_status: 'suspended', merchant_license_revoked_at: new Date().toISOString(), merchant_license_revoke_reason: reason }).eq('id', id).eq('role', 'merchant');
        if (error) throw error;
      } else if (action === 'regenerate_license') {
        if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ success: false, message: 'معرف التاجر غير صالح.' });
        const licenseId = 'LIC-MCH-' + crypto.randomBytes(6).toString('hex').toUpperCase();
        const { error } = await db.from('store_profiles').update({ merchant_license_id: licenseId }).eq('id', id).eq('role', 'merchant');
        if (error) throw error;
        await db.from('store_audit_logs').insert({ actor_id: actor.id, actor_email: actor.email, actor_role: actorProfile.role, action: 'MERCHANT_LICENSE_REGENERATED', entity_type: 'profile', entity_id: id, details: { licenseId }, result: 'success' });
        return res.json({ success: true, licenseId });
      } else if (action === 'send_activation') {
        if (!['admin','super_admin'].includes(actorProfile.role) || !/^[0-9a-f-]{36}$/i.test(id)) return res.status(403).json({ success: false, message: 'إرسال التفعيل يتطلب صلاحية مدير ومعرف تاجر صالح.' });
        const result = await issueMerchantActivationToken(id);
        return res.json({ success: true, expiresAt: result.expiresAt });
      } else if (action === 'refund_deposits') {
        return res.status(501).json({ success: false, message: 'رد الضمانات متوقف حتى إكمال واختبار التسوية المحاسبية الذرية.' });
      } else return res.status(400).json({ success: false, message: 'إجراء غير معروف.' });
      await db.from('store_audit_logs').insert({ actor_id: actor.id, actor_email: actor.email, actor_role: actorProfile.role, action: `MERCHANT_ADMIN_${action.toUpperCase()}`, entity_type: action, entity_id: id || null, details: { decision, reason }, result: 'success' });
      return res.json({ success: true });
    } catch (err: any) { return res.status(err?.message === 'unauthorized' ? 401 : err?.message === 'forbidden' ? 403 : 400).json({ success: false, message: 'تعذر تنفيذ إجراء إدارة التجار.' }); }
  });

  app.post('/api/admin/products', async (req, res) => {
    try {
      const actor = await requireAuth(req);
      const actorProfile = await requirePermission(actor.id, (actor as any).aal, 'manage_products');
      const db = getSupabaseAdmin();
      const { data: displayProfile } = await db.from('store_profiles').select('display_name').eq('id', actor.id).maybeSingle();
      const p = req.body?.product || {};
      const title = String(p.name || p.title || '').trim().slice(0, 160);
      const description = String(p.description || '').trim().slice(0, 10000);
      const price = Number(p.price);
      const category = String(p.category || 'development');
      if (!title || !Number.isFinite(price) || price <= 0 || price > 50000 || Math.round(price * 100) !== price * 100) return res.status(400).json({ success: false, message: 'عنوان المنتج أو سعره غير صالح.' });
      const statusMap: Record<string, string> = { published: 'published', draft: 'draft', pending_review: 'pending', pending: 'pending', archived: 'archived', rejected: 'rejected' };
      const status = statusMap[String(p.status || 'published')] || 'draft';
      const productId = /^[0-9a-f-]{36}$/i.test(String(p.id || '')) ? String(p.id) : crypto.randomUUID();
      const { data: existingProduct, error: existingProductError } = await db.from('store_products').select('id,seller_id,seller_name,file_storage_path').eq('id', productId).maybeSingle();
      if (existingProductError) throw existingProductError;
      const sellerId = existingProduct?.seller_id || actor.id;
      const sellerName = existingProduct?.seller_name || displayProfile?.display_name || actor.email || 'Store';
      const submittedPath = String(p.fileStoragePath || '');
      const pathBelongsToActor = submittedPath.startsWith(`${actor.id}/`) && !submittedPath.includes('..');
      const fileStoragePath = pathBelongsToActor ? submittedPath : (existingProduct?.file_storage_path || null);
      const record = {
        id: productId, seller_id: sellerId, title, title_en: String(p.nameEn || title).trim().slice(0, 160), description,
        category, price, currency: 'COIN', image_url: String(p.thumbnail || '').slice(0, 2000) || null,
        image_urls: Array.isArray(p.images) ? p.images.slice(0, 10) : [], demo_video_url: p.demoVideoUrl || null, demo_url: p.demoUrl || null,
        file_format: String(p.fileFormat || p.fileType || '').slice(0, 30) || null, file_name: String(p.fileName || '').slice(0, 255) || null,
        file_type: String(p.fileType || p.fileFormat || '').slice(0, 100) || null, file_size: String(p.fileSize || '').slice(0, 50) || null,
        file_storage_path: fileStoragePath, download_url: /^https:\/\//i.test(String(p.downloadUrl || '')) ? String(p.downloadUrl).slice(0, 2000) : null,
        features: Array.isArray(p.features) ? p.features.slice(0, 40) : [], features_en: Array.isArray(p.featuresEn) ? p.featuresEn.slice(0, 40) : [],
        status, is_digital: true, seller_name: sellerName, metadata: { version: p.version || '1.0', changelog: p.changelog || '', compatibility: p.compatibility || '', terms: p.terms || '', tags: Array.isArray(p.tags) ? p.tags.slice(0, 30) : [] }, updated_at: new Date().toISOString(),
      };
      const { data: saved, error } = await db.from('store_products').upsert(record, { onConflict: 'id' }).select('*').single();
      if (error) throw error;
      await db.from('store_audit_logs').insert({ actor_id: actor.id, actor_email: actor.email, actor_role: actorProfile.role, action: 'PRODUCT_UPSERT', entity_type: 'product', entity_id: productId, details: { title, status, price }, result: 'success' });
      return res.json({ success: true, product: { id: saved.id, name: saved.title, nameEn: saved.title_en || saved.title, description: saved.description || '', descriptionEn: saved.metadata?.description_en || '', price: Number(saved.price), category: saved.category || 'development', tags: saved.metadata?.tags || [], thumbnail: saved.image_url || '', images: saved.image_urls || [], demoVideoUrl: saved.demo_video_url, demoUrl: saved.demo_url, fileFormat: saved.file_format, downloadUrl: saved.download_url, fileName: saved.file_name, fileType: saved.file_type, fileSize: saved.file_size, fileStoragePath: saved.file_storage_path, status: saved.status === 'pending' ? 'pending_review' : saved.status, downloadsCount: saved.downloads_count || 0, rating: Number(saved.rating || 0), ratingCount: saved.rating_count || 0, updatedAt: saved.updated_at, createdAt: saved.created_at, features: saved.features || [], featuresEn: saved.features_en || [], sellerId: saved.seller_id, sellerName: saved.seller_name, rejectionReason: saved.rejection_reason } });
    } catch (err: any) { console.error('Admin product upsert failed:', err?.message); return res.status(err?.message === 'unauthorized' ? 401 : 400).json({ success: false, message: 'تعذر حفظ المنتج في Supabase.' }); }
  });

  app.post('/api/admin/products/:id/archive', async (req, res) => {
    try {
      const actor = await requireAuth(req);
      await requirePermission(actor.id, (actor as any).aal, 'manage_products');
      const db = getSupabaseAdmin();
      if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(400).json({ success: false, message: 'معرف المنتج غير صالح.' });
      const { error } = await db.from('store_products').update({ status: 'archived', updated_at: new Date().toISOString() }).eq('id', req.params.id);
      if (error) throw error;
      return res.json({ success: true });
    } catch { return res.status(400).json({ success: false, message: 'تعذر أرشفة المنتج.' }); }
  });

  app.post('/api/admin/set-user-role', async (req, res) => {
    try {
      const actor = await requireAuth(req);
      const actorProfile = await requirePermission(actor.id, (actor as any).aal, 'manage_roles');
      const db = getSupabaseAdmin();
      const targetUid = String(req.body?.targetUid || '');
      const requestedRole = String(req.body?.newRole || '');
      const roleMap: Record<string, string> = { customer: 'user', user: 'user', admin: 'admin', support: 'support', moderator: 'moderator', finance: 'finance', product_manager: 'product_manager' };
      const newRole = roleMap[requestedRole];
      if (!/^[0-9a-f-]{36}$/i.test(targetUid) || !newRole) return res.status(400).json({ success: false, message: 'بيانات الصلاحيات غير صالحة.' });
      if (targetUid === actor.id) return res.status(400).json({ success: false, message: 'لا يمكنك تغيير دور حسابك الحالي.' });
      if (newRole !== 'user' && actorProfile.role !== 'super_admin') return res.status(403).json({ success: false, message: 'فقط المدير العام يمكنه منح أدوار الإدارة.' });
      const { data: target, error: targetError } = await db.from('store_profiles').select('role').eq('id', targetUid).maybeSingle();
      if (targetError || !target) return res.status(404).json({ success: false, message: 'الحساب المستهدف غير موجود.' });
      if (target.role === 'super_admin') return res.status(403).json({ success: false, message: 'لا يمكن تعديل دور المدير العام من هذه الشاشة.' });
      const { error } = await db.from('store_profiles').update({ role: newRole }).eq('id', targetUid);
      if (error) throw error;
      await db.from('store_audit_logs').insert({ actor_id: actor.id, actor_email: actor.email, actor_role: actorProfile.role, action: 'USER_ROLE_CHANGED', entity_type: 'profile', entity_id: targetUid, details: { newRole }, result: 'success' });
      return res.json({ success: true, role: newRole });
    } catch (err: any) { return res.status(err?.message === 'unauthorized' ? 401 : err?.message === 'forbidden' ? 403 : 400).json({ success: false, message: 'تعذر تحديث الصلاحيات.' }); }
  });

  app.get('/api/notifications', async (req, res) => {
    try {
      const user = await requireAuth(req);
      const { data, error } = await getSupabaseAdmin().from('store_notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return res.json({ notifications: (data || []).map((row: any) => ({ id: row.id, userId: row.user_id, title: row.title, titleEn: row.title_en || row.title, message: row.body, messageEn: row.body_en || row.body, type: row.type, isRead: Boolean(row.read_at), timestamp: row.created_at, linkTab: row.link || undefined })) });
    } catch { return res.status(401).json({ error: 'unauthorized' }); }
  });

  app.post('/api/notifications', async (req, res) => {
    try {
      const user = await requireAuth(req);
      const title = String(req.body?.title || '').trim().slice(0, 160);
      const body = String(req.body?.body || '').trim().slice(0, 1000);
      const type = String(req.body?.type || 'system');
      const allowedTypes = ['transfer', 'purchase', 'dispute', 'system', 'security', 'refund', 'merchant', 'support'];
      if (!title || !body || !allowedTypes.includes(type)) return res.status(400).json({ success: false, message: 'بيانات الإشعار غير صالحة.' });
      const id = /^[0-9a-f-]{36}$/i.test(String(req.body?.id || '')) ? String(req.body.id) : crypto.randomUUID();
      const { error } = await getSupabaseAdmin().from('store_notifications').insert({ id, user_id: user.id, title, body, title_en: String(req.body?.titleEn || title).slice(0, 160), body_en: String(req.body?.bodyEn || body).slice(0, 1000), type, link: typeof req.body?.linkTab === 'string' ? req.body.linkTab.slice(0, 40) : null, metadata: {} });
      if (error) {
        if (error.code === '23505') {
          const { data: existing } = await getSupabaseAdmin().from('store_notifications').select('id').eq('id', id).eq('user_id', user.id).maybeSingle();
          if (existing) return res.json({ success: true, id });
        }
        throw error;
      }
      return res.json({ success: true, id });
    } catch { return res.status(401).json({ success: false, message: 'تعذر حفظ الإشعار.' }); }
  });

  app.post('/api/notifications/:id/read', async (req, res) => {
    try {
      const user = await requireAuth(req); const id = String(req.params.id || '');
      if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ success: false });
      const { error } = await getSupabaseAdmin().from('store_notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id);
      if (error) throw error;
      return res.json({ success: true });
    } catch { return res.status(401).json({ success: false }); }
  });

  app.post('/api/notifications/read-all', async (req, res) => {
    try {
      const user = await requireAuth(req);
      const { error } = await getSupabaseAdmin().from('store_notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null);
      if (error) throw error;
      return res.json({ success: true });
    } catch { return res.status(401).json({ success: false }); }
  });

  app.post('/api/auth/link-telegram', async (req, res) => {
    try {
      const user = await requireAuth(req);
      const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
      if (!botToken) return res.status(503).json({ success: false, message: 'ربط تيليجرام غير مفعّل على الخادم.' });
      const authData = req.body?.telegramAuthData;
      if (!authData || typeof authData !== 'object' || !authData.hash || !authData.id || !authData.auth_date) return res.status(400).json({ success: false, message: 'بيانات تسجيل تيليجرام غير مكتملة.' });
      const authDate = Number(authData.auth_date);
      if (!Number.isFinite(authDate) || authDate > Math.floor(Date.now() / 1000) + 300 || Math.floor(Date.now() / 1000) - authDate > 86400) return res.status(400).json({ success: false, message: 'انتهت صلاحية بيانات تيليجرام.' });
      const checkString = Object.keys(authData).filter((key) => key !== 'hash' && authData[key] !== undefined && authData[key] !== null).sort().map((key) => `${key}=${String(authData[key])}`).join('\n');
      const secretKey = crypto.createHash('sha256').update(botToken).digest();
      const expectedHash = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');
      const suppliedHash = String(authData.hash);
      const a = Buffer.from(expectedHash, 'hex'); const b = Buffer.from(suppliedHash, 'hex');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(403).json({ success: false, message: 'تعذر التحقق من توقيع تيليجرام.' });
      const telegramId = String(authData.id);
      if (!/^\d{1,20}$/.test(telegramId)) return res.status(400).json({ success: false, message: 'معرف تيليجرام غير صالح.' });
      const { error } = await getSupabaseAdmin().from('store_profiles').update({ telegram_chat_id: telegramId, telegram_username: typeof authData.username === 'string' ? authData.username.slice(0, 64) : null, telegram_linked_at: new Date().toISOString() }).eq('id', user.id);
      if (error) throw error;
      return res.json({ success: true, telegramUsername: authData.username || null });
    } catch (err: any) { return res.status(err?.message === 'unauthorized' ? 401 : 400).json({ success: false, message: 'تعذر ربط حساب تيليجرام.' }); }
  });

  app.post('/api/auth/generate-transfer-code', async (req, res) => {
    try {
      const user = await requireAuth(req);
      if (await isRateLimited(`generate-transfer-code:${user.id}`, 5, 10 * 60 * 1000)) return res.status(429).json({ success: false, message: 'طلبات كثيرة لإنشاء رموز التحويل؛ حاول لاحقاً.' });
      const db = getSupabaseAdmin();
      const { data: profile } = await db.from('store_profiles').select('account_status').eq('id', user.id).maybeSingle();
      if (!profile || profile.account_status !== 'active') return res.status(403).json({ success: false, message: 'الحساب غير نشط.' });
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      for (let attempt = 0; attempt < 5; attempt++) {
        const random = crypto.randomBytes(6);
        let suffix = '';
        for (const byte of random) suffix += alphabet[byte % alphabet.length];
        const code = `TRF-${suffix}`;
        const expiresAt = Date.now() + 10 * 60 * 1000;
        const { error } = await db.from('store_profiles').update({ transfer_code: sha256(code), transfer_code_expires_at: expiresAt }).eq('id', user.id);
        if (!error) return res.json({ success: true, code, expiresAt });
        if (error.code !== '23505') throw error;
      }
      return res.status(503).json({ success: false, message: 'تعذر إنشاء رمز فريد؛ حاول مجدداً.' });
    } catch (err: any) { return res.status(err?.message === 'unauthorized' ? 401 : 503).json({ success: false, message: 'تعذر إنشاء رمز التحويل.' }); }
  });

  app.post('/api/wallet/transfer', async (req, res) => {
    try {
      const user = await requireAuth(req);
      if (await isRateLimited(`wallet-transfer:${user.id}`, 15, 10 * 60 * 1000)) return res.status(429).json({ success: false, message: 'محاولات تحويل كثيرة؛ حاول لاحقاً.' });
      const flags = await getPlatformFlags();
      if (flags.maintenanceMode || flags.pauseTransfers || flags.pauseWallet) return res.status(503).json({ success: false, message: 'التحويلات متوقفة مؤقتاً من إعدادات الطوارئ.' });
      const recipientInput = String(req.body?.recipientIdOrCode || req.body?.recipientId || '').trim();
      const amount = Number(req.body?.amount);
      const description = String(req.body?.description || '').trim().slice(0, 240);
      const pin = String(req.body?.pin || '');
      const requestId = String(req.body?.clientRequestId || '');
      if (!recipientInput || recipientInput.length > 200 || !Number.isFinite(amount) || amount <= 0 || amount > 50000 || Math.round(amount * 100) !== amount * 100 || !/^\d{4,6}$/.test(pin) || requestId.length < 8 || requestId.length > 160) {
        return res.status(400).json({ success: false, message: 'بيانات التحويل غير صالحة.' });
      }
      const db = getSupabaseAdmin();
      let recipientId = recipientInput;
      let recipientRow: any = null;
      if (!/^[0-9a-f-]{36}$/i.test(recipientInput)) {
        const { data: byUsername } = await db.from('store_profiles').select('id,display_name,account_status').eq('username', recipientInput.toLowerCase()).maybeSingle();
        const normalizedCode = recipientInput.toUpperCase();
        const looksLikeTransferCode = /^TRF-[A-HJ-NP-Z2-9]{6}$/.test(normalizedCode);
        const { data: byCode } = byUsername || !looksLikeTransferCode ? { data: null } : await db.from('store_profiles').select('id,display_name,account_status,transfer_code_expires_at').eq('transfer_code', sha256(normalizedCode)).maybeSingle();
        const { data: byEmail } = byUsername || byCode ? { data: null } : await db.from('store_profiles').select('id,display_name,account_status').eq('email', recipientInput.toLowerCase()).maybeSingle();
        recipientRow = byUsername || byCode || byEmail;
        if (!recipientRow) return res.status(404).json({ success: false, message: 'لم يتم العثور على المستلم.' });
        if (byCode && (!recipientRow.transfer_code_expires_at || Number(recipientRow.transfer_code_expires_at) < Date.now())) return res.status(400).json({ success: false, message: 'انتهت صلاحية رمز التحويل.' });
        recipientId = recipientRow.id;
      } else {
        const { data } = await db.from('store_profiles').select('id,display_name,account_status').eq('id', recipientId).maybeSingle();
        recipientRow = data;
      }
      if (!recipientRow || recipientId === user.id || recipientRow.account_status !== 'active') return res.status(400).json({ success: false, message: 'المستلم غير صالح أو حسابه غير نشط.' });
      const { data: pinData, error: pinError } = await db.from('store_security_profiles').select('transfer_pin_hash,transfer_pin_salt,pin_enabled,failed_attempts,locked_until').eq('user_id', user.id).maybeSingle();
      if (pinError || !pinData?.pin_enabled || !pinData.transfer_pin_hash || !pinData.transfer_pin_salt) return res.status(403).json({ success: false, message: 'يجب إعداد PIN للتحويلات أولاً.' });
      if (pinData.locked_until && new Date(pinData.locked_until).getTime() > Date.now()) return res.status(429).json({ success: false, message: 'تم إيقاف التحقق مؤقتاً بعد محاولات متعددة.' });
      const candidate = (await scryptAsync(pin, pinData.transfer_pin_salt, 64)).toString('hex');
      const a = Buffer.from(candidate, 'hex'); const b = Buffer.from(pinData.transfer_pin_hash, 'hex');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        const attempts = Number(pinData.failed_attempts || 0) + 1;
        await db.from('store_security_profiles').update({ failed_attempts: attempts, locked_until: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null }).eq('user_id', user.id);
        return res.status(403).json({ success: false, message: 'رمز PIN غير صحيح.' });
      }
      const txId = crypto.randomUUID(); const debitId = crypto.randomUUID(); const creditId = crypto.randomUUID();
      const reference = 'TRF-' + crypto.randomBytes(6).toString('hex').toUpperCase();
      const securityHash = computeRealHmac(txId, amount);
      const { data, error } = await db.rpc('store_send_transfer_service', {
        p_sender_id: user.id, p_recipient_id: recipientId, p_amount: amount, p_description: description,
        p_request_id: requestId, p_tx_id: txId, p_debit_id: debitId, p_credit_id: creditId,
        p_reference: reference, p_security_hash: securityHash,
      });
      if (error) { console.warn('Supabase transfer rejected:', error.message); return res.status(400).json({ success: false, message: 'تعذر تنفيذ التحويل. تحقق من الرصيد والمستلم وحالة الحساب.' }); }
      await db.from('store_security_profiles').update({ failed_attempts: 0, locked_until: null, updated_at: new Date().toISOString() }).eq('user_id', user.id);
      const actualTxId = String(data?.txId || txId);
      const { data: txRow } = await db.from('store_transactions').select('*').eq('id', actualTxId).maybeSingle();
      const { data: sender } = await db.from('store_profiles').select('display_name').eq('id', user.id).maybeSingle();
      const { data: recipient } = await db.from('store_profiles').select('display_name').eq('id', recipientId).maybeSingle();
      if (txRow) await db.from('store_transactions').update({ sender_id: user.id, sender_name: sender?.display_name || user.email || 'User', receiver_name: recipient?.display_name || 'User' }).eq('id', actualTxId);
      const transaction = txRow ? { id: txRow.id, reference: txRow.reference, type: 'transfer_sent', senderId: user.id, senderName: sender?.display_name || user.email || 'User', receiverId: recipientId, receiverName: recipient?.display_name || 'User', amount: Number(txRow.amount), status: txRow.status, timestamp: txRow.created_at, description: txRow.description || description, securityVerificationHash: txRow.security_verification_hash || '' } : null;
      return res.json({ success: true, result: data, txId: actualTxId, reference: data?.reference || reference, transaction });
    } catch (err: any) { return res.status(err?.message === 'unauthorized' ? 401 : 503).json({ success: false, message: 'تعذر التحقق من الجلسة أو خدمة التحويل.' }); }
  });

  app.post('/api/products/:orderId/download', async (req, res) => {
    try {
      const user = await requireAuth(req);
      const db = getSupabaseAdmin();
      const { data: activeProfile } = await db.from('store_profiles').select('account_status').eq('id', user.id).maybeSingle();
      if (!activeProfile || activeProfile.account_status !== 'active') return res.status(403).json({ success: false, message: 'الحساب غير نشط.' });
      const orderId = String(req.params.orderId || '');
      if (!/^[0-9a-f-]{36}$/i.test(orderId)) return res.status(400).json({ success: false, message: 'معرف الطلب غير صالح.' });
      const { data: order, error: orderError } = await db.from('store_orders').select('id,user_id,product_id,status,downloads_count,max_downloads').eq('id', orderId).eq('user_id', user.id).maybeSingle();
      if (orderError || !order) return res.status(404).json({ success: false, message: 'الطلب غير موجود لهذا الحساب.' });
      if (!['paid', 'processing', 'completed'].includes(order.status)) return res.status(403).json({ success: false, message: 'الطلب غير مؤهل للتنزيل حالياً.' });
      const maximum = Number(order.max_downloads || 10);
      if (Number(order.downloads_count || 0) >= maximum) return res.status(429).json({ success: false, message: 'تم الوصول إلى الحد الأقصى للتنزيلات لهذا الطلب.' });
      const { data: product, error: productError } = await db.from('store_products').select('file_storage_path,file_name,file_format,download_url').eq('id', order.product_id).maybeSingle();
      if (productError || !product) return res.status(404).json({ success: false, message: 'ملف المنتج غير موجود.' });
      let downloadUrl = '';
      if (product.file_storage_path) {
        const { data: signed, error: signError } = await db.storage.from('store-product-files').createSignedUrl(product.file_storage_path, 15 * 60, { download: product.file_name || true });
        if (signError || !signed?.signedUrl) return res.status(503).json({ success: false, message: 'تعذر إنشاء رابط تنزيل آمن.' });
        downloadUrl = signed.signedUrl;
      } else if (product.download_url && /^https:\/\//i.test(product.download_url)) {
        downloadUrl = product.download_url;
      } else return res.status(404).json({ success: false, message: 'لم يُرفع ملف المنتج إلى التخزين الآمن بعد.' });
      const { error: consumeError } = await db.rpc('store_consume_download_service', { p_user_id: user.id, p_order_id: order.id });
      if (consumeError) return res.status(429).json({ success: false, message: 'تعذر السماح بتنزيل إضافي؛ ربما انتهى الحد أو لم يعد الطلب مؤهلاً.' });
      const expiresAt = Date.now() + 15 * 60 * 1000;
      const { error: updateError } = await db.from('store_orders').update({ download_url_expires_at: expiresAt }).eq('id', order.id).eq('user_id', user.id);
      if (updateError) throw updateError;
      const { data: updatedOrder } = await db.from('store_orders').select('downloads_count').eq('id', order.id).maybeSingle();
      const downloadsCount = Number(updatedOrder?.downloads_count || Number(order.downloads_count || 0) + 1);
      await db.from('store_audit_logs').insert({ actor_id: user.id, actor_email: user.email, action: 'PRODUCT_DOWNLOAD', entity_type: 'order', entity_id: order.id, details: { productId: order.product_id, downloadsCount }, result: 'success' });
      return res.json({ success: true, downloadUrl, fileName: product.file_name || `product.${String(product.file_format || 'zip').toLowerCase()}`, downloadsCount, expiresAt });
    } catch (err: any) { return res.status(err?.message === 'unauthorized' ? 401 : 503).json({ success: false, message: 'تعذر التحقق من صلاحية التنزيل.' }); }
  });

  app.post('/api/products/purchase', async (req, res) => {
    try {
      const user = await requireAuth(req);
      const flags = await getPlatformFlags();
      if (flags.maintenanceMode || flags.pausePurchases || flags.pauseWallet) return res.status(503).json({ success: false, message: 'المشتريات متوقفة مؤقتاً من إعدادات الطوارئ.' });
      const productId = String(req.body?.productId || '');
      const requestId = String(req.body?.clientRequestId || '');
      if (!/^[0-9a-f-]{36}$/i.test(productId) || requestId.length < 8 || requestId.length > 160) return res.status(400).json({ success: false, message: 'بيانات الشراء غير صالحة.' });
      const db = getSupabaseAdmin();
      const { data: product, error: productError } = await db.from('store_products').select('price,status,seller_id').eq('id', productId).maybeSingle();
      if (productError || !product || product.status !== 'published' || !product.seller_id || !Number.isFinite(Number(product.price))) return res.status(404).json({ success: false, message: 'المنتج غير متاح.' });
      if (product.seller_id === user.id) return res.status(400).json({ success: false, message: 'لا يمكنك شراء منتجك الخاص.' });
      const { data: sellerProfile } = await db.from('store_profiles').select('account_status').eq('id', product.seller_id).maybeSingle();
      if (!sellerProfile || sellerProfile.account_status !== 'active') return res.status(403).json({ success: false, message: 'التاجر غير نشط؛ لم يتم خصم الرصيد.' });
      const txId = crypto.randomUUID(); const orderId = crypto.randomUUID(); const debitId = crypto.randomUUID(); const sellerCreditId = crypto.randomUUID();
      const reference = 'BUY-' + crypto.randomBytes(6).toString('hex').toUpperCase();
      // Amount is calculated and checked inside the database transaction; the pre-read is used only for receipt signing.
      const { data, error } = await db.rpc('store_purchase_product_service', {
        p_user_id: user.id, p_product_id: productId, p_request_id: requestId, p_order_id: orderId,
        p_tx_id: txId, p_debit_id: debitId, p_seller_credit_id: sellerCreditId,
        p_reference: reference, p_security_hash: computeRealHmac(txId, product.price),
      });
      if (error) { console.warn('Supabase purchase rejected:', error.message); return res.status(400).json({ success: false, message: 'تعذر إتمام الشراء. تحقق من توفر المنتج والرصيد.' }); }
      const actualTxId = String(data?.txId || txId);
      const { data: savedTx } = await db.from('store_transactions').select('amount,security_verification_hash').eq('id', actualTxId).maybeSingle();
      if (savedTx && savedTx.security_verification_hash !== computeRealHmac(actualTxId, savedTx.amount)) {
        await db.from('store_transactions').update({ security_verification_hash: computeRealHmac(actualTxId, savedTx.amount) }).eq('id', actualTxId);
      }
      const [{ data: buyerProfile }, { data: sellerNameProfile }] = await Promise.all([
        db.from('store_profiles').select('display_name').eq('id', user.id).maybeSingle(),
        db.from('store_profiles').select('display_name').eq('id', product.seller_id).maybeSingle(),
      ]);
      await db.from('store_transactions').update({ sender_id: user.id, sender_name: buyerProfile?.display_name || user.email || 'Buyer', receiver_name: sellerNameProfile?.display_name || 'Seller' }).eq('id', actualTxId);
      return res.json({ success: true, result: data });
    } catch (err: any) { return res.status(err?.message === 'unauthorized' ? 401 : 503).json({ success: false, message: 'تعذر التحقق من الجلسة أو خدمة الشراء.' }); }
  });

  app.post('/api/auth/verify-transfer-pin', async (req, res) => {
    try {
      const user = await requireAuth(req);
      if (await isRateLimited(`verify-transfer-pin:${user.id}`, 8, 15 * 60 * 1000)) return res.status(429).json({ error: 'temporarily locked' });
      const pin = String(req.body?.pin || '');
      if (!/^\d{4,6}$/.test(pin)) return res.status(400).json({ error: 'invalid PIN' });
      const db = getSupabaseAdmin();
      const { data, error } = await db.from('store_security_profiles').select('transfer_pin_hash,transfer_pin_salt,pin_enabled,failed_attempts,locked_until').eq('user_id', user.id).maybeSingle();
      if (error || !data?.pin_enabled || !data.transfer_pin_hash || !data.transfer_pin_salt) return res.status(403).json({ error: 'PIN not configured' });
      if (data.locked_until && new Date(data.locked_until).getTime() > Date.now()) return res.status(429).json({ error: 'temporarily locked' });
      const candidate = (await scryptAsync(pin, data.transfer_pin_salt, 64)).toString('hex');
      const a = Buffer.from(candidate, 'hex'); const b = Buffer.from(data.transfer_pin_hash, 'hex');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        const attempts = Number(data.failed_attempts || 0) + 1;
        await db.from('store_security_profiles').update({ failed_attempts: attempts, locked_until: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null, updated_at: new Date().toISOString() }).eq('user_id', user.id);
        return res.status(403).json({ error: 'invalid PIN' });
      }
      await db.from('store_security_profiles').update({ failed_attempts: 0, locked_until: null, updated_at: new Date().toISOString() }).eq('user_id', user.id);
      return res.json({ success: true });
    } catch (err: any) { return res.status(err?.message === 'unauthorized' ? 401 : 400).json({ error: 'Could not verify PIN' }); }
  });

  // 7. Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  scheduleDailyAdminGate();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[FullStack] Express server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
