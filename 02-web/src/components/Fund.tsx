import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Settings as SettingsIcon, History as HistoryIcon } from 'lucide-react';
import type { AppState } from '../types';
import { getFundRecords } from '../lib/db';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  state: AppState;
  onOpenSettings: () => void;
}

export const Fund = ({ state, onOpenSettings }: Props) => {
  const { settings } = state;
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    setRecords(getFundRecords());
  }, [state.settings?.piggy_bank_saved]); // refresh if saved amount changes

  if (!settings) return null;

  const piggyPercent = Math.min((settings.piggy_bank_saved / settings.piggy_bank_goal) * 100, 100);

  // SVG parameters for circular progress
  const size = 280;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (piggyPercent / 100) * circumference;

  return (
    <div className="flex-1 flex flex-col pt-12 relative overflow-x-hidden safe-area-inset-top">
      {/* Background Decorative Blurs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-96 bg-gradient-to-b from-blue-100/50 to-transparent rounded-[100%] blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="flex justify-between items-center px-6 relative z-10 mb-8">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">
          {settings.piggy_bank_name} 進度
        </h1>
        <button 
          onClick={onOpenSettings}
          className="p-3 bg-white/60 backdrop-blur-md rounded-2xl shadow-sm text-slate-400 hover:text-slate-600 border border-slate-200/50 hover:scale-105 active:scale-95 transition-all"
        >
          <SettingsIcon size={20} />
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center px-6 pb-6 relative z-10 w-full max-w-sm mx-auto">
        
        {/* Circular Progress Area */}
        <div className="relative mb-12 flex items-center justify-center" style={{ width: size, height: size }}>
          
          {/* SVG Ring */}
          <svg
            className="transform -rotate-90 drop-shadow-xl"
            width={size}
            height={size}
          >
            {/* Background Track */}
            <circle
              className="text-slate-200/50"
              strokeWidth={strokeWidth}
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx={size / 2}
              cy={size / 2}
            />
            {/* Progress Stroke */}
            <motion.circle
              className="text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={circumference} // Start at 0 for animation
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx={size / 2}
              cy={size / 2}
            />
          </svg>

          {/* Inner Text Center Payload */}
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-white/40 backdrop-blur-sm m-4 border border-white/60 shadow-[inset_0_4px_20px_rgba(255,255,255,1)]">
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="flex flex-col items-center text-center"
            >
              <span className="text-4xl font-black tracking-tighter text-blue-600 drop-shadow-sm">
                ${Math.floor(settings.piggy_bank_saved)}
              </span>
              <div className="w-12 h-0.5 bg-slate-200 my-2 rounded-full" />
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-0.5">目標</span>
              <span className="text-lg font-bold text-slate-500">${settings.piggy_bank_goal}</span>
            </motion.div>
          </div>
        </div>

        {/* Global Percentage Indicator (Optional extra feel) */}
        <div className="bg-white px-6 py-3 rounded-full shadow-sm border border-slate-100 flex items-center gap-3 mb-10 w-full justify-center">
             <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
             <span className="font-bold text-slate-600 text-sm">目前已達成 <strong className="text-blue-600 font-black">{Math.floor(piggyPercent)}%</strong></span>
        </div>

        {/* Savings Record List */}
        <div className="w-full relative">
          <div className="flex items-center gap-2 mb-6 ml-2 text-slate-400">
            <HistoryIcon size={18} strokeWidth={2.5} />
            <h2 className="text-sm font-black uppercase tracking-widest">夢想儲蓄紀錄</h2>
          </div>

          <div className="space-y-3">
             {records.length > 0 ? (
               records.map((rec) => (
                 <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   key={rec.id} 
                   className="bg-white rounded-3xl p-5 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] border border-slate-100 flex justify-between items-center"
                 >
                   <div>
                     <p className="font-black text-slate-800 text-sm mb-1">{rec.reason}</p>
                     <p className="text-[10px] font-bold text-slate-400 tracking-wider">
                       {new Date(rec.created_at).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                     </p>
                   </div>
                   <div className={cn(
                     "font-black text-lg tracking-tight",
                     rec.amount > 0 ? "text-emerald-500" : "text-rose-500"
                   )}>
                     {rec.amount > 0 ? '+' : ''}{Math.floor(rec.amount)}
                   </div>
                 </motion.div>
               ))
             ) : (
                <div className="bg-slate-100/50 rounded-3xl p-8 border border-slate-200 border-dashed text-center">
                  <p className="text-slate-400 font-bold text-sm">尚無存入紀錄<br/>努力度過每一天來累積夢想吧！</p>
                </div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
};
