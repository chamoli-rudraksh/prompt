'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { getUser, logout, apiFetch } from '@/lib/auth';
import styles from './navbar.module.css';

const navLinks = [
  { href: '/feed', label: 'Feed', index: '01' },
  { href: '/navigator', label: 'Navigator', index: '02' },
  { href: '/story', label: 'Story Arc', index: '03' },
  { href: '/dashboard', label: 'Dashboard', index: '04' },
  { href: '/saved', label: 'Saved', index: '05' },
];

function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
    setTime(fmt());
    const id = setInterval(() => setTime(fmt()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className={styles["topbar-value"]}>{time}</span>;
}

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState('light');
  const dropdownRef = useRef(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const handleLogout = () => logout();

  const dateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  }).toUpperCase();

  return (
    <nav className={styles.navbar}>

      <div className={styles["navbar-topbar"]}>
        <div className={styles["topbar-segment"]}>
          <span className={styles["topbar-label"]}>Date</span>
          <span className={styles["topbar-value"]}>{dateStr}</span>
        </div>

        <div className={`${styles["topbar-segment"]} ${styles["topbar-hide-md"]}`}>
          <span className={styles["topbar-label"]}>Edition</span>
          <span className={styles["topbar-value"]}>ET · 2026</span>
        </div>

        <div className={`${styles["topbar-segment"]} ${styles["topbar-hide-md"]}`}>
          <span className={styles["topbar-label"]}>IST</span>
          <LiveClock />
        </div>

        <div className={styles["topbar-segment"]}>
          <div className={styles["topbar-live"]}>
            <span className={styles["topbar-live-dot"]} />
            <span className={styles["topbar-signal"]}>Live Feed Active</span>
          </div>
        </div>
      </div>

      <div className={styles["navbar-inner"]}>
        <Link href="/" className={styles["navbar-logo"]}>
          <span className={styles["logo-et"]}>ET News</span>
          <span className={styles["logo-dot"]}>·</span>
          <span className={styles["logo-ai"]}>AI</span>
        </Link>

        <button className={styles.hamburger} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? '✕' : '☰'}
        </button>

        <div className={`${styles["navbar-links"]} ${menuOpen ? styles.open : ''}`}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles["navbar-link"]} ${
                pathname === link.href ? styles.active : ''
              }`}
            >
              <span className={styles["link-index"]}>{link.index}</span>
              <span className={styles["link-label"]}>{link.label}</span>
            </Link>
          ))}
        </div>

        <div className={styles["navbar-right"]} ref={dropdownRef}>
          <button className={styles["theme-toggle"]} onClick={toggleTheme}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {user && (
            <div className={styles["user-avatar-wrap"]}>
              <div className={styles["user-avatar"]}>
                {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}