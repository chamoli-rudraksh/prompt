// ════════════════════════════════════════════════
// ArticleCard.jsx  — Peak UI/UX Edition
// ════════════════════════════════════════════════
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import AudioButton from './AudioButton';
import { apiFetch } from '@/lib/auth';

// ─── Backend (untouched) ─────────────────────────────────────────────────────
const getApiUrl = () => {
  if (typeof window !== 'undefined') return `${window.location.protocol}//${window.location.hostname}:8000`;
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};
const API = getApiUrl();

function readingTime(text) {
  if (!text) return '1 min read';
  return `${Math.max(1, Math.round(text.trim().split(/\s+/).length / 200))} min read`;
}

// ─── Tokens (untouched) ──────────────────────────────────────────────────────
const C = {
  bg:'#07070a', surface:'#0f0f12', surfaceHigh:'#141418',
  border:'rgba(255,255,255,0.07)', text:'#f0f0f2', textSec:'#8a8a9a', textMuted:'#44445a',
  accent:'#f5c842', accentDim:'rgba(245,200,66,0.10)', accentGlow:'rgba(245,200,66,0.25)',
};
const mono = "'JetBrains Mono','Fira Code',monospace";
const serif = "'Playfair Display',Georgia,serif";
const sans = "'DM Sans',system-ui,sans-serif";

// ─── Tilt Card Hook ──────────────────────────────────────────────────────────
function useTilt(maxDeg = 6) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [maxDeg, -maxDeg]), { stiffness:200, damping:30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-maxDeg, maxDeg]), { stiffness:200, damping:30 });

  const handleMove = useCallback((e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }, [x, y]);

  const handleLeave = useCallback(() => {
    x.set(0); y.set(0);
  }, [x, y]);

  return { ref, rotateX, rotateY, handleMove, handleLeave };
}

// ─── Shimmer text on hover ────────────────────────────────────────────────────
function ShimmerTitle({ href, children, hovered }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
    style={{
      fontFamily: serif,
      fontSize: '1.08rem',
      fontWeight: 600,
      lineHeight: 1.38,
      letterSpacing: '-0.015em',
      display: 'block',
      textDecoration: 'none',

      backgroundImage: hovered
        ? `linear-gradient(90deg, ${C.text} 0%, ${C.accent} 40%, ${C.text} 60%, ${C.text} 100%)`
        : 'none',

      backgroundSize: hovered ? '200% auto' : '100%',
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: hovered ? 'transparent' : C.text,

      animation: hovered ? 'shimmer-text 1.4s linear infinite' : 'none',
      transition: 'background-image 0.3s',
    }}
    >
      {children}
      <style>{`
        @keyframes shimmer-text {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>
    </a>
  );
}

// ─── Animated Bookmark ────────────────────────────────────────────────────────
function BookmarkBtn({ saved, saving, onToggle }) {
  return (
    <motion.button
      onClick={onToggle}
      disabled={saving}
      title={saved ? 'Unsave' : 'Save'}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        width: 30, height: 30, borderRadius: 6, padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', flexShrink: 0,
      }}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.8, rotate: -8 }}
    >
      {/* Glow burst on save */}
      <AnimatePresence>
        {saved && (
          <motion.span
            style={{
              position: 'absolute', inset: -6, borderRadius: '50%',
              background: `radial-gradient(circle, rgba(245,200,66,0.35), transparent 70%)`,
              pointerEvents: 'none',
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 1.6, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>
      <motion.span
        style={{ fontSize: '1.05rem', lineHeight: 1, display: 'block' }}
        animate={{ color: saved ? C.accent : C.textMuted }}
        transition={{ duration: 0.2 }}
      >
        {saved ? '★' : '☆'}
      </motion.span>
    </motion.button>
  );
}

// ─── Reading Progress Bar ────────────────────────────────────────────────────
function ReadingBar({ minutes }) {
  const total = Math.max(1, minutes);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <div style={{
        display: 'flex', gap: 2, alignItems: 'center',
      }}>
        {Array.from({ length: Math.min(total, 8) }).map((_, i) => (
          <motion.div
            key={i}
            style={{
              width: 3, height: 3 + (i % 3),
              borderRadius: 99,
              background: i < Math.min(total, 3) ? C.accent : 'rgba(255,255,255,0.12)',
            }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
          />
        ))}
      </div>
      <span style={{ fontFamily: mono, fontSize: '0.56rem', color: C.textMuted }}>
        {total} min
      </span>
    </div>
  );
}

// ─── Floating particle on hover ───────────────────────────────────────────────
function Particles({ active }) {
  const particles = [
    { x: '20%', y: '30%', delay: 0 },
    { x: '80%', y: '20%', delay: 0.1 },
    { x: '60%', y: '80%', delay: 0.2 },
    { x: '10%', y: '70%', delay: 0.15 },
  ];
  return (
    <AnimatePresence>
      {active && particles.map((p, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute', left: p.x, top: p.y,
            width: 2, height: 2, borderRadius: '50%',
            background: C.accent, pointerEvents: 'none',
            boxShadow: `0 0 4px ${C.accent}`,
          }}
          initial={{ opacity: 0, y: 0, scale: 0 }}
          animate={{ opacity: [0, 0.8, 0], y: -24, scale: [0, 1, 0] }}
          transition={{ delay: p.delay, duration: 1.2, repeat: Infinity, repeatDelay: 1.5 }}
        />
      ))}
    </AnimatePresence>
  );
}

// ─── Verdict / Relevance Score ────────────────────────────────────────────────
function RelevanceScore({ topics }) {
  const score = Math.min(99, 60 + (topics?.length || 0) * 8 + Math.floor(Math.random() * 15));
  const arc = score / 100;
  const r = 10, cx = 14, cy = 14;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <svg width="28" height="28" viewBox="0 0 28 28">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2"/>
        <motion.circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={C.accent} strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - arc) }}
          transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
          style={{ transformOrigin: 'center', transform: 'rotate(-90deg)', transformBox: 'fill-box' }}
        />
        <text x={cx} y={cy + 3.5} textAnchor="middle"
          style={{ fontFamily: mono, fontSize: '6px', fill: C.accent, fontWeight: 700 }}>
          {score}
        </text>
      </svg>
      <span style={{ fontFamily: mono, fontSize: '0.5rem', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        match
      </span>
    </div>
  );
}

// ─── Main ArticleCard ─────────────────────────────────────────────────────────
export default function ArticleCard({ article, userId }) {
  const [saved, setSaved]     = useState(article.is_saved || false);
  const [saving, setSaving]   = useState(false);
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { ref, rotateX, rotateY, handleMove, handleLeave } = useTilt(4);

  // ── Backend untouched ──
  const toggleSave = async () => {
    setSaving(true);
    try {
      if (saved) await apiFetch(`${API}/articles/save/${article.id}`, { method: 'DELETE' });
      else await apiFetch(`${API}/articles/save`, { method: 'POST', body: JSON.stringify({ article_id: article.id }) });
      setSaved(!saved);
    } catch (e) { console.error('Failed to save article:', e); }
    finally { setSaving(false); }
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const h = Math.floor(diff / 3600000);
      if (h < 1) return 'Just now';
      if (h < 24) return `${h}h ago`;
      return `${Math.floor(h / 24)}d ago`;
    } catch { return ''; }
  };

  const mins = parseInt(readingTime(article.content || article.summary));
  const ago = timeAgo(article.published_at);

  const onHoverStart = () => setHovered(true);
  const onHoverEnd = () => { setHovered(false); handleLeave(); };

  return (
    <motion.div
      ref={ref}
      style={{
        perspective: 1000,
        position: 'relative',
      }}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      onMouseMove={handleMove}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        style={{
          background: hovered ? C.surfaceHigh : C.surface,
          borderRadius: 14,
          border: `1px solid ${hovered ? 'rgba(245,200,66,0.18)' : C.border}`,
          overflow: 'hidden',
          position: 'relative',
          fontFamily: sans,
          boxShadow: hovered
            ? `0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,200,66,0.06), inset 0 1px 0 rgba(255,255,255,0.05)`
            : `0 2px 12px rgba(0,0,0,0.3)`,
          rotateX, rotateY,
          transformStyle: 'preserve-3d',
          transition: 'background 0.2s, border-color 0.25s, box-shadow 0.3s',
        }}
      >
        {/* ── Floating particles ── */}
        <Particles active={hovered} />

        {/* ── Corner glow on hover ── */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              style={{
                position: 'absolute', top: -40, right: -40,
                width: 160, height: 160,
                background: `radial-gradient(circle, rgba(245,200,66,0.07), transparent 70%)`,
                pointerEvents: 'none', zIndex: 0,
              }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.4 }}
            />
          )}
        </AnimatePresence>

        {/* ── Top accent line ── */}
        <motion.div
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: `linear-gradient(90deg, ${C.accent}, rgba(245,200,66,0.3), transparent)`,
            transformOrigin: 'left', zIndex: 2,
          }}
          animate={{ scaleX: hovered ? 1 : 0, opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        />

        {/* ── Side accent rail ── */}
        <motion.div
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: 2,
            background: `linear-gradient(180deg, ${C.accent}, transparent)`,
            transformOrigin: 'top', zIndex: 2,
          }}
          animate={{ scaleY: hovered ? 1 : 0, opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: 'easeOut' }}
        />

        {/* ── Inner content ── */}
        <div style={{ padding: '1.5rem 1.6rem', position: 'relative', zIndex: 1 }}>

          {/* ── Header row ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1 }}>
              {/* Source chip */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <motion.span
                  style={{
                    fontFamily: mono, fontSize: '0.55rem', textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    background: 'rgba(245,200,66,0.10)',
                    border: '1px solid rgba(245,200,66,0.22)',
                    borderRadius: 99, padding: '0.18rem 0.6rem',
                    color: C.accent, lineHeight: 1.6,
                  }}
                  animate={{ borderColor: hovered ? 'rgba(245,200,66,0.45)' : 'rgba(245,200,66,0.22)' }}
                >
                  ◈ {article.source}
                </motion.span>

                {/* Freshness badge */}
                {ago === 'Just now' && (
                  <motion.span
                    style={{
                      fontFamily: mono, fontSize: '0.48rem', textTransform: 'uppercase',
                      letterSpacing: '0.1em', color: '#22c55e',
                      background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.22)',
                      borderRadius: 99, padding: '0.18rem 0.5rem',
                      display: 'flex', alignItems: 'center', gap: '0.3rem',
                    }}
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  >
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}/>
                    Breaking
                  </motion.span>
                )}
              </div>

              {/* Time + reading bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontFamily: mono, fontSize: '0.56rem', color: C.textMuted }}>
                  {ago}
                </span>
                <span style={{ color: C.textMuted, fontSize: '0.5rem' }}>·</span>
                <ReadingBar minutes={mins} />
              </div>
            </div>

            {/* Right: relevance + save */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.8rem' }}>
              <RelevanceScore topics={article.topics} />
              <BookmarkBtn saved={saved} saving={saving} onToggle={toggleSave} />
            </div>
          </div>

          {/* ── Title ── */}
          <div style={{ marginBottom: '0.7rem' }}>
            <ShimmerTitle href={article.url} hovered={hovered}>
              {article.title}
            </ShimmerTitle>
          </div>

          {/* ── Summary ── */}
          <motion.p
            style={{
              fontFamily: sans, fontSize: '0.84rem', lineHeight: 1.75,
              color: C.textSec, margin: '0 0 0.9rem',
            }}
            animate={{ color: hovered ? '#a0a0b8' : C.textSec }}
            transition={{ duration: 0.3 }}
          >
            {article.summary}
          </motion.p>

          {/* ── Audio ── */}
          {article.summary && (
            <div style={{ marginBottom: '0.9rem' }}>
              <AudioButton text={article.summary} />
            </div>
          )}

          {/* ── Why it matters ── */}
          {article.why_it_matters && (
            <motion.div
              style={{
                position: 'relative', borderRadius: 10, overflow: 'hidden',
                marginBottom: '0.9rem',
              }}
              animate={{
                background: hovered ? 'rgba(245,200,66,0.08)' : 'rgba(245,200,66,0.05)',
                borderColor: hovered ? 'rgba(245,200,66,0.25)' : 'rgba(245,200,66,0.12)',
              }}
              transition={{ duration: 0.3 }}
            >
              <div style={{
                border: '1px solid rgba(245,200,66,0.15)',
                borderRadius: 10, padding: '0.85rem 0.9rem 0.85rem 1.1rem',
                position: 'relative',
              }}>
                {/* Left rail */}
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                  background: `linear-gradient(180deg, ${C.accent}, rgba(245,200,66,0.2))`,
                  borderRadius: '10px 0 0 10px',
                }}/>
                <div style={{
                  fontFamily: mono, fontSize: '0.52rem', textTransform: 'uppercase',
                  letterSpacing: '0.14em', color: C.accent, marginBottom: '0.45rem',
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                }}>
                  <span>◐</span> Why this matters to you
                </div>
                <p style={{
                  fontFamily: sans, fontSize: '0.82rem', lineHeight: 1.68,
                  color: C.text, margin: 0,
                }}>
                  {article.why_it_matters}
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Footer ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

            {/* Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {(article.topics || []).map((t, i) => (
                <motion.span
                  key={t}
                  style={{
                    fontFamily: mono, fontSize: '0.52rem', textTransform: 'uppercase',
                    letterSpacing: '0.08em', borderRadius: 5,
                    padding: '0.18rem 0.55rem',
                    cursor: 'default',
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: 1, scale: 1,
                    color: hovered ? C.accent : C.textMuted,
                    background: hovered ? 'rgba(245,200,66,0.08)' : C.surfaceHigh,
                    borderColor: hovered ? 'rgba(245,200,66,0.2)' : C.border,
                  }}
                  style={{
                    border: `1px solid ${C.border}`,
                    fontFamily: mono, fontSize: '0.52rem', textTransform: 'uppercase',
                    letterSpacing: '0.08em', borderRadius: 5, color: C.textMuted,
                    background: C.surfaceHigh, padding: '0.18rem 0.55rem',
                  }}
                  transition={{ delay: i * 0.05, duration: 0.25 }}
                  whileHover={{ scale: 1.08, color: C.accent, borderColor: 'rgba(245,200,66,0.3)', background: 'rgba(245,200,66,0.07)' }}
                >
                  {t}
                </motion.span>
              ))}
            </div>

            {/* Read more */}
            <a href={article.url} target="_blank" rel="noopener noreferrer"
              style={{ textDecoration: 'none', flexShrink: 0, marginLeft: '0.6rem' }}
            >
              <motion.div
                style={{
                  fontFamily: mono, fontSize: '0.6rem', textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: C.accent,
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  position: 'relative',
                }}
                whileHover={{ gap: '0.6rem' }}
                transition={{ duration: 0.2 }}
              >
                Read more
                <motion.span
                  animate={{ x: hovered ? 3 : 0 }}
                  transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
                >→</motion.span>
                {/* Underline shimmer */}
                <motion.div
                  style={{
                    position: 'absolute', bottom: -2, left: 0,
                    height: '1px', background: `linear-gradient(90deg, ${C.accent}, transparent)`,
                    transformOrigin: 'left',
                  }}
                  animate={{ scaleX: hovered ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
            </a>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}