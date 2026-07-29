import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../components/Header';

export const metadata: Metadata = {
  title: 'About SQCT Grades | Western Averages',
  description: 'Learn what SQCT grades mean and how to use them when comparing Western courses.',
};

export default function SqctPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#4F2683] mb-3">
              A quick guide
            </p>
            <h1 className="text-3xl sm:text-4xl font-display font-semibold text-gray-900 mb-4">
              What is an SQCT grade?
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed max-w-3xl">
              SQCT stands for <strong className="font-semibold text-gray-900">Student Questionnaires on Courses and Teaching</strong>.
              They are the end-of-course questionnaires Western students fill out to share what they thought about a course and its teaching.
            </p>
          </div>

          <div className="bg-[#4F2683] text-white p-6 sm:p-8 mb-8">
            <p className="text-xs uppercase tracking-widest text-white/70 mb-2">Data year</p>
            <p className="text-2xl sm:text-3xl font-display font-semibold mb-2">The grades shown here are from 2025.</p>
            <p className="text-white/80">
              Think of them as a snapshot of student feedback from that year, not a permanent rating for the course.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <section className="border border-gray-200 p-6">
              <h2 className="text-xl font-display font-semibold text-gray-900 mb-3">What the grade tells you</h2>
              <p className="text-gray-600 leading-relaxed">
                On Western Averages, the SQCT grade is a quick summary of the 2025 feedback in our dataset. It gives you another point of reference when you are comparing courses.
              </p>
            </section>

            <section className="border border-gray-200 p-6">
              <h2 className="text-xl font-display font-semibold text-gray-900 mb-3">What it does not tell you</h2>
              <p className="text-gray-600 leading-relaxed">
                It is not the class average, and it is not a promise that you will have the same experience. The instructor, course format, workload and group of students can all change from one year to the next.
              </p>
            </section>
          </div>

          <section className="border border-gray-200 mb-8">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-display font-semibold text-gray-900">How to use it</h2>
            </div>
            <div className="p-6">
              <ul className="space-y-4 text-gray-600">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#4F2683]/10 text-[#4F2683] font-semibold text-sm flex items-center justify-center">1</span>
                  <span>Use the SQCT grade as one piece of the picture, alongside the verified class average and the course description.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#4F2683]/10 text-[#4F2683] font-semibold text-sm flex items-center justify-center">2</span>
                  <span>Keep the year in mind. A course taught by a different instructor or in a different format may feel quite different.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#4F2683]/10 text-[#4F2683] font-semibold text-sm flex items-center justify-center">3</span>
                  <span>Do not let one letter make the decision for you. Your interests, program requirements and learning style still matter more.</span>
                </li>
              </ul>
            </div>
          </section>

          <div className="bg-amber-50 border-l-4 border-amber-400 p-5 mb-8">
            <h2 className="text-base font-semibold text-amber-950 mb-1">A note about student feedback</h2>
            <p className="text-sm text-amber-900 leading-relaxed">
              SQCT results reflect the students who completed the questionnaire. Response rates and personal experiences vary, so the grade is most useful as context—not as a final verdict on a course or instructor.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-gray-200 pt-6">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-[#4F2683] text-white text-sm font-medium hover:bg-[#3D1E66] transition-colors"
            >
              Browse all courses
            </Link>
            <a
              href="https://yourfeedback.uwo.ca/students.cfm"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-[#4F2683] hover:text-[#3D1E66] underline"
            >
              Read Western&apos;s official SQCT information
            </a>
          </div>
        </div>
      </main>

      <footer className="bg-[#4F2683] text-white mt-12 py-6">
        <div className="container mx-auto px-4 sm:px-6 text-center text-sm text-white/80">
          Western University Course Averages
        </div>
      </footer>
    </div>
  );
}
