// ════════════════════════════════════════════════
// ChatPanel.jsx — PEAK UI/UX EDITION v2
// Backend: UNTOUCHED  |  Visuals: MAXIMAL
// ════════════════════════════════════════════════
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendChatMessage } from '@/lib/api';

const C = {
  bg:'#07070a', surface:'#0f0f12', surfaceHigh:'#141418',
  border:'rgba(255,255,255,0.07)', text:'#f0f0f2', textSec:'#8a8a9a', textMuted:'#44445a',
  accent:'#f5c842', accentDim:'rgba(245,200,66,0.10)', accentGlow:'rgba(245,200,66,0.25)',
};
const mono = "'JetBrains Mono','Fira Code',monospace";
const sans = "'DM Sans',system-ui,sans-serif";
const serif = "'Playfair Display',Georgia,serif";

const SUGGESTIONS = [
  { label:'Key risks?',       text:'What are the key risks?',                  icon:'⚠' },
  { label:'Investor impact?', text:'How does this affect retail investors?',    icon:'📈' },
  { label:'Background?',      text:'What happened before this?',               icon:'📖' },
  { label:'Next steps?',      text:'What should I watch for next?',            icon:'🔭' },
];

// ─── Constellation Empty State ────────────────────────────────────────────────
const STARS = [
  {x:20,y:15},{x:50,y:8},{x:78,y:22},{x:35,y:42},{x:65,y:35},
  {x:15,y:65},{x:88,y:55},{x:42,y:78},{x:70,y:80},{x:55,y:55},
];
const CONNECTIONS = [[0,1],[1,2],[0,3],[3,4],[4,2],[4,9],[9,7],[7,8],[5,3],[6,4]];

function ConstellationEmpty({ onSuggestion }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, padding:'2rem 1.5rem', textAlign:'center' }}>
      {/* Constellation SVG */}
      <div style={{ position:'relative', width:180, height:120, marginBottom:'1.5rem' }}>
        <svg width="180" height="120" viewBox="0 0 100 100" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
          {CONNECTIONS.map(([a, b], i) => (
            <motion.line key={i}
              x1={`${STARS[a].x}%`} y1={`${STARS[a].y}%`}
              x2={`${STARS[b].x}%`} y2={`${STARS[b].y}%`}
              stroke="rgba(245,200,66,0.15)" strokeWidth="0.5"
              initial={{ opacity:0, pathLength:0 }}
              animate={{ opacity:1, pathLength:1 }}
              transition={{ delay:i * 0.08, duration:0.5 }}
            />
          ))}
          {STARS.map((s, i) => (
            <motion.circle key={i}
              cx={`${s.x}%`} cy={`${s.y}%`}
              r={i === 9 ? 2.5 : 1.5}
              fill={i === 9 ? C.accent : 'rgba(245,200,66,0.5)'}
              filter={i === 9 ? `url(#glow)` : undefined}
              initial={{ opacity:0, scale:0 }}
              animate={{ opacity:[0,1,0.7,1], scale:1 }}
              transition={{ delay:i*0.06, duration:0.4 }}
            />
          ))}
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
        </svg>
      </div>

      <p style={{ fontFamily:serif, fontSize:'1.05rem', fontWeight:600, color:C.text, margin:'0 0 0.4rem' }}>
        Ask the AI anything
      </p>
      <p style={{ fontFamily:sans, fontSize:'0.82rem', color:C.textMuted, margin:'0 0 1.5rem', maxWidth:260, lineHeight:1.6 }}>
        Follow-up on the briefing, dig into specifics, or explore deeper context.
      </p>

      {/* Suggestions */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:'0.45rem', justifyContent:'center', maxWidth:320 }}>
        {SUGGESTIONS.map((s, i) => (
          <motion.button key={s.label}
            onClick={() => onSuggestion(s.text)}
            style={{
              padding:'0.45rem 0.9rem', borderRadius:99,
              fontFamily:mono, fontSize:'0.58rem', textTransform:'uppercase', letterSpacing:'0.08em',
              border:`1px solid rgba(255,255,255,0.07)`,
              background:C.surface, color:C.textSec, cursor:'pointer',
              display:'flex', alignItems:'center', gap:'0.35rem',
            }}
            initial={{ opacity:0, y:8 }}
            animate={{ opacity:1, y:0 }}
            transition={{ delay:0.3 + i*0.07 }}
            whileHover={{ scale:1.06, background:C.accentDim, borderColor:'rgba(245,200,66,0.25)', color:C.accent }}
            whileTap={{ scale:0.94 }}
          >
            <span>{s.icon}</span> {s.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ─── Orbital Thinking Indicator ───────────────────────────────────────────────
function OrbitalThinking() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.1rem 0' }}>
      <div style={{ position:'relative', width:28, height:28, flexShrink:0 }}>
        <style>{`
          @keyframes orbit1{from{transform:rotate(0deg) translateX(10px)}to{transform:rotate(360deg) translateX(10px)}}
          @keyframes orbit2{from{transform:rotate(120deg) translateX(7px)}to{transform:rotate(480deg) translateX(7px)}}
          @keyframes orbit3{from{transform:rotate(240deg) translateX(5px)}to{transform:rotate(600deg) translateX(5px)}}
        `}</style>
        {/* Center dot */}
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:4, height:4, borderRadius:'50%', background:C.accent, boxShadow:`0 0 6px ${C.accent}` }}/>
        {/* Orbiting dots */}
        <div style={{ position:'absolute', top:'50%', left:'50%', width:5, height:5, borderRadius:'50%', background:'rgba(245,200,66,0.6)', marginTop:-2.5, marginLeft:-2.5, animation:'orbit1 1.4s linear infinite' }}/>
        <div style={{ position:'absolute', top:'50%', left:'50%', width:4, height:4, borderRadius:'50%', background:'rgba(245,200,66,0.4)', marginTop:-2, marginLeft:-2, animation:'orbit2 1.8s linear infinite' }}/>
        <div style={{ position:'absolute', top:'50%', left:'50%', width:3, height:3, borderRadius:'50%', background:'rgba(245,200,66,0.25)', marginTop:-1.5, marginLeft:-1.5, animation:'orbit3 2.2s linear infinite' }}/>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
        <div style={{ fontFamily:mono, fontSize:'0.52rem', textTransform:'uppercase', letterSpacing:'0.1em', color:C.textMuted }}>
          ET<span style={{ color:C.accent }}>AI</span> is thinking
        </div>
        <motion.div
          style={{ height:2, background:`linear-gradient(90deg, ${C.accent}, transparent)`, borderRadius:99, width:80, transformOrigin:'left' }}
          animate={{ scaleX:[0.3,1,0.3] }}
          transition={{ duration:1.5, repeat:Infinity, ease:'easeInOut' }}
        />
      </div>
    </div>
  );
}

// ─── Copy Button ──────────────────────────────────────────────────────────────
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <motion.button
      onClick={handle}
      title="Copy"
      style={{
        background: copied ? 'rgba(52,211,153,0.1)' : 'transparent',
        border:`1px solid ${copied ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius:5, padding:'0.15rem 0.45rem', cursor:'pointer',
        fontFamily:mono, fontSize:'0.55rem', color: copied ? '#34d399' : C.textMuted,
        transition:'all 0.18s',
        display:'flex', alignItems:'center', gap:'0.25rem',
      }}
      whileHover={{ scale:1.05 }}
      whileTap={{ scale:0.9 }}
    >
      {copied ? '✓ Copied' : '⎘ Copy'}
    </motion.button>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, isLast, isStreaming, sources }) {
  const isUser = msg.role === 'user';
  const isAI   = msg.role === 'assistant';
  const [hov, setHov] = useState(false);

  const timeStr = msg.timestamp
    ? new Date(msg.timestamp).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })
    : new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });

  return (
    <motion.div
      style={{
        display:'flex',
        flexDirection:'column',
        gap:'0.3rem',
        maxWidth: isUser ? '82%' : '100%',
        alignSelf: isUser ? 'flex-end' : 'flex-start',
      }}
      initial={{ opacity:0, y:10, scale:0.97 }}
      animate={{ opacity:1, y:0, scale:1 }}
      transition={{ duration:0.28, ease:[0.22,1,0.36,1] }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* AI label */}
      {isAI && (
        <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', marginBottom:'0.1rem' }}>
          <motion.span
            style={{ display:'inline-block', width:5, height:5, borderRadius:'50%', background:C.accent, boxShadow:`0 0 5px ${C.accent}` }}
            animate={{ opacity:[1,0.4,1] }}
            transition={{ duration:2.2, repeat:Infinity }}
          />
          <span style={{ fontFamily:mono, fontSize:'0.52rem', textTransform:'uppercase', letterSpacing:'0.1em', color:C.textMuted }}>
            ET<span style={{ color:C.accent }}>AI</span>
          </span>
        </div>
      )}

      {/* Bubble */}
      <div style={{
        position:'relative',
        padding:'0.78rem 1rem',
        borderRadius: isUser ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
        background: isUser
          ? `linear-gradient(135deg, rgba(245,200,66,0.12), rgba(245,200,66,0.07))`
          : C.surface,
        border:`1px solid ${isUser ? 'rgba(245,200,66,0.22)' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: isUser
          ? '0 4px 20px rgba(245,200,66,0.08)'
          : '0 2px 12px rgba(0,0,0,0.3)',
      }}>
        {/* Content */}
        {msg.content ? (
          <span style={{ fontFamily:sans, fontSize:'0.88rem', lineHeight:1.72, color:C.text, display:'block' }}>
            {msg.content}
            {isAI && isStreaming && isLast && (
              <motion.span
                style={{ color:C.accent, marginLeft:2 }}
                animate={{ opacity:[1,0,1] }}
                transition={{ duration:0.65, repeat:Infinity }}
              >▊</motion.span>
            )}
          </span>
        ) : (
          <OrbitalThinking />
        )}
      </div>

      {/* Bottom row: time + copy */}
      <AnimatePresence>
        {(hov || (isAI && msg.content && !isStreaming)) && (
          <motion.div
            style={{
              display:'flex', alignItems:'center', gap:'0.5rem',
              paddingLeft: isAI ? '0.2rem' : '0',
              justifyContent: isUser ? 'flex-end' : 'flex-start',
            }}
            initial={{ opacity:0, y:-4 }}
            animate={{ opacity:1, y:0 }}
            exit={{ opacity:0, y:-4 }}
            transition={{ duration:0.15 }}
          >
            <span style={{ fontFamily:mono, fontSize:'0.5rem', color:C.textMuted }}>{timeStr}</span>
            {isAI && msg.content && <CopyBtn text={msg.content} />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Source chips under AI messages */}
      {isAI && msg.content && !isStreaming && sources?.length > 0 && (
        <motion.div
          style={{ display:'flex', flexWrap:'wrap', gap:'0.35rem', marginTop:'0.25rem' }}
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.2 }}
        >
          {sources.slice(0,3).map((s, si) => (
            <a key={si} href={s.url} target="_blank" rel="noopener noreferrer"
              style={{
                fontFamily:mono, fontSize:'0.52rem', textTransform:'uppercase', letterSpacing:'0.07em',
                color:C.textMuted, background:C.bg, border:`1px solid rgba(255,255,255,0.06)`,
                borderRadius:4, padding:'0.15rem 0.5rem', textDecoration:'none',
                transition:'all 0.15s',
              }}
              onMouseEnter={e => { e.target.style.color = C.accent; e.target.style.borderColor = 'rgba(245,200,66,0.2)'; }}
              onMouseLeave={e => { e.target.style.color = C.textMuted; e.target.style.borderColor = 'rgba(255,255,255,0.06)'; }}
            >
              {s.source}
            </a>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Main ChatPanel ───────────────────────────────────────────────────────────
export default function ChatPanel({ conversationId, sources }) {
  const [messages, setMessages]      = useState([]);
  const [input, setInput]            = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [focused, setFocused]        = useState(false);
  const [charCount, setCharCount]    = useState(0);
  const messagesRef = useRef(null);
  const inputRef    = useRef(null);

  useEffect(() => {
    if (messagesRef.current)
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => { setMessages([]); }, [conversationId]);

  // ── Backend untouched ──
  const handleSend = async () => {
    if (!input.trim() || isStreaming || !conversationId) return;
    const userMessage = input.trim();
    setInput(''); setCharCount(0);
    setMessages(p => [...p, { role:'user', content:userMessage, timestamp:Date.now() }]);
    setIsStreaming(true);
    setMessages(p => [...p, { role:'assistant', content:'', timestamp:Date.now() }]);

    try {
      const stream  = await sendChatMessage(conversationId, userMessage, true);
      const reader  = stream.getReader();
      const decoder = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream:true }).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const d = line.slice(6).trim();
          if (d === '[DONE]') continue;
          try {
            const p = JSON.parse(d);
            if (p.text) { full += p.text; setMessages(prev => { const u=[...prev]; u[u.length-1]={...u[u.length-1],content:full}; return u; }); }
            if (p.error) { full=`Error: ${p.error}`; setMessages(prev => { const u=[...prev]; u[u.length-1]={...u[u.length-1],content:full}; return u; }); }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => { const u=[...prev]; u[u.length-1]={...u[u.length-1],content:'Sorry, I encountered an error. Please try again.'}; return u; });
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    setCharCount(e.target.value.length);
  };

  const isDisabled = !conversationId || isStreaming;
  const canSend = input.trim() && !isDisabled;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', minHeight:480, background:C.surfaceHigh, fontFamily:sans }}>

      {/* Header */}
      <div style={{
        display:'flex', justifyContent:'space-between', alignItems:'center',
        padding:'0.85rem 1.2rem',
        borderBottom:`1px solid rgba(255,255,255,0.06)`,
        background:`linear-gradient(180deg, rgba(20,20,24,1), rgba(15,15,18,0.5))`,
        flexShrink:0,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.55rem' }}>
          {/* Live indicator */}
          <div style={{ position:'relative', width:8, height:8 }}>
            <span style={{ position:'absolute', inset:0, borderRadius:'50%', background:isStreaming ? C.accent : '#22c55e', animation:'ping 1.5s infinite', opacity:0.5 }}/>
            <span style={{ position:'relative', display:'block', width:8, height:8, borderRadius:'50%', background:isStreaming ? C.accent : '#22c55e' }}/>
            <style>{`@keyframes ping{0%{transform:scale(1);opacity:.5}75%,100%{transform:scale(2.2);opacity:0}}`}</style>
          </div>
          <span style={{ fontFamily:mono, fontSize:'0.58rem', textTransform:'uppercase', letterSpacing:'0.12em', color:C.textSec }}>
            {isStreaming ? 'Responding…' : 'Follow-up'}
          </span>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
          {messages.length > 0 && (
            <span style={{ fontFamily:mono, fontSize:'0.5rem', color:C.textMuted }}>
              {Math.floor(messages.length / 2)} exchanges
            </span>
          )}
          {sources?.length > 0 && (
            <span style={{
              fontFamily:mono, fontSize:'0.53rem', textTransform:'uppercase', letterSpacing:'0.08em',
              color:C.accent, background:C.accentDim, padding:'0.18rem 0.6rem', borderRadius:99,
              border:`1px solid rgba(245,200,66,0.2)`,
            }}>{sources.length} srcs</span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesRef}
        style={{
          flex:1, overflowY:'auto', padding:'1.2rem 1.1rem',
          display:'flex', flexDirection:'column', gap:'0.9rem',
          scrollbarWidth:'thin', scrollbarColor:`rgba(255,255,255,0.06) transparent`,
        }}
      >
        {messages.length === 0 ? (
          <ConstellationEmpty onSuggestion={t => setInput(t)} />
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                msg={msg}
                isLast={i === messages.length - 1}
                isStreaming={isStreaming}
                sources={sources}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Input area */}
      <div style={{
        borderTop:`1px solid ${focused ? 'rgba(245,200,66,0.28)' : 'rgba(255,255,255,0.06)'}`,
        transition:'border-color 0.22s',
        background:C.bg, flexShrink:0,
      }}>
        <div style={{ display:'flex', alignItems:'flex-end' }}>
          <textarea
            ref={inputRef}
            id="chat-input"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={conversationId ? 'Ask a follow-up question…' : 'Generate a briefing first'}
            disabled={isDisabled}
            rows={2}
            style={{
              flex:1, padding:'0.9rem 1rem',
              background:'transparent', border:'none', outline:'none', resize:'none',
              fontFamily:sans, fontSize:'0.88rem', lineHeight:1.55, color:C.text,
              scrollbarWidth:'none', opacity: isDisabled ? 0.45 : 1,
            }}
          />

          {/* Right side of input */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'0.6rem 0.8rem', gap:'0.35rem', flexShrink:0 }}>
            {/* Char counter */}
            {charCount > 0 && (
              <motion.span
                initial={{ opacity:0 }}
                animate={{ opacity:1 }}
                style={{
                  fontFamily:mono, fontSize:'0.48rem', color: charCount > 400 ? '#f87171' : C.textMuted,
                  transition:'color 0.2s',
                }}
              >
                {charCount}
              </motion.span>
            )}

            {/* Send button */}
            <motion.button
              id="chat-send-btn"
              onClick={handleSend}
              disabled={!canSend}
              style={{
                width:38, height:38, borderRadius:10, flexShrink:0,
                background: canSend
                  ? `linear-gradient(135deg, ${C.accent}, rgba(245,200,66,0.7))`
                  : 'rgba(255,255,255,0.05)',
                color: canSend ? '#07070a' : C.textMuted,
                border: canSend ? 'none' : `1px solid rgba(255,255,255,0.06)`,
                cursor: canSend ? 'pointer' : 'not-allowed',
                fontFamily:mono, fontSize:'1rem', fontWeight:700,
                display:'flex', alignItems:'center', justifyContent:'center',
                transition:'all 0.2s',
                boxShadow: canSend ? `0 4px 16px rgba(245,200,66,0.25)` : 'none',
              }}
              whileHover={canSend ? { scale:1.06, boxShadow:`0 6px 24px rgba(245,200,66,0.35)` } : {}}
              whileTap={canSend ? { scale:0.9 } : {}}
            >
              {isStreaming ? (
                <motion.span
                  animate={{ rotate:360 }}
                  transition={{ duration:1, repeat:Infinity, ease:'linear' }}
                  style={{ display:'inline-block', fontSize:'0.85rem' }}
                >◌</motion.span>
              ) : '→'}
            </motion.button>
          </div>
        </div>

        {/* Bottom hint */}
        <div style={{
          padding:'0 1rem 0.6rem',
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <span style={{ fontFamily:mono, fontSize:'0.48rem', color:C.textMuted, opacity:focused ? 1 : 0, transition:'opacity 0.2s' }}>
            Enter to send · Shift+Enter for new line
          </span>
          <span style={{ fontFamily:mono, fontSize:'0.48rem', color:C.textMuted, opacity:0.5 }}>
            Powered by ETAI
          </span>
        </div>
      </div>
    </div>
  );
}