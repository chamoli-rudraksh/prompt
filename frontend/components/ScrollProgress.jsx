'use client';

import { useState } from 'react';
import { useScrollEvent } from '@/components/SmoothScrollProvider';

export default function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useScrollEvent(({ progress }) => {
    setProgress(progress);
  });

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '3px',
        width: `${progress * 100}%`,
        background: 'linear-gradient(90deg, #E8593C, #1D9E75)',
        zIndex: 9999,
      }}
    />
  );
}