import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Settings as SettingsIcon, PieChart as PieChartIcon } from 'lucide-react';
import type { AppState, Category } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CATEGORIES: { name: Category; hex: string; colorClass: string }[] = [
  { name: '生存正餐', hex: '#10b981', colorClass: 'bg-emerald-500' },
  { name: '快樂水/零食', hex: '#f59e0b', colorClass: 'bg-amber-500' },
  { name: '生活日用', hex: '#3b82f6', colorClass: 'bg-blue-500' },
  { name: '交通通勤', hex: '#6366f1', colorClass: 'bg-indigo-500' },
  { name: '娛樂社交', hex: '#a855f7', colorClass: 'bg-purple-500' },
  { name: '自我投資', hex: '#f43f5e', colorClass: 'bg-rose-500' },
  { name: '其他雜項', hex: '#64748b', colorClass: 'bg-slate-500' },
];

export const Report = ({ state, onOpenSettings }: { state: AppState, onOpenSettings: () => void }) => {
  const { transactions } = state;

  const currentMonth = new Date().toISOString().substring(0, 7);
  
  const monthTransactions = useMemo(() => {
    return transactions.filter(t => !t.is_emergency && t.created_at.startsWith(currentMonth) && t.transaction_type === 'expense');
  }, [transactions, currentMonth]);

  const totalSpent = useMemo(() => {
    return monthTransactions.reduce((acc, t) => acc + t.amount, 0);
  }, [monthTransactions]);

  const categoryStats = useMemo(() => {
    return CATEGORIES.map(cat => {
      const amount = monthTransactions.filter(t => t.category === cat.name).reduce((acc, t) => acc + t.amount, 0);
      return { ...cat, amount, percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0 };
    }).filter(cat => cat.amount > 0).sort((a, b) => b.amount - a.amount);
  }, [monthTransactions, totalSpent]);

  // Generate conic gradient string
  let cumulativePercent = 0;
  const conicStops = categoryStats.map(cat => {
    const start = cumulativePercent;
    cumulativePercent += cat.percentage;
    return `${cat.hex} ${start}% ${cumulativePercent}%`;
  }).join(', ');

  const pieStyle = totalSpent > 0 ? { background: `conic-gradient(${conicStops})` } : { background: '#f1f5f9' };

  return (
    <div className="flex-1 flex flex-col pt-12 relative overflow-x-hidden safe-area-inset-top">
      <header className="flex justify-between items-center px-6 relative z-10 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">生存報表</h1>
          <p className="text-sm font-bold text-slate-400 mt-1">本月花銷洞察</p>
        </div>
        <button 
          onClick={onOpenSettings}
          className="p-3 bg-white/60 backdrop-blur-md rounded-2xl shadow-sm text-slate-400 hover:text-slate-600 border border-slate-200/50 hover:scale-105 active:scale-95 transition-all"
        >
          <SettingsIcon size={20} />
        </button>
      </header>

      <div className="flex-1 px-6 pb-6 w-full max-w-md mx-auto space-y-8">
        
        {/* Total Spent Widget */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col items-center justify-center text-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 bg-blue-50/50 rounded-bl-[100px] pointer-events-none" />
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 relative z-10">本月總開銷</span>
          <span className="text-5xl font-black text-slate-900 tracking-tighter relative z-10">
            ${totalSpent}
          </span>
        </motion.div>

        {/* Pie Chart Section */}
        {totalSpent > 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/40 border border-slate-100"
          >
            <div className="flex justify-center mb-8 pt-4">
              <div className="relative w-48 h-48 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.05)] flex items-center justify-center transition-all duration-1000" style={pieStyle}>
                 <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-inner z-10">
                   <div className="text-center">
                     <span className="block text-2xl font-black text-slate-800">{categoryStats[0]?.percentage.toFixed(0)}%</span>
                     <span className="block text-[10px] font-bold text-slate-400 mt-0.5 max-w-16 truncate">{categoryStats[0]?.name}</span>
                   </div>
                 </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">佔比排行</h3>
              {categoryStats.map((cat, i) => (
                <div key={cat.name} className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-24 shrink-0">
                     <div className={cn("w-3 h-3 rounded-full shadow-sm", cat.colorClass)} />
                     <span className="text-[11px] font-bold text-slate-600 truncate">{cat.name}</span>
                  </div>
                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                    <motion.div 
                      className={cn("h-full", cat.colorClass)}
                      initial={{ width: 0 }}
                      animate={{ width: `${cat.percentage}%` }}
                      transition={{ delay: 0.2 + i * 0.1, duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                  <div className="w-12 text-right">
                    <span className="text-sm font-black text-slate-800">${cat.amount}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="py-20 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center text-slate-300 mb-4">
              <PieChartIcon size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-500 mb-1">本月尚無消費</h3>
            <p className="text-sm font-bold text-slate-400">目前為完美的生存紀錄</p>
          </div>
        )}

      </div>
    </div>
  );
};
