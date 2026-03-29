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

export default function ArticleCard({ article, userId, persona, onUnsave }) {
  const [saved, setSaved] = useState(article.is_saved || false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const toggleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const url = `${API}/articles/save`;
      if (saved) {
        await apiFetch(`${url}/${article.id}`, { method: 'DELETE' });
        setSaved(false);
        // If we're on the saved page, notify parent to remove card
        if (onUnsave) onUnsave(article.id);
      } else {
        await apiFetch(url, {
          method: 'POST',
          body: JSON.stringify({ article_id: article.id }),
        });
        setSaved(true);
      }
    } catch (error) {
      console.error('Failed to save article:', error);
      setSaveError('Save failed');
      setTimeout(() => setSaveError(''), 2000);
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

  // Persona-specific badge rendering
  const renderPersonaBadge = () => {
    if (!persona) return null;
    const p = persona.toLowerCase();
    if (p.includes('student') || p.includes('beginner')) {
      return <span className="persona-badge persona-student" title="Simplified for learners">📚 Explainer</span>;
    }
    if (p.includes('cfo') || p.includes('professional')) {
      return <span className="persona-badge persona-pro">📊 Analysis</span>;
    }
    if (p.includes('founder') || p.includes('startup')) {
      return <span className="persona-badge persona-founder">🚀 Startup Intel</span>;
    }
    if (p.includes('trader') || p.includes('trading')) {
      return <span className="persona-badge persona-trader">📈 Market Signal</span>;
    }
    return null;
  };

  // Get persona-specific CSS class for the card
  const getPersonaClass = () => {
    if (!persona) return '';
    const p = persona.toLowerCase();
    if (p.includes('student') || p.includes('beginner')) return 'card-student';
    if (p.includes('cfo') || p.includes('professional')) return 'card-professional';
    if (p.includes('founder') || p.includes('startup')) return 'card-founder';
    if (p.includes('trader') || p.includes('trading')) return 'card-trader';
    return '';
  };

  return (
    <div className={`article-card ${getPersonaClass()}`}>
      <div className="article-card-header">
        <div className="article-source">
          <span className="source-name">{article.source}</span>
          <span className="source-dot">·</span>
          <span className="source-time">{timeAgo(article.published_at)}</span>
          <span className="source-dot">·</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {readingTime(article.content || article.summary)}
          </span>
          {renderPersonaBadge()}
        </div>
        <button
          onClick={toggleSave}
          disabled={saving}
          className={`save-btn ${saved ? 'saved' : ''}`}
          title={saving ? 'Saving...' : saved ? 'Unsave' : 'Save article'}
          style={{
            background: 'none',
            border: 'none',
            cursor: saving ? 'wait' : 'pointer',
            fontSize: 16,
            color: saved ? 'var(--et-coral)' : 'var(--text-muted)',
            opacity: saving ? 0.5 : 1,
            transition: 'all 0.2s ease',
            transform: saving ? 'scale(0.85)' : 'scale(1)',
          }}
        >
          {saving ? '⏳' : saved ? '★' : '☆'}
        </button>
      </div>

      {/* Save error toast */}
      {saveError && (
        <div style={{
          fontSize: 11, color: '#ff6b6b', padding: '4px 8px',
          background: 'rgba(255,107,107,0.1)', borderRadius: 4, marginBottom: 8,
        }}>
          {saveError}
        </div>
      )}

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
          <AudioButton text={article.summary} articleId={article.id} />
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