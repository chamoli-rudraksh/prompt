'use client';

import { useState } from 'react';

interface OnboardingModalProps {
  onComplete: (name: string, persona: string, interests: string[]) => void;
}

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

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [persona, setPersona] = useState('');
  const [interests, setInterests] = useState<string[]>([]);

  const toggleInterest = (id: string) => {
    setInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (name && persona && interests.length > 0) {
      onComplete(name, persona, interests);
    }
  };

  return (
    <div className="onboarding-container">
      {step === 1 && (
        <div className="onboarding-step">
          <h2 className="onboarding-title">What&apos;s your name?</h2>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="onboarding-input"
            id="onboarding-name"
          />
          <button
            onClick={() => name.trim() && setStep(2)}
            disabled={!name.trim()}
            className="onboarding-next-btn"
            id="onboarding-next-1"
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="onboarding-step">
          <h2 className="onboarding-title">I am a...</h2>
          <div className="persona-grid">
            {personas.map(p => (
              <button
                key={p.id}
                onClick={() => { setPersona(p.id); setStep(3); }}
                className={`persona-card ${persona === p.id ? 'selected' : ''}`}
                id={`persona-${p.id}`}
              >
                <span className="persona-icon">{p.icon}</span>
                <span className="persona-label">{p.label}</span>
                <span className="persona-desc">{p.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="onboarding-step">
          <h2 className="onboarding-title">What interests you?</h2>
          <p className="onboarding-subtitle">Select at least one topic</p>
          <div className="interests-grid">
            {topicOptions.map(t => (
              <button
                key={t.id}
                onClick={() => toggleInterest(t.id)}
                className={`interest-chip ${interests.includes(t.id) ? 'selected' : ''}`}
                id={`interest-${t.id}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleSubmit}
            disabled={interests.length === 0}
            className="onboarding-submit-btn"
            id="onboarding-submit"
          >
            Start Reading →
          </button>
        </div>
      )}
    </div>
  );
}
