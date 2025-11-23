import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import Header from '../components/Header';
import AnalyticsDashboard from './AnalyticsDashboard';

export const dynamic = 'force-dynamic';

async function checkLocalhost() {
  const headersList = await headers();
  const hostname = headersList.get('host') || '';
  return hostname.includes('localhost') || hostname.includes('127.0.0.1') || hostname.startsWith('127.') || hostname.startsWith('::1');
}

export default async function AnalyticsPage() {
  // Check if accessing from localhost
  const isLocalhost = await checkLocalhost();

  if (!isLocalhost) {
    redirect('/');
  }

  // Fetch analytics data
  const supabase = createClient();
  
  // Get all visits data
  const { data: allVisits, error: visitsError } = await supabase
    .from('daily_visits')
    .select('date, visit_count, visitor_id');

  if (visitsError) {
    console.error('Error fetching visits:', visitsError);
  }

  // Calculate total unique visitors
  const uniqueVisitorsSet = new Set(allVisits?.map(v => v.visitor_id) || []);
  const uniqueVisitors = uniqueVisitorsSet.size;

  // Calculate total visits
  const totalVisits = allVisits?.reduce((sum, v) => sum + (v.visit_count || 1), 0) || 0;

  // Get daily visits for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];
  
  // Filter and aggregate daily data
  const dailyStatsMap = new Map<string, { visits: number; uniqueVisitors: Set<string> }>();
  
  allVisits?.forEach(visit => {
    if (visit.date >= cutoffDate) {
      if (!dailyStatsMap.has(visit.date)) {
        dailyStatsMap.set(visit.date, { visits: 0, uniqueVisitors: new Set() });
      }
      const dayStats = dailyStatsMap.get(visit.date)!;
      dayStats.visits += visit.visit_count || 1;
      dayStats.uniqueVisitors.add(visit.visitor_id);
    }
  });

  // Convert to array format
  const dailyStatsArray = Array.from(dailyStatsMap.entries())
    .map(([date, stats]) => ({
      date,
      visits: stats.visits,
      uniqueVisitors: stats.uniqueVisitors.size,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Get today's stats
  const today = new Date().toISOString().split('T')[0];
  const todayStats = dailyStatsArray.find(d => d.date === today) || { date: today, visits: 0, uniqueVisitors: 0 };

  // Get this week's stats
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekCutoff = weekAgo.toISOString().split('T')[0];
  const thisWeekVisitsSet = new Set<string>();
  let thisWeekTotalVisits = 0;
  
  allVisits?.forEach(visit => {
    if (visit.date >= weekCutoff) {
      thisWeekVisitsSet.add(visit.visitor_id);
      thisWeekTotalVisits += visit.visit_count || 1;
    }
  });
  
  const thisWeekStats = {
    visits: thisWeekTotalVisits,
    uniqueVisitors: thisWeekVisitsSet.size,
  };

  return (
    <div className="min-h-screen bg-[#faf9f7] relative">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-10 relative z-10">
        <div className="mb-6 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 mb-2 sm:mb-3 heading-display">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 text-base sm:text-lg font-light leading-relaxed">
            Visitor statistics and insights (localhost only)
          </p>
        </div>

        <AnalyticsDashboard
          totalVisits={totalVisits || 0}
          uniqueVisitors={uniqueVisitors || 0}
          todayVisits={todayStats.visits}
          todayUniqueVisitors={todayStats.uniqueVisitors}
          thisWeekVisits={thisWeekStats.visits}
          thisWeekUniqueVisitors={thisWeekStats.uniqueVisitors}
          dailyStats={dailyStatsArray}
        />
      </main>

      <footer className="bg-purple-900 text-white mt-16 py-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v20h2v2H20v-1.5zM0 20h2v20H0V20zm4 0h2v20H4V20zm4 0h2v20H8V20zm4 0h2v20h-2V20zm4 0h2v20h-2V20zm4 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2z'/%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <a 
            href="https://www.linkedin.com/in/annas-amar/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-purple-200/90 hover:text-purple-100 underline transition-colors font-medium"
          >
            LinkedIn
          </a>
        </div>
      </footer>
    </div>
  );
}

