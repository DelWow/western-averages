'use client';

import StatsCard from '../components/StatsCard';

interface DailyStat {
  date: string;
  visits: number;
  uniqueVisitors: number;
}

interface AnalyticsDashboardProps {
  totalVisits: number;
  uniqueVisitors: number;
  todayVisits: number;
  todayUniqueVisitors: number;
  thisWeekVisits: number;
  thisWeekUniqueVisitors: number;
  dailyStats: DailyStat[];
}

export default function AnalyticsDashboard({
  totalVisits,
  uniqueVisitors,
  todayVisits,
  todayUniqueVisitors,
  thisWeekVisits,
  thisWeekUniqueVisitors,
  dailyStats,
}: AnalyticsDashboardProps) {
  // Find max visits for scaling the chart
  const maxVisits = Math.max(...dailyStats.map(d => d.visits), 1);
  const maxUnique = Math.max(...dailyStats.map(d => d.uniqueVisitors), 1);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard
          title="Total Visits"
          value={totalVisits.toLocaleString()}
          subtitle="All time"
          icon={
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          }
        />
        <StatsCard
          title="Unique Visitors"
          value={uniqueVisitors.toLocaleString()}
          subtitle="All time"
          icon={
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
        <StatsCard
          title="Today's Visits"
          value={todayVisits.toLocaleString()}
          subtitle={`${todayUniqueVisitors} unique visitors`}
          icon={
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard
          title="This Week"
          value={thisWeekVisits.toLocaleString()}
          subtitle={`${thisWeekUniqueVisitors} unique visitors`}
          icon={
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
      </div>

      {/* Daily Visits Chart */}
      <div className="card-elevated rounded-xl p-6 bg-white">
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-6 heading-section">
          Daily Visits (Last 30 Days)
        </h2>
        
        {dailyStats.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-gray-500 font-medium">No visit data available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Chart */}
            <div className="relative h-64 sm:h-80">
              <div className="absolute inset-0 flex items-end justify-between gap-1 sm:gap-2">
                {dailyStats.map((stat, index) => {
                  const visitHeight = maxVisits > 0 ? (stat.visits / maxVisits) * 100 : 0;
                  const uniqueHeight = maxUnique > 0 ? (stat.uniqueVisitors / maxUnique) * 100 : 0;
                  
                  return (
                    <div
                      key={stat.date}
                      className="flex-1 flex flex-col items-center justify-end group relative"
                      style={{ minWidth: '8px' }}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
                        <div className="font-semibold mb-1">{formatDate(stat.date)}</div>
                        <div>Visits: {stat.visits}</div>
                        <div>Unique: {stat.uniqueVisitors}</div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                      
                      {/* Bars */}
                      <div className="w-full flex items-end gap-0.5 sm:gap-1">
                        {/* Visits bar */}
                        <div
                          className="bg-purple-600 rounded-t transition-all hover:bg-purple-700 flex-1"
                          style={{ height: `${visitHeight}%`, minHeight: visitHeight > 0 ? '2px' : '0' }}
                          title={`${stat.visits} visits`}
                        />
                        {/* Unique visitors bar */}
                        <div
                          className="bg-purple-400 rounded-t transition-all hover:bg-purple-500 flex-1"
                          style={{ height: `${uniqueHeight}%`, minHeight: uniqueHeight > 0 ? '2px' : '0' }}
                          title={`${stat.uniqueVisitors} unique visitors`}
                        />
                      </div>
                      
                      {/* Date label */}
                      {index % Math.ceil(dailyStats.length / 10) === 0 && (
                        <div className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left whitespace-nowrap">
                          {formatDate(stat.date)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 pr-2">
                <span>{maxVisits}</span>
                <span>{Math.floor(maxVisits / 2)}</span>
                <span>0</span>
              </div>
            </div>
            
            {/* Legend */}
            <div className="flex items-center justify-center gap-6 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-600 rounded"></div>
                <span className="text-sm text-gray-700 font-medium">Total Visits</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-400 rounded"></div>
                <span className="text-sm text-gray-700 font-medium">Unique Visitors</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity Table */}
      <div className="card-elevated rounded-xl overflow-hidden bg-white">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 heading-section">
            Recent Daily Activity
          </h2>
        </div>
        
        {dailyStats.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 font-medium">No activity data available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Total Visits
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Unique Visitors
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dailyStats.slice(-14).reverse().map((stat) => (
                  <tr key={stat.date} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {new Date(stat.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right font-semibold">
                      {stat.visits.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right font-semibold">
                      {stat.uniqueVisitors.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

