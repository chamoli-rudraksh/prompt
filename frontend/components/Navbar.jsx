'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { getUser, logout, apiFetch } from '@/lib/auth';

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState('light');
  const dropdownRef = useRef(null);

  useEffect(() => {
    setUser(getUser());

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
      setUser(getUser());
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

  const handleLogout = () => {
    logout();
  };

  const handleRefreshFeed = async () => {
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      await apiFetch(`${API_URL}/admin/refresh-news`, { method: 'POST' });
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

          {user && (
            <>
              <div
                className="user-avatar"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                title={user.full_name || user.email || 'User'}
              >
                {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
              </div>

              {dropdownOpen && (
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <div className="dropdown-name">{user.full_name || user.email}</div>
                    <div className="dropdown-persona">{user.persona || 'No persona set'}</div>
                  </div>
                  <button
                    className="dropdown-item"
                    onClick={handleRefreshFeed}
                  >
                    Refresh feed
                  </button>
                  <button
                    className="dropdown-item danger"
                    onClick={handleLogout}
                  >
                    Sign out
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