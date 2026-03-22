'use client';

import { useState } from 'react';

const personas = [
  { id: 'investor', label: 'Investor', icon: '📈', desc: 'Track markets, funds & portfolio insights' },
  { id: 'founder', label: 'Founder', icon: '🚀', desc: 'Startup trends, funding & growth strategies' },
  { id: 'student', label: 'Student', icon: '📚', desc: 'Economy, policy & career-relevant news' },
  { id: 'professional', label: 'Professional', icon: '💼', desc: 'Industry insights & business intelligence' },
];

const topicOptions = [
  { id: 'markets', label: 'Markets' },
  { id: 'startups', label: 'Startups' },
  { id: 'policy', label: 'Policy' },
  { id: 'technology', label: 'Technology' },
  { id: 'economy', label: 'Economy' },
  { id: 'banking', label: 'Banking' },
  { id: 'energy', label: 'Energy' },
  { id: 'geopolitics', label: 'Geopolitics' },
];

export default function OnboardingModal({ onComplete }) {
  const [name, setName] = useState('');
  const [persona, setPersona] = useState('');
  const [interests, setInterests] = useState([]);

  const toggleInterest = (id) => {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (name && persona && interests.length > 0) {
      onComplete(name, persona, interests);
    }
  };

  return (
    <div className="onboarding-container">
      <h2 className="onboarding-title">What kind of reader are you?</h2>

      <p className="onboarding-subtitle">
        Personalise your ET NewsAI experience in 30 seconds
      </p>

      {/* Name */}
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter your name"
        className="onboarding-input"
      />

      {/* Persona */}
      <div className="persona-grid">
        {personas.map((p) => (
          <button
            key={p.id}
            onClick={() => setPersona(p.id)}
            className={`persona-card ${persona === p.id ? 'selected' : ''}`}
          >
            <div className="persona-header">
              <span className="persona-icon">{p.icon}</span>
              <span className="persona-label">{p.label}</span>
            </div>

            <div className="persona-desc">
              {p.desc}
            </div>
          </button>
        ))}
      </div>

      {/* Interests */}
      {persona && (
        <>
          <p className="onboarding-subtitle interest-title">
            Select topics that interest you
          </p>

          <div className="interests-grid">
            {topicOptions.map((t) => (
              <button
                key={t.id}
                onClick={() => toggleInterest(t.id)}
                className={`interest-chip ${
                  interests.includes(t.id) ? 'selected' : ''
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* CTA */}
      <button
        onClick={handleSubmit}
        disabled={!name.trim() || !persona || interests.length === 0}
        className="onboarding-submit-btn"
      >
        Start reading →
      </button>
    </div>
  );
}