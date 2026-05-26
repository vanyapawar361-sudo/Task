import React from 'react';
import { LayoutGrid, CheckCircle, Clock, AlertTriangle, TrendingUp } from 'lucide-react';

const Dashboard = ({ stats }) => {
  if (!stats) return null;

  const cards = [
    { label: 'Total Tasks', value: stats.totalTasks, icon: LayoutGrid, color: 'text-indigo-400' },
    { label: 'Pending', value: stats.pendingTasks, icon: Clock, color: 'text-amber-400' },
    { label: 'Completed', value: stats.completedTasks, icon: CheckCircle, color: 'text-emerald-400' },
    { label: 'Overdue', value: stats.overdueTasks, icon: AlertTriangle, color: 'text-rose-400' },
    { label: 'Avg Importance', value: stats.averageImportance, icon: TrendingUp, color: 'text-purple-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      {cards.map((card, i) => (
        <div key={i} className="glass p-4 text-center group hover:border-indigo-500/30 transition-colors">
          <div className={`mb-2 flex justify-center ${card.color}`}>
            <card.icon size={20} />
          </div>
          <div className="text-xl font-bold">{card.value}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
            {card.label}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Dashboard;
