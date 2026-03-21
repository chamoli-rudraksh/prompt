'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ArticleCard from '@/components/ArticleCard';
import { getFeed } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
    const id = localStorage.getItem('etnewsai_user_id');
    const name = localStorage.getItem('etnewsai_user_name');
    const p = localStorage.getItem('etnewsai_persona');

    if (!id) {
      router.push('/');
      return;
    }

    setUserId(id);
    setUserName(name || '');
    setPersona(p || '');

    loadFeed(id);
  }, [router]);

  // Listen for refresh-feed event from navbar dropdown
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
      if (err?.response?.status === 404) {
        localStorage.removeItem('etnewsai_user_id');
        localStorage.removeItem('etnewsai_user_name');
        localStorage.removeItem('etnewsai_persona');
        localStorage.removeItem('etnewsai_demo');
        router.push('/');
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
      await fetch(`${API_URL}/admin/refresh-news`, { method: 'POST' });
      await new Promise((r) => setTimeout(r, 4000));
      await loadFeed(userId);
    } finally {
      setRefreshing(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
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
  );
}