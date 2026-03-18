'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OnboardingModal from '@/components/OnboardingModal';
import { createUser } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem('etnewsai_user_id');
    if (userId) {
      router.push('/feed');
    }
  }, [router]);

  const handleOnboardingComplete = async (
    name: string,
    persona: string,
    interests: string[]
  ) => {
    try {
      const user = await createUser({ name, persona, interests });
      localStorage.setItem('etnewsai_user_id', user.id);
      localStorage.setItem('etnewsai_user_name', user.name);
      localStorage.setItem('etnewsai_persona', user.persona);
      router.push('/feed');
    } catch (error) {
      console.error('Failed to create user:', error);
      // Fallback: create local-only user
      const fallbackId = 'local-' + Date.now();
      localStorage.setItem('etnewsai_user_id', fallbackId);
      localStorage.setItem('etnewsai_user_name', name);
      localStorage.setItem('etnewsai_persona', persona);
      router.push('/feed');
    }
  };

  return (
    <div className="landing-page">
      <div className="landing-hero">
        <div className="hero-badge">ET AI Hackathon 2026</div>
        <h1 className="hero-title">
          Business news in 2026 is still delivered like it&apos;s 2005.
          <span className="hero-highlight"> We fixed that.</span>
        </h1>
        <p className="hero-subtitle">
          AI-powered personalization, deep briefings, and visual story tracking
          — designed for the modern professional.
        </p>

        <div className="hero-features">
          <div className="hero-feature">
            <div className="feature-icon">📰</div>
            <h3>My ET Feed</h3>
            <p>News curated for your role with AI-generated context</p>
          </div>
          <div className="hero-feature">
            <div className="feature-icon">🧭</div>
            <h3>News Navigator</h3>
            <p>Deep briefings on any topic with interactive follow-up chat</p>
          </div>
          <div className="hero-feature">
            <div className="feature-icon">📊</div>
            <h3>Story Arc Tracker</h3>
            <p>Visual timelines, player maps, and sentiment analysis</p>
          </div>
        </div>
      </div>

      <div className="landing-onboarding" id="onboarding-section">
        <OnboardingModal onComplete={handleOnboardingComplete} />
      </div>
    </div>
  );
}
