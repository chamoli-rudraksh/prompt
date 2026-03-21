'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ArticleCard from '@/components/ArticleCard';
import { getFeed } from '@/lib/api';
import AuthGuard from '@/components/AuthGuard';
import { apiFetch, getUser, logout } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function TrendingBar({ onTopicClick }) {
  const [topics, setTopics] = useState([]);

  useEffect(() => {
    apiFetch(`${API_URL}/trending`)
      .then((r) => r.json())
      .then((d) => setTopics(d.topics || []))
      .catch(() => {});
  }, []);

  if (!topics.length) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 10,
        }}
      >
        Trending today
      </div>
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 4,
          flexWrap: 'nowrap',
        }}
      >
        {topics.map((t) => (
          <button
            key={t.name}
            onClick={() => onTopicClick(t.name)}
            style={{
              padding: '5px 14px',
              borderRadius: 20,
              whiteSpace: 'nowrap',
              border: '1px solid var(--border)',
              background: 'var(--pill-bg)',
              cursor: 'pointer',
              fontSize: 12,
              color: 'var(--text-primary)',
              fontWeight: 500,
              flexShrink: 0,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--et-navy)';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.border = '1px solid var(--et-navy)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--pill-bg)';
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.border = '1px solid var(--border)';
            }}
          >
            {t.name}
            <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-muted)' }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function FeedPage() {
  const router = useRouter();
  const [articles, setArticles] = useState([]);
  const [userName, setUserName] = useState('');
  const [persona, setPersona] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (!user) return;

    const { id, name, persona: p } = user;
    setUserId(id || '');
    setUserName(name || '');
    setPersona(p || '');
    loadFeed(id);
  }, [router]);

  useEffect(() => {
    const handler = () => {
      if (userId) handleRefresh();
    };
    window.addEventListener('refresh-feed', handler);
    return () => window.removeEventListener('refresh-feed', handler);
  }, [userId]);

  const loadFeed = async (id) => {
    setLoading(true);
    setError('');
    try {
      const data = await getFeed(id, 20);
      setArticles(data.articles || []);
      if (data.user_name) setUserName(data.user_name);
    } catch (err) {
      console.error('Feed error:', err);
      if (err?.response?.status === 404 || err?.response?.status === 401) {
        logout();
        return;
      }
      setError('Unable to load feed. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await apiFetch(`${API_URL}/admin/refresh-news`, { method: 'POST' });
      await new Promise((r) => setTimeout(r, 4000));
      await loadFeed(userId);
    } finally {
      setRefreshing(false);
    }
  };

  const handleTopicClick = (topic) => {
    router.push(`/navigator?q=${encodeURIComponent(topic)}`);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <AuthGuard>
      <div className="feed-page">
        <div className="feed-header">
          <div className="feed-header-left">
            <h1 className="feed-greeting">
              {getGreeting()}, {userName || 'there'}{' '}
              <span className="feed-greeting-sub">
                Here&apos;s what matters to you today.
              </span>
            </h1>
            {persona && (
              <span className="feed-persona-badge">{persona}</span>
            )}
          </div>
          <div className="feed-header-right">
            <button
              className="btn-accent"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <>Refreshing... <span className="spinner" /></>
              ) : (
                'Refresh feed'
              )}
            </button>
          </div>
        </div>

        <TrendingBar onTopicClick={handleTopicClick} />

        {error && (
          <div className="feed-banner">
            <span>⚠️ {error}</span>
          </div>
        )}

        {loading ? (
          <div className="feed-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-line short"></div>
                <div className="skeleton-line"></div>
                <div className="skeleton-line"></div>
                <div className="skeleton-line medium"></div>
                <div className="skeleton-box"></div>
                <div className="skeleton-tags">
                  <div className="skeleton-tag"></div>
                  <div className="skeleton-tag"></div>
                </div>
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="feed-empty">
            <h2>News is being fetched right now</h2>
            <p>
              Articles are being ingested from live sources. Click &quot;Refresh feed&quot; above to check again.
            </p>
          </div>
        ) : (
          <div className="feed-grid">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                userId={userId}
              />
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}