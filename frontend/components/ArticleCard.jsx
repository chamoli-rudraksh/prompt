'use client';

import { useState } from 'react';
import AudioButton from './AudioButton';
import { apiFetch } from '@/lib/auth';

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};

const API = getApiUrl();

function readingTime(text) {
  if (!text) return '1 min read';
  const words = text.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

export default function ArticleCard({ article, userId }) {
  const [saved, setSaved] = useState(article.is_saved || false);
  const [saving, setSaving] = useState(false);

  const toggleSave = async () => {
    setSaving(true);
    try {
      const url = `${API}/articles/save`;
      if (saved) {
        await apiFetch(`${url}/${article.id}`, { method: 'DELETE' });
      } else {
        await apiFetch(url, {
          method: 'POST',
          body: JSON.stringify({ article_id: article.id }),
        });
      }
      setSaved(!saved);
    } catch (error) {
      console.error('Failed to save article:', error);
    } finally {
      setSaving(false);
    }
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="article-card">
      <div className="article-card-header">
        <div className="article-source">
          <span className="source-name">{article.source}</span>
          <span className="source-dot">·</span>
          <span className="source-time">{timeAgo(article.published_at)}</span>
          <span className="source-dot">·</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {readingTime(article.content || article.summary)}
          </span>
        </div>
        <button
          onClick={toggleSave}
          disabled={saving}
          className={`save-btn ${saved ? 'saved' : ''}`}
          title={saved ? 'Unsave' : 'Save article'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            color: saved ? 'var(--et-coral)' : 'var(--text-muted)',
          }}
        >
          {saved ? '★' : '☆'}
        </button>
      </div>

      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="article-title"
      >
        {article.title}
      </a>

      <p className="article-summary">{article.summary}</p>

      {article.summary && (
        <div style={{ marginBottom: 12 }}>
          <AudioButton text={article.summary} />
        </div>
      )}

      {article.why_it_matters && (
        <div className="why-it-matters">
          <span className="why-label">Why this matters to you</span>
          <p className="why-text">{article.why_it_matters}</p>
        </div>
      )}

      <div className="article-footer">
        <div className="article-tags">
          {(article.topics || []).map((topic) => (
            <span key={topic} className="topic-tag">
              {topic}
            </span>
          ))}
        </div>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="read-more-link"
        >
          Read more →
        </a>
      </div>
    </div>
  );
}