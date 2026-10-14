import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { Language } from '../types';
import { useStore } from '../context/StoreContext';

interface OpeningGlobeProps {
  language?: Language;
  onEnter?: () => void;
  onLanguageToggle?: () => void;
}

export const OpeningGlobe: React.FC<OpeningGlobeProps> = ({
  language: propLanguage,
  onEnter,
  onLanguageToggle,
}) => {
  const store = useStore();
  const language = propLanguage || store?.language || 'ar';
  const handleToggle = onLanguageToggle || store?.toggleLanguage;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isEntering, setIsEntering] = useState(false);
  const [step, setStep] = useState<'globe' | 'intro' | 'brand'>('globe');

  const isAr = language === 'ar';

  useEffect(() => {
    // Step progression for clean cinematic pacing
    const t1 = setTimeout(() => setStep('intro'), 900);
    const t2 = setTimeout(() => setStep('brand'), 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    // Mathematical 3D Sphere Points
    const numPoints = Math.min(width < 768 ? 480 : 780, 850);
    const globeRadius = Math.min(width, height) * (width < 768 ? 0.36 : 0.28);
    const points: { x: number; y: number; z: number; size: number; alpha: number }[] = [];

    // Fibonacci sphere distribution for uniform luxury density
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle
    for (let i = 0; i < numPoints; i++) {
      const y = 1 - (i / (numPoints - 1)) * 2; // y goes from 1 to -1
      const radiusAtY = Math.sqrt(1 - y * y); // radius at y
      const theta = phi * i; // golden angle increment

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      // Filter some latitude bands to vaguely simulate continents / oceans rhythm
      const continentFactor = Math.sin(x * 5) * Math.cos(z * 4) + Math.sin(y * 3);
      const isLand = continentFactor > -0.2;

      points.push({
        x: x * globeRadius,
        y: y * globeRadius,
        z: z * globeRadius,
        size: isLand ? 1.6 : 1.0,
        alpha: isLand ? 0.85 : 0.28,
      });
    }

    // Interactive Hub nodes (Cities / Delivery Hubs)
    const hubs = [
      { lat: 0.42, lon: 0.78, name: 'Riyadh' },
      { lat: 0.55, lon: 0.12, name: 'London' },
      { lat: 0.61, lon: -1.2, name: 'New York' },
      { lat: 0.38, lon: 2.2, name: 'Tokyo' },
      { lat: 0.18, lon: 1.8, name: 'Singapore' },
      { lat: 0.45, lon: 0.95, name: 'Dubai' },
    ];

    // Data flow pulses between hubs
    const arcs: {
      fromIdx: number;
      toIdx: number;
      progress: number;
      speed: number;
      color: string;
    }[] = [
      { fromIdx: 0, toIdx: 5, progress: 0.1, speed: 0.007, color: '#c5a059' }, // Riyadh -> Dubai
      { fromIdx: 5, toIdx: 1, progress: 0.4, speed: 0.005, color: '#801428' }, // Dubai -> London
      { fromIdx: 1, toIdx: 2, progress: 0.7, speed: 0.006, color: '#e5c158' }, // London -> New York
      { fromIdx: 0, toIdx: 4, progress: 0.2, speed: 0.0065, color: '#991b32' }, // Riyadh -> Singapore
    ];

    let rotationY = 0;
    let rotationX = 0.25;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      rotationY += 0.0035;

      const centerX = width / 2;
      const centerY = height / 2 - (width < 768 ? 40 : 0);

      // Subtle globe backglow
      const radialGlow = ctx.createRadialGradient(
        centerX,
        centerY,
        globeRadius * 0.2,
        centerX,
        centerY,
        globeRadius * 1.35
      );
      radialGlow.addColorStop(0, 'rgba(128, 20, 40, 0.08)');
      radialGlow.addColorStop(0.65, 'rgba(197, 160, 89, 0.03)');
      radialGlow.addColorStop(1, 'rgba(11, 13, 16, 0)');
      ctx.fillStyle = radialGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, globeRadius * 1.4, 0, Math.PI * 2);
      ctx.fill();

      // Project and draw sphere points
      const cosY = Math.cos(rotationY);
      const sinY = Math.sin(rotationY);
      const cosX = Math.cos(rotationX);
      const sinX = Math.sin(rotationX);

      // Transform hubs
      const transformedHubs: { x: number; y: number; z: number; visible: boolean }[] = [];
      hubs.forEach((hub) => {
        const phiAngle = (90 - hub.lat * 90) * (Math.PI / 180);
        const thetaAngle = (hub.lon * 180) * (Math.PI / 180);

        const hx = globeRadius * Math.sin(phiAngle) * Math.cos(thetaAngle);
        const hy = globeRadius * Math.cos(phiAngle);
        const hz = globeRadius * Math.sin(phiAngle) * Math.sin(thetaAngle);

        const rx = hx * cosY + hz * sinY;
        const rz = -hx * sinY + hz * cosY;
        const ry = hy * cosX - rz * sinX;
        const rzFinal = hy * sinX + rz * cosX;

        transformedHubs.push({
          x: centerX + rx,
          y: centerY + ry,
          z: rzFinal,
          visible: rzFinal > -globeRadius * 0.2,
        });
      });

      // Draw connections & pulses
      arcs.forEach((arc) => {
        arc.progress = (arc.progress + arc.speed) % 1;
        const p1 = transformedHubs[arc.fromIdx];
        const p2 = transformedHubs[arc.toIdx];
        if (p1 && p2 && p1.visible && p2.visible) {
          // Arc line
          ctx.beginPath();
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2 - 25;
          ctx.moveTo(p1.x, p1.y);
          ctx.quadraticCurveTo(midX, midY, p2.x, p2.y);
          ctx.strokeStyle = 'rgba(197, 160, 89, 0.18)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Traveling pulse particle
          const t = arc.progress;
          const pulseX = (1 - t) * (1 - t) * p1.x + 2 * (1 - t) * t * midX + t * t * p2.x;
          const pulseY = (1 - t) * (1 - t) * p1.y + 2 * (1 - t) * t * midY + t * t * p2.y;

          ctx.beginPath();
          ctx.arc(pulseX, pulseY, 2.4, 0, Math.PI * 2);
          ctx.fillStyle = arc.color;
          ctx.shadowColor = arc.color;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0; // reset
        }
      });

      // Draw globe dot points with depth sorting
      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        // Rotate Y
        const x1 = pt.x * cosY + pt.z * sinY;
        const z1 = -pt.x * sinY + pt.z * cosY;
        // Rotate X
        const y1 = pt.y * cosX - z1 * sinX;
        const zFinal = pt.y * sinX + z1 * cosX;

        // Perspective scale
        const scale = (zFinal + globeRadius * 1.5) / (globeRadius * 2.5);
        if (scale <= 0.05) continue;

        const projX = centerX + x1;
        const projY = centerY + y1;

        const isFront = zFinal > 0;
        const alpha = Math.max(0.04, Math.min(1, pt.alpha * scale * (isFront ? 1 : 0.35)));

        ctx.beginPath();
        ctx.arc(projX, projY, Math.max(0.6, pt.size * scale), 0, Math.PI * 2);

        if (isFront && (i % 25 === 0)) {
          // Occasional champagne gold active nodes
          ctx.fillStyle = `rgba(197, 160, 89, ${alpha})`;
        } else if (isFront && (i % 38 === 0)) {
          // Occasional deep burgundy active nodes
          ctx.fillStyle = `rgba(128, 20, 40, ${alpha})`;
        } else {
          ctx.fillStyle = `rgba(220, 224, 233, ${alpha * 0.75})`;
        }
        ctx.fill();
      }

      // Draw Hub markers
      transformedHubs.forEach((hub) => {
        if (!hub.visible) return;
        ctx.beginPath();
        ctx.arc(hub.x, hub.y, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = '#c5a059';
        ctx.fill();

        // Pulsing ring around hub
        ctx.beginPath();
        ctx.arc(hub.x, hub.y, 6.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(197, 160, 89, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleEnterClick = () => {
    setIsEntering(true);
    if (store?.setHasSeenIntro) {
      store.setHasSeenIntro(true);
    }
    setTimeout(() => {
      if (onEnter) {
        onEnter();
      }
    }, 600);
  };

  return (
    <div
      id="opening-globe-container"
      className="fixed inset-0 z-50 flex flex-col justify-between items-center bg-[#0b0d10] text-[#f7f7f9] overflow-hidden select-none transition-opacity duration-700"
      style={{ opacity: isEntering ? 0 : 1 }}
    >
      {/* Top minimal header: Language & Skip controls */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#801428] to-[#450a16] border border-[#c5a059]/30 flex items-center justify-center shadow-lg shadow-[#801428]/20">
            <ShieldCheck className="w-5 h-5 text-[#c5a059]" />
          </div>
          <span className="font-semibold tracking-wide text-sm text-[#f7f7f9]/90">
            DIGITAL<span className="text-[#c5a059]">STORE</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleToggle}
            className="px-3.5 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-white/80 transition-all cursor-pointer"
            aria-label="Toggle language"
          >
            {isAr ? 'English' : 'العربية'}
          </button>
          <button
            onClick={handleEnterClick}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            {isAr ? 'تخطي' : 'Skip Intro'}
          </button>
        </div>
      </header>

      {/* 3D WebGL / Canvas Container */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Foreground Typography & Interactive Content */}
      <main className="relative z-20 w-full max-w-4xl mx-auto px-6 pb-12 flex flex-col items-center text-center">
        <AnimatePresence>
          {step === 'intro' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.8 }}
              className="mb-8 space-y-2"
            >
              <h1 className="text-xl sm:text-2xl md:text-3xl font-light tracking-wide text-[#f7f7f9]/90">
                {isAr ? 'أهلاً بك في عالم رقمي بلا حدود' : 'Welcome to a world without borders.'}
              </h1>
              <p className="text-xs sm:text-sm text-[#c5a059] tracking-wider uppercase">
                {isAr ? 'اكتشف • تواصل • حوّل • استلم' : 'Discover • Connect • Transfer • Receive'}
              </p>
            </motion.div>
          )}

          {step === 'brand' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className="flex flex-col items-center space-y-6"
            >
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#c5a059]/25 bg-[#801428]/20 backdrop-blur-md text-[#c5a059] text-xs mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isAr ? 'منصة التبادل والتجارة الرقمية المعتمدة' : 'Verified Digital Commerce Platform'}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
                  {isAr ? 'متجرك الرقمي.. مبني على الثقة' : 'Your digital marketplace, built around trust.'}
                </h2>
                <p className="text-xs sm:text-sm text-white/60 max-w-md mx-auto leading-relaxed">
                  {isAr
                    ? 'تسوق المنتجات الرقمية الاحترافية، أدر محفظتك بدقة عبر قيود مالية Ledger غير قابلة للتلاعب، وحوّل الأرصدة بإيصالات رسمية موثقة.'
                    : 'Discover vetted enterprise digital assets, manage coin balances on an immutable double-entry ledger, and transfer funds with cryptographic receipt verification.'}
                </p>
              </div>

              {/* Action Button: Deep Burgundy + Champagne Gold */}
              <button
                id="enter-store-btn"
                onClick={handleEnterClick}
                disabled={isEntering}
                className="group relative inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-[#801428] via-[#651020] to-[#801428] border border-[#c5a059]/40 hover:border-[#c5a059] shadow-xl shadow-[#801428]/30 hover:shadow-[#801428]/50 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-50"
              >
                <span className="tracking-wide">
                  {isAr ? 'دخول المنصة والمتجر' : 'Enter Store & Platform'}
                </span>
                {isAr ? (
                  <ArrowLeft className="w-4 h-4 text-[#c5a059] transition-transform group-hover:-translate-x-1" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-[#c5a059] transition-transform group-hover:translate-x-1" />
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Subtle bottom footer info */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-[11px] text-white/35 z-20">
        <span>© 2026 DigitalStore Infrastructure. All rights reserved.</span>
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {isAr ? 'الأنظمة المالية وقواعد Ledger تعمل بكفاءة' : 'Ledger Core 100% Operational'}
        </span>
      </footer>
    </div>
  );
};
