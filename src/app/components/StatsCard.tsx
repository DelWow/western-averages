'use client';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
}

export default function StatsCard({ title, value, subtitle, icon }: StatsCardProps) {
  return (
    <div className="stats-gradient card-elevated rounded-xl p-4 sm:p-6 border-l-[3px] border-purple-600 relative overflow-hidden group">
      {/* Decorative corner accent */}
      <div className="absolute top-0 right-0 w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-purple-100/50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider mb-1.5 sm:mb-2 font-medium">{title}</p>
          <p className="text-3xl sm:text-4xl font-black text-gray-900 mb-0.5 sm:mb-1 heading-display">{value}</p>
          {subtitle && (
            <p className="text-[10px] sm:text-xs text-gray-500 font-light mt-1 sm:mt-1.5">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="text-purple-600 opacity-80 group-hover:opacity-100 transition-opacity ml-3 sm:ml-4 flex-shrink-0">
            <div className="w-5 h-5 sm:w-7 sm:h-7">{icon}</div>
          </div>
        )}
      </div>
    </div>
  );
}

