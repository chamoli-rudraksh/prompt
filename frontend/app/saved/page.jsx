"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AuthGuard from "@/components/AuthGuard";
import ArticleCard from "@/components/ArticleCard";
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
  border:     'rgba(255,255,255,0.07)',
  borderDash: 'rgba(255,255,255,0.1)',
  text:       '#f0f0f2',
  textSec:    '#8a8a9a',
  textMuted:  '#44445a',
  accent:     '#f5c842',
  accentDim:  'rgba(245,200,66,0.10)',
  accentGlow: 'rgba(245,200,66,0.28)',
};

const mono  = "'JetBrains Mono','Fira Code',monospace";
const serif = "'Playfair Display',Georgia,serif";
const sans  = "'DM Sans',system-ui,sans-serif";

// ─── Saved Articles ───────────────────────────────────────────────────────────

function SavedArticles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch(`${API}/articles/saves`);
        const d   = await res.json();
        setArticles(d.articles || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div style={S.page}>

      {/* ── HEADER ── */}
      <div style={S.header}>
        <div style={S.headerInner}>
          <span style={S.pageTag}>Library</span>
          <h1 style={S.pageTitle}>Saved Articles</h1>
          <p style={S.pageDesc}>
            Your personally bookmarked stories, always within reach.
          </p>
        </div>
      </div>

      <div style={S.content}>

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
              <p style={S.loadingText}>Loading saved articles...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── EMPTY STATE ── */}
        {!loading && articles.length === 0 && (
          <motion.div
            style={S.emptyState}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div style={S.emptyIcon}>🔖</div>
            <h2 style={S.emptyTitle}>Nothing saved yet</h2>
            <p style={S.emptyDesc}>
              Bookmark articles from your feed — they'll appear here for quick access.
            </p>
          </motion.div>
        )}

        {/* ── ARTICLES GRID ── */}
        {!loading && articles.length > 0 && (
          <motion.div
            className="feed-grid"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
          >
            {articles.map((article, i) => (
              <motion.div
                key={article.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
                }}
              >
                <ArticleCard article={article} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
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
  headerInner: { maxWidth: 1100, margin: '0 auto' },
  pageTag: {
    fontFamily: mono, fontSize: '0.6rem',
    textTransform: 'uppercase', letterSpacing: '0.15em',
    color: C.accent, background: C.accentDim,
    padding: '0.25rem 0.8rem', borderRadius: 99,
    display: 'inline-block', marginBottom: '0.8rem',
  },
  pageTitle: {
    fontFamily: serif, fontSize: 'clamp(1.8rem, 3vw, 2.4rem)',
    fontWeight: 700, letterSpacing: '-0.03em',
    color: C.text, margin: '0 0 0.5rem',
  },
  pageDesc: {
    fontFamily: sans, fontSize: '0.92rem', lineHeight: 1.7,
    color: C.textSec, margin: 0,
  },

  content: { maxWidth: 1100, margin: '2.5rem auto', padding: '0 2rem' },

  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '5rem 0' },
  dotsRow: { display: 'flex', gap: '0.5rem' },
  dot: {
    display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
    background: C.accent, boxShadow: `0 0 6px ${C.accentGlow}`,
  },
  loadingText: {
    fontFamily: mono, fontSize: '0.62rem',
    textTransform: 'uppercase', letterSpacing: '0.12em', color: C.textMuted, margin: 0,
  },

  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
    border: `1px dashed ${C.borderDash}`,
    borderRadius: 16,
    background: C.surface,
  },
  emptyIcon: { fontSize: '2.5rem', marginBottom: '1rem' },
  emptyTitle: {
    fontFamily: serif, fontSize: '1.3rem', fontWeight: 600,
    color: C.text, margin: '0 0 0.5rem',
  },
  emptyDesc: {
    fontFamily: sans, fontSize: '0.88rem', lineHeight: 1.7,
    color: C.textMuted, margin: 0, maxWidth: 340, marginLeft: 'auto', marginRight: 'auto',
  },
};

// ─── Export ───────────────────────────────────────────────────────────────────

export default function SavedPage() {
  return <AuthGuard><SavedArticles /></AuthGuard>;
}