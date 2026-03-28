"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AuthGuard from "@/components/AuthGuard";
import { apiFetch } from "@/lib/auth";

// ─── Backend (untouched) ──────────────────────────────────────────────────────

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};

const API = getApiUrl();

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  bg:         '#07070a',
  surface:    '#0f0f12',
  surfaceHigh:'#141418',
  border:     'rgba(255,255,255,0.07)',
  text:       '#f0f0f2',
  textSec:    '#8a8a9a',
  textMuted:  '#44445a',
  accent:     '#f5c842',
  accentDim:  'rgba(245,200,66,0.10)',
  accentGlow: 'rgba(245,200,66,0.28)',
  green:      '#34d399',
  greenDim:   'rgba(52,211,153,0.12)',
  red:        '#f87171',
  redDim:     'rgba(248,113,113,0.12)',
};

const mono  = "'JetBrains Mono','Fira Code',monospace";
const serif = "'Playfair Display',Georgia,serif";
const sans  = "'DM Sans',system-ui,sans-serif";

// ─── Index Card ───────────────────────────────────────────────────────────────

function IndexCard({ idx, delay }) {
  const [hovered, setHovered] = useState(false);
  const isPos = idx.is_positive;

  return (
    <motion.div
      style={{
        ...S.card,
        background: hovered ? C.surfaceHigh : C.surface,
      }}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      {/* top accent line */}
      <motion.div
        style={{ ...S.cardTopLine, background: isPos ? C.green : C.red }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: hovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />

      <div style={S.cardSymbol}>{idx.short}</div>
      <div style={S.cardValue}>{idx.current.toLocaleString("en-IN")}</div>

      <div style={{
        ...S.cardChange,
        color: isPos ? C.green : C.red,
        background: isPos ? C.greenDim : C.redDim,
      }}>
        <span>{isPos ? "▲" : "▼"}</span>
        <span>{Math.abs(idx.change).toLocaleString("en-IN")}</span>
        <span style={S.cardChangePct}>
          ({idx.change_pct > 0 ? "+" : ""}{idx.change_pct}%)
        </span>
      </div>

      <div style={S.cardDivider} />
      <p style={S.cardCommentary}>{idx.commentary}</p>
    </motion.div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);

  async function load(manual = false) {
    if (manual) setSpinning(true);
    else setLoading(true);
    try {
      const res = await apiFetch(`${API}/market`);
      const d   = await res.json();
      setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(() => load(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={S.page}>

      {/* ── HEADER ── */}
      <div style={S.header}>
        <div style={S.headerInner}>
          <div>
            <span style={S.pageTag}>Live</span>
            <h1 style={S.pageTitle}>Market Pulse</h1>
            <p style={S.pageDesc}>
              {data?.updated_at
                ? `Updated at ${new Date(data.updated_at * 1000).toLocaleTimeString("en-IN")} · refreshes every 5 min`
                : 'Fetching live data...'}
            </p>
          </div>
          <motion.button
            onClick={() => load(true)}
            style={S.refreshBtn}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            <motion.span
              animate={spinning ? { rotate: 360 } : { rotate: 0 }}
              transition={{ duration: 0.7, ease: 'linear', repeat: spinning ? Infinity : 0 }}
              style={{ display: 'inline-block' }}
            >
              ↻
            </motion.span>
            {spinning ? 'Refreshing' : 'Refresh'}
          </motion.button>
        </div>
      </div>

      {/* ── LOADING ── */}
      <AnimatePresence>
        {loading && (
          <motion.div
            style={S.loadingWrap}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div style={S.dotsRow}>
              {[0, 1, 2].map(i => (
                <motion.span
                  key={i} style={S.dot}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
                />
              ))}
            </div>
            <p style={S.loadingText}>Fetching live market data...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CONTENT ── */}
      {!loading && data && (
        <div style={S.content}>
          <div style={S.indicesGrid}>
            {data.indices.map((idx, i) => (
              <IndexCard key={idx.symbol} idx={idx} delay={i * 0.1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  page: { minHeight: '100vh', background: C.bg, color: C.text, fontFamily: sans },

  header: {
    borderBottom: `1px solid ${C.border}`,
    padding: '3rem 2rem 2rem',
    background: `linear-gradient(to bottom, ${C.surface}, ${C.bg})`,
  },
  headerInner: {
    maxWidth: 1100, margin: '0 auto',
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
  },
  pageTag: {
    fontFamily: mono, fontSize: '0.58rem',
    textTransform: 'uppercase', letterSpacing: '0.15em',
    color: C.green, background: C.greenDim,
    padding: '0.22rem 0.7rem', borderRadius: 99,
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    marginBottom: '0.8rem',
  },
  pageTitle: {
    fontFamily: serif, fontSize: 'clamp(1.8rem, 3vw, 2.4rem)',
    fontWeight: 700, letterSpacing: '-0.03em',
    color: C.text, margin: '0 0 0.4rem',
  },
  pageDesc: {
    fontFamily: mono, fontSize: '0.62rem',
    textTransform: 'uppercase', letterSpacing: '0.1em',
    color: C.textMuted, margin: 0,
  },

  refreshBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.65rem 1.2rem',
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 8, cursor: 'pointer',
    fontFamily: mono, fontSize: '0.65rem',
    textTransform: 'uppercase', letterSpacing: '0.1em',
    color: C.textSec,
  },

  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '5rem 2rem' },
  dotsRow: { display: 'flex', gap: '0.5rem' },
  dot: {
    display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
    background: C.accent, boxShadow: `0 0 6px ${C.accentGlow}`,
  },
  loadingText: {
    fontFamily: mono, fontSize: '0.62rem',
    textTransform: 'uppercase', letterSpacing: '0.12em', color: C.textMuted, margin: 0,
  },

  content: { maxWidth: 1100, margin: '2.5rem auto', padding: '0 2rem' },
  indicesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 1,
    background: C.border,
    border: `1px solid ${C.border}`,
    borderRadius: 12, overflow: 'hidden',
  },

  card: {
    padding: '1.8rem 2rem',
    position: 'relative', overflow: 'hidden',
    display: 'flex', flexDirection: 'column', gap: '0.5rem',
    transition: 'background 0.2s',
  },
  cardTopLine: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
    transformOrigin: 'left',
  },
  cardSymbol: {
    fontFamily: mono, fontSize: '0.6rem',
    textTransform: 'uppercase', letterSpacing: '0.14em', color: C.textMuted,
  },
  cardValue: {
    fontFamily: serif, fontSize: '2rem', fontWeight: 700,
    color: C.text, letterSpacing: '-0.02em', lineHeight: 1,
  },
  cardChange: {
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    fontFamily: mono, fontSize: '0.72rem', fontWeight: 600,
    padding: '0.3rem 0.75rem', borderRadius: 6,
    width: 'fit-content',
  },
  cardChangePct: { opacity: 0.75 },
  cardDivider: { height: 1, background: C.border, margin: '0.4rem 0' },
  cardCommentary: {
    fontFamily: sans, fontSize: '0.82rem', lineHeight: 1.65,
    color: C.textSec, margin: 0,
  },
};

// ─── Export ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return <AuthGuard><Dashboard /></AuthGuard>;
}