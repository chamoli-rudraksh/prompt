'use client';

import { useState } from 'react';
import BriefingPanel from '@/components/BriefingPanel';
import ChatPanel from '@/components/ChatPanel';
import { createBriefing } from '@/lib/api';
import { SourceInfo } from '@/types';

export default function NavigatorPage() {
  const [query, setQuery] = useState('');
  const [briefingText, setBriefingText] = useState('');
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [conversationId, setConversationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setBriefingText('');
    setSources([]);
    setConversationId('');

    try {
      const userId = localStorage.getItem('etnewsai_user_id') || 'anonymous';
      const data = await createBriefing(query, userId);
      setBriefingText(data.briefing_text);
      setSources(data.sources);
      setConversationId(data.conversation_id);
    } catch (err: any) {
      console.error('Briefing error:', err);
      setError('Failed to generate briefing. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="navigator-page">
      <div className="navigator-header">
        <h1 className="navigator-title">News Navigator</h1>
        <p className="navigator-subtitle">
          Get an AI-powered deep briefing on any topic
        </p>
      </div>

      <form onSubmit={handleSearch} className="navigator-search">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask about any topic... e.g. RBI rate cut, Adani group"
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
