'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const [userName, setUserName] = useState('');
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const name = localStorage.getItem('etnewsai_user_name');
    if (name) setUserName(name);
  }, []);

  const handleDemo = () => {
    localStorage.setItem('etnewsai_user_id', 'demo-user-001');
    localStorage.setItem('etnewsai_user_name', 'Demo User');
    localStorage.setItem('etnewsai_persona', 'investor');
    localStorage.setItem('etnewsai_demo', 'true');
    setUserName('Demo User');
    setIsDemo(true);
    window.location.href = '/feed';
  };

  const navLinks = [
    { href: '/feed', label: 'My Feed' },
    { href: '/navigator', label: 'Navigator' },
    { href: '/story', label: 'Story Arc' },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-logo">
          <span className="logo-et">ET</span>
          <span className="logo-newsai">NewsAI</span>
        </Link>

        <div className="navbar-links">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`navbar-link ${pathname === link.href ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="navbar-right">
          <button onClick={handleDemo} className="demo-btn">
            Demo
          </button>
          {userName && (
            <div className="user-avatar" title={userName}>
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
