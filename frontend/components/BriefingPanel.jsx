// ════════════════════════════════════════════════
// BriefingPanel.jsx — PEAK UI/UX EDITION v2
// Backend: UNTOUCHED  |  Visuals: MAXIMAL
// ════════════════════════════════════════════════
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const C = {
  bg:'#07070a', surface:'#0f0f12', surfaceHigh:'#141418',
  border:'rgba(255,255,255,0.07)', text:'#f0f0f2', textSec:'#8a8a9a', textMuted:'#44445a',
  accent:'#f5c842', accentDim:'rgba(245,200,66,0.08)', accentGlow:'rgba(245,200,66,0.25)',
};
const mono  = "'JetBrains Mono','Fira Code',monospace";
const serif = "'Playfair Display',Georgia,serif";
const sans  = "'DM Sans',system-ui,sans-serif";

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
function SkeletonLine({ width = '100%', height = 14, delay = 0 }) {
  return (
    <motion.div
      style={{
        width, height, borderRadius:6,
        background:'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
        backgroundSize:'200% 100%',
        marginBottom:8,
      }}
      animate={{ backgroundPosition:['200% 0', '-200% 0'] }}
      transition={{ duration:1.8, repeat:Infinity, ease:'linear', delay }}
    />
  );
}

function SkeletonBriefing() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem', padding:'0.5rem 0' }}>
      {/* Header skeleton */}
      <div>
        <SkeletonLine width="60%" height={20} delay={0} />
        <SkeletonLine width="85%" height={14} delay={0.1} />
        <SkeletonLine width="75%" height={14} delay={0.2} />
        <SkeletonLine width="90%" height={14} delay={0.15} />
      </div>

      {/* Section */}
      <div>
        <SkeletonLine width="40%" height={18} delay={0.1} />
        <SkeletonLine width="100%" height={14} delay={0.2} />
        <SkeletonLine width="95%" height={14} delay={0.25} />
        <SkeletonLine width="88%" height={14} delay={0.3} />
        <SkeletonLine width="70%" height={14} delay={0.35} />
      </div>

      {/* Callout skeleton */}
      <div style={{
        border:`1px solid rgba(245,200,66,0.08)`, borderRadius:10,
        padding:'1rem', display:'flex', flexDirection:'column', gap:8,
      }}>
        <SkeletonLine width="45%" height={12} delay={0.2} />
        <SkeletonLine width="100%" height={14} delay={0.3} />
        <SkeletonLine width="80%" height={14} delay={0.35} />
      </div>
    </div>
  );
}

// ─── Table of Contents ────────────────────────────────────────────────────────
function TableOfContents({ headings, activeId }) {
  if (headings.length < 2) return null;
  return (
    <motion.div
      initial={{ opacity:0, x:-12 }}
      animate={{ opacity:1, x:0 }}
      transition={{ delay:0.3, duration:0.4 }}
      style={{
        position:'sticky', top:'1rem', alignSelf:'flex-start',
        width:180, flexShrink:0,
        borderRight:`1px solid rgba(255,255,255,0.05)`,
        paddingRight:'1.2rem',
      }}
    >
      <div style={{
        fontFamily:mono, fontSize:'0.5rem', textTransform:'uppercase',
        letterSpacing:'0.14em', color:C.textMuted, marginBottom:'0.75rem',
      }}>Contents</div>
      <div style={{ display:'flex', flexDirection:'column', gap:'0.35rem' }}>
        {headings.map((h, i) => {
          const isActive = activeId === h.id;
          return (
            <motion.button
              key={h.id}
              onClick={() => document.getElementById(h.id)?.scrollIntoView({ behavior:'smooth', block:'start' })}
              style={{
                background:'none', border:'none', cursor:'pointer', textAlign:'left',
                padding:'0.2rem 0 0.2rem 0.65rem',
                borderLeft:`2px solid ${isActive ? C.accent : 'rgba(255,255,255,0.06)'}`,
                transition:'border-color 0.2s',
              }}
              whileHover={{ paddingLeft:'0.85rem' }}
              transition={{ duration:0.15 }}
            >
              <span style={{
                fontFamily:sans, fontSize:'0.72rem', lineHeight:1.4,
                color: isActive ? C.accent : C.textMuted,
                transition:'color 0.2s',
                display:'block',
              }}>{h.text}</span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Reading Progress ─────────────────────────────────────────────────────────
function ReadingProgress({ contentRef }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const total = scrollHeight - clientHeight;
      setProgress(total > 0 ? Math.min(scrollTop / total, 1) : 0);
    };
    el.addEventListener('scroll', onScroll, { passive:true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [contentRef]);

  return (
    <div style={{ position:'relative', height:2, background:'rgba(255,255,255,0.05)', borderRadius:99, overflow:'hidden', marginBottom:'1.2rem' }}>
      <motion.div
        style={{
          position:'absolute', left:0, top:0, bottom:0,
          background:`linear-gradient(90deg, ${C.accent}, rgba(245,200,66,0.6))`,
          borderRadius:99,
          boxShadow:`0 0 8px rgba(245,200,66,0.4)`,
          scaleX:progress, transformOrigin:'left',
        }}
      />
      <motion.div
        style={{
          position:'absolute', top:'50%', transform:'translateY(-50%)',
          width:6, height:6, borderRadius:'50%',
          background:C.accent, boxShadow:`0 0 8px ${C.accent}`,
          left:`${progress * 100}%`,
          marginLeft:-3,
        }}
      />
    </div>
  );
}

// ─── Markdown Renderer ────────────────────────────────────────────────────────
function renderBriefing(text, headingRefs) {
  const lines = text.split('\n');
  const elements = [];
  let currentList = [];
  let sectionIdx = 0;

  const flushList = () => {
    if (!currentList.length) return;
    elements.push(
      <motion.ul
        key={`list-${elements.length}`}
        style={{ listStyle:'none', padding:0, margin:'0.25rem 0 0.75rem', display:'flex', flexDirection:'column', gap:'0.55rem' }}
        initial={{ opacity:0, x:-8 }}
        animate={{ opacity:1, x:0 }}
        transition={{ duration:0.35, delay:0.1 }}
      >
        {currentList.map((item, i) => (
          <li key={i} style={{ display:'flex', alignItems:'flex-start', gap:'0.75rem', fontFamily:sans, fontSize:'0.9rem', lineHeight:1.72, color:C.textSec }}>
            <motion.span
              style={{
                flexShrink:0, width:5, height:5, borderRadius:'50%',
                background:C.accent, marginTop:'0.55rem',
                boxShadow:`0 0 5px ${C.accentGlow}`,
                display:'inline-block',
              }}
              initial={{ scale:0 }}
              animate={{ scale:1 }}
              transition={{ delay:i * 0.06, duration:0.25, ease:'backOut' }}
            />
            <span>{item.replace(/^[-*•]\s*/, '')}</span>
          </li>
        ))}
      </motion.ul>
    );
    currentList = [];
  };

  lines.forEach((line, i) => {
    const t = line.trim();

    if (t.startsWith('## ')) {
      flushList();
      const headingText = t.replace('## ', '');
      const id = `section-${sectionIdx++}`;
      headingRefs.current.push({ id, text: headingText });
      elements.push(
        <motion.div
          key={`h-${i}`}
          id={id}
          style={{ marginTop: sectionIdx > 1 ? '1.8rem' : '0.5rem', marginBottom:'0.6rem' }}
          initial={{ opacity:0, y:10 }}
          animate={{ opacity:1, y:0 }}
          transition={{ duration:0.4, delay:0.05 }}
        >
          {/* Section divider */}
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.7rem' }}>
            <div style={{ flex:1, height:1, background:`linear-gradient(90deg, rgba(245,200,66,0.3), transparent)` }}/>
            <span style={{
              fontFamily:mono, fontSize:'0.46rem', textTransform:'uppercase',
              letterSpacing:'0.15em', color:C.accent, opacity:0.7,
            }}>§ {String(sectionIdx).padStart(2, '0')}</span>
          </div>
          <h3 style={{
            fontFamily:serif, fontSize:'1.18rem', fontWeight:700, color:C.text,
            margin:0, letterSpacing:'-0.02em', lineHeight:1.3,
          }}>
            {headingText}
          </h3>
        </motion.div>
      );

    } else if (t.startsWith('> ')) {
      // Pull quote
      flushList();
      const quoteText = t.replace('> ', '');
      elements.push(
        <motion.blockquote
          key={`bq-${i}`}
          style={{
            margin:'1.2rem 0', padding:'0',
            position:'relative',
          }}
          initial={{ opacity:0, x:-16 }}
          animate={{ opacity:1, x:0 }}
          transition={{ duration:0.45, delay:0.1 }}
        >
          {/* Giant quote mark */}
          <span style={{
            position:'absolute', top:-8, left:-4,
            fontFamily:serif, fontSize:'5rem', color:'rgba(245,200,66,0.12)',
            lineHeight:1, userSelect:'none', pointerEvents:'none',
            fontWeight:700,
          }}>"</span>
          <div style={{
            borderLeft:`3px solid ${C.accent}`,
            paddingLeft:'1.25rem', marginLeft:'0.5rem',
            background:`linear-gradient(135deg, rgba(245,200,66,0.06), transparent)`,
            borderRadius:'0 8px 8px 0', padding:'1rem 1.2rem',
          }}>
            <p style={{
              fontFamily:serif, fontSize:'1.05rem', fontStyle:'italic',
              color:C.text, margin:0, lineHeight:1.65, letterSpacing:'-0.01em',
            }}>{quoteText}</p>
          </div>
        </motion.blockquote>
      );

    } else if (t.startsWith('- ') || t.startsWith('* ') || t.startsWith('• ')) {
      currentList.push(t);

    } else if (t.startsWith('**') && t.endsWith('**')) {
      // Callout / highlight
      flushList();
      const calloutText = t.replace(/\*\*/g, '');
      elements.push(
        <motion.div
          key={`co-${i}`}
          style={{
            position:'relative', borderRadius:10, overflow:'hidden',
            marginBottom:'0.75rem',
          }}
          initial={{ opacity:0, scale:0.97 }}
          animate={{ opacity:1, scale:1 }}
          transition={{ duration:0.35, delay:0.1 }}
        >
          <div style={{
            border:`1px solid rgba(245,200,66,0.18)`,
            background:'rgba(245,200,66,0.06)',
            borderRadius:10, padding:'0.85rem 1rem 0.85rem 1.15rem',
            position:'relative',
          }}>
            <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:`linear-gradient(180deg, ${C.accent}, rgba(245,200,66,0.15))`, borderRadius:'10px 0 0 10px' }}/>
            <p style={{ fontFamily:sans, fontSize:'0.88rem', lineHeight:1.68, color:C.text, margin:0, fontWeight:500 }}>
              {calloutText}
            </p>
          </div>
        </motion.div>
      );

    } else if (t.length > 0) {
      flushList();
      elements.push(
        <motion.p
          key={`p-${i}`}
          style={{ fontFamily:sans, fontSize:'0.9rem', lineHeight:1.8, color:C.textSec, margin:'0 0 0.6rem' }}
          initial={{ opacity:0, y:6 }}
          animate={{ opacity:1, y:0 }}
          transition={{ duration:0.3, delay:0.05 }}
        >
          {t}
        </motion.p>
      );
    } else {
      flushList();
    }
  });

  flushList();
  return elements;
}

// ─── Source Chip ──────────────────────────────────────────────────────────────
function SourceChip({ source }) {
  const [hov, setHov] = useState(false);
  return (
    <motion.a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      title={source.title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        fontFamily:mono, fontSize:'0.56rem', textTransform:'uppercase', letterSpacing:'0.08em',
        color: hov ? C.accent : C.textMuted,
        background: hov ? 'rgba(245,200,66,0.08)' : C.surfaceHigh,
        border:`1px solid ${hov ? 'rgba(245,200,66,0.25)' : C.border}`,
        borderRadius:6, padding:'0.24rem 0.7rem', textDecoration:'none',
        transition:'all 0.18s', display:'inline-flex', alignItems:'center', gap:'0.3rem',
        whiteSpace:'nowrap',
      }}
    >
      <span style={{ opacity:0.6 }}>◈</span>
      {source.source}
    </motion.a>
  );
}

// ─── Main BriefingPanel ───────────────────────────────────────────────────────
export default function BriefingPanel({ briefingText, sources, loading }) {
  const [activeId, setActiveId] = useState('');
  const headingRefs = useRef([]);
  const contentRef = useRef(null);

  // Reset headings on new briefing
  useEffect(() => { headingRefs.current = []; }, [briefingText]);

  // Active heading observer
  useEffect(() => {
    if (!briefingText) return;
    const observers = [];
    setTimeout(() => {
      headingRefs.current.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (!el) return;
        const obs = new IntersectionObserver(
          ([entry]) => { if (entry.isIntersecting) setActiveId(id); },
          { threshold:0.4 }
        );
        obs.observe(el);
        observers.push(obs);
      });
    }, 300);
    return () => observers.forEach(o => o.disconnect());
  }, [briefingText]);

  // Loading state
  if (loading) return (
    <div style={{ fontFamily:sans, padding:'0.5rem 0' }}>
      {/* Animated dots header */}
      <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1.5rem' }}>
        <div style={{ display:'flex', gap:'0.35rem' }}>
          {[0,1,2].map(i => (
            <motion.span key={i}
              style={{ display:'inline-block', width:7, height:7, borderRadius:'50%', background:C.accent, boxShadow:`0 0 6px ${C.accentGlow}` }}
              animate={{ scale:[1,1.6,1], opacity:[0.4,1,0.4] }}
              transition={{ duration:1.1, repeat:Infinity, delay:i*0.18 }}
            />
          ))}
        </div>
        <span style={{ fontFamily:mono, fontSize:'0.6rem', textTransform:'uppercase', letterSpacing:'0.14em', color:C.textMuted }}>
          Building your briefing…
        </span>
      </div>
      <SkeletonBriefing />
    </div>
  );

  // Empty state
  if (!briefingText) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, padding:'3rem 2rem', textAlign:'center' }}>
      {/* Orbiting decoration */}
      <div style={{ position:'relative', width:70, height:70, marginBottom:'1.5rem' }}>
        <style>{`
          @keyframes orbit-a { from{transform:rotate(0deg) translateX(28px)} to{transform:rotate(360deg) translateX(28px)} }
          @keyframes orbit-b { from{transform:rotate(90deg) translateX(22px)} to{transform:rotate(450deg) translateX(22px)} }
        `}</style>
        <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:`1px solid rgba(245,200,66,0.15)` }}/>
        <div style={{ position:'absolute', inset:12, borderRadius:'50%', border:`1px dashed rgba(245,200,66,0.1)` }}/>
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)' }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'rgba(245,200,66,0.2)', border:`1px solid rgba(245,200,66,0.35)`, animation:'orbit-a 3s linear infinite' }}/>
        </div>
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)' }}>
          <div style={{ width:5, height:5, borderRadius:'50%', background:'rgba(245,200,66,0.15)', border:`1px solid rgba(245,200,66,0.25)`, animation:'orbit-b 4.5s linear infinite' }}/>
        </div>
        <span style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', fontSize:'1.5rem' }}>📰</span>
      </div>
      <p style={{ fontFamily:serif, fontSize:'1.25rem', fontWeight:700, color:C.text, margin:'0 0 0.6rem' }}>Ready to brief you</p>
      <p style={{ fontFamily:sans, fontSize:'0.88rem', color:C.textMuted, margin:0, maxWidth:300, lineHeight:1.65 }}>
        Enter a topic above to generate a deep, multi-source intelligence briefing.
      </p>
    </div>
  );

  // Reset headings before render
  headingRefs.current = [];
  const rendered = renderBriefing(briefingText, headingRefs);
  const hasHeadings = headingRefs.current.length >= 2;

  return (
    <div style={{ fontFamily:sans, height:'100%', display:'flex', flexDirection:'column' }}>
      {/* Reading Progress */}
      <ReadingProgress contentRef={contentRef} />

      <div style={{ display:'flex', gap:'1.5rem', flex:1, minHeight:0 }}>
        {/* TOC sidebar */}
        {hasHeadings && (
          <div style={{ display:'none' }} className="briefing-toc">
            <TableOfContents headings={headingRefs.current} activeId={activeId} />
          </div>
        )}
        <style>{`@media(min-width:780px){.briefing-toc{display:block!important}}`}</style>

        {/* Content */}
        <motion.div
          ref={contentRef}
          style={{
            flex:1, overflowY:'auto', minHeight:0,
            display:'flex', flexDirection:'column', gap:'0.25rem',
            scrollbarWidth:'thin', scrollbarColor:`rgba(245,200,66,0.15) transparent`,
            paddingRight:'0.25rem',
          }}
          initial={{ opacity:0, y:14 }}
          animate={{ opacity:1, y:0 }}
          transition={{ duration:0.5, ease:[0.22,1,0.36,1] }}
        >
          {rendered}
        </motion.div>
      </div>

      {/* Sources */}
      {sources?.length > 0 && (
        <motion.div
          style={{ marginTop:'1.5rem', paddingTop:'1.2rem', borderTop:`1px solid rgba(255,255,255,0.06)` }}
          initial={{ opacity:0 }}
          animate={{ opacity:1 }}
          transition={{ delay:0.5 }}
        >
          <div style={{
            fontFamily:mono, fontSize:'0.54rem', textTransform:'uppercase',
            letterSpacing:'0.15em', color:C.textMuted, marginBottom:'0.65rem',
            display:'flex', alignItems:'center', gap:'0.5rem',
          }}>
            <span style={{ color:C.accent, opacity:0.7 }}>◈</span>
            {sources.length} source{sources.length !== 1 ? 's' : ''} synthesized
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'0.45rem' }}>
            {sources.map((s, i) => (
              <motion.div key={i} initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 + i*0.05 }}>
                <SourceChip source={s} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}