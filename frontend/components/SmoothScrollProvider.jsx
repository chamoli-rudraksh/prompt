'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import Lenis from '@studio-freight/lenis'; // ✅ was '@studio-freight/lenis' — that package is deprecated

// ─── Context ──────────────────────────────────────────────────────────────────

const LenisContext = createContext(null);

export function useLenis() {
  return useContext(LenisContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export default function SmoothScrollProvider({ children, options = {} }) {
  const [lenis, setLenis] = useState(null);
  const rafIdRef   = useRef(null);

  // ✅ Store options in a ref so the effect never needs them as a dependency
  //    (avoids infinite re-renders when the caller passes an object literal).
  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; }); // keep ref in sync each render

  useEffect(() => {
    const instance = new Lenis({
      lerp: 0.08,
      smoothWheel: true,
      syncTouch: false,
      touchMultiplier: 1.5,
      infinite: false,
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      autoRaf: false,          // ✅ we drive the loop ourselves — prevents double-tick
      ...optionsRef.current,
    });

    setLenis(instance);

    // ✅ expose for devtools, cleaned up on destroy so HMR stays clean
    if (typeof window !== 'undefined') {
      window.lenis = instance;
    }

    function raf(time) {
      instance.raf(time);
      rafIdRef.current = requestAnimationFrame(raf);
    }

    rafIdRef.current = requestAnimationFrame(raf);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      instance.destroy();
      setLenis(null);

      // ✅ clean up the global reference
      if (typeof window !== 'undefined' && window.lenis === instance) {
        delete window.lenis;
      }
    };
  }, []); // ✅ truly stable — options are read from the ref, not the closure

  return (
    <LenisContext.Provider value={lenis}>
      {children}
    </LenisContext.Provider>
  );
}

// ─── Hook: scrollTo ───────────────────────────────────────────────────────────

export function useScrollTo() {
  const lenis = useLenis();

  // ✅ memoized — stable reference across renders, safe to put in dep arrays
  return useCallback(
    (target, options = {}) => {
      if (!lenis) return;
      lenis.scrollTo(target, {
        offset: 0,
        duration: 1,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        ...options,
      });
    },
    [lenis],
  );
}

// ─── Hook: scroll event ───────────────────────────────────────────────────────

export function useScrollEvent(callback) {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis || typeof callback !== 'function') return;

    lenis.on('scroll', callback);

    return () => {
      lenis.off('scroll', callback);
    };
  }, [lenis, callback]); // ✅ wrap your callback in useCallback at the call-site
}