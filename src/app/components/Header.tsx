'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-[#4F2683] text-white">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Top bar */}
        <div className="flex items-center justify-between py-4 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl tracking-tight">
              <span className="font-bold">Western</span> Averages
            </span>
            <span className="text-white/50">|</span>
            <span className="text-sm text-white/80">Class Grade Tracker</span>
          </Link>
          
          <nav className="flex items-center gap-1">
            <Link
              href="/"
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                pathname === '/'
                  ? 'bg-white/15 text-white'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              All Courses
            </Link>
            <Link
              href="/subject"
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                pathname === '/subject'
                  ? 'bg-white/15 text-white'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              By Subject
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
