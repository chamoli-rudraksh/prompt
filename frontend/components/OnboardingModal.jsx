'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const C = {
  bg:'#07070a', surface:'#0f0f12', surfaceHigh:'#141418',
  border:'rgba(255,255,255,0.07)', text:'#f0f0f2', textSec:'#8a8a9a', textMuted:'#44445a',
  accent:'#f5c842', accentDim:'rgba(245,200,66,0.10)', accentGlow:'rgba(245,200,66,0.28)',
};
const mono  = "'JetBrains Mono','Fira Code',monospace";
const serif = "'Playfair Display',Georgia,serif";
const sans  = "'DM Sans',system-ui,sans-serif";

const PERSONAS = [
  { id:'investor',     label:'Investor',     icon:'📈', desc:'Markets, funds & portfolio insights' },
  { id:'founder',      label:'Founder',      icon:'🚀', desc:'Startup trends, funding & growth' },
  { id:'student',      label:'Student',      icon:'📚', desc:'Economy, policy & career news' },
  { id:'professional', label:'Professional', icon:'💼', desc:'Industry insights & business intel' },
];

const TOPICS = [
  { id:'markets',    label:'Markets' },
  { id:'startups',   label:'Startups' },
  { id:'policy',     label:'Policy' },
  { id:'technology', label:'Technology' },
  { id:'economy',    label:'Economy' },
  { id:'banking',    label:'Banking' },
  { id:'energy',     label:'Energy' },
  { id:'geopolitics',label:'Geopolitics' },
];

export default function OnboardingModal({ onComplete }) {
  const [name, setName]         = useState('');
  const [persona, setPersona]   = useState('');
  const [interests, setInterests] = useState([]);
  const [focused, setFocused]   = useState(false);

  const toggleInterest = (id) =>
    setInterests(p => p.includes(id) ? p.filter(i=>i!==id) : [...p,id]);

  const handleSubmit = () => {
    if (name && persona && interests.length > 0) onComplete(name, persona, interests);
  };

  const canSubmit = name.trim() && persona && interests.length > 0;

  return (
    <div style={S.wrap}>
      <h2 style={S.title}>What kind of reader are you?</h2>
      <p style={S.subtitle}>Personalise your ET NewsAI experience in 30 seconds</p>

      {/* Name */}
      <input
        id="onboarding-name"
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Enter your name"
        style={{
          ...S.input,
          borderColor: focused ? 'rgba(245,200,66,0.45)' : C.border,
          boxShadow: focused ? `0 0 0 3px ${C.accentDim}` : 'none',
        }}
      />

      {/* Personas */}
      <div style={S.personaGrid}>
        {PERSONAS.map(p => {
          const active = persona === p.id;
          return (
            <motion.button
              key={p.id}
              id={`persona-${p.id}`}
              onClick={() => setPersona(p.id)}
              style={{ ...S.personaCard, ...(active ? S.personaCardActive : {}) }}
              whileHover={{ scale:1.03 }}
              whileTap={{ scale:0.97 }}
            >
              <motion.div
                style={S.personaTopLine}
                animate={{ scaleX: active ? 1 : 0 }}
                transition={{ duration:0.3 }}
              />
              <span style={S.personaIcon}>{p.icon}</span>
              <span style={{ ...S.personaLabel, ...(active ? { color:C.accent } : {}) }}>{p.label}</span>
              <span style={S.personaDesc}>{p.desc}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Topics */}
      <AnimatePresence>
        {persona && (
          <motion.div
            initial={{ opacity:0, height:0 }}
            animate={{ opacity:1, height:'auto' }}
            exit={{ opacity:0, height:0 }}
            transition={{ duration:0.35 }}
            style={{ overflow:'hidden' }}
          >
            <p style={{ ...S.subtitle, marginTop:'1.5rem' }}>Select topics that interest you</p>
            <div style={S.topicsGrid}>
              {TOPICS.map(t => {
                const active = interests.includes(t.id);
                return (
                  <motion.button
                    key={t.id}
                    id={`interest-${t.id}`}
                    onClick={() => toggleInterest(t.id)}
                    style={{ ...S.chip, ...(active ? S.chipActive : {}) }}
                    whileHover={{ scale:1.05 }}
                    whileTap={{ scale:0.95 }}
                  >
                    {t.label}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit */}
      <motion.button
        id="onboarding-submit"
        onClick={handleSubmit}
        disabled={!canSubmit}
        style={{ ...S.submitBtn, ...(!canSubmit ? S.submitDisabled : {}) }}
        whileHover={canSubmit ? { scale:1.02 } : {}}
        whileTap={canSubmit ? { scale:0.97 } : {}}
      >
        Start reading →
      </motion.button>
    </div>
  );
}

const S = {
  wrap:{ fontFamily:sans, display:'flex', flexDirection:'column', gap:'0' },
  title:{ fontFamily:serif, fontSize:'1.6rem', fontWeight:700, letterSpacing:'-0.03em', color:'#f0f0f2', margin:'0 0 0.5rem' },
  subtitle:{ fontFamily:"'JetBrains Mono','Fira Code',monospace", fontSize:'0.62rem', textTransform:'uppercase', letterSpacing:'0.12em', color:'#44445a', margin:'0 0 1.5rem' },
  input:{
    width:'100%', padding:'0.9rem 1rem', marginBottom:'1.5rem',
    background:'#07070a', border:'1px solid rgba(255,255,255,0.07)',
    borderRadius:8, outline:'none',
    fontFamily:"'DM Sans',system-ui,sans-serif", fontSize:'0.95rem', color:'#f0f0f2',
    boxSizing:'border-box', transition:'border-color 0.15s, box-shadow 0.15s',
  },
  personaGrid:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:1, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, overflow:'hidden', marginBottom:'0.5rem' },
  personaCard:{
    padding:'1.2rem', display:'flex', flexDirection:'column', gap:'0.35rem',
    background:'#0f0f12', border:'none', cursor:'pointer',
    textAlign:'left', position:'relative', overflow:'hidden',
    transition:'background 0.2s',
  },
  personaCardActive:{ background:'#141418' },
  personaTopLine:{
    position:'absolute', top:0, left:0, right:0, height:2,
    background:'linear-gradient(90deg, #f5c842, transparent)',
    transformOrigin:'left',
  },
  personaIcon:{ fontSize:'1.3rem', marginBottom:'0.1rem' },
  personaLabel:{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'0.95rem', fontWeight:600, color:'#f0f0f2' },
  personaDesc:{ fontFamily:"'DM Sans',system-ui,sans-serif", fontSize:'0.75rem', lineHeight:1.5, color:'#44445a' },
  topicsGrid:{ display:'flex', flexWrap:'wrap', gap:7, marginBottom:'1.5rem' },
  chip:{
    padding:'0.35rem 0.9rem', borderRadius:99,
    fontFamily:"'JetBrains Mono','Fira Code',monospace", fontSize:'0.6rem',
    textTransform:'uppercase', letterSpacing:'0.08em',
    border:'1px solid rgba(255,255,255,0.07)',
    background:'#0f0f12', color:'#44445a',
    cursor:'pointer', transition:'all 0.15s',
  },
  chipActive:{ border:'1px solid rgba(245,200,66,0.35)', background:'rgba(245,200,66,0.10)', color:'#f5c842' },
  submitBtn:{
    width:'100%', padding:'0.95rem 0', marginTop:'0.5rem',
    background:'#f5c842', color:'#07070a',
    border:'none', borderRadius:8, cursor:'pointer',
    fontFamily:"'JetBrains Mono','Fira Code',monospace", fontSize:'0.75rem',
    textTransform:'uppercase', letterSpacing:'0.12em', fontWeight:700,
    boxShadow:'0 0 24px rgba(245,200,66,0.28)',
    transition:'opacity 0.15s',
  },
  submitDisabled:{ opacity:0.35, cursor:'not-allowed', boxShadow:'none' },
};