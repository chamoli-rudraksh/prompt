'use client';

import { Article } from '@/types';
import { saveArticle } from '@/lib/api';
import { useState } from 'react';

interface ArticleCardProps {
  article: Article;
  userId?: string;
}

export default function ArticleCard({ article, userId }: ArticleCardProps) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!userId || saved) return;
    setSaving(true);
    try {
      await saveArticle({ user_id: userId, article_id: article.id });
      setSaved(true);
    } catch (error) {
      console.error('Failed to save article:', error);
    } finally {
      setSaving(false);
    }
  };

  const timeAgo = (dateStr?: string) => {
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
          <span className="source-icon">{article.source.charAt(0)}</span>
          <span className="source-name">{article.source}</span>
          <span className="source-time">{timeAgo(article.published_at)}</span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className={`save-btn ${saved ? 'saved' : ''}`}
          title={saved ? 'Saved' : 'Save article'}
        >
          {saved ? '✓' : '♡'}
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

      {article.why_it_matters && (
        <div className="why-it-matters">
          <span className="why-label">Why it matters to you</span>
          <p className="why-text">{article.why_it_matters}</p>
        </div>
      )}

      <div className="article-tags">
        {article.topics.map((topic) => (
          <span key={topic} className="topic-tag">
            {topic}
          </span>
        ))}
      </div>
    </div>
  );
}
