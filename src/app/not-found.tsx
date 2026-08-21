import Link from 'next/link';
import Breadcrumbs from './components/Breadcrumbs';
import Header from './components/Header';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="container mx-auto flex-1 px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <Breadcrumbs
            items={[
              { label: 'All Courses', href: '/' },
              { label: 'Page not found' },
            ]}
            className="mb-8"
          />

          <div className="border border-gray-200">
            <div className="h-1 bg-[#4F2683]" />

            <div className="grid md:grid-cols-[15rem_1fr]">
              <div className="flex items-center border-b border-gray-200 bg-gray-50 px-6 py-8 md:border-b-0 md:border-r md:px-8">
                <div>
                  <p className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-gray-500">
                    Error code
                  </p>
                  <p className="font-display text-7xl font-semibold leading-none text-[#4F2683] sm:text-8xl">
                    404
                  </p>
                </div>
              </div>

              <div className="px-6 py-8 sm:px-10 sm:py-12">
                <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-gray-500">
                  Page not found
                </p>
                <h1 className="mb-4 text-3xl font-semibold text-gray-900 sm:text-4xl">
                  This page isn&apos;t in the course calendar.
                </h1>
                <p className="max-w-xl text-gray-600">
                  The link may be out of date, or the page may have moved. You can
                  head back to the full course list or browse by subject instead.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center bg-[#4F2683] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#3D1E66]"
                  >
                    Browse all courses
                  </Link>
                  <Link
                    href="/subject"
                    className="inline-flex items-center justify-center border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-[#4F2683] hover:text-[#4F2683]"
                  >
                    Browse by subject
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-5 text-sm text-gray-500">
            Looking for SQCT information?{' '}
            <Link href="/sqct" className="font-medium text-[#4F2683] underline hover:text-[#3D1E66]">
              Read the SQCT guide
            </Link>
            .
          </p>
        </div>
      </main>

      <footer className="mt-12 bg-[#4F2683] py-6 text-white">
        <div className="container mx-auto px-4 text-center text-sm text-white/80 sm:px-6">
          Western University Course Averages
        </div>
      </footer>
    </div>
  );
}
