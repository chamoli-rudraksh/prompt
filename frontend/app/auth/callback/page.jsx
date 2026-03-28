"use client";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { saveTokens } from "@/lib/auth";

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  bg:         '#07070a',
  surface:    '#0f0f12',
  border:     'rgba(255,255,255,0.07)',
  text:       '#f0f0f2',
  textMuted:  '#44445a',
  accent:     '#f5c842',
  accentDim:  'rgba(245,200,66,0.10)',
  accentGlow: 'rgba(245,200,66,0.3)',
};

const mono  = "'JetBrains Mono','Fira Code',monospace";
const serif = "'Playfair Display',Georgia,serif";

// ─── Grid Background ─────────────────────────────────────────────────────────

function GridBackground() {
  return (
    <div style={S.gridBg} aria-hidden>
      <div style={S.gridH} />
      <div style={S.gridV} />
      <motion.div
        style={{ ...S.orb, ...S.orb1 }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.14, 0.2, 0.14] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

// ─── Callback Inner ───────────────────────────────────────────────────────────

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const accessToken  = params.get("access_token");
    const needsProfile = params.get("needs_profile") === "true";

    if (!accessToken) {
      router.replace("/auth?error=google_failed");
      return;
    }

    try {
      const payload = JSON.parse(atob(accessToken.split(".")[1]));
      const user = {
        id:    payload.sub,
        email: payload.email,
        name:  payload.name || payload.email.split("@")[0],
      };
      saveTokens(accessToken, user);
      router.replace(needsProfile ? "/auth/profile" : "/feed");
    } catch {
      router.replace("/auth?error=google_failed");
    }
  }, []);

  return (
    <div style={S.page}>
      <GridBackground />

      <motion.div
        style={S.centerWrap}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Spinner ring */}
        <div style={S.ringWrap}>
          <motion.div
            style={S.ring}
            animate={{ rotate: 360 }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            style={S.ringInner}
            animate={{ rotate: -360 }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
          />
          <div style={S.logo}>
            ET<span style={{ color: C.accent }}>AI</span>
          </div>
        </div>

        {/* Labels */}
        <motion.div
          style={S.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Signing you in
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.2 }}
          >...</motion.span>
        </motion.div>

        <motion.p
          style={S.sublabel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
        >
          Verifying your Google credentials
        </motion.p>

        {/* Animated progress bar */}
        <motion.div style={S.barWrap}>
          <motion.div
            style={S.barFill}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 2.5, ease: [0.22, 1, 0.36, 1] }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: '100vh', background: C.bg,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: mono, position: 'relative',
  },
  gridBg: { position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' },
  gridH: {
    position: 'absolute', inset: 0,
    backgroundImage: `linear-gradient(${C.border} 1px, transparent 1px)`,
    backgroundSize: '100% 64px',
    maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black, transparent)',
    WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black, transparent)',
  },
  gridV: {
    position: 'absolute', inset: 0,
    backgroundImage: `linear-gradient(90deg, ${C.border} 1px, transparent 1px)`,
    backgroundSize: '64px 100%',
    maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black, transparent)',
    WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black, transparent)',
  },
  orb: { position: 'absolute', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' },
  orb1: {
    width: 600, height: 600,
    background: 'radial-gradient(circle, rgba(245,200,66,0.15) 0%, transparent 70%)',
    top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
  },

  centerWrap: {
    position: 'relative', zIndex: 1,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '1.25rem',
  },

  ringWrap: {
    position: 'relative', width: 88, height: 88,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  ring: {
    position: 'absolute', inset: 0, borderRadius: '50%',
    border: '1.5px solid transparent',
    borderTopColor: C.accent,
    borderRightColor: `${C.accent}55`,
  },
  ringInner: {
    position: 'absolute', inset: 10, borderRadius: '50%',
    border: '1px solid transparent',
    borderBottomColor: `${C.accent}44`,
    borderLeftColor: `${C.accent}22`,
  },
  logo: {
    fontFamily: serif, fontSize: '1.4rem', fontWeight: 700,
    color: C.text, letterSpacing: '-0.03em',
  },

  label: {
    fontSize: '0.82rem', textTransform: 'uppercase',
    letterSpacing: '0.14em', color: C.text,
    fontFamily: mono,
  },
  sublabel: {
    fontSize: '0.6rem', textTransform: 'uppercase',
    letterSpacing: '0.12em', color: C.textMuted,
    fontFamily: mono, margin: 0,
  },

  barWrap: {
    width: 180, height: 1, background: C.border,
    borderRadius: 99, overflow: 'hidden', marginTop: 8,
  },
  barFill: {
    height: '100%', width: '100%',
    background: `linear-gradient(90deg, ${C.accent}, #ffaa00)`,
    transformOrigin: 'left',
    boxShadow: `0 0 10px ${C.accentGlow}`,
  },
};

// ─── Export ───────────────────────────────────────────────────────────────────

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: mono, fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.textMuted }}>
          Loading...
        </div>
      </div>
    }>
      <CallbackInner />
    </Suspense>
  );
}