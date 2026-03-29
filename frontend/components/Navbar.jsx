// ════════════════════════════════════════
// Navbar.jsx — PEAK UI/UX EDITION v2
// Backend: UNTOUCHED  |  Visuals: MAXIMAL
// ════════════════════════════════════════
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { getUser, logout, apiFetch } from '@/lib/auth';

// ─── Backend (untouched) ──────────────────────────────────────────────────────
const getApiUrl = () => {
  if (typeof window !== 'undefined')
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};

// ─── Tokens (untouched) ───────────────────────────────────────────────────────
const C = {
  bg:'#07070a', surface:'#0f0f12', surfaceHigh:'#141418',
  border:'rgba(255,255,255,0.07)', text:'#f0f0f2', textSec:'#8a8a9a', textMuted:'#44445a',
  accent:'#f5c842', accentDim:'rgba(245,200,66,0.10)', accentGlow:'rgba(245,200,66,0.25)',
};
const mono  = "'JetBrains Mono','Fira Code',monospace";
const serif = "'Playfair Display',Georgia,serif";
const sans  = "'DM Sans',system-ui,sans-serif";

const NAV_LINKS = [
  { href:'/feed',      label:'Feed',      icon:'◈', sub:'Latest signals',  cmd:'f' },
  { href:'/navigator', label:'Navigator', icon:'◎', sub:'Explore topics',  cmd:'n' },
  { href:'/story',     label:'Story Arc', icon:'◐', sub:'Narratives',      cmd:'s' },
  { href:'/dashboard', label:'Dashboard', icon:'▣', sub:'Your metrics',    cmd:'d' },
  { href:'/saved',     label:'Saved',     icon:'◆', sub:'Bookmarks',       cmd:'b' },
];

// ─── Command Palette ──────────────────────────────────────────────────────────
const ALL_COMMANDS = [
  ...NAV_LINKS.map(l => ({ type:'nav', label:`Go to ${l.label}`, desc:l.sub, icon:l.icon, href:l.href, shortcut:l.cmd })),
  { type:'action', label:'Refresh Feed', desc:'Pull latest articles', icon:'↻', action:'refresh' },
  { type:'action', label:'Sign Out',     desc:'Log out of your account', icon:'→', action:'logout', danger:true },
  { type:'help',   label:'Keyboard Shortcuts', desc:'See all shortcuts', icon:'?', action:'shortcuts' },
];

function CommandPalette({ open, onClose, onRefresh, router }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);

  const filtered = ALL_COMMANDS.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.desc.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => { if (open) { setQuery(''); setSelected(0); setTimeout(() => inputRef.current?.focus(), 60); } }, [open]);
  useEffect(() => { setSelected(0); }, [query]);

  const execute = (cmd) => {
    onClose();
    if (cmd.type === 'nav') { window.location.href = cmd.href; return; }
    if (cmd.action === 'refresh') { onRefresh(); return; }
    if (cmd.action === 'logout') { logout(); return; }
    if (cmd.action === 'shortcuts') { window.dispatchEvent(new Event('open-shortcuts')); return; }
  };

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s+1, filtered.length-1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s-1, 0)); }
    if (e.key === 'Enter' && filtered[selected]) execute(filtered[selected]);
    if (e.key === 'Escape') onClose();
  };

  const groupOrder = ['nav', 'action', 'help'];
  const groups = groupOrder.map(type => ({
    type, label: type === 'nav' ? 'Navigation' : type === 'action' ? 'Actions' : 'Help',
    items: filtered.filter(c => c.type === type)
  })).filter(g => g.items.length > 0);

  let globalIdx = -1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          style={{
            position:'fixed', inset:0, zIndex:9000,
            background:'rgba(7,7,10,0.85)',
            backdropFilter:'blur(20px) saturate(180%)',
            display:'flex', alignItems:'flex-start', justifyContent:'center',
            paddingTop:'clamp(60px, 15vh, 140px)',
          }}
          initial={{ opacity:0 }}
          animate={{ opacity:1 }}
          exit={{ opacity:0 }}
          transition={{ duration:0.18 }}
          onClick={onClose}
        >
          <motion.div
            style={{
              width:'min(620px, 92vw)',
              background:'rgba(15,15,18,0.98)',
              border:'1px solid rgba(245,200,66,0.18)',
              borderRadius:16,
              overflow:'hidden',
              boxShadow:`0 32px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(245,200,66,0.06), 0 0 60px rgba(245,200,66,0.04)`,
            }}
            initial={{ opacity:0, y:-20, scale:0.95 }}
            animate={{ opacity:1, y:0, scale:1 }}
            exit={{ opacity:0, y:-20, scale:0.95 }}
            transition={{ duration:0.22, ease:[0.22,1,0.36,1] }}
            onClick={e => e.stopPropagation()}
          >
            {/* Accent top line */}
            <div style={{ height:2, background:`linear-gradient(90deg, ${C.accent}, rgba(245,200,66,0.3), transparent)` }}/>

            {/* Search input */}
            <div style={{
              display:'flex', alignItems:'center', gap:'0.75rem',
              padding:'1rem 1.2rem',
              borderBottom:`1px solid rgba(255,255,255,0.05)`,
            }}>
              <span style={{ fontFamily:mono, fontSize:'0.85rem', color:C.textMuted, flexShrink:0 }}>⌘</span>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Search commands, navigate, actions…"
                style={{
                  flex:1, background:'transparent', border:'none', outline:'none',
                  fontFamily:sans, fontSize:'0.95rem', color:C.text,
                  '::placeholder': { color:C.textMuted },
                }}
              />
              <kbd style={{
                fontFamily:mono, fontSize:'0.55rem', color:C.textMuted,
                background:'rgba(255,255,255,0.05)', border:`1px solid rgba(255,255,255,0.08)`,
                borderRadius:5, padding:'0.15rem 0.45rem', flexShrink:0,
              }}>ESC</kbd>
            </div>

            {/* Results */}
            <div style={{ maxHeight:'min(420px, 60vh)', overflowY:'auto', padding:'0.5rem' }}>
              {groups.length === 0 ? (
                <div style={{
                  padding:'2.5rem 1.5rem', textAlign:'center',
                  fontFamily:mono, fontSize:'0.65rem', color:C.textMuted,
                  textTransform:'uppercase', letterSpacing:'0.1em',
                }}>No results for "{query}"</div>
              ) : groups.map(group => (
                <div key={group.type}>
                  <div style={{
                    fontFamily:mono, fontSize:'0.5rem', textTransform:'uppercase',
                    letterSpacing:'0.14em', color:C.textMuted,
                    padding:'0.6rem 0.8rem 0.3rem',
                  }}>{group.label}</div>
                  {group.items.map(cmd => {
                    globalIdx++;
                    const myIdx = globalIdx;
                    const isSelected = myIdx === selected;
                    return (
                      <motion.div
                        key={cmd.label}
                        onClick={() => execute(cmd)}
                        onMouseEnter={() => setSelected(myIdx)}
                        style={{
                          display:'flex', alignItems:'center', gap:'0.75rem',
                          padding:'0.7rem 0.8rem', borderRadius:10, cursor:'pointer',
                          background: isSelected ? 'rgba(245,200,66,0.08)' : 'transparent',
                          border: isSelected ? '1px solid rgba(245,200,66,0.15)' : '1px solid transparent',
                          transition:'all 0.12s',
                        }}
                      >
                        <span style={{
                          width:30, height:30, borderRadius:8, flexShrink:0,
                          background: isSelected ? 'rgba(245,200,66,0.12)' : 'rgba(255,255,255,0.04)',
                          border:`1px solid ${isSelected ? 'rgba(245,200,66,0.25)' : 'rgba(255,255,255,0.07)'}`,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontFamily:mono, fontSize:'0.75rem',
                          color: cmd.danger ? '#f87171' : isSelected ? C.accent : C.textMuted,
                        }}>{cmd.icon}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{
                            fontFamily:sans, fontSize:'0.88rem', fontWeight:500,
                            color: cmd.danger ? '#f87171' : isSelected ? C.text : C.textSec,
                            transition:'color 0.12s',
                          }}>{cmd.label}</div>
                          <div style={{ fontFamily:sans, fontSize:'0.72rem', color:C.textMuted, marginTop:1 }}>
                            {cmd.desc}
                          </div>
                        </div>
                        {cmd.shortcut && (
                          <kbd style={{
                            fontFamily:mono, fontSize:'0.55rem', color:isSelected ? C.accent : C.textMuted,
                            background: isSelected ? 'rgba(245,200,66,0.1)' : 'rgba(255,255,255,0.04)',
                            border:`1px solid ${isSelected ? 'rgba(245,200,66,0.2)' : 'rgba(255,255,255,0.06)'}`,
                            borderRadius:5, padding:'0.15rem 0.45rem', flexShrink:0,
                            transition:'all 0.12s',
                          }}>{cmd.shortcut}</kbd>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{
              padding:'0.6rem 1.2rem',
              borderTop:`1px solid rgba(255,255,255,0.04)`,
              display:'flex', gap:'1.2rem',
            }}>
              {[['↑↓','Navigate'],['↵','Execute'],['esc','Close']].map(([key, desc]) => (
                <span key={key} style={{ display:'flex', alignItems:'center', gap:'0.35rem' }}>
                  <kbd style={{
                    fontFamily:mono, fontSize:'0.5rem', color:C.textMuted,
                    background:'rgba(255,255,255,0.05)',
                    border:'1px solid rgba(255,255,255,0.07)',
                    borderRadius:4, padding:'0.1rem 0.35rem',
                  }}>{key}</kbd>
                  <span style={{ fontFamily:sans, fontSize:'0.65rem', color:C.textMuted }}>{desc}</span>
                </span>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Magnetic Hook ────────────────────────────────────────────────────────────
function useMagnetic(strength = 0.3) {
  const ref = useRef(null);
  const x = useMotionValue(0); const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness:220, damping:22 });
  const sy = useSpring(y, { stiffness:220, damping:22 });
  const handleMove = useCallback((e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left - rect.width/2) * strength);
    y.set((e.clientY - rect.top  - rect.height/2) * strength);
  }, [x, y, strength]);
  const handleLeave = useCallback(() => { x.set(0); y.set(0); }, [x, y]);
  return { ref, sx, sy, handleMove, handleLeave };
}

// ─── Live Clock ───────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-IN', {
      hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false
    }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{ fontFamily:mono, fontSize:'0.58rem', color:C.textMuted, letterSpacing:'0.08em', tabularNums:true }}>
      {time}
    </span>
  );
}

// ─── Glitch Logo ──────────────────────────────────────────────────────────────
function GlitchLogo() {
  const [glitch, setGlitch] = useState(false);
  useEffect(() => {
    const fire = () => { setGlitch(true); setTimeout(() => setGlitch(false), 380); };
    const id = setInterval(fire, 8000 + Math.random() * 5000);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{ position:'relative', display:'inline-block' }}>
      {glitch && <>
        <span style={{
          position:'absolute', top:0, left:0,
          fontFamily:serif, fontSize:'1.35rem', fontWeight:700, color:'#f5c842',
          clipPath:'polygon(0 15%,100% 15%,100% 45%,0 45%)',
          transform:'translateX(-3px)', opacity:0.75, mixBlendMode:'screen', letterSpacing:'-0.03em',
        }}>ET<span style={{color:'#f0f0f2'}}>AI</span></span>
        <span style={{
          position:'absolute', top:0, left:0,
          fontFamily:serif, fontSize:'1.35rem', fontWeight:700, color:'#00ffff',
          clipPath:'polygon(0 55%,100% 55%,100% 85%,0 85%)',
          transform:'translateX(3px)', opacity:0.55, mixBlendMode:'screen', letterSpacing:'-0.03em',
        }}>ET<span style={{color:'#f0f0f2'}}>AI</span></span>
      </>}
      <span style={{ fontFamily:serif, fontSize:'1.35rem', fontWeight:700, color:C.text, letterSpacing:'-0.03em' }}>
        ET<span style={{color:C.accent}}>AI</span>
      </span>
    </span>
  );
}

// ─── Status Dot ───────────────────────────────────────────────────────────────
function StatusDot() {
  return (
    <span style={{ position:'relative', display:'inline-flex', width:8, height:8 }}>
      <style>{`@keyframes ping{0%{transform:scale(1);opacity:0.5}75%,100%{transform:scale(2.2);opacity:0}}`}</style>
      <span style={{ position:'absolute', inset:0, borderRadius:'50%', background:'#22c55e', animation:'ping 1.6s cubic-bezier(0,0,0.2,1) infinite' }}/>
      <span style={{ position:'relative', width:8, height:8, borderRadius:'50%', background:'#22c55e', display:'inline-block' }}/>
    </span>
  );
}

// ─── Nav Link ─────────────────────────────────────────────────────────────────
function NavLinkItem({ href, label, icon, sub, active, cmd }) {
  const { ref, sx, sy, handleMove, handleLeave } = useMagnetic(0.2);
  const [hovered, setHovered] = useState(false);
  return (
    <Link href={href} style={{ textDecoration:'none', position:'relative' }}>
      <motion.div
        ref={ref} style={{ x:sx, y:sy, position:'relative' }}
        onMouseMove={handleMove}
        onMouseLeave={() => { handleLeave(); setHovered(false); }}
        onMouseEnter={() => setHovered(true)}
      >
        {/* Pill background */}
        <AnimatePresence>
          {(hovered && !active) && (
            <motion.span
              style={{
                position:'absolute', inset:0, borderRadius:9,
                background:'rgba(245,200,66,0.05)',
                border:'1px solid rgba(245,200,66,0.1)',
                zIndex:0,
              }}
              initial={{ opacity:0, scale:0.85 }}
              animate={{ opacity:1, scale:1 }}
              exit={{ opacity:0, scale:0.85 }}
              transition={{ duration:0.18 }}
            />
          )}
          {active && (
            <motion.span
              layoutId="nav-pill"
              style={{
                position:'absolute', inset:0, borderRadius:9,
                background:`linear-gradient(135deg, rgba(245,200,66,0.12), rgba(245,200,66,0.06))`,
                border:'1px solid rgba(245,200,66,0.22)',
                zIndex:0,
              }}
              transition={{ type:'spring', stiffness:380, damping:32 }}
            />
          )}
        </AnimatePresence>

        {/* Content */}
        <div style={{
          position:'relative', zIndex:1,
          padding:'0.38rem 0.9rem',
          display:'flex', alignItems:'center', gap:'0.3rem',
          borderRadius:9, cursor:'pointer',
        }}>
          <span style={{
            fontFamily:mono, fontSize:'0.55rem',
            color: active ? C.accent : hovered ? 'rgba(245,200,66,0.55)' : C.textMuted,
            transition:'color 0.2s', lineHeight:1,
          }}>{icon}</span>
          <span style={{
            fontFamily:mono, fontSize:'0.6rem', textTransform:'uppercase', letterSpacing:'0.1em',
            color: active ? C.accent : hovered ? C.textSec : C.textMuted,
            transition:'color 0.2s',
          }}>{label}</span>
        </div>

        {/* Active glow dot */}
        {active && (
          <motion.div
            layoutId="nav-dot"
            style={{
              position:'absolute', bottom:-3, left:'50%', transform:'translateX(-50%)',
              width:4, height:4, borderRadius:'50%',
              background:C.accent, boxShadow:`0 0 8px ${C.accentGlow}, 0 0 20px rgba(245,200,66,0.3)`,
            }}
          />
        )}

        {/* Tooltip */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              style={{
                position:'absolute', top:'calc(100% + 14px)', left:'50%',
                transform:'translateX(-50%)',
                background:C.surface, border:'1px solid rgba(245,200,66,0.18)',
                borderRadius:10, padding:'0.55rem 0.85rem',
                whiteSpace:'nowrap', zIndex:200,
                boxShadow:'0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,200,66,0.06)',
                pointerEvents:'none',
              }}
              initial={{ opacity:0, y:-8, scale:0.9 }}
              animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, y:-8, scale:0.9 }}
              transition={{ duration:0.16 }}
            >
              <div style={{ fontFamily:mono, fontSize:'0.52rem', color:C.accent, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:3 }}>
                {icon} {label} <span style={{ opacity:0.5, marginLeft:4, background:'rgba(245,200,66,0.1)', border:'1px solid rgba(245,200,66,0.2)', borderRadius:4, padding:'0 4px' }}>{cmd}</span>
              </div>
              <div style={{ fontFamily:sans, fontSize:'0.7rem', color:C.textSec }}>{sub}</div>
              {/* Arrow */}
              <div style={{
                position:'absolute', top:-5, left:'50%', transform:'translateX(-50%) rotate(45deg)',
                width:8, height:8, background:C.surface,
                border:'1px solid rgba(245,200,66,0.18)', borderRight:'none', borderBottom:'none',
              }}/>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Link>
  );
}

// ─── User Avatar ──────────────────────────────────────────────────────────────
function UserAvatar({ initial, onClick, title }) {
  const { ref, sx, sy, handleMove, handleLeave } = useMagnetic(0.4);
  const [hov, setHov] = useState(false);
  return (
    <motion.div
      ref={ref} style={{ x:sx, y:sy, position:'relative', cursor:'pointer' }}
      onMouseMove={handleMove}
      onMouseLeave={() => { handleLeave(); setHov(false); }}
      onMouseEnter={() => setHov(true)}
      onClick={onClick} title={title} whileTap={{ scale:0.9 }}
    >
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <svg style={{
        position:'absolute', inset:-5, width:'calc(100% + 10px)', height:'calc(100% + 10px)',
        opacity: hov ? 1 : 0, transition:'opacity 0.3s',
        animation: hov ? 'spin 3s linear infinite' : 'none',
      }} viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="20" fill="none" stroke={C.accent} strokeWidth="1"
          strokeDasharray="6 4" strokeLinecap="round"/>
      </svg>
      <div style={{
        width:34, height:34, borderRadius:'50%',
        background: hov ? 'rgba(245,200,66,0.22)' : 'rgba(245,200,66,0.12)',
        border:`1px solid ${hov ? C.accent : 'rgba(245,200,66,0.3)'}`,
        color:C.accent, fontFamily:mono, fontSize:'0.78rem', fontWeight:700,
        display:'flex', alignItems:'center', justifyContent:'center',
        transition:'all 0.2s', position:'relative', zIndex:1,
        boxShadow: hov ? `0 0 16px rgba(245,200,66,0.25)` : 'none',
      }}>{initial}</div>
    </motion.div>
  );
}

// ─── Theme Toggle ─────────────────────────────────────────────────────────────
function ThemeToggle({ theme, onToggle }) {
  const { ref, sx, sy, handleMove, handleLeave } = useMagnetic(0.35);
  return (
    <motion.div ref={ref} style={{ x:sx, y:sy }} onMouseMove={handleMove} onMouseLeave={handleLeave}>
      <motion.button
        onClick={onToggle}
        style={{
          width:34, height:34, borderRadius:'50%',
          border:'1px solid rgba(255,255,255,0.09)',
          background:'rgba(255,255,255,0.04)', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'0.9rem', overflow:'hidden',
        }}
        whileHover={{ borderColor:'rgba(245,200,66,0.4)', background:'rgba(245,200,66,0.07)', scale:1.05 }}
        whileTap={{ scale:0.88, rotate:15 }}
        title={theme === 'light' ? 'Switch to dark' : 'Switch to light'}
      >
        <AnimatePresence mode="wait">
          <motion.span key={theme}
            initial={{ rotate:-90, opacity:0, scale:0.5 }}
            animate={{ rotate:0, opacity:1, scale:1 }}
            exit={{ rotate:90, opacity:0, scale:0.5 }}
            transition={{ type:'spring', stiffness:280, damping:20 }}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </motion.div>
  );
}

// ─── Command Trigger Button ───────────────────────────────────────────────────
function CmdButton({ onClick }) {
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
  return (
    <motion.button
      onClick={onClick}
      style={{
        display:'flex', alignItems:'center', gap:'0.45rem',
        padding:'0.32rem 0.65rem', borderRadius:8,
        background:'rgba(255,255,255,0.04)',
        border:'1px solid rgba(255,255,255,0.08)',
        cursor:'pointer',
      }}
      whileHover={{
        background:'rgba(245,200,66,0.06)',
        borderColor:'rgba(245,200,66,0.2)',
        scale:1.02,
      }}
      whileTap={{ scale:0.95 }}
      title="Open command palette (⌘K)"
    >
      <span style={{ fontFamily:mono, fontSize:'0.56rem', color:C.textMuted }}>⌘</span>
      <span style={{ fontFamily:sans, fontSize:'0.72rem', color:C.textMuted }}>Search…</span>
      <div style={{ display:'flex', gap:2 }}>
        <kbd style={{ fontFamily:mono, fontSize:'0.48rem', color:C.textMuted, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:4, padding:'0.1rem 0.35rem' }}>
          {isMac ? '⌘' : 'Ctrl'}
        </kbd>
        <kbd style={{ fontFamily:mono, fontSize:'0.48rem', color:C.textMuted, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:4, padding:'0.1rem 0.35rem' }}>
          K
        </kbd>
      </div>
    </motion.button>
  );
}

// ─── Main Navbar ──────────────────────────────────────────────────────────────
export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser]                 = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [menuOpen, setMenuOpen]         = useState(false);
  const [cmdOpen, setCmdOpen]           = useState(false);
  const [theme, setTheme]               = useState('dark');
  const [scrolled, setScrolled]         = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const dropdownRef = useRef(null);

  // ── Backend logic untouched ──
  useEffect(() => {
    setUser(getUser());
    const saved = localStorage.getItem('etnewsai_theme');
    if (saved) { setTheme(saved); document.documentElement.setAttribute('data-theme', saved); }
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark'); document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  useEffect(() => {
    const h = () => setUser(getUser());
    window.addEventListener('storage', h);
    window.addEventListener('user-updated', h);
    return () => { window.removeEventListener('storage', h); window.removeEventListener('user-updated', h); };
  }, []);

  useEffect(() => {
    const h = (e) => { if (!dropdownRef.current?.contains(e.target)) setDropdownOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Scroll awareness
  useEffect(() => {
    const onScroll = () => {
      const s = window.scrollY;
      setScrolled(s > 12);
      const total = document.body.scrollHeight - window.innerHeight;
      setScrollProgress(total > 0 ? Math.min(s / total, 1) : 0);
    };
    window.addEventListener('scroll', onScroll, { passive:true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Cmd+K global
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(o => !o); }
      if (e.key === 'Escape') { setCmdOpen(false); setMenuOpen(false); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('etnewsai_theme', next);
  };

  const handleLogout = () => logout();

  const handleRefreshFeed = async () => {
    try {
      await apiFetch(`${getApiUrl()}/admin/refresh-news`, { method:'POST' });
      window.dispatchEvent(new CustomEvent('refresh-feed'));
    } catch(err) { console.error('Refresh failed:', err); }
    setDropdownOpen(false);
  };

  const initial = (user?.full_name || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <>
      {/* Scroll progress line */}
      <motion.div
        style={{
          position:'fixed', top:0, left:0, right:0, height:2, zIndex:100,
          background:`linear-gradient(90deg, ${C.accent}, rgba(245,200,66,0.5))`,
          transformOrigin:'left', scaleX:scrollProgress,
          boxShadow:`0 0 10px ${C.accentGlow}`,
        }}
      />

      {/* Command Palette */}
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onRefresh={handleRefreshFeed}
      />

      <motion.nav
        style={{ position:'sticky', top:0, zIndex:50, fontFamily:sans }}
        animate={{
          background: scrolled ? 'rgba(7,7,10,0.96)' : 'rgba(7,7,10,0.75)',
          backdropFilter: scrolled ? 'blur(28px) saturate(200%)' : 'blur(14px)',
          borderBottom: scrolled ? '1px solid rgba(245,200,66,0.08)' : '1px solid rgba(255,255,255,0.05)',
          boxShadow: scrolled ? '0 4px 60px rgba(0,0,0,0.55)' : 'none',
        }}
        transition={{ duration:0.35 }}
      >
        {/* Grid background texture */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none',
          backgroundImage:`
            linear-gradient(rgba(245,200,66,0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(245,200,66,0.018) 1px, transparent 1px)
          `,
          backgroundSize:'40px 40px',
          maskImage:'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)',
        }}/>

        <div style={{
          maxWidth:1280, margin:'0 auto',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'0 1.5rem', height:60, position:'relative',
          gap:'1rem',
        }}>

          {/* Logo */}
          <Link href="/" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:'0.55rem', flexShrink:0 }}>
            <motion.div whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}
              style={{ display:'flex', alignItems:'center', gap:'0.45rem' }}>
              <div style={{
                width:28, height:28, borderRadius:7,
                background:`linear-gradient(135deg, rgba(245,200,66,0.22), rgba(245,200,66,0.05))`,
                border:`1px solid rgba(245,200,66,0.28)`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'0.75rem', color:C.accent, fontFamily:mono, fontWeight:700,
                boxShadow:`0 0 14px rgba(245,200,66,0.12)`,
              }}>◈</div>
              <GlitchLogo />
            </motion.div>
            <motion.div
              style={{
                display:'flex', alignItems:'center', gap:'0.28rem',
                background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)',
                borderRadius:99, padding:'0.14rem 0.48rem',
              }}
              initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.5 }}
            >
              <StatusDot />
              <span style={{ fontFamily:mono, fontSize:'0.46rem', color:'rgba(34,197,94,0.85)', textTransform:'uppercase', letterSpacing:'0.1em' }}>live</span>
            </motion.div>
          </Link>

          {/* Desktop Nav */}
          <nav style={{
            display:'flex', alignItems:'center', gap:'0.1rem',
            position:'absolute', left:'50%', transform:'translateX(-50%)',
          }}>
            {NAV_LINKS.map(link => (
              <NavLinkItem key={link.href} {...link} active={pathname === link.href} />
            ))}
          </nav>

          {/* Right Controls */}
          <div style={{ display:'flex', alignItems:'center', gap:'0.55rem', flexShrink:0 }}>

            {/* Command palette button */}
            <div style={{ display:'none' }} className="cmd-btn-desktop">
              <CmdButton onClick={() => setCmdOpen(true)} />
            </div>
            <style>{`@media(min-width:700px){.cmd-btn-desktop{display:block!important}}.cmd-btn-desktop{display:none}`}</style>

            {/* Clock */}
            <motion.div
              style={{
                display:'flex', alignItems:'center', gap:'0.4rem',
                background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)',
                borderRadius:7, padding:'0.28rem 0.6rem',
              }}
              initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.8 }}
            >
              <span style={{ fontSize:'0.5rem', color:C.textMuted }}>◷</span>
              <LiveClock />
            </motion.div>

            <ThemeToggle theme={theme} onToggle={toggleTheme} />

            {/* User */}
            {user && (
              <div style={{ position:'relative' }} ref={dropdownRef}>
                <UserAvatar
                  initial={initial}
                  title={user.full_name || user.email}
                  onClick={() => setDropdownOpen(o => !o)}
                />

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      style={{
                        position:'absolute', top:'calc(100% + 12px)', right:0,
                        background:C.surface,
                        border:'1px solid rgba(245,200,66,0.15)',
                        borderRadius:14, minWidth:248,
                        boxShadow:'0 28px 70px rgba(0,0,0,0.75), 0 0 0 1px rgba(245,200,66,0.04)',
                        overflow:'hidden', zIndex:100,
                      }}
                      initial={{ opacity:0, y:-14, scale:0.93 }}
                      animate={{ opacity:1, y:0, scale:1 }}
                      exit={{ opacity:0, y:-14, scale:0.93 }}
                      transition={{ duration:0.22, ease:[0.22,1,0.36,1] }}
                    >
                      <div style={{ height:2, background:`linear-gradient(90deg, ${C.accent}, transparent)` }}/>

                      {/* User header */}
                      <div style={{ padding:'1rem 1.15rem 0.85rem', position:'relative', overflow:'hidden' }}>
                        <div style={{
                          position:'absolute', top:0, right:0, width:90, height:90,
                          background:`radial-gradient(circle, rgba(245,200,66,0.06), transparent 70%)`,
                          pointerEvents:'none',
                        }}/>
                        <div style={{
                          width:38, height:38, borderRadius:10,
                          background:'rgba(245,200,66,0.12)', border:'1px solid rgba(245,200,66,0.25)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontFamily:mono, fontSize:'0.95rem', fontWeight:700, color:C.accent,
                          marginBottom:'0.6rem',
                        }}>{initial}</div>
                        <div style={{ fontFamily:sans, fontSize:'0.9rem', color:C.text, fontWeight:600, marginBottom:3 }}>
                          {user.full_name || user.email}
                        </div>
                        {user.persona && (
                          <span style={{
                            fontFamily:mono, fontSize:'0.5rem', textTransform:'uppercase', letterSpacing:'0.1em', color:C.accent,
                            background:'rgba(245,200,66,0.08)', border:'1px solid rgba(245,200,66,0.18)',
                            borderRadius:99, padding:'0.14rem 0.5rem', display:'inline-block',
                          }}>◈ {user.persona}</span>
                        )}
                      </div>

                      <div style={{ height:1, background:'rgba(255,255,255,0.05)', margin:'0 1rem' }}/>

                      {/* Actions */}
                      {[
                        { icon:'↻', label:'Refresh feed',  onClick:handleRefreshFeed, danger:false },
                        { icon:'⌘', label:'Command palette', onClick:() => { setDropdownOpen(false); setCmdOpen(true); }, danger:false },
                        { icon:'→', label:'Sign out',       onClick:handleLogout,       danger:true },
                      ].map(({ icon, label, onClick, danger }) => (
                        <motion.button key={label}
                          style={{
                            display:'flex', alignItems:'center', gap:'0.65rem',
                            width:'100%', padding:'0.78rem 1.15rem',
                            background:'transparent', border:'none', cursor:'pointer',
                            fontFamily:mono, fontSize:'0.6rem', textTransform:'uppercase', letterSpacing:'0.1em',
                            color: danger ? '#f87171' : C.textSec, textAlign:'left',
                          }}
                          onClick={onClick}
                          whileHover={{
                            background: danger ? 'rgba(248,113,113,0.06)' : 'rgba(245,200,66,0.05)',
                            color: danger ? '#fca5a5' : C.accent, paddingLeft:'1.45rem',
                          }}
                          transition={{ duration:0.13 }}
                        >
                          <span style={{ fontSize:'0.85rem' }}>{icon}</span> {label}
                        </motion.button>
                      ))}

                      <div style={{ height:1, background:'rgba(255,255,255,0.04)', margin:'0 1rem' }}/>
                      <div style={{ padding:'0.6rem 1.15rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                        <StatusDot />
                        <span style={{ fontFamily:mono, fontSize:'0.48rem', color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.1em' }}>
                          Connected · ETNewsAI
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Hamburger */}
            <motion.button
              style={{
                width:34, height:34, background:'transparent',
                border:'1px solid rgba(255,255,255,0.08)', borderRadius:8,
                color:C.textSec, cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}
              onClick={() => setMenuOpen(o => !o)}
              whileHover={{ borderColor:'rgba(245,200,66,0.3)', color:C.accent }}
              whileTap={{ scale:0.88 }}
            >
              <AnimatePresence mode="wait">
                <motion.span key={menuOpen ? 'x' : 'h'}
                  initial={{ rotate:-90, opacity:0, scale:0.7 }}
                  animate={{ rotate:0, opacity:1, scale:1 }}
                  exit={{ rotate:90, opacity:0, scale:0.7 }}
                  transition={{ duration:0.15 }}
                  style={{ lineHeight:1, fontSize:'0.85rem' }}
                >
                  {menuOpen ? '✕' : '☰'}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              style={{
                borderTop:'1px solid rgba(245,200,66,0.07)',
                background:'rgba(7,7,10,0.99)',
                backdropFilter:'blur(20px)',
                overflow:'hidden',
              }}
              initial={{ height:0, opacity:0 }}
              animate={{ height:'auto', opacity:1 }}
              exit={{ height:0, opacity:0 }}
              transition={{ duration:0.32, ease:[0.22,1,0.36,1] }}
            >
              <div style={{ padding:'0.6rem 0 0.4rem' }}>
                {NAV_LINKS.map((link, i) => (
                  <motion.div key={link.href}
                    initial={{ x:-24, opacity:0 }}
                    animate={{ x:0, opacity:1 }}
                    transition={{ delay:i*0.055, duration:0.28, ease:'easeOut' }}
                  >
                    <Link href={link.href} style={{ textDecoration:'none' }} onClick={() => setMenuOpen(false)}>
                      <motion.div
                        style={{
                          display:'flex', alignItems:'center', gap:'0.85rem',
                          padding:'0.88rem 1.75rem',
                          borderLeft: pathname === link.href ? `2px solid ${C.accent}` : '2px solid transparent',
                          transition:'border-color 0.2s',
                        }}
                        whileHover={{ background:'rgba(245,200,66,0.04)', paddingLeft:'2.1rem' }}
                        transition={{ duration:0.15 }}
                      >
                        <span style={{
                          fontFamily:mono, fontSize:'0.78rem',
                          color: pathname === link.href ? C.accent : C.textMuted,
                        }}>{link.icon}</span>
                        <div>
                          <div style={{
                            fontFamily:mono, fontSize:'0.62rem', textTransform:'uppercase',
                            letterSpacing:'0.1em',
                            color: pathname === link.href ? C.accent : C.textSec,
                          }}>{link.label}</div>
                          <div style={{ fontFamily:sans, fontSize:'0.68rem', color:C.textMuted, marginTop:1 }}>{link.sub}</div>
                        </div>
                        {pathname === link.href && (
                          <motion.div
                            style={{ marginLeft:'auto', width:6, height:6, borderRadius:'50%', background:C.accent, boxShadow:`0 0 8px ${C.accentGlow}` }}
                            animate={{ scale:[1,1.4,1], opacity:[1,0.6,1] }}
                            transition={{ duration:1.8, repeat:Infinity }}
                          />
                        )}
                      </motion.div>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Mobile footer */}
              <div style={{
                borderTop:'1px solid rgba(255,255,255,0.05)',
                padding:'0.75rem 1.75rem',
                display:'flex', alignItems:'center', justifyContent:'space-between',
              }}>
                <motion.button
                  onClick={() => { setMenuOpen(false); setCmdOpen(true); }}
                  style={{
                    display:'flex', alignItems:'center', gap:'0.4rem',
                    padding:'0.3rem 0.7rem', borderRadius:6,
                    background:'rgba(245,200,66,0.07)', border:'1px solid rgba(245,200,66,0.15)',
                    cursor:'pointer', fontFamily:mono, fontSize:'0.55rem',
                    textTransform:'uppercase', letterSpacing:'0.08em', color:C.accent,
                  }}
                  whileHover={{ scale:1.03 }} whileTap={{ scale:0.96 }}
                >
                  ⌘ Commands
                </motion.button>
                <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                  <StatusDot />
                  <span style={{ fontFamily:mono, fontSize:'0.48rem', color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.08em' }}>live</span>
                  <span style={{ color:C.border }}>·</span>
                  <LiveClock />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </>
  );
}