"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch, getUser, saveTokens, getAccessToken } from "@/lib/auth";

// ─── Backend (untouched) ──────────────────────────────────────────────────────

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};

const API = getApiUrl();
const PERSONAS = ["Investor", "Founder", "Student", "Professional"];
const TOPICS = ["Markets","Startups","Policy","Technology","Economy","Banking","Energy","Geopolitics"];

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  bg:         '#07070a',
  surface:    '#0f0f12',
  surfaceHigh:'#161619',
  border:     'rgba(255,255,255,0.07)',
  text:       '#f0f0f2',
  textSec:    '#8a8a9a',
  textMuted:  '#44445a',
  accent:     '#f5c842',
  accentDim:  'rgba(245,200,66,0.10)',
  accentGlow: 'rgba(245,200,66,0.3)',
  error:      'rgba(239,68,68,0.12)',
  errorText:  '#fca5a5',
};

const mono  = "'JetBrains Mono','Fira Code',monospace";
const serif = "'Playfair Display',Georgia,serif";
const sans  = "'DM Sans',system-ui,sans-serif";

// ─── Grid Background ─────────────────────────────────────────────────────────

function GridBackground() {
  return (
    <div style={S.gridBg} aria-hidden>
      <div style={S.gridH} />
      <div style={S.gridV} />
      <motion.div
        style={{ ...S.orb, ...S.orb1 }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.14, 0.2, 0.14] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div style={{ ...S.orb, ...S.orb2 }} />
    </div>
  );
}

// ─── Profile Page ─────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const user = getUser();
  const [persona, setPersona] = useState("");
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleInterest(t) {
    const tl = t.toLowerCase();
    setInterests((prev) => prev.includes(tl) ? prev.filter((i) => i !== tl) : [...prev, tl]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!persona) { setError("Pick a persona"); return; }
    if (!interests.length) { setError("Pick at least one topic"); return; }

    setLoading(true);
    try {
      const res = await apiFetch(`${API}/auth/update-profile`, {
        method: "POST",
        body: JSON.stringify({ persona, interests }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Failed"); return; }

      const token = await getAccessToken();
      const refresh = localStorage.getItem("refresh_token");
      saveTokens(token, refresh, data.user);
      router.push("/feed");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div style={S.page}>
      <GridBackground />

      <motion.div
        style={S.card}
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Header */}
        <div style={S.header}>
          <div style={S.logo}>ET<span style={{ color: C.accent }}>AI</span></div>
          <motion.h1
            style={S.greeting}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Welcome, {firstName}
          </motion.h1>
          <motion.p
            style={S.greetingSub}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            Tell us about yourself to personalise your feed
          </motion.p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Persona */}
          <motion.div
            style={{ marginBottom: 24 }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <label style={S.fieldLabel}>I am a...</label>
            <div style={S.personaGrid}>
              {PERSONAS.map((p) => {
                const active = persona === p.toLowerCase();
                return (
                  <motion.button
                    type="button"
                    key={p}
                    onClick={() => { setPersona(p.toLowerCase()); setError(""); }}
                    style={{ ...S.personaBtn, ...(active ? S.personaBtnActive : {}) }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {p}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Topics */}
          <motion.div
            style={{ marginBottom: 24 }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.52 }}
          >
            <div style={S.topicsHeader}>
              <label style={S.fieldLabel}>Topics I follow</label>
              {interests.length > 0 && (
                <span style={S.topicsCount}>{interests.length} selected</span>
              )}
            </div>
            <div style={S.topicsWrap}>
              {TOPICS.map((t) => {
                const active = interests.includes(t.toLowerCase());
                return (
                  <motion.button
                    type="button"
                    key={t}
                    onClick={() => { toggleInterest(t); setError(""); }}
                    style={{ ...S.topicChip, ...(active ? S.topicChipActive : {}) }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {t}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                style={S.errorBox}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
          >
            <motion.button
              type="submit"
              disabled={loading}
              style={{ ...S.submitBtn, ...(loading ? S.submitBtnDisabled : {}) }}
              whileHover={!loading ? { scale: 1.02 } : {}}
              whileTap={!loading ? { scale: 0.97 } : {}}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <motion.span
                    style={S.spinner}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  Saving...
                </span>
              ) : "Start reading →"}
            </motion.button>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: '100vh', background: C.bg,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16, fontFamily: sans, position: 'relative',
  },
  gridBg: { position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' },
  gridH: {
    position: 'absolute', inset: 0,
    backgroundImage: `linear-gradient(${C.border} 1px, transparent 1px)`,
    backgroundSize: '100% 64px',
    maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent)',
    WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent)',
  },
  gridV: {
    position: 'absolute', inset: 0,
    backgroundImage: `linear-gradient(90deg, ${C.border} 1px, transparent 1px)`,
    backgroundSize: '64px 100%',
    maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent)',
    WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent)',
  },
  orb: { position: 'absolute', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' },
  orb1: {
    width: 600, height: 600,
    background: 'radial-gradient(circle, rgba(245,200,66,0.18) 0%, transparent 70%)',
    top: -250, left: '50%', transform: 'translateX(-50%)',
  },
  orb2: {
    width: 300, height: 300,
    background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)',
    bottom: '5%', right: '-5%',
  },

  card: {
    position: 'relative', zIndex: 1,
    background: C.surface,
    borderRadius: 16,
    border: `1px solid ${C.border}`,
    padding: '40px 44px',
    width: '100%', maxWidth: 480,
    boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
  },

  header: { textAlign: 'center', marginBottom: 32 },
  logo: { fontFamily: serif, fontSize: '1.6rem', fontWeight: 700, color: C.text, letterSpacing: '-0.03em', marginBottom: 16 },
  greeting: { fontFamily: serif, fontSize: '1.5rem', fontWeight: 700, color: C.text, letterSpacing: '-0.02em', margin: '0 0 8px' },
  greetingSub: { fontFamily: mono, fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: C.textMuted, margin: 0 },

  fieldLabel: {
    fontFamily: mono, fontSize: '0.6rem',
    textTransform: 'uppercase', letterSpacing: '0.1em',
    color: C.textSec, display: 'block', marginBottom: 10,
  },

  personaGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  personaBtn: {
    padding: '12px 14px', borderRadius: 8,
    cursor: 'pointer', fontFamily: sans, fontSize: 13, fontWeight: 500,
    border: `1px solid ${C.border}`,
    background: C.bg, color: C.textSec,
    transition: 'all 0.15s',
  },
  personaBtnActive: {
    border: `1px solid ${C.accent}`,
    background: C.accentDim, color: C.accent,
    boxShadow: `0 0 16px ${C.accentGlow}`,
  },

  topicsHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  topicsCount: { fontFamily: mono, fontSize: '0.6rem', color: C.accent, letterSpacing: '0.08em' },
  topicsWrap: { display: 'flex', flexWrap: 'wrap', gap: 7 },
  topicChip: {
    padding: '6px 14px', borderRadius: 99,
    fontSize: 11, cursor: 'pointer', fontFamily: mono,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    border: `1px solid ${C.border}`,
    background: C.bg, color: C.textMuted,
    transition: 'all 0.15s',
  },
  topicChipActive: {
    border: `1px solid ${C.accent}`,
    background: C.accentDim, color: C.accent,
  },

  errorBox: {
    background: C.error, color: C.errorText,
    borderRadius: 8, padding: '10px 14px',
    fontFamily: mono, fontSize: '0.65rem',
    letterSpacing: '0.04em', lineHeight: 1.6,
    marginBottom: 14, overflow: 'hidden',
  },

  submitBtn: {
    width: '100%', padding: '13px 0',
    borderRadius: 8, border: 'none',
    background: C.accent, color: C.bg,
    fontFamily: mono, fontSize: '0.75rem',
    textTransform: 'uppercase', letterSpacing: '0.12em',
    fontWeight: 700, cursor: 'pointer',
    boxShadow: `0 0 24px ${C.accentGlow}`,
    transition: 'opacity 0.15s',
  },
  submitBtnDisabled: { opacity: 0.5, cursor: 'not-allowed', boxShadow: 'none' },
  spinner: {
    display: 'inline-block', width: 12, height: 12,
    border: `2px solid ${C.bg}`,
    borderTopColor: 'transparent', borderRadius: '50%',
  },
};