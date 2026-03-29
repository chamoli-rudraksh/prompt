'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthGuard from '@/components/AuthGuard';
import { apiFetch } from '@/lib/auth';

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};

const API = getApiUrl();

// ── Design tokens (terminal theme) ────────────────────────────────

const T = {
  bg:         '#0a0a0e',
  surface:    '#111116',
  surfaceAlt: '#161620',
  border:     'rgba(255,255,255,0.06)',
  green:      '#00ff88',
  greenDim:   'rgba(0,255,136,0.08)',
  greenGlow:  'rgba(0,255,136,0.3)',
  red:        '#ff4444',
  redDim:     'rgba(255,68,68,0.08)',
  redGlow:    'rgba(255,68,68,0.2)',
  yellow:     '#f5c842',
  yellowDim:  'rgba(245,200,66,0.10)',
  cyan:       '#00d4ff',
  cyanDim:    'rgba(0,212,255,0.08)',
  text:       '#c8c8d0',
  textDim:    '#555568',
  textBright: '#f0f0f5',
};

const mono = "'JetBrains Mono','Fira Code','Courier New',monospace";
const sans = "'DM Sans',system-ui,sans-serif";

// ── Status helpers ────────────────────────────────────────────────

function statusColor(status) {
  switch (status) {
    case 'success': return T.green;
    case 'failed':  return T.red;
    case 'skipped': return T.yellow;
    case 'partial': return T.yellow;
    default:        return T.textDim;
  }
}

function statusIcon(status) {
  switch (status) {
    case 'success': return '✓';
    case 'failed':  return '✗';
    case 'skipped': return '⊘';
    case 'partial': return '◐';
    default:        return '•';
  }
}

function formatDuration(ms) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTimestamp(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-IN', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
  } catch { return ts; }
}

// ── Log Entry Component ───────────────────────────────────────────

function LogEntry({ log, index }) {
  const [expanded, setExpanded] = useState(false);
  const color = statusColor(log.status);
  const icon = statusIcon(log.status);

  const inputData = (() => { try { return JSON.parse(log.input_data || '{}'); } catch { return {}; } })();
  const outputData = (() => { try { return JSON.parse(log.output_data || '{}'); } catch { return {}; } })();

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02, duration: 0.3 }}
      onClick={() => setExpanded(!expanded)}
      style={{
        ...S.logRow,
        borderLeft: `2px solid ${color}`,
        cursor: 'pointer',
      }}
    >
      {/* Main line */}
      <div style={S.logMain}>
        <span style={{ ...S.logIcon, color }}>{icon}</span>
        <span style={S.logTime}>{formatTimestamp(log.created_at)}</span>
        <span style={{ ...S.logAgent, background: T.surfaceAlt }}>{log.agent_name}</span>
        <span style={{ ...S.logTask, color: T.cyan }}>[{log.task}]</span>
        <span style={{ ...S.logStatus, color }}>{log.status}</span>
        <span style={S.logDuration}>{formatDuration(log.duration_ms)}</span>
        <span style={{ ...S.logExpand, transform: expanded ? 'rotate(90deg)' : 'rotate(0)' }}>▶</span>
      </div>

      {/* Error line */}
      {log.error && (
        <div style={S.logError}>
          <span style={{ color: T.red, fontWeight: 700 }}>ERR</span> {log.error}
        </div>
      )}

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={S.logDetails}
          >
            {Object.keys(inputData).length > 0 && (
              <div style={S.detailBlock}>
                <span style={S.detailLabel}>INPUT</span>
                <pre style={S.detailPre}>{JSON.stringify(inputData, null, 2)}</pre>
              </div>
            )}
            {Object.keys(outputData).length > 0 && (
              <div style={S.detailBlock}>
                <span style={S.detailLabel}>OUTPUT</span>
                <pre style={S.detailPre}>{JSON.stringify(outputData, null, 2)}</pre>
              </div>
            )}
            {log.retry_count > 0 && (
              <div style={{ ...S.detailBlock, color: T.yellow }}>
                RETRIES: {log.retry_count}
              </div>
            )}
            {log.user_id && (
              <div style={S.detailBlock}>
                <span style={S.detailLabel}>USER</span> {log.user_id}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Stats Bar ─────────────────────────────────────────────────────

function StatsBar({ logs }) {
  const total = logs.length;
  const success = logs.filter(l => l.status === 'success').length;
  const failed = logs.filter(l => l.status === 'failed').length;
  const avgMs = total > 0
    ? Math.round(logs.reduce((sum, l) => sum + (l.duration_ms || 0), 0) / total)
    : 0;

  const stats = [
    { label: 'TOTAL', value: total, color: T.textBright },
    { label: 'SUCCESS', value: success, color: T.green },
    { label: 'FAILED', value: failed, color: failed > 0 ? T.red : T.textDim },
    { label: 'AVG LATENCY', value: formatDuration(avgMs), color: T.cyan },
  ];

  return (
    <div style={S.statsBar}>
      {stats.map(s => (
        <div key={s.label} style={S.statItem}>
          <span style={{ ...S.statValue, color: s.color }}>{s.value}</span>
          <span style={S.statLabel}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────

function AgentConsole() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filter, setFilter] = useState('all');
  const scrollRef = useRef(null);

  const fetchLogs = async () => {
    try {
      const res = await apiFetch(`${API}/admin/logs?limit=200`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to fetch agent logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const filteredLogs = filter === 'all'
    ? logs
    : logs.filter(l => l.status === filter);

  const agents = [...new Set(logs.map(l => l.agent_name))];

  return (
    <div style={S.page}>

      {/* ── HEADER ── */}
      <div style={S.header}>
        <div style={S.headerInner}>
          <div>
            <div style={S.headerTag}>
              <motion.span
                style={S.liveDot}
                animate={autoRefresh ? { opacity: [1, 0.2, 1], scale: [1, 0.7, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              {autoRefresh ? 'LIVE' : 'PAUSED'}
            </div>
            <h1 style={S.headerTitle}>Agent Console</h1>
            <p style={S.headerDesc}>
              Real-time observability into LangGraph agent execution, errors, and recovery.
            </p>
          </div>

          <div style={S.headerControls}>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              style={{
                ...S.controlBtn,
                background: autoRefresh ? T.greenDim : T.redDim,
                color: autoRefresh ? T.green : T.red,
                borderColor: autoRefresh ? 'rgba(0,255,136,0.2)' : 'rgba(255,68,68,0.2)',
              }}
            >
              {autoRefresh ? '⏸ Pause' : '▶ Resume'}
            </button>
            <button onClick={fetchLogs} style={S.controlBtn}>
              ↻ Refresh
            </button>
          </div>
        </div>
      </div>

      <div style={S.body}>

        {/* ── STATS ── */}
        <StatsBar logs={logs} />

        {/* ── AGENT BADGES ── */}
        {agents.length > 0 && (
          <div style={S.agentBadges}>
            {agents.map(a => (
              <span key={a} style={S.agentBadge}>{a}</span>
            ))}
          </div>
        )}

        {/* ── FILTER BAR ── */}
        <div style={S.filterBar}>
          {['all', 'success', 'failed', 'skipped', 'partial'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                ...S.filterBtn,
                ...(filter === f ? {
                  background: f === 'all' ? T.surfaceAlt : (f === 'success' ? T.greenDim : f === 'failed' ? T.redDim : T.yellowDim),
                  color: f === 'all' ? T.textBright : statusColor(f),
                  borderColor: f === 'all' ? T.border : statusColor(f),
                } : {}),
              }}
            >
              {statusIcon(f === 'all' ? '' : f)} {f.toUpperCase()}
            </button>
          ))}
          <span style={S.logCount}>{filteredLogs.length} entries</span>
        </div>

        {/* ── TERMINAL OUTPUT ── */}
        <div style={S.terminal} ref={scrollRef}>

          {/* Boot message */}
          <div style={S.bootMsg}>
            <span style={{ color: T.green }}>$</span>{' '}
            <span style={{ color: T.textDim }}>etnewsai agent-monitor --mode=</span>
            <span style={{ color: T.green }}>live</span>
            <span style={{ color: T.textDim }}> --format=</span>
            <span style={{ color: T.cyan }}>structured</span>
          </div>
          <div style={{ ...S.bootMsg, color: T.textDim }}>
            ── Agent execution log stream ──────────────────────────
          </div>

          {/* Loading */}
          {loading && (
            <motion.div
              style={S.loadingMsg}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Loading agent logs...
            </motion.div>
          )}

          {/* Empty */}
          {!loading && filteredLogs.length === 0 && (
            <div style={{ ...S.bootMsg, color: T.textDim, padding: '2rem 0' }}>
              No log entries {filter !== 'all' ? `with status "${filter}"` : 'found'}.
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  style={{ ...S.filterBtn, marginLeft: 8, color: T.cyan }}
                >
                  Show all
                </button>
              )}
            </div>
          )}

          {/* Log entries */}
          {filteredLogs.map((log, i) => (
            <LogEntry key={log.id} log={log} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────

const S = {
  page: { minHeight: '100vh', background: T.bg, color: T.text, fontFamily: mono },

  header: {
    borderBottom: `1px solid ${T.border}`,
    padding: '2rem 2rem 1.5rem',
    background: `linear-gradient(to bottom, ${T.surface}, ${T.bg})`,
  },
  headerInner: {
    maxWidth: 1200, margin: '0 auto',
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: '1rem', flexWrap: 'wrap',
  },
  headerTag: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.15em',
    color: T.green, background: T.greenDim,
    padding: '0.2rem 0.7rem', borderRadius: 99,
    marginBottom: '0.6rem',
  },
  liveDot: {
    display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
    background: T.green, boxShadow: `0 0 8px ${T.greenGlow}`,
  },
  headerTitle: {
    fontFamily: sans, fontSize: 'clamp(1.5rem, 2vw, 2rem)',
    fontWeight: 700, color: T.textBright, margin: '0 0 0.35rem',
    letterSpacing: '-0.03em',
  },
  headerDesc: {
    fontSize: '0.72rem', color: T.textDim, margin: 0,
    lineHeight: 1.6,
  },
  headerControls: { display: 'flex', gap: 8 },
  controlBtn: {
    padding: '0.5rem 1rem', borderRadius: 6,
    background: T.surfaceAlt, color: T.text,
    borderWidth: 1, borderStyle: 'solid', borderColor: T.border,
    cursor: 'pointer',
    fontSize: '0.62rem', fontFamily: mono, fontWeight: 500,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    transition: 'all 0.15s',
  },

  body: { maxWidth: 1200, margin: '0 auto', padding: '1.5rem 2rem 4rem' },

  // Stats
  statsBar: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1,
    background: T.border, borderRadius: 10, overflow: 'hidden',
    marginBottom: '1.5rem',
  },
  statItem: {
    background: T.surface, padding: '1rem 1.2rem',
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  statValue: { fontSize: '1.3rem', fontWeight: 700 },
  statLabel: { fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: T.textDim },

  // Agent badges
  agentBadges: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' },
  agentBadge: {
    fontSize: '0.56rem', textTransform: 'uppercase', letterSpacing: '0.1em',
    background: T.cyanDim, color: T.cyan,
    padding: '0.2rem 0.65rem', borderRadius: 99,
    border: `1px solid rgba(0,212,255,0.15)`,
  },

  // Filter
  filterBar: {
    display: 'flex', alignItems: 'center', gap: 6,
    marginBottom: '1rem', flexWrap: 'wrap',
  },
  filterBtn: {
    padding: '0.35rem 0.7rem', borderRadius: 6,
    background: 'transparent', color: T.textDim,
    borderWidth: 1, borderStyle: 'solid', borderColor: T.border,
    cursor: 'pointer',
    fontSize: '0.56rem', fontFamily: mono,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    transition: 'all 0.15s',
  },
  logCount: {
    marginLeft: 'auto', fontSize: '0.55rem',
    color: T.textDim, textTransform: 'uppercase', letterSpacing: '0.1em',
  },

  // Terminal
  terminal: {
    background: T.surface, borderRadius: 12,
    border: `1px solid ${T.border}`,
    padding: '1rem 0', maxHeight: '65vh', overflowY: 'auto',
  },
  bootMsg: { padding: '0.3rem 1.2rem', fontSize: '0.68rem', color: T.text },
  loadingMsg: { padding: '1rem 1.2rem', fontSize: '0.68rem', color: T.yellow },

  // Log rows
  logRow: {
    padding: '0.6rem 1.2rem 0.6rem 1rem',
    borderBottom: `1px solid ${T.border}`,
    transition: 'background 0.15s',
  },
  logMain: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: '0.65rem', flexWrap: 'wrap',
  },
  logIcon: { fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 },
  logTime: { color: T.textDim, flexShrink: 0, minWidth: 90 },
  logAgent: {
    padding: '0.15rem 0.55rem', borderRadius: 4,
    color: T.textBright, fontSize: '0.6rem', fontWeight: 600,
  },
  logTask: { fontSize: '0.6rem' },
  logStatus: { fontWeight: 600, textTransform: 'uppercase', fontSize: '0.58rem', letterSpacing: '0.08em' },
  logDuration: { color: T.textDim, marginLeft: 'auto', flexShrink: 0 },
  logExpand: {
    color: T.textDim, fontSize: '0.5rem',
    transition: 'transform 0.2s', flexShrink: 0,
  },
  logError: {
    fontSize: '0.6rem', color: T.red, marginTop: 4,
    paddingLeft: 20, opacity: 0.9,
  },

  // Details
  logDetails: { overflow: 'hidden', marginTop: 8, paddingLeft: 20 },
  detailBlock: { marginBottom: 8, fontSize: '0.58rem' },
  detailLabel: {
    fontSize: '0.5rem', color: T.textDim, textTransform: 'uppercase',
    letterSpacing: '0.12em', display: 'block', marginBottom: 2,
  },
  detailPre: {
    margin: 0, fontSize: '0.58rem', color: T.text,
    background: T.surfaceAlt, padding: '0.4rem 0.6rem',
    borderRadius: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
    maxHeight: 120, overflowY: 'auto',
  },
};

export default function AgentPage() {
  return <AuthGuard><AgentConsole /></AuthGuard>;
}
