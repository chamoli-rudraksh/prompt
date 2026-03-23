'use client';

import { useState } from 'react';
import styles from "./onboarding.module.css";

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
    <div className={styles["onboarding-container"]}>
      <h2 className={styles["onboarding-title"]}>
        What kind of reader are you?
      </h2>

      <p className={styles["onboarding-subtitle"]}>
        Personalise your ET NewsAI experience in 30 seconds
      </p>

      {/* Name */}
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter your name"
        className={styles["onboarding-input"]}
      />

      {/* Persona */}
      <div className={styles["persona-grid"]}>
        {personas.map((p) => (
          <button
            key={p.id}
            onClick={() => setPersona(p.id)}
            className={`${styles["persona-card"]} ${
              persona === p.id ? styles.selected : ''
            }`}
          >
            <div className={styles["persona-header"]}>
              <span className={styles["persona-icon"]}>{p.icon}</span>
              <span className={styles["persona-label"]}>{p.label}</span>
            </div>

            <div className={styles["persona-desc"]}>
              {p.desc}
            </div>
          </button>
        ))}
      </div>

      {/* Interests */}
      {persona && (
        <>
          <p className={`${styles["onboarding-subtitle"]} ${styles["interest-title"]}`}>
            Select topics that interest you
          </p>

          <div className={styles["interests-grid"]}>
            {topicOptions.map((t) => (
              <button
                key={t.id}
                onClick={() => toggleInterest(t.id)}
                className={`${styles["interest-chip"]} ${
                  interests.includes(t.id) ? styles.selected : ''
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
        className={styles["onboarding-submit-btn"]}
      >
        Start reading →
      </button>
    </div>
  );
}