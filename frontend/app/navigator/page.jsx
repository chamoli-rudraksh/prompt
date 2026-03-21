'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import BriefingPanel from '@/components/BriefingPanel';
import ChatPanel from '@/components/ChatPanel';
import { createBriefing } from '@/lib/api';
import AuthGuard from '@/components/AuthGuard';
import { getUser } from '@/lib/auth';
import SearchHistory, { saveSearch } from '@/components/SearchHistory';

const STORAGE_KEY = 'etnewsai_navigator_state';

function NavigatorInner() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [briefingText, setBriefingText] = useState('');
  const [sources, setSources] = useState([]);
  const [conversationId, setConversationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        setQuery(state.query || '');
        setBriefingText(state.briefingText || '');
        setSources(state.sources || []);
        setConversationId(state.conversationId || '');
      }
    } catch {}
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      handleSearch(null, q);
    }
  }, []);

  const saveState = useCallback(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ query, briefingText, sources, conversationId })
      );
    } catch {}
  }, [query, briefingText, sources, conversationId]);

  useEffect(() => { saveState(); }, [saveState]);

  const handleSearch = async (e, overrideQuery) => {
    if (e) e.preventDefault();
    const searchQuery = overrideQuery || query;
    if (!searchQuery.trim()) return;

    saveSearch(searchQuery);
    setLoading(true);
    setError('');
    setBriefingText('');
    setSources([]);
    setConversationId('');

    try {
      const activeUser = getUser();
      const userId = activeUser?.id || 'anonymous';
      const data = await createBriefing(searchQuery, userId);
      setBriefingText(data.briefing_text);
      setSources(data.sources);
      setConversationId(data.conversation_id);
    } catch (err) {
      console.error('Briefing error:', err);
      setError('Failed to generate briefing. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleHistorySelect = (q) => {
    setQuery(q);
    handleSearch(null, q);
  };

  return (
    <div className="navigator-page">
      <form onSubmit={handleSearch} className="navigator-search">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any business topic, company, or event..."
          className="navigator-input"
          id="navigator-search-input"
        />
        <button
          type="submit"
          disabled={!query.trim() || loading}
          className="navigator-search-btn"
          id="navigator-search-btn"
        >
          {loading ? 'Analyzing...' : 'Get Briefing'}
        </button>
      </form>

      <SearchHistory onSelect={handleHistorySelect} />

      {error && (
        <div className="navigator-banner">
          <span>⚠️ {error}</span>
        </div>
      )}

      {loading && (
        <div className="navigator-loading-state">
          <div className="loading-dots">
            <span></span><span></span><span></span>
          </div>
          <p>Gathering sources and building your briefing...</p>
        </div>
      )}

      <div className="navigator-layout">
        <div className="navigator-briefing">
          <BriefingPanel
            briefingText={briefingText}
            sources={sources}
            loading={loading}
          />
        </div>
        <div className="navigator-chat">
          <ChatPanel
            conversationId={conversationId}
            sources={sources}
          />
        </div>
      </div>
    </div>
  );
}

export default function NavigatorPage() {
  return (
    <AuthGuard>
      <Suspense fallback={
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading...
        </div>
      }>
        <NavigatorInner />
      </Suspense>
    </AuthGuard>
  );
}