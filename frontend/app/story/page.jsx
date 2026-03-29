'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StoryTimeline from '@/components/StoryTimeline';
import PlayerGraph from '@/components/PlayerGraph';
import SentimentChart from '@/components/SentimentChart';
import { getStoryArc } from '@/lib/api';
import AuthGuard from '@/components/AuthGuard';
import { getUser } from '@/lib/auth';
import SearchHistory, { saveSearch } from '@/components/SearchHistory';

// ─── Backend (untouched) ──────────────────────────────────────────────────────

const STORAGE_KEY = 'etnewsai_story_state';

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
  indigo:     'rgba(99,102,241,0.15)',
  indigoBorder:'rgba(99,102,241,0.3)',
};

const mono  = "'JetBrains Mono','Fira Code',monospace";
const serif = "'Playfair Display',Georgia,serif";
const sans  = "'DM Sans',system-ui,sans-serif";

// ─── Loading dots ─────────────────────────────────────────────────────────────

function LoadingState({ text }) {
  return (
    <motion.div
      style={S.loadingWrap}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <div style={S.dotsRow}>
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            style={S.dot}
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
          />
        ))}
      </div>
      <p style={S.loadingText}>{text}</p>
    </motion.div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ label, children, delay = 0 }) {
  return (
    <motion.div
      style={S.section}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      {label && <div style={S.sectionLabel}>{label}</div>}
      {children}
    </motion.div>
  );
}

// ─── Story Page ───────────────────────────────────────────────────────────────

export default function StoryPage() {
  const [query, setQuery] = useState('');
  const [storyData, setStoryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        setQuery(state.query || '');
        if (state.storyData) setStoryData(state.storyData);
      }
    } catch {}
  }, []);

  const saveState = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ query, storyData }));
    } catch {}
  }, [query, storyData]);

  useEffect(() => { saveState(); }, [saveState]);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    saveSearch(query);
    setLoading(true);
    setError('');
    setStoryData(null);

    try {
      const activeUser = getUser();
      const userId = activeUser?.id || 'anonymous';
      const data = await getStoryArc(query, userId);
      setStoryData(data);
    } catch (err) {
      console.error('Story arc error:', err);
      setError('Failed to generate story arc. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleHistorySelect = (q) => {
    setQuery(q);
    setTimeout(() => {
      const form = document.querySelector('.story-search');
      if (form) form.requestSubmit();
    }, 0);
  };

  return (
    <AuthGuard>
      <div style={S.page}>

        {/* ── PAGE HEADER ── */}
        <div style={S.pageHeader}>
          <div style={S.pageHeaderInner}>
            <span style={S.pageTag}>Story Arc Tracker</span>
            <h1 style={S.pageTitle}>Track Any Story</h1>
            <p style={S.pageDesc}>
              Visual timelines, entity maps, and sentiment curves — see how stories evolve, not just how they start.
            </p>
          </div>
        </div>

        {/* ── SEARCH ── */}
        <div style={S.searchWrap}>
          <form
            className="story-search"
            onSubmit={handleSearch}
            style={{ ...S.searchForm, ...(focused ? S.searchFormFocused : {}) }}
          >
            <span style={S.searchIcon}>⌕</span>
            <input
              id="story-search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Track any ongoing story... e.g. India-Canada relations, Byju's collapse"
              style={S.searchInput}
            />
            <motion.button
              id="story-search-btn"
              type="submit"
              disabled={!query.trim() || loading}
              style={{ ...S.searchBtn, ...((!query.trim() || loading) ? S.searchBtnDisabled : {}) }}
              whileHover={query.trim() && !loading ? { scale: 1.03 } : {}}
              whileTap={query.trim() && !loading ? { scale: 0.97 } : {}}
            >
              {loading ? 'Analyzing...' : 'Track Story'}
            </motion.button>
          </form>
        </div>

        <SearchHistory onSelect={handleHistorySelect} />

        {/* ── ERROR ── */}
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

        {/* ── LOADING ── */}
        <AnimatePresence>
          {loading && <LoadingState text="Analyzing story arc across all sources..." />}
        </AnimatePresence>

        {/* ── RESULTS ── */}
        <AnimatePresence>
          {storyData && !loading && (
            <div style={S.content}>

              {storyData.summary && (
                <Section label="Story overview" delay={0}>
                  <p style={S.summaryText}>{storyData.summary}</p>
                </Section>
              )}

              {storyData.timeline?.length > 0 && (
                <Section delay={0.1}>
                  <StoryTimeline events={storyData.timeline} />
                </Section>
              )}

              {(storyData.players?.length > 0 || storyData.sentiment_over_time?.length > 0) && (
                <Section delay={0.2}>
                  <div style={S.dualGrid}>
                    <div style={S.dualLeft}>
                      {storyData.players?.length > 0 && <PlayerGraph players={storyData.players} />}
                    </div>
                    <div style={S.dualRight}>
                      {storyData.sentiment_over_time?.length > 0 && <SentimentChart data={storyData.sentiment_over_time} />}
                    </div>
                  </div>
                </Section>
              )}

              {(storyData.contrarian_view || storyData.what_to_watch?.length > 0) && (
                <Section delay={0.3}>
                  <div style={S.contrarianCard}>
                    <div style={S.contrarianLabel}>Another perspective</div>
                    {storyData.contrarian_view && (
                      <p style={S.contrarianText}>{storyData.contrarian_view}</p>
                    )}
                    {storyData.what_to_watch?.length > 0 && (
                      <ul style={S.watchList}>
                        {storyData.what_to_watch.map((item, i) => (
                          <motion.li
                            key={i}
                            style={S.watchItem}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.35 + i * 0.07 }}
                          >
                            <span style={S.watchBullet} />
                            {item}
                          </motion.li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Section>
              )}
            </div>
          )}
        </AnimatePresence>

        {/* ── EMPTY STATE ── */}
        {!storyData && !loading && !error && (
          <motion.div
            style={S.emptyState}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div style={S.emptyIcon}>📊</div>
            <p style={S.emptyTitle}>Map any story</p>
            <p style={S.emptyDesc}>Search for an ongoing event to see its timeline, key players, and sentiment arc.</p>
          </motion.div>
        )}
      </div>
    </AuthGuard>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  page: { minHeight: '100vh', background: C.bg, color: C.text, fontFamily: sans, paddingBottom: '5rem' },

  pageHeader: {
    borderBottom: `1px solid ${C.border}`,
    padding: '3rem 2rem 2rem',
    background: `linear-gradient(to bottom, ${C.surface}, ${C.bg})`,
  },
  pageHeaderInner: { maxWidth: 960, margin: '0 auto' },
  pageTag: {
    fontFamily: mono, fontSize: '0.6rem',
    textTransform: 'uppercase', letterSpacing: '0.15em',
    color: C.accent, background: C.accentDim,
    padding: '0.25rem 0.8rem', borderRadius: 99,
    display: 'inline-block', marginBottom: '1rem',
  },
  pageTitle: {
    fontFamily: serif, fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
    fontWeight: 700, letterSpacing: '-0.03em',
    color: C.text, margin: '0 0 0.6rem',
  },
  pageDesc: {
    fontFamily: sans, fontSize: '0.95rem', lineHeight: 1.7,
    color: C.textSec, margin: 0, maxWidth: 540,
  },

  searchWrap: { maxWidth: 960, margin: '2rem auto 0', padding: '0 2rem' },
  searchForm: {
    display: 'flex', alignItems: 'center',
    background: C.surface,
    borderWidth: 1, borderStyle: 'solid', borderColor: C.border,
    borderRadius: 12, overflow: 'hidden',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  searchFormFocused: {
    borderColor: 'rgba(245,200,66,0.4)',
    boxShadow: `0 0 0 3px ${C.accentDim}`,
  },
  searchIcon: { padding: '0 1rem 0 1.2rem', fontSize: '1.1rem', color: C.textMuted, flexShrink: 0 },
  searchInput: {
    flex: 1, padding: '1rem 0.5rem',
    background: 'transparent', border: 'none', outline: 'none',
    fontFamily: sans, fontSize: '0.95rem', color: C.text,
  },
  searchBtn: {
    flexShrink: 0, padding: '0.85rem 1.6rem',
    background: C.accent, color: C.bg, border: 'none', cursor: 'pointer',
    fontFamily: mono, fontSize: '0.7rem',
    textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700,
  },
  searchBtnDisabled: { opacity: 0.45, cursor: 'not-allowed' },

  errorBanner: {
    maxWidth: 960, margin: '1rem auto 0', padding: '0.75rem 1rem',
    background: C.error, color: C.errorText,
    borderRadius: 8, fontFamily: mono, fontSize: '0.68rem', letterSpacing: '0.05em',
  },

  loadingWrap: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '1rem', padding: '4rem 2rem',
  },
  dotsRow: { display: 'flex', gap: '0.5rem' },
  dot: {
    display: 'inline-block', width: 6, height: 6,
    borderRadius: '50%', background: C.accent,
    boxShadow: `0 0 6px ${C.accentGlow}`,
  },
  loadingText: {
    fontFamily: mono, fontSize: '0.65rem',
    textTransform: 'uppercase', letterSpacing: '0.12em',
    color: C.textMuted, margin: 0,
  },

  content: { maxWidth: 960, margin: '2rem auto 0', padding: '0 2rem', display: 'flex', flexDirection: 'column', gap: '1px', background: C.border, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' },

  section: { background: C.surface, padding: '2rem' },
  sectionLabel: {
    fontFamily: mono, fontSize: '0.58rem',
    textTransform: 'uppercase', letterSpacing: '0.14em',
    color: C.accent, marginBottom: '1rem',
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
  },
  summaryText: { fontFamily: sans, fontSize: '0.95rem', lineHeight: 1.8, color: C.textSec, margin: 0 },

  dualGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: C.border, borderRadius: 8, overflow: 'hidden' },
  dualLeft: { background: C.surface, padding: '1.5rem' },
  dualRight: { background: C.surfaceHigh, padding: '1.5rem' },

  contrarianCard: {
    border: `1px solid ${C.indigoBorder}`,
    background: C.indigo,
    borderRadius: 10, padding: '1.5rem',
  },
  contrarianLabel: {
    fontFamily: mono, fontSize: '0.58rem',
    textTransform: 'uppercase', letterSpacing: '0.14em',
    color: 'rgba(165,180,252,0.8)', marginBottom: '0.9rem',
  },
  contrarianText: { fontFamily: sans, fontSize: '0.92rem', lineHeight: 1.8, color: C.text, margin: '0 0 1rem' },
  watchList: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  watchItem: {
    display: 'flex', alignItems: 'flex-start', gap: '0.7rem',
    fontFamily: sans, fontSize: '0.88rem', lineHeight: 1.6, color: C.textSec,
  },
  watchBullet: {
    flexShrink: 0, width: 4, height: 4, borderRadius: '50%',
    background: C.accent, marginTop: '0.45rem',
    boxShadow: `0 0 6px ${C.accentGlow}`,
  },

  emptyState: { textAlign: 'center', padding: '6rem 2rem', maxWidth: 400, margin: '0 auto' },
  emptyIcon: { fontSize: '2.5rem', marginBottom: '1rem' },
  emptyTitle: { fontFamily: serif, fontSize: '1.3rem', fontWeight: 600, color: C.text, margin: '0 0 0.5rem' },
  emptyDesc: { fontFamily: sans, fontSize: '0.88rem', lineHeight: 1.7, color: C.textMuted, margin: 0 },
};