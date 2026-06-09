interface StatsCardProps {
  label: string;
  value: string | number;
  icon?: string;
  color?: string;
  sub?: string;
}

export default function StatsCard({ label, value, icon, color = 'text-gray-800', sub }: StatsCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-4 text-center">
      {icon && <div className="text-lg mb-1">{icon}</div>}
      <div className={`text-xl sm:text-2xl font-black ${color}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-300 mt-0.5">{sub}</div>}
    </div>
  );
}
