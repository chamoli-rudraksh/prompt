'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Design tokens ────────────────────────────────────────────────

const C = {
  bg:         '#0a0a0e',
  surface:    '#111116',
  surfaceAlt: '#161620',
  border:     'rgba(255,255,255,0.07)',
  text:       '#f0f0f2',
  textSec:    '#8a8a9a',
  textMuted:  '#44445a',
  accent:     '#f5c842',
  accentDim:  'rgba(245,200,66,0.10)',
  accentGlow: 'rgba(245,200,66,0.28)',
  green:      '#00ff88',
  greenDim:   'rgba(0,255,136,0.06)',
  cyan:       '#00d4ff',
  cyanDim:    'rgba(0,212,255,0.06)',
  red:        '#ff4444',
  redDim:     'rgba(255,68,68,0.06)',
  purple:     '#a855f7',
  purpleDim:  'rgba(168,85,247,0.06)',
  orange:     '#f97316',
  orangeDim:  'rgba(249,115,22,0.06)',
};

const mono  = "'JetBrains Mono','Fira Code',monospace";
const serif = "'Playfair Display',Georgia,serif";
const sans  = "'DM Sans',system-ui,sans-serif";

// ── Angle config (icons + colors) ────────────────────────────────

const ANGLE_CONFIG = {
  macro_impact:           { icon: '🌐', label: 'Macro Impact',            color: C.cyan,   dimColor: C.cyanDim   },
  sector_winners_losers:  { icon: '📊', label: 'Sector Winners & Losers', color: C.green,  dimColor: C.greenDim  },
  market_reaction:        { icon: '📈', label: 'Market Reaction',         color: C.orange, dimColor: C.orangeDim },
  expert_commentary:      { icon: '🎯', label: 'Expert Commentary',       color: C.purple, dimColor: C.purpleDim },
  what_to_watch:          { icon: '👁', label: 'What to Watch',            color: C.red,    dimColor: C.redDim    },
};

const ANGLE_ORDER = ['macro_impact', 'sector_winners_losers', 'market_reaction', 'expert_commentary', 'what_to_watch'];

// ── Accordion Item ───────────────────────────────────────────────

function AngleSection({ angleKey, data, isOpen, onToggle, index }) {
  const config = ANGLE_CONFIG[angleKey] || { icon: '•', label: angleKey, color: C.accent, dimColor: C.accentDim };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        ...S.angleItem,
        borderLeft: `3px solid ${isOpen ? config.color : 'transparent'}`,
        background: isOpen ? config.dimColor : C.surface,
      }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        style={S.angleHeader}
      >
        <div style={S.angleHeaderLeft}>
          <span style={{ fontSize: '1.1rem' }}>{config.icon}</span>
          <span style={{
            ...S.angleLabel,
            color: isOpen ? config.color : C.text,
          }}>
            {data?.title || config.label}
          </span>
        </div>
        <motion.span
          style={{ ...S.angleChevron, color: isOpen ? config.color : C.textMuted }}
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25 }}
        >
          ▼
        </motion.span>
      </button>

      {/* Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={S.angleContent}>
              {/* Content text */}
              {data?.content && (
                <div style={S.contentText}>
                  {data.content.split('\n').map((line, i) => (
                    <p key={i} style={{ margin: '0 0 0.6rem', lineHeight: 1.8 }}>
                      {line}
                    </p>
                  ))}
                </div>
              )}

              {/* Cited sources */}
              {data?.sources && data.sources.length > 0 && (
                <div style={S.sourcesRow}>
                  <span style={S.sourcesLabel}>Sources:</span>
                  {data.sources.map((s, i) => (
                    <span key={i} style={{ ...S.sourceChip, borderColor: config.color, color: config.color }}>
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main BriefingPanel ───────────────────────────────────────────

export default function BriefingPanel({ briefingText, sources, loading }) {
  const [openAngles, setOpenAngles] = useState(new Set(['macro_impact']));

  // Parse the briefing JSON. If it's a string, try to parse. If it's already markdown, use legacy rendering.
  const parsedBriefing = useMemo(() => {
    if (!briefingText) return null;
    try {
      const parsed = typeof briefingText === 'string' ? JSON.parse(briefingText) : briefingText;
      // Check if it has the new structured format
      if (parsed.macro_impact || parsed.sector_winners_losers) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }, [briefingText]);

  const toggleAngle = (key) => {
    setOpenAngles(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const expandAll = () => setOpenAngles(new Set(ANGLE_ORDER));
  const collapseAll = () => setOpenAngles(new Set());

  if (loading) {
    return (
      <div style={S.panel}>
        <div style={S.loadingWrap}>
          <div style={S.loadingDots}>
            {[0, 1, 2].map(i => (
              <motion.span
                key={i}
                style={S.dot}
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
              />
            ))}
          </div>
          <p style={S.loadingText}>Synthesizing multi-angle briefing...</p>
          <div style={S.loadingSteps}>
            {['Searching articles', 'Analyzing perspectives', 'Building briefing'].map((step, i) => (
              <motion.div
                key={step}
                style={S.loadingStep}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 + i * 1.5, duration: 0.4 }}
              >
                <motion.span
                  style={S.loadingStepDot}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                />
                {step}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!briefingText) {
    return (
      <div style={S.panel}>
        <div style={S.emptyWrap}>
          <div style={{ fontSize: '2rem', marginBottom: '0.8rem' }}>🧭</div>
          <p style={S.emptyText}>Enter a topic above to generate a deep multi-angle briefing.</p>
        </div>
      </div>
    );
  }

  // ── Structured JSON rendering (new) ──
  if (parsedBriefing) {
    return (
      <div style={S.panel}>
        {/* Summary */}
        {parsedBriefing.summary && (
          <motion.div
            style={S.summaryBlock}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span style={S.summaryLabel}>Executive Summary</span>
            <p style={S.summaryText}>{parsedBriefing.summary}</p>
          </motion.div>
        )}

        {/* Controls */}
        <div style={S.controlBar}>
          <span style={S.controlLabel}>{ANGLE_ORDER.length} analysis angles</span>
          <div style={S.controlBtns}>
            <button onClick={expandAll} style={S.controlBtn}>Expand all</button>
            <button onClick={collapseAll} style={S.controlBtn}>Collapse all</button>
          </div>
        </div>

        {/* Angle accordion */}
        <div style={S.anglesWrap}>
          {ANGLE_ORDER.map((key, i) => (
            <AngleSection
              key={key}
              angleKey={key}
              data={parsedBriefing[key]}
              isOpen={openAngles.has(key)}
              onToggle={() => toggleAngle(key)}
              index={i}
            />
          ))}
        </div>

        {/* Sources */}
        {sources && sources.length > 0 && (
          <div style={S.sourcesBlock}>
            <h4 style={S.sourcesTitle}>All Sources Referenced</h4>
            <div style={S.sourcesChips}>
              {sources.map((source, i) => (
                <a
                  key={i}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={S.sourceLink}
                  title={source.title}
                >
                  {source.source}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Legacy markdown rendering (fallback) ──
  const renderBriefing = (text) => {
    const lines = text.split('\n');
    const elements = [];
    let currentList = [];

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} style={S.legacyList}>
            {currentList.map((item, i) => (
              <li key={i}>{item.replace(/^[-*•]\s*/, '')}</li>
            ))}
          </ul>
        );
        currentList = [];
      }
    };

    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('## ')) {
        flushList();
        elements.push(
          <h3 key={i} style={S.legacyHeading}>{trimmed.replace('## ', '')}</h3>
        );
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
        currentList.push(trimmed);
      } else if (trimmed.length > 0) {
        flushList();
        elements.push(<p key={i} style={S.legacyParagraph}>{trimmed}</p>);
      } else {
        flushList();
      }
    });

    flushList();
    return elements;
  };

  return (
    <div style={S.panel}>
      <div style={S.legacyContent}>{renderBriefing(briefingText)}</div>
      {sources && sources.length > 0 && (
        <div style={S.sourcesBlock}>
          <h4 style={S.sourcesTitle}>Sources</h4>
          <div style={S.sourcesChips}>
            {sources.map((source, i) => (
              <a key={i} href={source.url} target="_blank" rel="noopener noreferrer" style={S.sourceLink} title={source.title}>
                {source.source}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────

const S = {
  panel: {
    background: C.bg,
    borderRadius: 12,
    border: `1px solid ${C.border}`,
    overflow: 'hidden',
  },

  // Loading
  loadingWrap: { padding: '3rem 2rem', textAlign: 'center' },
  loadingDots: { display: 'flex', justifyContent: 'center', gap: 6, marginBottom: '1rem' },
  dot: {
    width: 6, height: 6, borderRadius: '50%',
    background: C.accent, boxShadow: `0 0 6px ${C.accentGlow}`,
  },
  loadingText: {
    fontFamily: sans, fontSize: '0.85rem', color: C.textSec, margin: '0 0 1.5rem',
  },
  loadingSteps: { display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' },
  loadingStep: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontFamily: mono, fontSize: '0.62rem', color: C.textMuted,
    textTransform: 'uppercase', letterSpacing: '0.1em',
  },
  loadingStepDot: {
    width: 4, height: 4, borderRadius: '50%',
    background: C.accent,
  },

  // Empty
  emptyWrap: { padding: '3rem 2rem', textAlign: 'center' },
  emptyText: { fontFamily: sans, fontSize: '0.88rem', color: C.textMuted, margin: 0 },

  // Summary
  summaryBlock: {
    padding: '1.5rem 1.8rem',
    borderBottom: `1px solid ${C.border}`,
    background: C.surface,
  },
  summaryLabel: {
    fontFamily: mono, fontSize: '0.55rem',
    textTransform: 'uppercase', letterSpacing: '0.14em',
    color: C.accent, display: 'block', marginBottom: '0.5rem',
  },
  summaryText: {
    fontFamily: serif, fontSize: '1.05rem', lineHeight: 1.7,
    color: C.text, margin: 0, fontStyle: 'italic',
  },

  // Controls
  controlBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '0.8rem 1.8rem',
    borderBottom: `1px solid ${C.border}`,
    background: C.surface,
  },
  controlLabel: {
    fontFamily: mono, fontSize: '0.55rem',
    textTransform: 'uppercase', letterSpacing: '0.12em', color: C.textMuted,
  },
  controlBtns: { display: 'flex', gap: 6 },
  controlBtn: {
    fontFamily: mono, fontSize: '0.55rem', color: C.textMuted,
    background: 'transparent', border: `1px solid ${C.border}`,
    padding: '0.25rem 0.6rem', borderRadius: 4, cursor: 'pointer',
    transition: 'all 0.15s',
  },

  // Angles
  anglesWrap: { display: 'flex', flexDirection: 'column' },
  angleItem: {
    borderBottom: `1px solid ${C.border}`,
    transition: 'all 0.25s ease',
  },
  angleHeader: {
    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '1rem 1.8rem', background: 'transparent', border: 'none',
    cursor: 'pointer', fontFamily: sans, textAlign: 'left',
  },
  angleHeaderLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  angleLabel: {
    fontSize: '0.88rem', fontWeight: 600,
    transition: 'color 0.2s',
  },
  angleChevron: { fontSize: '0.6rem', transition: 'color 0.2s' },
  angleContent: { padding: '0 1.8rem 1.2rem' },
  contentText: {
    fontFamily: sans, fontSize: '0.85rem', color: C.textSec, lineHeight: 1.8,
  },
  sourcesRow: {
    display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
    marginTop: '0.8rem', paddingTop: '0.8rem',
    borderTop: `1px solid ${C.border}`,
  },
  sourcesLabel: {
    fontFamily: mono, fontSize: '0.5rem', color: C.textMuted,
    textTransform: 'uppercase', letterSpacing: '0.12em',
  },
  sourceChip: {
    fontFamily: mono, fontSize: '0.52rem',
    padding: '0.15rem 0.5rem', borderRadius: 99,
    border: '1px solid', background: 'transparent',
  },

  // Sources block
  sourcesBlock: {
    padding: '1.2rem 1.8rem',
    background: C.surface,
    borderTop: `1px solid ${C.border}`,
  },
  sourcesTitle: {
    fontFamily: mono, fontSize: '0.55rem',
    textTransform: 'uppercase', letterSpacing: '0.12em',
    color: C.textMuted, margin: '0 0 0.6rem',
  },
  sourcesChips: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  sourceLink: {
    fontFamily: mono, fontSize: '0.58rem',
    padding: '0.2rem 0.6rem', borderRadius: 99,
    background: C.accentDim, color: C.accent,
    border: `1px solid rgba(245,200,66,0.15)`,
    textDecoration: 'none', transition: 'all 0.15s',
  },

  // Legacy (fallback)
  legacyContent: { padding: '1.5rem 1.8rem' },
  legacyHeading: {
    fontFamily: serif, fontSize: '1rem', fontWeight: 700,
    color: C.text, margin: '1.2rem 0 0.5rem',
  },
  legacyParagraph: {
    fontFamily: sans, fontSize: '0.85rem', lineHeight: 1.8,
    color: C.textSec, margin: '0 0 0.5rem',
  },
  legacyList: {
    fontFamily: sans, fontSize: '0.85rem', lineHeight: 1.8,
    color: C.textSec, paddingLeft: '1.5rem', margin: '0 0 0.8rem',
  },
};