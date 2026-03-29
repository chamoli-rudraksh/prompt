// ════════════════════════════════════════════════
// AudioButton.jsx — PEAK UI/UX EDITION v2
// Backend: UNTOUCHED  |  Visuals: MAXIMAL
// ════════════════════════════════════════════════
'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const C = {
  bg:'#07070a', surface:'#0f0f12', surfaceHigh:'#141418',
  border:'rgba(255,255,255,0.07)', text:'#f0f0f2', textMuted:'#44445a',
  accent:'#f5c842', accentDim:'rgba(245,200,66,0.10)', accentGlow:'rgba(245,200,66,0.3)',
};
const mono = "'JetBrains Mono','Fira Code',monospace";
const sans = "'DM Sans',system-ui,sans-serif";

const SPEEDS = [0.8, 1, 1.5, 2];

// ─── Animated Waveform ────────────────────────────────────────────────────────
const BAR_HEIGHTS = [4, 8, 12, 10, 6, 14, 9, 7, 11, 5, 13, 8];

function AnimatedWaveform({ playing }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:2, height:18 }}>
      <style>{`
        @keyframes wave-bar {
          0%, 100% { transform: scaleY(0.3); }
          50%       { transform: scaleY(1); }
        }
      `}</style>
      {BAR_HEIGHTS.map((h, i) => (
        <div key={i} style={{
          width: 2.5,
          height: h,
          borderRadius: 99,
          background: playing ? C.accent : 'rgba(255,255,255,0.18)',
          transformOrigin: 'center',
          boxShadow: playing ? `0 0 4px rgba(245,200,66,0.4)` : 'none',
          animation: playing ? `wave-bar ${0.6 + (i % 4) * 0.15}s ease-in-out infinite` : 'none',
          animationDelay: `${i * 0.07}s`,
          transition: 'background 0.25s, box-shadow 0.25s',
        }}/>
      ))}
    </div>
  );
}

// ─── Progress Arc ─────────────────────────────────────────────────────────────
function ProgressArc({ progress, playing }) {
  const r = 11; const cx = 14; const cy = 14;
  const circ = 2 * Math.PI * r;
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2"/>
      {playing && (
        <motion.circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={C.accent} strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - progress)}
          style={{ transformOrigin:'center', transform:'rotate(-90deg)', transformBox:'fill-box' }}
          transition={{ duration:0.5 }}
        />
      )}
    </svg>
  );
}

// ─── Main AudioButton ─────────────────────────────────────────────────────────
export default function AudioButton({ text, onPlayChange }) {
  const [playing, setPlaying]   = useState(false);
  const [speed, setSpeed]       = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hovered, setHovered]   = useState(false);
  const uttRef      = useRef(null);
  const intervalRef = useRef(null);
  const startRef    = useRef(null);
  const textLen     = useRef(text?.trim().split(/\s+/).length || 0);

  const estimatedDuration = (textLen.current / 150) * 60 * (1 / speed); // seconds

  const clearProgress = () => {
    clearInterval(intervalRef.current);
    setProgress(0);
  };

  const startProgress = (dur) => {
    startRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const p = Math.min(elapsed / dur, 1);
      setProgress(p);
      if (p >= 1) clearInterval(intervalRef.current);
    }, 100);
  };

  // ── Backend logic untouched ──
  function handlePlay() {
    const synth = window.speechSynthesis;
    if (!synth) { alert("Your browser does not support text-to-speech."); return; }
    if (playing) {
      synth.cancel();
      setPlaying(false);
      onPlayChange?.(false);
      clearProgress();
      return;
    }
    synth.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = speed;
    utt.lang = "en-US";
    const voices = synth.getVoices();
    if (voices.length) { const v = voices.find(v => v.lang.startsWith("en")); if (v) utt.voice = v; }
    const keepAlive = setInterval(() => {
      if (!synth.speaking) { clearInterval(keepAlive); return; }
      synth.pause(); synth.resume();
    }, 10000);
    const est = estimatedDuration;
    utt.onstart  = () => startProgress(est);
    utt.onend    = () => { clearInterval(keepAlive); clearProgress(); setPlaying(false); onPlayChange?.(false); };
    utt.onerror  = () => { clearInterval(keepAlive); clearProgress(); setPlaying(false); onPlayChange?.(false); };
    uttRef.current = utt;
    synth.speak(utt);
    setPlaying(true);
    onPlayChange?.(true);
  }

  function handleSpeedChange(s) {
    setSpeed(s);
    if (playing) {
      window.speechSynthesis.cancel();
      clearProgress();
      setTimeout(() => {
        const utt = new SpeechSynthesisUtterance(text);
        utt.rate = s; utt.lang = "en-US";
        const est = (textLen.current / 150) * 60 * (1 / s);
        utt.onstart = () => startProgress(est);
        utt.onend   = () => { clearProgress(); setPlaying(false); onPlayChange?.(false); };
        utt.onerror = () => { clearProgress(); setPlaying(false); onPlayChange?.(false); };
        uttRef.current = utt;
        window.speechSynthesis.speak(utt);
      }, 60);
    }
  }

  useEffect(() => () => { window.speechSynthesis?.cancel(); clearInterval(intervalRef.current); }, []);

  return (
    <div
      style={{ display:'flex', alignItems:'center', gap:'0.55rem', flexWrap:'wrap' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Main play button */}
      <motion.button
        onClick={handlePlay}
        title={playing ? 'Stop' : 'Listen to summary'}
        style={{
          position:'relative',
          width:28, height:28, borderRadius:'50%', padding:0,
          border:`1px solid ${playing ? C.accent : 'rgba(255,255,255,0.1)'}`,
          background: playing ? 'rgba(245,200,66,0.12)' : 'rgba(255,255,255,0.04)',
          cursor:'pointer', flexShrink:0,
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'all 0.2s',
          boxShadow: playing ? `0 0 12px rgba(245,200,66,0.25)` : 'none',
        }}
        whileHover={{ scale:1.1, borderColor:'rgba(245,200,66,0.5)', background:'rgba(245,200,66,0.1)' }}
        whileTap={{ scale:0.88 }}
      >
        <ProgressArc progress={progress} playing={playing} />
        <AnimatePresence mode="wait">
          <motion.span
            key={playing ? 'stop' : 'play'}
            style={{ fontFamily:mono, fontSize:'0.55rem', color: playing ? C.accent : C.textMuted, lineHeight:1, position:'relative', zIndex:1 }}
            initial={{ scale:0.5, opacity:0 }}
            animate={{ scale:1, opacity:1 }}
            exit={{ scale:0.5, opacity:0 }}
            transition={{ duration:0.15 }}
          >
            {playing ? '■' : '▶'}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      {/* Waveform + label */}
      <motion.div
        style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}
        animate={{ opacity: playing || hovered ? 1 : 0.6 }}
        transition={{ duration:0.2 }}
      >
        <AnimatedWaveform playing={playing} />
        <span style={{
          fontFamily:mono, fontSize:'0.52rem', textTransform:'uppercase',
          letterSpacing:'0.1em', color: playing ? C.accent : C.textMuted,
          transition:'color 0.2s',
        }}>
          {playing ? 'Playing' : 'Listen'}
        </span>
      </motion.div>

      {/* Speed selector */}
      <div style={{ display:'flex', gap:3, alignItems:'center' }}>
        {SPEEDS.map(s => (
          <motion.button
            key={s}
            onClick={() => handleSpeedChange(s)}
            style={{
              padding:'0.18rem 0.5rem', borderRadius:5,
              border:`1px solid ${speed === s ? C.accent : 'rgba(255,255,255,0.07)'}`,
              background: speed === s ? 'rgba(245,200,66,0.12)' : 'transparent',
              cursor:'pointer', fontFamily:mono, fontSize:'0.5rem',
              color: speed === s ? C.accent : C.textMuted,
              transition:'all 0.15s',
            }}
            whileHover={{ scale:1.08, borderColor:'rgba(245,200,66,0.35)', color:C.accent }}
            whileTap={{ scale:0.9 }}
          >
            {s}×
          </motion.button>
        ))}
      </div>

      {/* Progress time display */}
      <AnimatePresence>
        {playing && (
          <motion.span
            initial={{ opacity:0, x:-6 }}
            animate={{ opacity:1, x:0 }}
            exit={{ opacity:0, x:-6 }}
            style={{ fontFamily:mono, fontSize:'0.5rem', color:C.textMuted, letterSpacing:'0.06em' }}
          >
            {Math.round(progress * estimatedDuration)}s / {Math.round(estimatedDuration)}s
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}