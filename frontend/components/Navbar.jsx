'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const [userName, setUserName] = useState('');
  const [persona, setPersona] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState('light');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const name = localStorage.getItem('etnewsai_user_name');
    const p = localStorage.getItem('etnewsai_persona');
    if (name !== null) setUserName(name);
    if (p) setPersona(p);

    // Load saved theme
    const saved = localStorage.getItem('etnewsai_theme');
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  // Re-read user info when storage changes (e.g. after onboarding)
  useEffect(() => {
    const handler = () => {
      setUserName(localStorage.getItem('etnewsai_user_name') || '');
      setPersona(localStorage.getItem('etnewsai_persona') || '');
    };
    window.addEventListener('storage', handler);
    window.addEventListener('user-updated', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('user-updated', handler);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (!dropdownRef.current?.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('etnewsai_theme', next);
  };

  const handleChangeUser = () => {
    localStorage.removeItem('etnewsai_user_id');
    localStorage.removeItem('etnewsai_user_name');
    localStorage.removeItem('etnewsai_persona');
    localStorage.removeItem('etnewsai_demo');
    window.location.href = '/';
  };

  const handleRefreshFeed = async () => {
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      await fetch(`${API_URL}/admin/refresh-news`, { method: 'POST' });
      window.dispatchEvent(new CustomEvent('refresh-feed'));
    } catch (err) {
      console.error('Refresh failed:', err);
    }
    setDropdownOpen(false);
  };

  const navLinks = [
    { href: '/feed', label: 'Feed' },
    { href: '/navigator', label: 'Navigator' },
    { href: '/story', label: 'Story Arc' },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-logo">
          <span className="logo-et">ET News</span>
          <span className="logo-dot">·</span>
          <span className="logo-ai">AI</span>
        </Link>

        <button
          className="hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`navbar-link ${
                pathname === link.href ? 'active' : ''
              }`}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="navbar-right" ref={dropdownRef}>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={
              theme === 'light'
                ? 'Switch to dark mode'
                : 'Switch to light mode'
            }
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {userName && (
            <>
              <div
                className="user-avatar"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                title={userName}
              >
                {userName.charAt(0).toUpperCase()}
              </div>

              {dropdownOpen && (
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <div className="dropdown-name">{userName}</div>
                    <div className="dropdown-persona">{persona}</div>
                  </div>
                  <button
                    className="dropdown-item"
                    onClick={handleRefreshFeed}
                  >
                    Refresh feed
                  </button>
                  <button
                    className="dropdown-item danger"
                    onClick={handleChangeUser}
                  >
                    Change user
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}