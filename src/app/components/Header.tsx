'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMenuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isMenuOpen]);

  const navItems = [
    { href: '/', label: 'All Courses' },
    { href: '/subject', label: 'By Subject' },
    { href: '/sqct', label: 'About SQCT' },
  ];

  return (
    <header className="bg-[#4F2683] text-white">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 py-4 border-b border-white/10">
          <Link href="/" onClick={() => setIsMenuOpen(false)} className="flex min-w-0 items-center gap-2 whitespace-nowrap">
            <span className="text-xl tracking-tight">
              <span className="font-bold">Western</span> Averages
            </span>
            <span className="text-white/50 hidden md:inline">|</span>
            <span className="text-sm text-white/80 hidden md:inline">Class Grade Tracker</span>
          </Link>
          
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center text-white transition-colors hover:bg-white/10 focus-visible:outline-white sm:hidden"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
            aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {isMenuOpen ? (
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          <nav className="hidden items-center gap-1 sm:flex" aria-label="Main navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  pathname === item.href
                    ? 'bg-white/15 text-white'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
                aria-current={pathname === item.href ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <nav
          id="mobile-navigation"
          className={`${isMenuOpen ? 'grid' : 'hidden'} grid-cols-1 gap-1 border-b border-white/10 py-3 sm:hidden`}
          aria-label="Mobile navigation"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMenuOpen(false)}
              className={`flex min-h-11 items-center px-3 text-sm font-medium transition-colors ${
                pathname === item.href
                  ? 'bg-white/15 text-white'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
