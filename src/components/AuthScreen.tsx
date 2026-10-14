import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  User as UserIcon,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Globe,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Zap,
  KeyRound,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const AuthScreen: React.FC = () => {
  const {
    language,
    toggleLanguage,
    login,
    register,
    replayIntro,
  } = useStore();

  const isAr = language === 'ar';

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);

  // Login form state
  const [loginStep, setLoginStep] = useState<'credentials' | 'pin'>('credentials');
  const [hasPinSetup, setHasPinSetup] = useState(true);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [enteredPin, setEnteredPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPin, setRegPin] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!loginIdentifier.trim()) {
      setErrorMessage(isAr ? 'يرجى إدخال البريد الإلكتروني أو اسم المستخدم.' : 'Please enter your email or username.');
      return;
    }
    if (!loginPassword) {
      setErrorMessage(isAr ? 'يرجى إدخال كلمة المرور.' : 'Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(loginIdentifier.trim(), loginPassword);
      if (res.requiresPin) {
        setHasPinSetup(Boolean(res.hasPinSetup));
        setLoginStep('pin');
        setEnteredPin('');
        setConfirmPin('');
        setErrorMessage(null);
      } else if (!res.success) {
        setErrorMessage(res.message || (isAr ? 'بيانات الدخول غير صحيحة.' : 'Invalid credentials.'));
      }
    } catch (err: any) {
      setErrorMessage(err?.message || (isAr ? 'حدث خطأ أثناء تسجيل الدخول.' : 'Login failed.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!hasPinSetup) {
      if (enteredPin.length < 4 || enteredPin.length > 6) {
        setErrorMessage(isAr ? 'يجب أن يتكون رمز PIN من 4 إلى 6 أرقام.' : 'PIN must be 4 to 6 digits.');
        return;
      }
      if (enteredPin !== confirmPin) {
        setErrorMessage(isAr ? 'رمزا PIN غير متطابقين.' : 'PIN codes do not match.');
        return;
      }
    } else {
      if (!enteredPin || enteredPin.length < 4) {
        setErrorMessage(isAr ? 'يرجى إدخال رمز PIN المكون من 4 إلى 6 أرقام.' : 'Please enter your PIN (4-6 digits).');
        return;
      }
    }

    setIsLoading(true);
    try {
      const res = await login(loginIdentifier.trim(), loginPassword, enteredPin);
      if (!res.success) {
        setErrorMessage(res.message || (isAr ? 'رمز PIN غير صحيح.' : 'Incorrect PIN.'));
      }
    } catch (err: any) {
      setErrorMessage(err?.message || (isAr ? 'فشل التحقق من رمز PIN.' : 'PIN verification failed.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!regFullName.trim()) {
      setErrorMessage(isAr ? 'يرجى إدخال اسمك الكامل.' : 'Please enter your full name.');
      return;
    }
    if (!regUsername.trim()) {
      setErrorMessage(isAr ? 'يرجى اختيار اسم مستخدم فريد.' : 'Please choose a unique username.');
      return;
    }
    if (!regEmail.trim()) {
      setErrorMessage(isAr ? 'يرجى إدخال البريد الإلكتروني.' : 'Please enter your email.');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setErrorMessage(isAr ? 'يجب أن لا تقل كلمة المرور عن 6 أحرف.' : 'Password must be at least 6 characters.');
      return;
    }
    if (regPin && !/^\d{4,6}$/.test(regPin)) {
      setErrorMessage(isAr ? 'يجب أن يتكون رمز PIN للتحويلات من 4 إلى 6 أرقام.' : 'Transfer PIN must be 4 to 6 digits.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await register(regFullName.trim(), regUsername.trim(), regEmail.trim(), regPassword, regPin);
      if (!res.success) {
        setErrorMessage(res.message || (isAr ? 'فشل إنشاء الحساب.' : 'Registration failed.'));
      } else {
        setSuccessMessage(isAr ? 'تم إنشاء الحساب وحفظ رمز PIN بنجاح!' : 'Account registered with Transfer PIN successfully!');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || (isAr ? 'حدث خطأ أثناء التسجيل.' : 'Registration error.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="mandatory-auth-screen"
      className="min-h-screen w-full bg-[#0b0d10] text-[#f7f7f9] flex flex-col justify-between relative overflow-hidden select-none"
    >
      {/* Ambient background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#801428]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#c5a059]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-b from-[#801428]/10 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#801428] to-[#450a16] border border-[#c5a059]/40 flex items-center justify-center shadow-lg shadow-[#801428]/30">
            <ShieldCheck className="w-5 h-5 text-[#c5a059]" />
          </div>
          <div>
            <span className="text-base font-bold text-white tracking-wide block">
              {isAr ? 'المتجر الرقمي الموحد' : 'DigitalStore Vault'}
            </span>
            <span className="text-[10px] text-[#c5a059] block font-mono">
              {isAr ? 'قاعدة بيانات سحابية متصلة بالكامل' : 'Unified Real-Time Database'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={replayIntro}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-white/70 hover:text-white transition-all cursor-pointer"
            title={isAr ? 'إعادة مشاهدة الكرة الأرضية' : 'Replay 3D Globe'}
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#c5a059]" />
            <span className="hidden sm:inline">{isAr ? 'الكرة 3D' : '3D Globe'}</span>
          </button>

          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-white/80 hover:text-white transition-all cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-[#c5a059]" />
            <span>{isAr ? 'English' : 'العربية'}</span>
          </button>
        </div>
      </header>

      {/* Center Auth Card */}
      <main className="relative z-10 w-full max-w-md mx-auto px-4 py-8 flex flex-col items-center">
        <div className="w-full rounded-3xl bg-[#0f1318]/90 backdrop-blur-xl border border-[#801428]/40 shadow-2xl shadow-black/80 p-6 sm:p-8 space-y-6">
          
          {/* Card Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#801428]/30 border border-[#c5a059]/30 text-[#c5a059] text-[11px] font-semibold">
              <Sparkles className="w-3 h-3 text-[#c5a059]" />
              <span>{isAr ? 'تسجيل دخول إجباري للوصول للمنصة' : 'Mandatory Account Access'}</span>
            </div>

            <h2 className="text-2xl font-bold text-white tracking-tight">
              {authMode === 'login'
                ? isAr ? 'تسجيل الدخول إلى حسابك' : 'Sign In to Your Account'
                : isAr ? 'إنشاء حساب شخصي جديد' : 'Create a New Account'}
            </h2>
            <p className="text-xs text-white/50 max-w-xs mx-auto">
              {isAr
                ? 'حسابك يرتبط مباشرة بقاعدة البيانات السحابية ويتيح لك التحويل والشراء الفوري'
                : 'Your individual account is bound to the central database for instant transfers.'}
            </p>
          </div>

          {/* Mode Tabs / PIN Step Header */}
          {authMode === 'login' && loginStep === 'pin' ? (
            <div className="flex items-center justify-between p-2 rounded-2xl bg-white/5 border border-white/10 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#c5a059]/20 border border-[#c5a059]/40 flex items-center justify-center text-[#c5a059]">
                  <KeyRound className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[10px] text-white/40">{isAr ? 'الخطوة 2 من 2' : 'Step 2 of 2'}</div>
                  <div className="font-bold text-white text-xs">{isAr ? 'التحقق برمز PIN' : 'PIN Authorization'}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLoginStep('credentials');
                  setEnteredPin('');
                  setConfirmPin('');
                  setErrorMessage(null);
                }}
                className="px-2.5 py-1 rounded-lg text-[11px] text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              >
                {isAr ? 'تغيير الحساب' : 'Change Account'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/5 border border-white/10 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setLoginStep('credentials');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2 rounded-xl transition-all cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-gradient-to-r from-[#801428] to-[#590e1c] text-white shadow-md'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {isAr ? 'تسجيل الدخول' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2 rounded-xl transition-all cursor-pointer ${
                  authMode === 'register'
                    ? 'bg-gradient-to-r from-[#801428] to-[#590e1c] text-white shadow-md'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {isAr ? 'إنشاء حساب جديد' : 'Create Account'}
              </button>
            </div>
          )}

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* LOGIN FORM (STEP 1: CREDENTIALS) */}
          {authMode === 'login' && loginStep === 'credentials' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70 block">
                  {isAr ? 'البريد الإلكتروني أو اسم المستخدم:' : 'Email or Username:'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 ltr:left-3.5 rtl:right-3.5 flex items-center pointer-events-none text-white/30">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder={isAr ? 'example@mail.com أو username' : 'email or username'}
                    required
                    className="w-full bg-[#141820] border border-white/10 rounded-xl ltr:pl-10 rtl:pr-10 pr-3.5 pl-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#c5a059]/60 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-white/70">
                    {isAr ? 'كلمة المرور:' : 'Password:'}
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 ltr:left-3.5 rtl:right-3.5 flex items-center pointer-events-none text-white/30">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-[#141820] border border-white/10 rounded-xl ltr:pl-10 rtl:pr-10 ltr:pr-10 rtl:pl-10 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#c5a059]/60 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 ltr:right-3 rtl:left-3 flex items-center text-white/40 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#801428] via-[#991b32] to-[#6b0f20] border border-[#c5a059]/50 hover:border-[#c5a059] shadow-lg shadow-[#801428]/30 hover:shadow-[#801428]/50 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{isAr ? 'متابعة وإدخال رمز PIN' : 'Continue to PIN'}</span>
                    {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </>
                )}
              </button>
            </form>
          )}

          {/* LOGIN PIN FORM (STEP 2: PIN) */}
          {authMode === 'login' && loginStep === 'pin' && (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-[#c5a059]/30 text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[#c5a059]/10 border border-[#c5a059]/40 flex items-center justify-center text-[#c5a059] shadow-inner">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {hasPinSetup
                      ? (isAr ? 'أدخل رمز PIN لتأكيد الدخول' : 'Enter Security PIN')
                      : (isAr ? 'تعيين رمز PIN للتحويلات' : 'Set Up Transfer PIN')}
                  </h3>
                  <p className="text-[11px] text-white/50 max-w-xs mx-auto mt-1 leading-relaxed">
                    {hasPinSetup
                      ? (isAr
                          ? 'رمز PIN هذا مخصص لحسابك ويُستخدم لتأكيد الدخول والتحويلات المالية.'
                          : 'This PIN authorizes your login and confirms any financial transfers.')
                      : (isAr
                          ? 'اختر رمز PIN جديداً (4 إلى 6 أرقام). سيُطلب منك هذا الرمز لتأكيد أي تحويل مالي لاحقاً.'
                          : 'Choose a 4-6 digit PIN. This PIN will be required to confirm financial transfers later.')}
                  </p>
                </div>
              </div>

              {hasPinSetup ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/70 block text-center">
                    {isAr ? 'رمز PIN السري (4 إلى 6 أرقام):' : 'Security PIN (4-6 digits):'}
                  </label>
                  <div className="flex justify-center">
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoFocus
                      value={enteredPin}
                      onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="••••"
                      maxLength={6}
                      required
                      className="w-48 bg-[#141820] border-2 border-[#c5a059]/40 focus:border-[#c5a059] rounded-2xl py-3 text-center text-2xl tracking-[0.4em] font-mono text-white focus:outline-none shadow-lg shadow-[#c5a059]/10"
                    />
                  </div>
                  <div className="text-[11px] text-white/40 text-center font-mono">
                    {enteredPin.length > 0 ? `${enteredPin.length} / 6` : (isAr ? 'أدخل الأرقام' : 'enter digits')}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/70 block">
                      {isAr ? 'رمز PIN الجديد (4 إلى 6 أرقام):' : 'New PIN (4-6 digits):'}
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoFocus
                      value={enteredPin}
                      onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="••••"
                      maxLength={6}
                      required
                      className="w-full bg-[#141820] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-center tracking-widest font-mono text-white focus:outline-none focus:border-[#c5a059]/60"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/70 block">
                      {isAr ? 'تأكيد رمز PIN الجديد:' : 'Confirm New PIN:'}
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="••••"
                      maxLength={6}
                      required
                      className="w-full bg-[#141820] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-center tracking-widest font-mono text-white focus:outline-none focus:border-[#c5a059]/60"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || enteredPin.length < 4}
                className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#801428] via-[#991b32] to-[#6b0f20] border border-[#c5a059]/50 hover:border-[#c5a059] shadow-lg shadow-[#801428]/30 hover:shadow-[#801428]/50 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-[#c5a059]" />
                    <span>
                      {hasPinSetup
                        ? (isAr ? 'تأكيد رمز PIN ودخول المنصة' : 'Verify PIN & Enter')
                        : (isAr ? 'حفظ رمز PIN ودخول المنصة' : 'Save PIN & Enter')}
                    </span>
                    {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginStep('credentials');
                  setEnteredPin('');
                  setConfirmPin('');
                  setErrorMessage(null);
                }}
                className="w-full py-2 text-xs text-white/50 hover:text-white text-center transition-colors cursor-pointer"
              >
                {isAr ? 'الرجوع لتعديل كلمة المرور' : 'Back to credentials'}
              </button>
            </form>
          )}

          {/* REGISTER FORM */}
          {authMode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/70 block">
                  {isAr ? 'الاسم الكامل:' : 'Full Name:'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 ltr:left-3.5 rtl:right-3.5 flex items-center pointer-events-none text-white/30">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder={isAr ? 'مثال: محمد السعيد' : 'e.g. John Doe'}
                    required
                    className="w-full bg-[#141820] border border-white/10 rounded-xl ltr:pl-10 rtl:pr-10 pr-3.5 pl-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#c5a059]/60"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/70 block">
                  {isAr ? 'اسم المستخدم الفريد:' : 'Unique Username:'}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 ltr:left-3.5 rtl:right-3.5 flex items-center pointer-events-none text-white/30 font-mono text-xs">
                    @
                  </span>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="khalid_tech"
                    required
                    className="w-full bg-[#141820] border border-white/10 rounded-xl ltr:pl-8 rtl:pr-8 pr-3.5 pl-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#c5a059]/60"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/70 block">
                  {isAr ? 'البريد الإلكتروني:' : 'Email Address:'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 ltr:left-3.5 rtl:right-3.5 flex items-center pointer-events-none text-white/30">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                    className="w-full bg-[#141820] border border-white/10 rounded-xl ltr:pl-10 rtl:pr-10 pr-3.5 pl-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#c5a059]/60"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/70 block">
                  {isAr ? 'كلمة المرور:' : 'Password:'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 ltr:left-3.5 rtl:right-3.5 flex items-center pointer-events-none text-white/30">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-[#141820] border border-white/10 rounded-xl ltr:pl-10 rtl:pr-10 ltr:pr-10 rtl:pl-10 py-2.5 text-xs text-white focus:outline-none focus:border-[#c5a059]/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 ltr:right-3 rtl:left-3 flex items-center text-white/40 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-white/70">
                    {isAr ? 'رمز PIN للتحويلات (4 إلى 6 أرقام):' : 'Transfer PIN (4-6 digits):'}
                  </label>
                  <span className="text-[10px] text-[#c5a059] font-mono">{isAr ? 'لتأكيد التحويلات' : 'for transfers'}</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 ltr:left-3.5 rtl:right-3.5 flex items-center pointer-events-none text-white/30">
                    <KeyRound className="w-4 h-4 text-[#c5a059]" />
                  </div>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={regPin}
                    onChange={(e) => setRegPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••"
                    maxLength={6}
                    required
                    className="w-full bg-[#141820] border border-white/10 rounded-xl ltr:pl-10 rtl:pr-10 ltr:pr-10 rtl:pl-10 py-2.5 text-xs text-white tracking-widest font-mono focus:outline-none focus:border-[#c5a059]/60"
                  />
                </div>
                <p className="text-[10px] text-white/40">
                  {isAr ? 'سيُطلب منك هذا الرمز عند تسجيل الدخول وعند إجراء أي تحويل مالي.' : 'You will use this PIN during login and to confirm transfers.'}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-white/50 leading-relaxed">
                {isAr
                  ? 'تبدأ الحسابات الجديدة برصيد 0 كوينز وتعتمد على التحويلات والشحن الفعلي. يتم ربط حسابك بقاعدة البيانات الموحدة فوراً.'
                  : 'New accounts start with 0.00 Coins balance. All users are synchronized across the unified central database.'}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#801428] via-[#991b32] to-[#6b0f20] border border-[#c5a059]/50 hover:border-[#c5a059] shadow-lg shadow-[#801428]/30 hover:shadow-[#801428]/50 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{isAr ? 'إنشاء الحساب ودخول المنصة' : 'Create Account & Enter'}</span>
                    {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </>
                )}
              </button>
            </form>
          )}

          {/* Unified Database Notice */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-center gap-2 text-center text-[11px] text-white/40">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              {isAr
                ? 'قاعدة بيانات Supabase متصلة بين المستخدمين'
                : 'Connected to the shared Supabase database'}
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full text-center py-4 text-[11px] text-white/30 font-mono">
        {isAr
          ? 'نظام المتجر الرقمي الموحد • تشفير القيد المزدوج المالي'
          : 'DigitalStore Vault • Double-Entry Cryptographic Ledger'}
      </footer>
    </div>
  );
};
