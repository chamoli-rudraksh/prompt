// ════════════════════════════════════════
// SearchHistory.jsx — PEAK UI/UX EDITION v2
// Backend: UNTOUCHED  |  Visuals: MAXIMAL
// ════════════════════════════════════════
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Backend logic (untouched) ────────────────────────────────────────────────
const KEY = "et_search_history";
const MAX = 8;

export function saveSearch(query) {
  try {
    const updated = [query, ...getHistory().filter(h => h !== query)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {}
}

export function getHistory() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

// ─── Tokens ───────────────────────────────────────────────────────────────────
const C = {
  surface:'#0f0f12', surfaceHigh:'#141418',
  border:'rgba(255,255,255,0.07)', text:'#f0f0f2', textSec:'#8a8a9a', textMuted:'#44445a',
  accent:'#f5c842', accentDim:'rgba(245,200,66,0.10)', accentGlow:'rgba(245,200,66,0.25)',
};
const mono = "'JetBrains Mono','Fira Code',monospace";
const sans = "'DM Sans',system-ui,sans-serif";

// ─── Search Pill ──────────────────────────────────────────────────────────────
function SearchPill({ query, index, onSelect, onRemove }) {
  const [hov, setHov] = useState(false);
  return (
    <motion.div
      style={{ position:'relative', display:'inline-flex', alignItems:'center' }}
      initial={{ opacity:0, scale:0.85, y:6 }}
      animate={{ opacity:1, scale:1, y:0 }}
      exit={{ opacity:0, scale:0.75, y:-4 }}
      transition={{ delay:index * 0.04, duration:0.28, ease:'backOut' }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* Main pill */}
      <motion.button
        onClick={() => onSelect(query)}
        style={{
          paddingLeft:'0.75rem',
          paddingRight: hov ? '2rem' : '0.75rem',
          paddingTop:'0.3rem', paddingBottom:'0.3rem',
          borderRadius:99,
          fontFamily:mono, fontSize:'0.58rem',
          textTransform:'uppercase', letterSpacing:'0.08em',
          border:`1px solid ${hov ? 'rgba(245,200,66,0.3)' : C.border}`,
          background: hov ? C.accentDim : C.surface,
          color: hov ? C.accent : C.textSec,
          cursor:'pointer',
          display:'flex', alignItems:'center', gap:'0.35rem',
          transition:'all 0.18s',
          whiteSpace:'nowrap',
          boxShadow: hov ? `0 0 12px rgba(245,200,66,0.08)` : 'none',
        }}
        whileTap={{ scale:0.95 }}
      >
        <motion.span
          style={{ fontSize:'0.6rem', opacity:0.7 }}
          animate={{ rotate: hov ? 15 : 0 }}
          transition={{ duration:0.2 }}
        >◷</motion.span>
        {query}
      </motion.button>

      {/* Remove X button — reveals on hover */}
      <AnimatePresence>
        {hov && (
          <motion.button
            onClick={(e) => { e.stopPropagation(); onRemove(query); }}
            style={{
              position:'absolute', right:6,
              background:'transparent', border:'none', cursor:'pointer',
              color:'rgba(245,200,66,0.5)', fontFamily:mono, fontSize:'0.55rem',
              lineHeight:1, padding:'0.1rem',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}
            initial={{ opacity:0, scale:0.6 }}
            animate={{ opacity:1, scale:1 }}
            exit={{ opacity:0, scale:0.6 }}
            transition={{ duration:0.12 }}
            whileHover={{ color:C.accent }}
            whileTap={{ scale:0.85 }}
            title="Remove"
          >×</motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main SearchHistory ───────────────────────────────────────────────────────
export default function SearchHistory({ onSelect }) {
  const [history, setHistory] = useState([]);

  useEffect(() => { setHistory(getHistory()); }, []);

  const removeItem = (query) => {
    const updated = history.filter(h => h !== query);
    setHistory(updated);
    try { localStorage.setItem(KEY, JSON.stringify(updated)); } catch {}
  };

  const clearAll = () => {
    setHistory([]);
    try { localStorage.removeItem(KEY); } catch {}
  };

  if (!history.length) return null;

  return (
    <motion.div
      style={{ margin:'0.65rem 0 0', padding:'0 1.5rem', maxWidth:860, marginLeft:'auto', marginRight:'auto' }}
      initial={{ opacity:0, y:6 }}
      animate={{ opacity:1, y:0 }}
      transition={{ duration:0.35 }}
    >
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.55rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
          <span style={{ fontFamily:mono, fontSize:'0.5rem', textTransform:'uppercase', letterSpacing:'0.14em', color:C.textMuted }}>
            Recent
          </span>
          <span style={{
            fontFamily:mono, fontSize:'0.46rem', color:C.accent,
            background:'rgba(245,200,66,0.08)', border:'1px solid rgba(245,200,66,0.18)',
            borderRadius:99, padding:'0.05rem 0.38rem',
          }}>{history.length}</span>
        </div>

        <motion.button
          onClick={clearAll}
          style={{
            background:'none', border:'none', cursor:'pointer',
            fontFamily:mono, fontSize:'0.5rem', textTransform:'uppercase',
            letterSpacing:'0.1em', color:C.textMuted,
            display:'flex', alignItems:'center', gap:'0.25rem',
            transition:'color 0.15s',
          }}
          whileHover={{ color:'#f87171' }}
          whileTap={{ scale:0.95 }}
        >
          <span style={{ fontSize:'0.6rem' }}>✕</span> Clear all
        </motion.button>
      </div>

      {/* Pills */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem' }}>
        <AnimatePresence>
          {history.map((h, i) => (
            <SearchPill
              key={h}
              query={h}
              index={i}
              onSelect={onSelect}
              onRemove={removeItem}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}