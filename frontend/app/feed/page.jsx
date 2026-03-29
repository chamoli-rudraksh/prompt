'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ArticleCard from '@/components/ArticleCard';
import { getFeed } from '@/lib/api';
import AuthGuard from '@/components/AuthGuard';
import { apiFetch, getUser, logout } from '@/lib/auth';

// ─── Backend (untouched) ──────────────────────────────────────────────────────

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};

const API_URL = getApiUrl();

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
  error:      'rgba(239,68,68,0.10)',
  errorText:  '#fca5a5',
};

const mono  = "'JetBrains Mono','Fira Code',monospace";
const serif = "'Playfair Display',Georgia,serif";
const sans  = "'DM Sans',system-ui,sans-serif";

// ─── Trending Bar ─────────────────────────────────────────────────────────────

function TrendingBar({ onTopicClick }) {
  const [topics, setTopics] = useState([]);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    apiFetch(`${API_URL}/trending`)
      .then((r) => r.json())
      .then((d) => setTopics(d.topics || []))
      .catch(() => {});
  }, []);

  if (!topics.length) return null;

  return (
    <motion.div
      style={S.trendingWrap}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
    >
      <span style={S.trendingLabel}>Trending today</span>
      <div style={S.trendingScroll}>
        {topics.map((t, i) => (
          <motion.button
            key={t.name}
            onClick={() => onTopicClick(t.name)}
            style={{
              ...S.trendingChip,
              ...(hovered === t.name ? S.trendingChipHover : {}),
            }}
            onMouseEnter={() => setHovered(t.name)}
            onMouseLeave={() => setHovered(null)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.45 + i * 0.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {t.name}
            <span style={S.trendingCount}>{t.count}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard({ delay }) {
  return (
    <motion.div
      style={S.skeletonCard}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
    >
      <motion.div
        style={S.skeletonShimmer}
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay }}
      />
      <div style={{ ...S.skeletonLine, width: '40%', marginBottom: 12 }} />
      <div style={{ ...S.skeletonLine, width: '90%', marginBottom: 8 }} />
      <div style={{ ...S.skeletonLine, width: '75%', marginBottom: 20 }} />
      <div style={{ ...S.skeletonBox }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <div style={{ ...S.skeletonLine, width: 60, height: 20, borderRadius: 99 }} />
        <div style={{ ...S.skeletonLine, width: 48, height: 20, borderRadius: 99 }} />
      </div>
    </motion.div>
  );
}

// ─── Feed Page ────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const router = useRouter();
  const [articles, setArticles]   = useState([]);
  const [userName, setUserName]   = useState('');
  const [persona, setPersona]     = useState('');
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [userId, setUserId]       = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (!user) return;
    const { id, name, persona: p } = user;
    setUserId(id || '');
    setUserName(name || '');
    setPersona(p || '');
    loadFeed(id);
  }, [router]);

  useEffect(() => {
    const handler = () => { if (userId) handleRefresh(); };
    window.addEventListener('refresh-feed', handler);
    return () => window.removeEventListener('refresh-feed', handler);
  }, [userId]);

  const loadFeed = async (id) => {
    setLoading(true);
    setError('');
    try {
      const data = await getFeed(id, 20);
      setArticles(data.articles || []);
      if (data.user_name) setUserName(data.user_name);
    } catch (err) {
      console.error('Feed error:', err);
      if (err?.response?.status === 404 || err?.response?.status === 401) { logout(); return; }
      setError('Unable to load feed. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await apiFetch(`${API_URL}/admin/refresh-news`, { method: 'POST' });
      await new Promise((r) => setTimeout(r, 4000));
      await loadFeed(userId);
    } finally {
      setRefreshing(false);
    }
  };

  const handleTopicClick = (topic) => {
    router.push(`/navigator?q=${encodeURIComponent(topic)}`);
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = userName?.split(' ')[0] || 'there';

  return (
    <AuthGuard>
      <div style={S.page}>

        {/* ── HEADER ── */}
        <div style={S.header}>
          <div style={S.headerInner}>

            {/* Left: greeting */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <div style={S.greetingTime}>
                <motion.span
                  style={S.liveIndicator}
                  animate={{ opacity: [1, 0.3, 1], scale: [1, 0.7, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity }}
                />
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>

              <h1 style={S.greeting}>
                {getGreeting()},{' '}
                <span style={S.greetingName}>{firstName}.</span>
              </h1>

              <p style={S.greetingSub}>Here&apos;s what matters to you today.</p>

              {persona && (
                <motion.span
                  style={S.personaBadge}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  {persona}
                </motion.span>
              )}
            </motion.div>

            {/* Right: refresh */}
            <motion.button
              onClick={handleRefresh}
              disabled={refreshing}
              style={{ ...S.refreshBtn, ...(refreshing ? S.refreshBtnDisabled : {}) }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              whileHover={!refreshing ? { scale: 1.03 } : {}}
              whileTap={!refreshing ? { scale: 0.97 } : {}}
            >
              <motion.span
                animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
                transition={{ duration: 0.8, ease: 'linear', repeat: refreshing ? Infinity : 0 }}
                style={{ display: 'inline-block' }}
              >
                ↻
              </motion.span>
              {refreshing ? 'Refreshing...' : 'Refresh feed'}
            </motion.button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div style={S.body}>

          {/* Trending */}
          <TrendingBar onTopicClick={handleTopicClick} />

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                style={S.errorBanner}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                ⚠ {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Skeleton loading */}
          {loading && (
            <div style={S.grid}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <SkeletonCard key={i} delay={i * 0.07} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && articles.length === 0 && !error && (
            <motion.div
              style={S.emptyState}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <div style={S.emptyIcon}>📡</div>
              <h2 style={S.emptyTitle}>News is being fetched right now</h2>
              <p style={S.emptyDesc}>
                Articles are being ingested from live sources. Click "Refresh feed" above to check again.
              </p>
            </motion.div>
          )}

          {/* Articles grid */}
          {!loading && articles.length > 0 && (
            <motion.div
              style={S.grid}
              className="feed-grid"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
            >
              {articles.map((article) => (
                <motion.div
                  key={article.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
                  }}
                >
                  <ArticleCard article={article} userId={userId} persona={persona} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  page: { minHeight: '100vh', background: C.bg, color: C.text, fontFamily: sans },

  // Header
  header: {
    borderBottom: `1px solid ${C.border}`,
    padding: '2.5rem 2rem 2rem',
    background: `linear-gradient(to bottom, ${C.surface}, ${C.bg})`,
    position: 'sticky', top: 0, zIndex: 20,
    backdropFilter: 'blur(16px)',
  },
  headerInner: {
    maxWidth: 1200, margin: '0 auto',
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
    gap: '1rem',
  },

  greetingTime: {
    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
    fontFamily: mono, fontSize: '0.6rem',
    textTransform: 'uppercase', letterSpacing: '0.14em',
    color: C.textMuted, marginBottom: '0.6rem',
  },
  liveIndicator: {
    display: 'inline-block', width: 5, height: 5,
    borderRadius: '50%', background: C.accent,
    boxShadow: `0 0 8px ${C.accentGlow}`,
  },

  greeting: {
    fontFamily: serif,
    fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)',
    fontWeight: 700, letterSpacing: '-0.03em',
    color: C.text, margin: '0 0 0.3rem',
    lineHeight: 1.2,
  },
  greetingName: { color: C.accent, fontStyle: 'italic' },
  greetingSub: {
    fontFamily: sans, fontSize: '0.9rem',
    color: C.textSec, margin: '0 0 0.75rem',
  },

  personaBadge: {
    display: 'inline-block',
    fontFamily: mono, fontSize: '0.58rem',
    textTransform: 'uppercase', letterSpacing: '0.12em',
    color: C.accent, background: C.accentDim,
    border: `1px solid rgba(245,200,66,0.2)`,
    padding: '0.25rem 0.75rem', borderRadius: 99,
  },

  refreshBtn: {
    flexShrink: 0,
    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.7rem 1.4rem',
    background: C.accent, color: C.bg,
    border: 'none', borderRadius: 8, cursor: 'pointer',
    fontFamily: mono, fontSize: '0.68rem',
    textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700,
    boxShadow: `0 0 20px ${C.accentGlow}`,
    whiteSpace: 'nowrap',
  },
  refreshBtnDisabled: { opacity: 0.5, cursor: 'not-allowed', boxShadow: 'none' },

  // Body
  body: { maxWidth: 1200, margin: '0 auto', padding: '2rem 2rem 5rem' },

  // Trending
  trendingWrap: {
    display: 'flex', alignItems: 'center', gap: '1rem',
    marginBottom: '2rem', overflow: 'hidden',
  },
  trendingLabel: {
    fontFamily: mono, fontSize: '0.58rem',
    textTransform: 'uppercase', letterSpacing: '0.14em',
    color: C.textMuted, whiteSpace: 'nowrap', flexShrink: 0,
  },
  trendingScroll: {
    display: 'flex', gap: 8,
    overflowX: 'auto', paddingBottom: 4, flexWrap: 'nowrap',
    scrollbarWidth: 'none',
  },
  trendingChip: {
    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.35rem 0.9rem', borderRadius: 99,
    whiteSpace: 'nowrap', flexShrink: 0,
    fontFamily: mono, fontSize: '0.62rem',
    textTransform: 'uppercase', letterSpacing: '0.08em',
    border: `1px solid ${C.border}`,
    background: C.surface, color: C.textSec,
    cursor: 'pointer', transition: 'all 0.15s',
  },
  trendingChipHover: {
    background: C.accentDim, color: C.accent,
    border: `1px solid rgba(245,200,66,0.25)`,
  },
  trendingCount: {
    fontFamily: mono, fontSize: '0.55rem',
    color: C.textMuted,
  },

  // Error
  errorBanner: {
    background: C.error, color: C.errorText,
    borderRadius: 8, padding: '0.75rem 1rem',
    fontFamily: mono, fontSize: '0.68rem', letterSpacing: '0.05em',
    marginBottom: '1.5rem',
  },

  // Grid
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 1,
    background: C.border,
    border: `1px solid ${C.border}`,
    borderRadius: 12, overflow: 'hidden',
  },

  // Skeleton
  skeletonCard: {
    background: C.surface, padding: '1.8rem',
    position: 'relative', overflow: 'hidden',
  },
  skeletonShimmer: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
    width: '60%',
  },
  skeletonLine: {
    height: 12, borderRadius: 6,
    background: C.surfaceHigh,
    marginBottom: 8,
  },
  skeletonBox: {
    height: 80, borderRadius: 8,
    background: C.surfaceHigh,
    marginTop: 4,
  },

  // Empty
  emptyState: {
    textAlign: 'center', padding: '5rem 2rem',
    border: `1px dashed rgba(255,255,255,0.08)`,
    borderRadius: 16, background: C.surface,
  },
  emptyIcon: { fontSize: '2.5rem', marginBottom: '1rem' },
  emptyTitle: {
    fontFamily: serif, fontSize: '1.3rem', fontWeight: 600,
    color: C.text, margin: '0 0 0.5rem',
  },
  emptyDesc: {
    fontFamily: sans, fontSize: '0.88rem', lineHeight: 1.7,
    color: C.textMuted, margin: '0 auto', maxWidth: 360,
  },
};