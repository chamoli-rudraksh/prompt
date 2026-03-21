'use client';

import React from 'react';

export default function BriefingPanel({ briefingText, sources, loading }) {
  if (loading) {
    return (
      <div className="briefing-panel">
        <div className="briefing-loading">
          <div className="loading-spinner-text">
            <div className="loading-dots">
              <span></span><span></span><span></span>
            </div>
            <p>Gathering sources and building briefing...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!briefingText) {
    return (
      <div className="briefing-panel">
        <div className="briefing-empty">
          <p>Enter a topic above to generate a deep briefing.</p>
        </div>
      </div>
    );
  }

  // Parse markdown-like sections for styled rendering
  const renderBriefing = (text) => {
    const lines = text.split('\n');
    const elements = [];
    let currentList = [];

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="briefing-list">
            {currentList.map((item, i) => (
              <li key={i}>{item.replace(/^[-*•]\s*/, '')}</li>
            ))}
          </ul>
        );
        currentList = [];
      }
    };

    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('## ')) {
        flushList();
        elements.push(
          <h3 key={i} className="briefing-heading">
            {trimmed.replace('## ', '')}
          </h3>
        );
      } else if (
        trimmed.startsWith('- ') ||
        trimmed.startsWith('* ') ||
        trimmed.startsWith('• ')
      ) {
        currentList.push(trimmed);
      } else if (trimmed.length > 0) {
        flushList();
        elements.push(
          <p key={i} className="briefing-paragraph">
            {trimmed}
          </p>
        );
      } else {
        flushList();
      }
    });

    flushList();
    return elements;
  };

  return (
    <div className="briefing-panel">
      <div className="briefing-content">
        {renderBriefing(briefingText)}
      </div>

      {sources.length > 0 && (
        <div className="briefing-sources">
          <h4 className="sources-title">Sources</h4>
          <div className="sources-chips">
            {sources.map((source, i) => (
              <a
                key={i}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="source-chip"
                title={source.title}
              >
                {source.source}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}