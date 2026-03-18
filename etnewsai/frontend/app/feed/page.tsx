'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ArticleCard from '@/components/ArticleCard';
import { getFeed, getDemoFeed } from '@/lib/api';
import { Article } from '@/types';

export default function FeedPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [userName, setUserName] = useState('');
  const [persona, setPersona] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem('etnewsai_user_id');
    const name = localStorage.getItem('etnewsai_user_name');
    const p = localStorage.getItem('etnewsai_persona');
    const demo = localStorage.getItem('etnewsai_demo');

    if (!id) {
      router.push('/');
      return;
    }

    setUserId(id);
    setUserName(name || '');
    setPersona(p || '');
    setIsDemo(demo === 'true');

    loadFeed(id, demo === 'true');
  }, [router]);

  const loadFeed = async (id: string, demo: boolean) => {
    setLoading(true);
    setError('');
    try {
      if (demo) {
        const data = await getDemoFeed();
        setArticles(data.articles || []);
        setUserName(data.user_name || 'Demo User');
      } else {
        const data = await getFeed(id, 20);
        setArticles(data.articles || []);
        if (data.user_name) setUserName(data.user_name);
      }
    } catch (err: any) {
      console.error('Feed error:', err);
      // Try demo data as fallback
      try {
        const data = await getDemoFeed();
        setArticles(data.articles || []);
        setError('Running in preview mode — showing demo data');
      } catch {
        setError('Unable to load feed. Please check backend connection.');
      }
    } finally {
      setLoading(false);
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
        <h1 className="feed-greeting">
          {getGreeting()}, {userName || 'there'}.{' '}
          <span className="feed-greeting-sub">
            Here&apos;s what matters to you today.
          </span>
        </h1>
        {persona && (
          <span className="feed-persona-badge">{persona}</span>
        )}
      </div>

      {error && (
        <div className="feed-banner">
          <span>⚠️ {error}</span>
        </div>
      )}

      {loading ? (
        <div className="feed-grid">
          {[1, 2, 3].map((i) => (
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
          <h2>No articles yet</h2>
          <p>
            Articles are being ingested in the background. Check back in a few
            minutes, or click Demo in the navbar for a preview.
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
