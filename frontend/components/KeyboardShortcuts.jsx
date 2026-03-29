// ════════════════════════════════════════
// KeyboardShortcuts.jsx — PEAK UI/UX EDITION v2
// Backend: UNTOUCHED  |  Visuals: MAXIMAL
// ════════════════════════════════════════
"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const C = {
  bg:'#07070a', surface:'#0f0f12', surfaceHigh:'#141418',
  border:'rgba(255,255,255,0.07)', text:'#f0f0f2', textSec:'#8a8a9a', textMuted:'#44445a',
  accent:'#f5c842', accentDim:'rgba(245,200,66,0.10)',
};
const mono  = "'JetBrains Mono','Fira Code',monospace";
const serif = "'Playfair Display',Georgia,serif";
const sans  = "'DM Sans',system-ui,sans-serif";

const SHORTCUT_GROUPS = [
  {
    label: 'Navigation',
    icon: '◎',
    items: [
      { key:'f', label:'Feed',          desc:'Go to latest signals',    href:'/feed' },
      { key:'n', label:'Navigator',     desc:'Explore topics',          href:'/navigator' },
      { key:'s', label:'Story Arc',     desc:'View narrative arcs',     href:'/story' },
      { key:'d', label:'Dashboard',     desc:'Your personal metrics',   href:'/dashboard' },
      { key:'b', label:'Saved',         desc:'Access your bookmarks',   href:'/saved' },
    ]
  },
  {
    label: 'Actions',
    icon: '◈',
    items: [
      { key:'r',   label:'Refresh feed',  desc:'Pull the latest articles' },
      { key:'/',   label:'Focus search',  desc:'Jump to the search bar' },
      { key:'⌘K',  label:'Command palette', desc:'Open this panel from anywhere' },
    ]
  },
  {
    label: 'Panel',
    icon: '◐',
    items: [
      { key:'?',   label:'Toggle shortcuts', desc:'Open/close this panel' },
      { key:'Esc', label:'Close',            desc:'Dismiss any open panel' },
    ]
  }
];

// ─── Animated Key Cap ─────────────────────────────────────────────────────────
function KeyCap({ children, pressed }) {
  return (
    <motion.kbd
      animate={{
        y: pressed ? 2 : 0,
        boxShadow: pressed
          ? `0 0 0 0 rgba(0,0,0,0.4)`
          : `0 2px 0 rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)`,
        background: pressed ? 'rgba(245,200,66,0.18)' : C.surfaceHigh,
        borderColor: pressed ? 'rgba(245,200,66,0.4)' : 'rgba(255,255,255,0.1)',
        color: pressed ? C.accent : C.textSec,
      }}
      transition={{ duration:0.08 }}
      style={{
        fontFamily:mono, fontSize:'0.6rem', letterSpacing:'0.04em',
        border:'1px solid rgba(255,255,255,0.1)',
        borderRadius:6, padding:'0.22rem 0.6rem', display:'inline-flex',
        alignItems:'center', justifyContent:'center', minWidth:28,
        userSelect:'none',
      }}
    >
      {children}
    </motion.kbd>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function KeyboardShortcuts() {
  const router = useRouter();
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const [pressedKey, setPressedKey] = useState(null);
  const searchRef = useRef(null);

  // Backend logic untouched
  useEffect(() => {
    function handler(e) {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const typing = ["input","textarea","select"].includes(tag);

      if (e.key === "Escape") { setOpen(false); return; }
      if (e.key === "?" && !typing) { setOpen(o => !o); return; }
      if (typing) return;

      // Animate key
      setPressedKey(e.key);
      setTimeout(() => setPressedKey(null), 200);

      if (e.key === "f") router.push("/feed");
      if (e.key === "n") router.push("/navigator");
      if (e.key === "s") router.push("/story");
      if (e.key === "d") router.push("/dashboard");
      if (e.key === "r") window.dispatchEvent(new Event("refresh-feed"));
      if (e.key === "/") {
        e.preventDefault();
        document.querySelector("input[type='search'],input[placeholder*='earch']")?.focus();
      }
    }

    // Open from external event
    const openHandler = () => setOpen(true);
    window.addEventListener("keydown", handler);
    window.addEventListener("open-shortcuts", openHandler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("open-shortcuts", openHandler);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setSearch('');
      setTimeout(() => searchRef.current?.focus(), 80);
    }
  }, [open]);

  // Filtered groups
  const filteredGroups = SHORTCUT_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item =>
      !search ||
      item.label.toLowerCase().includes(search.toLowerCase()) ||
      item.desc.toLowerCase().includes(search.toLowerCase()) ||
      item.key.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(g => g.items.length > 0);

  const totalMatches = filteredGroups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <>
      {/* FAB */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        style={{
          position:"fixed", bottom:24, right:24,
          width:40, height:40, borderRadius:12,
          border:`1px solid ${open ? 'rgba(245,200,66,0.35)' : 'rgba(255,255,255,0.08)'}`,
          background: open ? 'rgba(245,200,66,0.1)' : C.surface,
          cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:"0 6px 24px rgba(0,0,0,0.5)",
          zIndex:50,
          transition:'all 0.2s',
        }}
        title="Keyboard shortcuts (?)"
        whileHover={{ scale:1.1, borderColor:'rgba(245,200,66,0.4)', background:'rgba(245,200,66,0.08)' }}
        whileTap={{ scale:0.9 }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={open ? 'close' : 'open'}
            style={{ fontFamily:mono, fontSize:'0.72rem', color: open ? C.accent : C.textMuted }}
            initial={{ rotate:-90, opacity:0, scale:0.6 }}
            animate={{ rotate:0, opacity:1, scale:1 }}
            exit={{ rotate:90, opacity:0, scale:0.6 }}
            transition={{ duration:0.15 }}
          >
            {open ? '✕' : '?'}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            style={{
              position:"fixed", inset:0, zIndex:1000,
              background:"rgba(7,7,10,0.82)", backdropFilter:"blur(18px) saturate(180%)",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}
            initial={{ opacity:0 }}
            animate={{ opacity:1 }}
            exit={{ opacity:0 }}
            transition={{ duration:0.18 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              style={{
                background:C.surface,
                border:"1px solid rgba(245,200,66,0.15)",
                borderRadius:18, width:"min(500px, 92vw)",
                overflow:"hidden",
                boxShadow:"0 32px 90px rgba(0,0,0,0.8), 0 0 0 1px rgba(245,200,66,0.06)",
              }}
              initial={{ opacity:0, y:-18, scale:0.94 }}
              animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, y:-18, scale:0.94 }}
              transition={{ duration:0.24, ease:[0.22,1,0.36,1] }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header accent line */}
              <div style={{ height:2, background:`linear-gradient(90deg, ${C.accent}, rgba(245,200,66,0.3), transparent)` }}/>

              {/* Header */}
              <div style={{ padding:"1.2rem 1.4rem 0.8rem", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <span style={{ fontFamily:serif, fontSize:"1.05rem", fontWeight:700, color:C.text }}>
                    Keyboard Shortcuts
                  </span>
                  <div style={{ fontFamily:mono, fontSize:"0.52rem", textTransform:"uppercase", letterSpacing:"0.12em", color:C.textMuted, marginTop:4 }}>
                    {totalMatches} shortcut{totalMatches !== 1 ? 's' : ''}{search ? ` matching "${search}"` : ' available'}
                  </div>
                </div>
                <motion.button
                  style={{ background:"none", border:`1px solid rgba(255,255,255,0.07)`, cursor:"pointer", color:C.textMuted, fontFamily:mono, fontSize:"0.7rem", width:28, height:28, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center" }}
                  onClick={() => setOpen(false)}
                  whileHover={{ scale:1.1, borderColor:"rgba(245,200,66,0.3)", color:C.accent }}
                  whileTap={{ scale:0.9 }}
                >✕</motion.button>
              </div>

              {/* Search */}
              <div style={{ padding:"0 1.4rem 0.8rem" }}>
                <div style={{
                  display:"flex", alignItems:"center", gap:"0.6rem",
                  background:C.surfaceHigh, border:`1px solid rgba(255,255,255,0.07)`,
                  borderRadius:9, padding:"0.55rem 0.85rem",
                }}>
                  <span style={{ fontFamily:mono, fontSize:"0.7rem", color:C.textMuted }}>⌕</span>
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Filter shortcuts…"
                    style={{
                      flex:1, background:"transparent", border:"none", outline:"none",
                      fontFamily:sans, fontSize:"0.82rem", color:C.text,
                    }}
                  />
                  {search && (
                    <motion.button
                      onClick={() => setSearch('')}
                      style={{ background:"none", border:"none", cursor:"pointer", color:C.textMuted, fontFamily:mono, fontSize:"0.65rem" }}
                      whileHover={{ color:C.accent }}
                    >✕</motion.button>
                  )}
                </div>
              </div>

              {/* Shortcuts list */}
              <div style={{ maxHeight:"min(440px, 60vh)", overflowY:"auto", padding:"0 1.4rem 1.4rem", scrollbarWidth:"thin", scrollbarColor:`rgba(255,255,255,0.06) transparent` }}>
                {filteredGroups.length === 0 ? (
                  <div style={{ padding:"2rem", textAlign:"center", fontFamily:sans, fontSize:"0.85rem", color:C.textMuted }}>
                    No shortcuts matching "{search}"
                  </div>
                ) : filteredGroups.map((group, gi) => (
                  <div key={group.label}>
                    {/* Group header */}
                    <div style={{
                      display:"flex", alignItems:"center", gap:"0.5rem",
                      fontFamily:mono, fontSize:"0.5rem", textTransform:"uppercase",
                      letterSpacing:"0.14em", color:C.textMuted,
                      padding:"0.8rem 0 0.4rem",
                      borderTop: gi > 0 ? `1px solid rgba(255,255,255,0.05)` : "none",
                      marginTop: gi > 0 ? "0.4rem" : 0,
                    }}>
                      <span style={{ color:C.accent, opacity:0.7 }}>{group.icon}</span>
                      {group.label}
                    </div>

                    {/* Items */}
                    {group.items.map((item, ii) => (
                      <motion.div
                        key={item.key}
                        style={{
                          display:"flex", justifyContent:"space-between", alignItems:"center",
                          padding:"0.58rem 0.7rem", borderRadius:8, marginBottom:2,
                          cursor: item.href ? "pointer" : "default",
                          border:"1px solid transparent",
                          transition:"all 0.14s",
                        }}
                        initial={{ opacity:0, x:-8 }}
                        animate={{ opacity:1, x:0 }}
                        transition={{ delay:gi * 0.05 + ii * 0.04 }}
                        whileHover={item.href ? {
                          background:"rgba(245,200,66,0.05)",
                          borderColor:"rgba(245,200,66,0.12)",
                          x:2,
                        } : {}}
                        onClick={item.href ? () => { router.push(item.href); setOpen(false); } : undefined}
                      >
                        <div>
                          <div style={{ fontFamily:sans, fontSize:"0.86rem", color:C.text, fontWeight:500, marginBottom:2 }}>
                            {item.label}
                            {item.href && <span style={{ fontFamily:mono, fontSize:"0.48rem", color:C.textMuted, marginLeft:6, textTransform:"uppercase", letterSpacing:"0.08em" }}>→ navigate</span>}
                          </div>
                          <div style={{ fontFamily:sans, fontSize:"0.72rem", color:C.textMuted }}>{item.desc}</div>
                        </div>

                        {/* Key caps */}
                        <div style={{ display:"flex", gap:3, flexShrink:0, marginLeft:"1rem" }}>
                          {item.key.split('+').map((k, ki) => (
                            <KeyCap key={ki} pressed={pressedKey === k || pressedKey === item.key}>
                              {k}
                            </KeyCap>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div style={{
                padding:"0.7rem 1.4rem",
                borderTop:`1px solid rgba(255,255,255,0.04)`,
                display:"flex", justifyContent:"space-between", alignItems:"center",
              }}>
                <div style={{ display:"flex", gap:"1rem" }}>
                  {[['?','Toggle'],['Esc','Close']].map(([k,d]) => (
                    <span key={k} style={{ display:"flex", alignItems:"center", gap:"0.3rem" }}>
                      <kbd style={{ fontFamily:mono, fontSize:"0.5rem", color:C.textMuted, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:4, padding:"0.1rem 0.35rem" }}>{k}</kbd>
                      <span style={{ fontFamily:sans, fontSize:"0.65rem", color:C.textMuted }}>{d}</span>
                    </span>
                  ))}
                </div>
                <span style={{ fontFamily:mono, fontSize:"0.5rem", color:C.textMuted, opacity:0.6 }}>ETNewsAI</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}