'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { useScrollEvent, useScrollTo } from '@/components/SmoothScrollProvider';
import OnboardingModal from '@/components/Onboarding/OnboardingModal';
import { createUser, getUser } from '@/lib/api';
import styles from './page.module.css';

// ─── Constants ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    no: '01',
    icon: '📰',
    tag: 'Personalization',
    title: 'Your Daily Feed',
    desc: 'A feed built around your role and industry — AI cuts through the noise and surfaces what actually matters.',
    stat: '3 min',
    statLabel: 'to get up to speed',
  },
  {
    no: '02',
    icon: '🧭',
    tag: 'Intelligence',
    title: 'Deep Briefings',
    desc: 'Move past headlines with sharp, multi-source insights and the context you need to think ahead.',
    stat: '12×',
    statLabel: 'more clarity',
  },
  {
    no: '03',
    icon: '📊',
    tag: 'Analytics',
    title: 'Story Tracking',
    desc: 'Track how stories evolve over time — key players, turning points, and sentiment shifts, all in one view.',
    stat: 'Live',
    statLabel: 'story updates',
  },
];

const TICKER_ITEMS = [
  'AI-powered personalization', 'Deep briefings', 'Story Arc Tracker',
  'Visual timelines', 'Sentiment analysis', 'ET AI Hackathon 2026',
  'Personalized feed', 'News Navigator', 'Context-aware AI',
];

const WORDS = "It's 2026—and business news still reads like it's 2005".split(' ');


// ─── Ticker ────────────────────────────────────────────────────────────────

function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className={styles["ticker-wrap"]}>
      <div className={styles["ticker-fade-l"]} />
      <div className={styles["ticker-fade-r"]} />
      <motion.div
        className={styles["ticker-track"]}
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
      >
        {items.map((t, i) => (
          <span key={i} className={styles["ticker-item"]}>
            <span className={styles["ticker-dot"]} />{t}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Background ────────────────────────────────────────────────────────────

function GridBackground() {
  return (
    <div className={styles["grid-bg"]} aria-hidden>
      <div className={styles["grid-h"]} />
      <div className={styles["grid-v"]} />
      <motion.div
        className={styles["orb orb-1"]}
        animate={{ scale: [1, 1.08, 1], opacity: [0.18, 0.26, 0.18] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className={styles["orb orb-2" ]}/>
      <div className={styles["orb orb-3"]} />
    </div>
  );
}

// ─── CTA ───────────────────────────────────────────────────────────────────

function MagneticCTA({ onClick }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 18 });
  const sy = useSpring(y, { stiffness: 200, damping: 18 });


  const onMove = useCallback((e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    x.set((e.clientX - r.left - r.width / 2) * 0.35);
    y.set((e.clientY - r.top - r.height / 2) * 0.35);
  }, [x, y]);

  const onLeave = useCallback(() => { x.set(0); y.set(0); }, [x, y]);

  return (
    <motion.button
      ref={ref}
      className={styles["cta"]}
      styles={{ x: sx, y: sy }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.8, duration: 0.6 }}
    >
      <span className={styles["cta-text"]}>Start Personalizing</span>
      <motion.span
        className={styles["cta-arrow"]}
        animate={{ x: [0, 5, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >→</motion.span>
      <div className={styles["cta-sheen"]} />
    </motion.button>
  );
}

// ─── Feature Card ──────────────────────────────────────────────────────────

function FeatureCard({ f, delay }) {
  const [hover, setHover] = useState(false);

  return (
    <motion.div
      className={`${styles.card} ${hover ? styles["card--hovered"] : ''}`}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
    >
      <div className={styles["card-top"]}>
        <span className={styles["card-no"]}>{f.no}</span>
        <span className={styles["card-tag"]}>{f.tag}</span>
      </div>
      <div className={styles["card-icon"]}>{f.icon}</div>
      <h3 className={styles["card-title"]}>{f.title}</h3>
      <p className={styles["card-desc"]}>{f.desc}</p>
      <div className={styles["card-stat-row"]}>
        <span className={styles["card-stat-num"]}>{f.stat}</span>
        <span className={styles["card-stat-label"]}>{f.statLabel}</span>
      </div>
    </motion.div>
  );
}

// ─── Headline ──────────────────────────────────────────────────────────────

function AnimatedHeadline() {
  return (
    <h1 className={styles["title"]}>
      {WORDS.map((w, i) => (
        <motion.span
          key={i}
          className={styles["title-word"]}
          initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: 0.3 + i * 0.055, duration: 0.55 }}
        >
          {w}
          {i !== WORDS.length - 1 && '\u00A0'}
        </motion.span>
      ))}

      <motion.span
        className={styles["title-accent"]}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 + WORDS.length * 0.055 + 0.15, duration: 0.7 }}
      >
        We fixed that.
      </motion.span>
    </h1>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router   = useRouter();
  const scrollTo = useScrollTo();
  const [scrollY, setScrollY]   = useState(0);

  useScrollEvent(useCallback(({ scroll }) => setScrollY(scroll), []));

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const id = localStorage.getItem('etnewsai_user_id');
        if (id) {
          await getUser(id);
          if (mounted) router.replace('/feed');
          return;
        }
      } catch {
        localStorage.clear();
      }
    })();

    return () => { mounted = false; };
  }, [router]);

  const handleOnboardingComplete = async (name, persona, interests) => {
    const user = await createUser({ name, persona, interests });
    localStorage.setItem('etnewsai_user_id', user.id);
    localStorage.setItem('etnewsai_user_name', user.name);
    localStorage.setItem('etnewsai_persona', user.persona);
    router.replace('/feed');
  };

  const heroOpacity  = Math.max(1 - scrollY / 500, 0);
  const heroParallax = scrollY * 0.18;

  return (
    <AnimatePresence mode="wait">
        <motion.div
          key="page"
          className={styles["page"]}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <GridBackground />

          <div className={styles["ticker-outer"]}>
            <Ticker />
          </div>

          <section
            className={styles["hero"]}
            styles={{
              opacity: heroOpacity,
              transform: `translateY(${heroParallax}px)`,
            }}
          >
            <AnimatedHeadline />

            <motion.p
              className={styles["subtitle"]}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.7 }}
            >
              Smarter personalization. Deeper insights. Visual story tracking.
            </motion.p>

            <MagneticCTA onClick={() => scrollTo('#onboarding-section', { duration: 1.4 })} />
          </section>

          <section className={styles["features"]}>
            <div className={styles["cards-grid"]}>
              {FEATURES.map((f, i) => (
                <FeatureCard key={f.no} f={f} delay={i * 0.12} />
              ))}
            </div>
          </section>
            <section id="onboarding-section" className={styles["onboarding"]}>
              <div className={styles["divider"]}>
                <div className={styles["divider-line"]} />
                <span className={styles["divider-label"]}>Personalize your feed</span>
                <div className={styles["divider-line"]} />
              </div>

              <OnboardingModal onComplete={handleOnboardingComplete} />
            </section>
        </motion.div>
    </AnimatePresence>
  );
}