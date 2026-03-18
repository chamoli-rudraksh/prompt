'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const name = localStorage.getItem('etnewsai_user_name');
    if (name) setUserName(name);
  }, []);

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
