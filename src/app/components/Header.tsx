'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-purple-900 text-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] relative overflow-hidden">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}></div>
      <div className="container mx-auto px-4 py-4 sm:py-5 relative z-10">
        <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/" className="group">
              <span className="text-xl sm:text-2xl font-black tracking-tight heading-display group-hover:opacity-90 transition-opacity">
                Western
              </span>
              <span className="text-lg sm:text-xl font-light text-purple-200 ml-1 tracking-wide">
                Averages
              </span>
            </Link>
            <div className="hidden md:block w-px h-6 bg-purple-300/30"></div>
            <div className="hidden md:block text-purple-200/80 text-sm font-light tracking-wide">
              Class Grade Tracker
            </div>
          </div>
          <nav className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/"
              className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium ${
                pathname === '/'
                  ? 'bg-white/15 text-white shadow-sm backdrop-blur-sm'
                  : 'text-purple-200/90 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="hidden sm:inline">All Courses</span>
              <span className="sm:hidden">Courses</span>
            </Link>
            <Link
              href="/subject"
              className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium ${
                pathname === '/subject'
                  ? 'bg-white/15 text-white shadow-sm backdrop-blur-sm'
                  : 'text-purple-200/90 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="hidden sm:inline">Browse by Subject</span>
              <span className="sm:hidden">Subjects</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

