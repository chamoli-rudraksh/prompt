'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import BriefingPanel from '@/components/BriefingPanel';
import ChatPanel from '@/components/ChatPanel';
import { createBriefing } from '@/lib/api';
import AuthGuard from '@/components/AuthGuard';
import { getUser } from '@/lib/auth';
import SearchHistory, { saveSearch } from '@/components/SearchHistory';

// ─── Backend (untouched) ──────────────────────────────────────────────────────

const STORAGE_KEY = 'etnewsai_navigator_state';

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

// ─── Animated loading dots ────────────────────────────────────────────────────

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

// ─── Navigator Inner ──────────────────────────────────────────────────────────

function NavigatorInner() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [briefingText, setBriefingText] = useState('');
  const [sources, setSources] = useState([]);
  const [conversationId, setConversationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        setQuery(state.query || '');
        setBriefingText(state.briefingText || '');
        setSources(state.sources || []);
        setConversationId(state.conversationId || '');
      }
    } catch {}
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) { setQuery(q); handleSearch(null, q); }
  }, []);

  const saveState = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ query, briefingText, sources, conversationId }));
    } catch {}
  }, [query, briefingText, sources, conversationId]);

  useEffect(() => { saveState(); }, [saveState]);

  const handleSearch = async (e, overrideQuery) => {
    if (e) e.preventDefault();
    const searchQuery = overrideQuery || query;
    if (!searchQuery.trim()) return;

    saveSearch(searchQuery);
    setLoading(true);
    setError('');
    setBriefingText('');
    setSources([]);
    setConversationId('');

    try {
      const activeUser = getUser();
      const userId = activeUser?.id || 'anonymous';
      const data = await createBriefing(searchQuery, userId);
      setBriefingText(data.briefing || data.briefing_text || '');
      setSources(data.sources || []);
      setConversationId(data.conversation_id || '');
    } catch (err) {
      console.error('Briefing error:', err);
      setError('Failed to generate briefing. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleHistorySelect = (q) => { setQuery(q); handleSearch(null, q); };

  const hasResults = briefingText || sources.length > 0;

  return (
    <div style={S.page}>

      {/* ── PAGE HEADER ── */}
      <div style={S.pageHeader}>
        <div style={S.pageHeaderInner}>
          <span style={S.pageTag}>News Navigator</span>
          <h1 style={S.pageTitle}>Deep Briefings</h1>
          <p style={S.pageDesc}>
            Search any topic, company, or event — get a multi-source AI briefing you can interrogate.
          </p>
        </div>
      </div>

      {/* ── SEARCH BAR ── */}
      <div style={S.searchWrap}>
        <form onSubmit={handleSearch} style={{ ...S.searchForm, ...(focused ? S.searchFormFocused : {}) }}>
          <span style={S.searchIcon}>⌕</span>
          <input
            id="navigator-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search any business topic, company, or event..."
            style={S.searchInput}
          />
          <motion.button
            id="navigator-search-btn"
            type="submit"
            disabled={!query.trim() || loading}
            style={{ ...S.searchBtn, ...((!query.trim() || loading) ? S.searchBtnDisabled : {}) }}
            whileHover={query.trim() && !loading ? { scale: 1.03 } : {}}
            whileTap={query.trim() && !loading ? { scale: 0.97 } : {}}
          >
            {loading ? 'Analyzing...' : 'Get Briefing'}
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
        {loading && <LoadingState text="Gathering sources and building your briefing..." />}
      </AnimatePresence>

      {/* ── RESULTS ── */}
      <AnimatePresence>
        {hasResults && !loading && (
          <motion.div
            style={S.layout}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div style={S.briefingCol}>
              <BriefingPanel briefingText={briefingText} sources={sources} loading={loading} />
            </div>
            <div style={S.chatCol}>
              <ChatPanel conversationId={conversationId} sources={sources} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── EMPTY STATE ── */}
      {!hasResults && !loading && !error && (
        <motion.div
          style={S.emptyState}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div style={S.emptyIcon}>🧭</div>
          <p style={S.emptyTitle}>Ready to brief you</p>
          <p style={S.emptyDesc}>Type any topic above to get a deep, multi-source AI briefing.</p>
        </motion.div>
      )}
    </div>
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
  pageHeaderInner: { maxWidth: 900, margin: '0 auto' },
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

  searchWrap: { maxWidth: 900, margin: '2rem auto 0', padding: '0 2rem' },
  searchForm: {
    display: 'flex', alignItems: 'center', gap: 0,
    background: C.surface,
    borderWidth: 1, borderStyle: 'solid', borderColor: C.border,
    borderRadius: 12, overflow: 'hidden',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  searchFormFocused: {
    borderColor: 'rgba(245,200,66,0.4)',
    boxShadow: `0 0 0 3px ${C.accentDim}`,
  },
  searchIcon: {
    padding: '0 1rem 0 1.2rem',
    fontSize: '1.1rem', color: C.textMuted,
    flexShrink: 0,
  },
  searchInput: {
    flex: 1, padding: '1rem 0.5rem',
    background: 'transparent', border: 'none', outline: 'none',
    fontFamily: sans, fontSize: '0.95rem', color: C.text,
  },
  searchBtn: {
    flexShrink: 0,
    padding: '0.85rem 1.6rem',
    background: C.accent, color: C.bg,
    border: 'none', cursor: 'pointer',
    fontFamily: mono, fontSize: '0.7rem',
    textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700,
    transition: 'opacity 0.15s',
  },
  searchBtnDisabled: { opacity: 0.45, cursor: 'not-allowed' },

  errorBanner: {
    maxWidth: 900, margin: '1rem auto 0', padding: '0 2rem',
    background: C.error, color: C.errorText,
    borderRadius: 8, fontFamily: mono,
    fontSize: '0.68rem', letterSpacing: '0.05em',
    padding: '0.75rem 1rem',
  },

  loadingWrap: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '1rem',
    padding: '4rem 2rem',
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

  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr 380px',
    gap: 1,
    maxWidth: 1200,
    margin: '2rem auto 0',
    padding: '0 2rem',
    background: C.border,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    overflow: 'hidden',
  },
  briefingCol: { background: C.surface, padding: '2rem' },
  chatCol: { background: C.surfaceHigh, padding: '2rem' },

  emptyState: {
    textAlign: 'center',
    padding: '6rem 2rem',
    maxWidth: 400, margin: '0 auto',
  },
  emptyIcon: { fontSize: '2.5rem', marginBottom: '1rem' },
  emptyTitle: {
    fontFamily: serif, fontSize: '1.3rem', fontWeight: 600,
    color: C.text, margin: '0 0 0.5rem',
  },
  emptyDesc: {
    fontFamily: sans, fontSize: '0.88rem', lineHeight: 1.7,
    color: C.textMuted, margin: 0,
  },
};

// ─── Export ───────────────────────────────────────────────────────────────────

export default function NavigatorPage() {
  return (
    <AuthGuard>
      <Suspense fallback={
        <div style={{ padding: 40, textAlign: 'center', fontFamily: mono, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.textMuted }}>
          Loading...
        </div>
      }>
        <NavigatorInner />
      </Suspense>
    </AuthGuard>
  );
}