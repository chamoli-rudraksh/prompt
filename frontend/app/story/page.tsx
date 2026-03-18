'use client';

import { useState } from 'react';
import StoryTimeline from '@/components/StoryTimeline';
import PlayerGraph from '@/components/PlayerGraph';
import SentimentChart from '@/components/SentimentChart';
import { getStoryArc } from '@/lib/api';
import { StoryArcResponse } from '@/types';

export default function StoryPage() {
  const [query, setQuery] = useState('');
  const [storyData, setStoryData] = useState<StoryArcResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setStoryData(null);

    try {
      const userId = localStorage.getItem('etnewsai_user_id') || 'anonymous';
      const data = await getStoryArc(query, userId);
      setStoryData(data);
    } catch (err: any) {
      console.error('Story arc error:', err);
      setError('Failed to generate story arc. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="story-page">
      <div className="story-header">
        <h1 className="story-title">Story Arc Tracker</h1>
        <p className="story-subtitle">
          Track the evolution of any ongoing story with AI-powered analysis
        </p>
      </div>

      <form onSubmit={handleSearch} className="story-search">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Track any ongoing story... e.g. India-Canada relations, Byju's collapse"
          className="story-input"
          id="story-search-input"
        />
        <button
          type="submit"
          disabled={!query.trim() || loading}
          className="story-search-btn"
          id="story-search-btn"
        >
          {loading ? 'Analyzing...' : 'Track Story'}
        </button>
      </form>

      {error && (
        <div className="story-banner">
          <span>⚠️ {error}</span>
        </div>
      )}

      {loading && (
        <div className="story-loading">
          <div className="loading-dots">
            <span></span><span></span><span></span>
          </div>
          <p>Analyzing story arc across all sources...</p>
        </div>
      )}

      {storyData && (
        <div className="story-content">
          {/* Section 1: Summary */}
          {storyData.summary && (
            <div className="story-summary-card">
              <h2 className="section-title">Story Summary</h2>
              <p className="story-summary-text">{storyData.summary}</p>
            </div>
          )}

          {/* Section 2: Timeline */}
          {storyData.timeline.length > 0 && (
            <StoryTimeline events={storyData.timeline} />
          )}

          {/* Section 3: Players + Sentiment side by side */}
          <div className="story-dual-section">
            <div className="story-dual-left">
              {storyData.players.length > 0 && (
                <PlayerGraph players={storyData.players} />
              )}
            </div>
            <div className="story-dual-right">
              {storyData.sentiment_over_time.length > 0 && (
                <SentimentChart data={storyData.sentiment_over_time} />
              )}
            </div>
          </div>

          {/* Section 4: Contrarian View */}
          {storyData.contrarian_view && (
            <div className="contrarian-card">
              <h3 className="contrarian-title">🔄 Another Perspective</h3>
              <p className="contrarian-text">{storyData.contrarian_view}</p>
            </div>
          )}

          {/* What to Watch */}
          {storyData.what_to_watch.length > 0 && (
            <div className="watch-card">
              <h3 className="watch-title">👁️ What to Watch Next</h3>
              <ul className="watch-list">
                {storyData.what_to_watch.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
