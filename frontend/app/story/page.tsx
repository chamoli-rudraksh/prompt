'use client';

import { useState, useEffect, useCallback } from 'react';
import StoryTimeline from '@/components/StoryTimeline';
import PlayerGraph from '@/components/PlayerGraph';
import SentimentChart from '@/components/SentimentChart';
import { getStoryArc } from '@/lib/api';
import { StoryArcResponse } from '@/types';

const STORAGE_KEY = 'etnewsai_story_state';

export default function StoryPage() {
  const [query, setQuery] = useState('');
  const [storyData, setStoryData] = useState<StoryArcResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Restore state from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        setQuery(state.query || '');
        if (state.storyData) setStoryData(state.storyData);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // Save state to sessionStorage whenever it changes
  const saveState = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        query,
        storyData,
      }));
    } catch {
      // ignore storage errors
    }
  }, [query, storyData]);

  useEffect(() => {
    saveState();
  }, [saveState]);

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
      <form onSubmit={handleSearch} className="story-search">
        <span className="search-icon">🔍</span>
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
              <div className="section-label">Story overview</div>
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

          {/* Section 4: Contrarian View + What to Watch */}
          {(storyData.contrarian_view || storyData.what_to_watch.length > 0) && (
            <div className="contrarian-card">
              <div className="contrarian-label">Another perspective</div>
              {storyData.contrarian_view && (
                <p className="contrarian-text">{storyData.contrarian_view}</p>
              )}
              {storyData.what_to_watch.length > 0 && (
                <ul className="watch-list">
                  {storyData.what_to_watch.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
