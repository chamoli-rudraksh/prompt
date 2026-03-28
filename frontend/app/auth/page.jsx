"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { saveTokens, isLoggedIn } from "@/lib/auth";

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
  borderFocus:'rgba(245,200,66,0.5)',
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
        animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.22, 0.15] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div style={{ ...S.orb, ...S.orb2 }} />
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({ label, type = "text", value, onChange, placeholder }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={S.fieldLabel}>{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...S.input,
          borderColor: focused ? C.borderFocus : C.border,
          boxShadow: focused ? `0 0 0 3px ${C.accentDim}` : 'none',
        }}
      />
    </div>
  );
}

// ─── Auth Page Inner ──────────────────────────────────────────────────────────

function AuthPageInner() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", persona: "", interests: [] });

  useEffect(() => {
    if (isLoggedIn()) router.replace("/feed");
  }, []);

  function set(key, val) { setForm((f) => ({ ...f, [key]: val })); setError(""); }

  function toggleInterest(topic) {
    const t = topic.toLowerCase();
    set("interests", form.interests.includes(t) ? form.interests.filter((i) => i !== t) : [...form.interests, t]);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (mode === "register" && step === 1) {
      if (!form.name || !form.email || !form.password) { setError("All fields are required"); return; }
      if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
      setStep(2);
      return;
    }

    if (mode === "register" && step === 2) {
      if (!form.persona) { setError("Please select a persona"); return; }
      if (!form.interests.length) { setError("Select at least one topic"); return; }
    }

    setLoading(true);
    setError("");

    const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
    const body = mode === "login" ? { email: form.email, password: form.password } : form;

    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Something went wrong"); if (mode === "register") setStep(1); return; }
      saveTokens(data.access_token, data.user);
      router.push("/feed");
    } catch {
      setError("Could not connect to server. Check if backend is running and CORS is configured.");
    } finally {
      setLoading(false);
    }
  }

  const isRegister = mode === "register";

  return (
    <div style={S.page}>
      <GridBackground />

      <motion.div
        style={S.card}
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Logo */}
        <div style={S.logoWrap}>
          <div style={S.logo}>ET<span style={S.logoAccent}>AI</span></div>
          <motion.p
            key={`${mode}-${step}`}
            style={S.logoSub}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {!isRegister ? "Welcome back" : step === 1 ? "Create your account" : "Personalise your experience"}
          </motion.p>
        </div>

        {/* Tab toggle */}
        <div style={S.tabs}>
          {[["login", "Sign in"], ["register", "Register"]].map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setStep(1); setError(""); }}
              style={{ ...S.tab, ...(mode === m ? S.tabActive : {}) }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Step progress */}
        {isRegister && (
          <div style={S.progress}>
            {[1, 2].map((s) => (
              <motion.div
                key={s}
                style={{ ...S.progressBar, background: step >= s ? C.accent : C.border }}
                animate={{ background: step >= s ? C.accent : C.border }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${mode}-${step}`}
              initial={{ opacity: 0, x: step === 2 ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: step === 2 ? -20 : 20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {/* Login fields */}
              {!isRegister && (
                <>
                  <Field label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} placeholder="you@example.com" />
                  <Field label="Password" type="password" value={form.password} onChange={(v) => set("password", v)} placeholder="••••••••" />
                </>
              )}

              {/* Register step 1 */}
              {isRegister && step === 1 && (
                <>
                  <Field label="Full name" value={form.name} onChange={(v) => set("name", v)} placeholder="Rahul Sharma" />
                  <Field label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} placeholder="you@example.com" />
                  <Field label="Password" type="password" value={form.password} onChange={(v) => set("password", v)} placeholder="Minimum 6 characters" />
                </>
              )}

              {/* Register step 2 */}
              {isRegister && step === 2 && (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <label style={S.fieldLabel}>I am a...</label>
                    <div style={S.personaGrid}>
                      {PERSONAS.map((p) => {
                        const active = form.persona === p.toLowerCase();
                        return (
                          <motion.button
                            type="button"
                            key={p}
                            onClick={() => set("persona", p.toLowerCase())}
                            style={{ ...S.personaBtn, ...(active ? S.personaBtnActive : {}) }}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            {p}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={S.fieldLabel}>Topics I follow</label>
                    <div style={S.topicsWrap}>
                      {TOPICS.map((t) => {
                        const active = form.interests.includes(t.toLowerCase());
                        return (
                          <motion.button
                            type="button"
                            key={t}
                            onClick={() => toggleInterest(t)}
                            style={{ ...S.topicChip, ...(active ? S.topicChipActive : {}) }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {t}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                style={S.errorBox}
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
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
                Please wait...
              </span>
            ) : !isRegister ? "Sign in" : step === 1 ? "Continue →" : "Start reading →"}
          </motion.button>
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
    background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)',
    bottom: '5%', right: '-5%',
  },

  card: {
    position: 'relative', zIndex: 1,
    background: C.surface,
    borderRadius: 16,
    border: `1px solid ${C.border}`,
    padding: '40px 44px',
    width: '100%', maxWidth: 460,
    boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
  },

  logoWrap: { textAlign: 'center', marginBottom: 28 },
  logo: { fontFamily: serif, fontSize: '1.9rem', fontWeight: 700, color: C.text, letterSpacing: '-0.03em' },
  logoAccent: { color: C.accent },
  logoSub: { fontFamily: mono, fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: C.textMuted, marginTop: 8 },

  tabs: {
    display: 'flex', background: C.bg,
    borderRadius: 10, padding: 4, marginBottom: 24, gap: 4,
    border: `1px solid ${C.border}`,
  },
  tab: {
    flex: 1, padding: '9px 0', borderRadius: 7,
    border: 'none', cursor: 'pointer',
    fontFamily: mono, fontSize: '0.68rem',
    textTransform: 'uppercase', letterSpacing: '0.1em',
    background: 'transparent', color: C.textMuted,
    transition: 'all 0.2s',
  },
  tabActive: {
    background: C.surfaceHigh, color: C.accent,
    boxShadow: '0 1px 6px rgba(0,0,0,0.3)',
  },

  progress: { display: 'flex', gap: 6, marginBottom: 24 },
  progressBar: { flex: 1, height: 2, borderRadius: 99 },

  fieldLabel: {
    fontFamily: mono, fontSize: '0.6rem',
    textTransform: 'uppercase', letterSpacing: '0.1em',
    color: C.textSec, display: 'block', marginBottom: 8,
  },
  input: {
    width: '100%', padding: '11px 14px',
    borderRadius: 8, border: `1px solid ${C.border}`,
    fontSize: 14, outline: 'none',
    boxSizing: 'border-box',
    background: C.bg, color: C.text,
    fontFamily: sans, transition: 'border-color 0.15s, box-shadow 0.15s',
  },

  personaGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  personaBtn: {
    padding: '11px 14px', borderRadius: 8,
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

  topicsWrap: { display: 'flex', flexWrap: 'wrap', gap: 7 },
  topicChip: {
    padding: '6px 14px', borderRadius: 99,
    fontSize: 12, cursor: 'pointer', fontFamily: mono,
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
    fontFamily: mono, fontSize: '0.68rem',
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
    marginTop: 4,
    boxShadow: `0 0 24px ${C.accentGlow}`,
    transition: 'opacity 0.15s',
  },
  submitBtnDisabled: {
    opacity: 0.5, cursor: 'not-allowed',
    boxShadow: 'none',
  },
  spinner: {
    display: 'inline-block', width: 12, height: 12,
    border: `2px solid ${C.bg}`,
    borderTopColor: 'transparent', borderRadius: '50%',
  },
};

// ─── Export ───────────────────────────────────────────────────────────────────

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: mono, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.textMuted }}>
          Loading...
        </div>
      </div>
    }>
      <AuthPageInner />
    </Suspense>
  );
}