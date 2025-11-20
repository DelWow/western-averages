'use client';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
}

export default function StatsCard({ title, value, subtitle, icon }: StatsCardProps) {
  return (
    <div className="stats-gradient card-elevated rounded-xl p-6 border-l-[3px] border-purple-600 relative overflow-hidden group">
      {/* Decorative corner accent */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-100/50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">{title}</p>
          <p className="text-4xl font-black text-gray-900 mb-1 heading-display">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 font-light mt-1.5">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="text-purple-600 opacity-80 group-hover:opacity-100 transition-opacity ml-4 flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

