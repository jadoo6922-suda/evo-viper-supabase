import React, { useMemo, useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Scale, Shield, FileText, BadgeCheck } from 'lucide-react';
import { useStore } from '../context/useStore';

export type LegalSection = 'privacy' | 'terms' | 'kyc';

interface LegalViewProps {
  initialSection?: LegalSection;
  onClose?: () => void;
}

export const LegalView: React.FC<LegalViewProps> = ({ initialSection = 'privacy', onClose }) => {
  const { language, setActiveTab } = useStore();
  const isAr = language === 'ar';
  const [section, setSection] = useState<LegalSection>(initialSection);

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('legal', section);
      window.history.replaceState({}, '', `${url.pathname}?${url.searchParams.toString()}`);
    } catch {
      /* ignore */
    }
  }, [section]);

  const tabs: { id: LegalSection; ar: string; en: string; icon: React.ReactNode }[] = [
    { id: 'privacy', ar: 'الخصوصية', en: 'Privacy', icon: <Shield className="w-4 h-4" /> },
    { id: 'terms', ar: 'الشروط', en: 'Terms', icon: <FileText className="w-4 h-4" /> },
    { id: 'kyc', ar: 'التحقق KYC', en: 'KYC / AML', icon: <BadgeCheck className="w-4 h-4" /> },
  ];

  const content = useMemo(() => {
    const updated = '2026-10-16';
    if (section === 'privacy') {
      return isAr ? {
        title: 'سياسة الخصوصية',
        body: [
          `آخر تحديث: ${updated}`,
          'تنطبق هذه السياسة على منصة المتجر الرقمي الموحد (EVO VIPER / DigitalStore) والموقع المرتبط بها.',
          '1) المسؤول عن المعالجة: مشغّل المنصة كما يظهر في بيانات الاتصال داخل الموقع أو رسائل الدعم.',
          '2) البيانات التي نجمعها: بيانات الحساب (الاسم، اسم المستخدم، البريد)، بيانات الجلسة والأجهزة، سجلات النشاط والأمان، بيانات المحفظة الداخلية والمعاملات داخل المنصة، طلبات الدعم، وبيانات التاجر إن تقدمت بطلب تاجر.',
          '3) أغراض الاستخدام: تشغيل الحساب والخدمات، منع الاحتيال وإساءة الاستخدام، تنفيذ التحويلات والمشتريات داخل الرصيد الافتراضي، الامتثال القانوني عند الاقتضاء، وتحسين الخدمة.',
          '4) المحفظة الداخلية: الرصيد داخل المنصة هو رصيد محاسبي/تشغيلي داخل النظام وليس حساباً مصرفياً. لا نطلب منك مشاركة أرقام بطاقات الدفع داخل المحادثة العامة؛ أي شحن يتم عبر القنوات المعتمدة في الواجهة فقط.',
          '5) المشاركة: قد تُشارك بيانات محدودة مع مزودي البنية التحتية (مثل الاستضافة، البريد، قواعد البيانات السحابية) حصراً لتشغيل الخدمة. لا نبيع بياناتك الشخصية.',
          '6) الاحتفاظ: نحتفظ بالبيانات طالما الحساب نشط أو للمدة اللازمة للمنازعات والأمان والالتزامات القانونية.',
          '7) حقوقك: طلب الاطلاع أو التصحيح أو حذف الحساب وفق ما يسمح به القانون التشغيلي للمنصة، عبر الدعم. قد نرفض طلباً إذا تعارض مع مكافحة الاحتيال أو نزاع قائم.',
          '8) الأمان: نستخدم ممارسات حماية معقولة (تشفير النقل، صلاحيات خادم، سجلات تدقيق). لا توجد حماية مطلقة على الإنترنت.',
          '9) التواصل: لطلبات الخصوصية استخدم قسم الدعم داخل المنصة.',
          'تنويه: هذا النص إطار تشغيلي عام وليس استشارة قانونية ملزمة في كل ولاية قضائية.',
        ],
      } : {
        title: 'Privacy Policy',
        body: [
          `Last updated: ${updated}`,
          'This policy applies to the Unified Digital Store platform (EVO VIPER / DigitalStore) and related websites.',
          '1) Controller: the platform operator as identified in in-app support or contact details.',
          '2) Data we collect: account data (name, username, email), session/device data, security and activity logs, internal wallet and transaction records, support tickets, and merchant application data when applicable.',
          '3) Purposes: operating accounts and services, fraud prevention, processing internal transfers and purchases against platform balance, legal compliance where required, and service improvement.',
          '4) Internal wallet: balances are operational ledger balances inside the platform, not bank accounts. Do not share payment-card numbers in public chat; top-ups use only approved in-app channels.',
          '5) Sharing: limited data may be processed by infrastructure providers (hosting, email, cloud database) solely to run the service. We do not sell personal data.',
          '6) Retention: for as long as the account is active or as needed for disputes, security, and legal obligations.',
          '7) Your rights: access, correction, or account deletion requests via support, subject to fraud-prevention and ongoing dispute needs.',
          '8) Security: reasonable safeguards (TLS, server-side privileges, audit logs). No system is perfectly secure.',
          '9) Contact: use in-app support for privacy requests.',
          'Disclaimer: this is an operational framework, not jurisdiction-specific legal advice.',
        ],
      };
    }
    if (section === 'terms') {
      return isAr ? {
        title: 'شروط الاستخدام',
        body: [
          `آخر تحديث: ${updated}`,
          'باستخدامك للمنصة فإنك توافق على هذه الشروط.',
          '1) طبيعة الخدمة: منصة لعرض وبيع منتجات رقمية وإدارة رصيد داخلي وتحويلات بين المستخدمين داخل النظام. المنصة ليست بنكاً ولا مؤسسة دفع مرخّصة ما لم يُعلن خلاف ذلك صراحةً.',
          '2) الأهلية: يجب أن تكون بكامل الأهلية القانونية في بلدك. استخدام القاصرين يتطلب موافقة الولي حيث يلزم القانون.',
          '3) الحساب: أنت مسؤول عن سرية كلمة المرور ورمز PIN. أي نشاط عبر حسابك يُعد صادراً عنك ما لم تُبلغ فوراً عن اختراق.',
          '4) الرصيد والشحن: الشحن اليدوي أو عبر قنوات غير بنكية يخضع لمراجعة إدارية. الرصيد غير قابل للسحب النقدي الخارجي ما لم تُوفَّر آلية سحب رسمية لاحقاً. عمليات الاحتيال أو التلاعب تؤدي إلى تعليق الحساب ومصادرة أرصدة غير مشروعة عند ثبوت المخالفة.',
          '5) المنتجات الرقمية: بعد التسليم/التحميل وفق قواعد الضمان قد لا يتوفر استرداد تلقائي. النزاعات تُعالج عبر نظام النزاعات في المنصة.',
          '6) الضمان (Escrow): للمشتريات فوق العتبة المحددة قد يُحتجز المبلغ حتى تأكيد الاستلام أو قرار النزاع. إساءة استخدام النزاعات قد تُقيّد الحساب.',
          '7) المحتوى المحظور: يُمنع بيع أو تداول مواد غير قانونية، برمجيات خبيثة، انتهاك ملكية فكرية، أو محتوى يستغل القاصرين.',
          '8) التجار: قبول التاجر قد يتطلب تحقق هوية/مستندات ورسوم ترخيص وفق ما تعلنه المنصة.',
          '9) إيقاف الخدمة: نحتفظ بحق تعليق أو إنهاء الحسابات المخالفة أو عند مخاطر أمنية/قانونية.',
          '10) إخلاء المسؤولية: الخدمة تُقدَّم «كما هي». لا نضمن عدم الانقطاع أو ملاءمة المنصة لغرض معيّن خارج ما يفرضه القانون الإلزامي.',
          '11) القانون الواجب: يُحدد لاحقاً في إشعار التشغيل الرسمي للمنصة أو عقد التاجر؛ إلى حينه تُطبق قواعد المنصة وإجراءات النزاع الداخلية أولاً.',
          'تنويه: هذا النص نموذج تشغيلي ويُنصح بمراجعته من محامٍ قبل الإطلاق التجاري العام.',
        ],
      } : {
        title: 'Terms of Use',
        body: [
          `Last updated: ${updated}`,
          'By using the platform you agree to these terms.',
          '1) Service nature: a marketplace for digital products with an internal balance and user-to-user transfers inside the system. The platform is not a bank or licensed payment institution unless expressly stated.',
          '2) Eligibility: you must have legal capacity in your jurisdiction. Minors require guardian consent where required by law.',
          '3) Account: you are responsible for passwords and PIN secrecy. Activity under your account is attributed to you unless you promptly report a compromise.',
          '4) Balance and top-ups: manual or offline top-ups may require admin review. Balances are not externally cashable unless an official withdrawal feature is launched. Proven fraud may lead to suspension and forfeiture of illicit balances.',
          '5) Digital goods: after delivery/download under escrow rules, refunds are not automatic. Disputes are handled through the in-app dispute system.',
          '6) Escrow: purchases above the configured threshold may hold funds until delivery confirmation or dispute resolution. Abuse of disputes may restrict the account.',
          '7) Prohibited content: illegal goods, malware, IP infringement, or any child-exploitation material is forbidden.',
          '8) Merchants: approval may require identity checks, documents, and license fees as published by the platform.',
          '9) Suspension: we may suspend or terminate accounts for violations or security/legal risk.',
          '10) Disclaimer: the service is provided “as is”. We do not guarantee uninterrupted operation beyond mandatory legal duties.',
          '11) Governing rules: platform rules and internal dispute procedures apply until a formal operating jurisdiction notice is published.',
          'Disclaimer: this is an operational template; obtain local legal review before public commercial launch.',
        ],
      };
    }
    // kyc
    return isAr ? {
      title: 'سياسة التحقق من الهوية (KYC) ومكافحة إساءة الاستخدام',
      body: [
        `آخر تحديث: ${updated}`,
        'تهدف هذه السياسة إلى تقليل الاحتيال وغسل الأموال وإساءة استخدام الرصيد الداخلي.',
        '1) المستويات:',
        '• المستوى 0 (أساسي): بريد + كلمة مرور. حدود منخفضة للاستخدام اليومي قد تُفرض إدارياً.',
        '• المستوى 1 (موثّق): تأكيد البريد + بيانات شخصية أساسية مطابقة للحساب.',
        '• المستوى 2 (معزّز): وثيقة هوية سارية وصورة سيلفي/تحقق حي عند الطلب للتجار أو الحدود الأعلى.',
        '2) متى يُطلب KYC: طلبات تاجر، سحب/شحن بمبالغ مرتفعة، نشاط مشبوه، نزاعات متكررة، أو طلب امتثال.',
        '3) المستندات المقبولة (عند الطلب): هوية وطنية / جواز سفر / إقامة سارية، وقد تُطلب فاتورة عنوان حسب الحالة.',
        '4) الرفض: مستندات غير واضحة، بيانات غير مطابقة، أو مؤشرات احتيال تؤدي لرفض التحقق وتعليق الميزات الحساسة.',
        '5) الاحتفاظ: مستندات التحقق تُحفظ لفترة محدودة لأغراض الأمان والامتثال ثم تُحذف أو تُقيَّد الوصول وفق سياسة الاحتفاظ.',
        '6) التحويلات: المنصة قد تحد من التحويل لأسماء مطابقة أو حسابات موثّقة، وتمنع الانتحال وأسماء محجوزة (مثل admin).',
        '7) الإبلاغ: يُرجى إبلاغ الدعم عن أي محاولة احتيال. قد نبلّغ الجهات المختصة عند وجود التزام قانوني.',
        '8) كيف تقدّم التحقق الآن: من الملف الشخصي / الدعم أرسل طلباً بعنوان «KYC» مع نوع الوثيقة وسبب الطلب. سيراجع فريق الإدارة الطلب يدوياً حتى ربط مزوّد تحقق آلي لاحقاً.',
        'تنويه: متطلبات KYC/AML تختلف حسب البلد. هذا إطار تشغيلي للمنصة وليس ترخيصاً مالياً.',
      ],
    } : {
      title: 'KYC / Anti-Abuse Policy',
      body: [
        `Last updated: ${updated}`,
        'This policy reduces fraud, abuse, and misuse of the internal balance.',
        '1) Levels:',
        '• Level 0 (Basic): email + password. Low operational limits may apply.',
        '• Level 1 (Verified): confirmed email + basic identity data matching the account.',
        '• Level 2 (Enhanced): valid ID document and liveness/selfie when requested for merchants or higher limits.',
        '2) When KYC is required: merchant applications, higher top-up/transfer limits, suspicious activity, repeated disputes, or compliance requests.',
        '3) Accepted documents (on request): national ID / passport / residence permit; proof of address may be requested.',
        '4) Rejection: unclear documents, mismatched data, or fraud indicators lead to rejection and restriction of sensitive features.',
        '5) Retention: verification documents are kept only as needed for security/compliance, then deleted or access-restricted.',
        '6) Transfers: the platform may limit transfers to verified accounts and block impersonation or reserved names (e.g. admin).',
        '7) Reporting: report suspected fraud via support. We may notify authorities where legally required.',
        '8) How to submit now: from Profile/Support open a ticket titled “KYC” with document type and purpose. Admins review manually until an automated provider is integrated.',
        'Disclaimer: KYC/AML duties vary by country. This is an operational framework, not a financial license.',
      ],
    };
  }, [section, isAr]);

  const close = () => {
    if (onClose) onClose();
    else setActiveTab('store');
  };

  return (
    <div className="min-h-[70vh] max-w-3xl mx-auto px-4 py-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between gap-3 mb-6">
        <button
          type="button"
          onClick={close}
          className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"
        >
          {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          {isAr ? 'رجوع' : 'Back'}
        </button>
        <div className="inline-flex items-center gap-2 text-[#c9a227]">
          <Scale className="w-5 h-5" />
          <span className="font-semibold">{isAr ? 'المستندات القانونية' : 'Legal'}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSection(t.id)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm border transition ${
              section === t.id
                ? 'bg-[#801428] border-[#801428] text-white'
                : 'border-white/15 text-white/70 hover:border-white/30'
            }`}
          >
            {t.icon}
            {isAr ? t.ar : t.en}
          </button>
        ))}
      </div>

      <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-8 shadow-xl">
        <h1 className="text-2xl font-bold mb-4 text-white">{content.title}</h1>
        <div className="space-y-3 text-sm leading-7 text-white/80">
          {content.body.map((para, idx) => (
            <p key={idx} className="whitespace-pre-wrap">{para}</p>
          ))}
        </div>
        <p className="mt-8 text-xs text-white/40 border-t border-white/10 pt-4">
          {isAr
            ? 'هذه الصفحات للشفافية التشغيلية. للاستشارة القانونية الملزمة راجع محامياً في بلد التشغيل.'
            : 'These pages support operational transparency. For binding legal advice, consult counsel in your operating jurisdiction.'}
        </p>
      </article>
    </div>
  );
};
