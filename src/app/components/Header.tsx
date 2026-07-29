'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-[#4F2683] text-white">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-xl tracking-tight">
              <span className="font-bold">Western</span> Averages
            </span>
            <span className="text-white/50 hidden md:inline">|</span>
            <span className="text-sm text-white/80 hidden md:inline">Class Grade Tracker</span>
          </Link>
          
          <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Main navigation">
            <Link
              href="/"
              className={`px-3 sm:px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                pathname === '/'
                  ? 'bg-white/15 text-white'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              All Courses
            </Link>
            <Link
              href="/subject"
              className={`px-3 sm:px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                pathname === '/subject'
                  ? 'bg-white/15 text-white'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              By Subject
            </Link>
            <Link
              href="/sqct"
              className={`px-3 sm:px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                pathname === '/sqct'
                  ? 'bg-white/15 text-white'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              About SQCT
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
