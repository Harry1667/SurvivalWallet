import { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Settings as SettingsIcon, AlertTriangle, Save } from 'lucide-react';
import type { AppState, UserSettings } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Details = ({ state, onOpenSettings, onSaveSettings }: { state: AppState, onOpenSettings: () => void, onSaveSettings: (s: Partial<UserSettings>) => void }) => {
  const { settings, transactions } = state;
  const [formData, setFormData] = useState({
    total_budget: settings?.total_budget,
    fixed_expenses: settings?.fixed_expenses,
    piggy_bank_name: settings?.piggy_bank_name || '夢想撲滿',
    piggy_bank_goal: settings?.piggy_bank_goal || 0,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        total_budget: settings.total_budget,
        fixed_expenses: settings.fixed_expenses,
        piggy_bank_name: settings.piggy_bank_name || '夢想撲滿',
        piggy_bank_goal: settings.piggy_bank_goal || 0,
      });
    }
  }, [settings]);

  const currentMonth = new Date().toISOString().substring(0, 7);
  
  const monthStats = useMemo(() => {
    if (!settings) return null;
    
    const emergencySpent = transactions
      .filter(t => t.is_emergency && t.created_at.startsWith(currentMonth))
      .reduce((acc, t) => acc + t.amount, 0);

    const monthNormalTransactions = transactions
      .filter(t => !t.is_emergency && t.created_at.startsWith(currentMonth) && t.transaction_type === 'expense');

    const normalSpent = monthNormalTransactions.reduce((acc, t) => acc + t.amount, 0);

    const netBudget = settings.total_budget - settings.fixed_expenses - emergencySpent;
    const remainingMoney = netBudget - normalSpent;
    
    const spentPercent = netBudget > 0 ? (normalSpent / netBudget) * 100 : 0;
    
    // New Advanced Stats
    const txCount = monthNormalTransactions.length;
    
    const categoryTotals = monthNormalTransactions.reduce((acc, t) => {
      acc[t.category as string] = (acc[t.category as string] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);
    const topCategoryEntry = Object.entries(categoryTotals).sort((a,b) => b[1] - a[1])[0];
    const topCategory = topCategoryEntry ? topCategoryEntry[0] : '無紀錄';
    const topCategoryAmount = topCategoryEntry ? topCategoryEntry[1] : 0;

    const now = new Date();
    const daysElapsed = Math.max(1, now.getDate());
    const avgDailySpent = Math.floor(normalSpent / daysElapsed);
    
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const remainingDays = daysInMonth - now.getDate() + 1;
    const projectedBalance = Math.floor(netBudget - (avgDailySpent * daysInMonth));

    return {
      totalBudget: settings.total_budget,
      fixed: settings.fixed_expenses,
      emergencySpent,
      netBudget,
      normalSpent,
      remainingMoney,
      spentPercent: Math.min(spentPercent, 100),
      txCount,
      topCategory,
      topCategoryAmount,
      avgDailySpent,
      remainingDays,
      projectedBalance
    };
  }, [settings, transactions, currentMonth]);

  if (!settings || !monthStats) return null;

  return (
    <div className="flex-1 flex flex-col pt-12 relative overflow-x-hidden safe-area-inset-top">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />

      <header className="flex justify-between items-center px-6 relative z-10 mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">詳細資料</h1>
          <p className="text-sm font-bold text-slate-400 mt-1">你的生存儀表板</p>
        </div>
        <button 
          onClick={onOpenSettings}
          className="p-3 bg-white/60 backdrop-blur-md rounded-2xl shadow-sm text-slate-400 hover:text-slate-600 border border-slate-200/50 hover:scale-105 active:scale-95 transition-all"
        >
          <SettingsIcon size={20} />
        </button>
      </header>

      <div className="flex-1 px-6 pb-8 w-full max-w-md mx-auto space-y-6 relative z-10">
        
        {/* Highlight: Remaining Money */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-[2rem] p-6 shadow-xl border flex flex-col items-center justify-center text-center backdrop-blur-xl",
            monthStats.remainingMoney > 0 
              ? "bg-white/60 border-white/60 shadow-emerald-900/5 text-emerald-900" 
              : "bg-white/60 border-white/60 shadow-red-900/5 text-red-900"
          )}
        >
          <span className="text-xs font-black uppercase tracking-widest mb-1 opacity-60">本月剩餘可用資金</span>
          <span className={cn(
            "text-6xl font-black tracking-tighter",
            monthStats.remainingMoney > 0 ? "text-emerald-500 bg-clip-text text-transparent bg-gradient-to-br from-emerald-400 to-emerald-600" : "text-rose-500 bg-clip-text text-transparent bg-gradient-to-br from-rose-400 to-rose-600"
          )}>
            ${monthStats.remainingMoney}
          </span>
          <div className="w-full bg-slate-200/50 h-2 rounded-full mt-6 flex overflow-hidden">
             <div className={cn("rounded-full transition-all duration-1000", monthStats.remainingMoney > 0 ? "bg-emerald-500" : "bg-rose-500")} style={{ width: `${monthStats.spentPercent}%` }} />
          </div>
          <span className="text-[10px] mt-2 font-bold opacity-60">
             已消耗分配預算的 {Math.floor(monthStats.spentPercent)}%
          </span>
        </motion.div>

        {/* Section: Survival Forecast Grid */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-4"
        >
          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/60">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">今日建議配額</span>
            <span className="text-2xl font-black text-slate-800">${Math.floor(state.todayAllowance)}</span>
          </div>
          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/60">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">月均日消耗</span>
            <span className="text-2xl font-black text-blue-600">${monthStats.avgDailySpent}</span>
          </div>
          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/60">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">預估月底結餘</span>
            <span className={cn("text-2xl font-black", monthStats.projectedBalance > 0 ? "text-emerald-500" : "text-rose-500")}>
              ${monthStats.projectedBalance}
            </span>
          </div>
          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/60">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">本月剩餘天數</span>
            <span className="text-2xl font-black text-slate-800">{monthStats.remainingDays} <span className="text-sm">Days</span></span>
          </div>
        </motion.div>

        {/* Section: Budget Breakdown */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white/80 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 border border-slate-100 space-y-5 backdrop-blur-xl"
        >
          <h3 className="text-sm font-black text-slate-800 tracking-wide border-b border-slate-100 pb-3">本月資金庫概況</h3>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-slate-500">💰 總預算 (含收入補血)</span>
            <span className="text-base font-black text-slate-800">${monthStats.totalBudget}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-slate-500">🔒 固定開銷預扣</span>
            <span className="text-base font-black text-slate-400">-${monthStats.fixed}</span>
          </div>

          {monthStats.emergencySpent > 0 && (
            <div className="flex justify-between items-center text-red-500 bg-red-50 p-2 -mx-2 rounded-xl">
              <span className="text-sm font-bold flex items-center gap-1"><AlertTriangle size={14}/> 突發避險總額</span>
              <span className="text-base font-black">-${monthStats.emergencySpent}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t border-slate-100 border-dashed">
            <span className="text-sm font-black text-slate-800">淨餘可用額度 (分攤基準)</span>
            <span className="text-base font-black text-slate-800">${monthStats.netBudget}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-slate-500">🛒 本月日常已花費</span>
            <span className="text-base font-black text-blue-500">-${monthStats.normalSpent}</span>
          </div>
        </motion.div>

        {/* Section: Spending Profile */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/80 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 border border-slate-100 space-y-4 backdrop-blur-xl"
        >
          <h3 className="text-sm font-black text-slate-800 tracking-wide border-b border-slate-100 pb-3">近期消費輪廓</h3>
          <div className="grid grid-cols-2 gap-4">
             <div className="flex flex-col gap-1">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">本月總筆數</span>
               <div className="text-xl font-black text-slate-800">
                 {monthStats.txCount} <span className="text-sm text-slate-400">筆</span>
               </div>
             </div>
             <div className="flex flex-col gap-1">
               <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">最大資金缺口</span>
               <div className="text-sm font-black text-rose-600 leading-tight">
                 {monthStats.topCategory}
                 {monthStats.topCategoryAmount > 0 && <span className="block text-rose-400 opacity-80">${monthStats.topCategoryAmount}</span>}
               </div>
             </div>
          </div>
        </motion.div>

        {/* Section: Edit Settings */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="bg-white/80 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 border border-slate-100 space-y-4 backdrop-blur-xl"
        >
          <h3 className="text-sm font-black text-slate-800 tracking-wide border-b border-slate-100 pb-3">基礎參數設定</h3>
          
          <div className="space-y-4">
            <label className="block">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">每月總生活費</span>
              <input 
                type="number" 
                value={formData.total_budget || ''}
                onChange={e => setFormData(s => ({ ...s, total_budget: parseInt(e.target.value) || 0 }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 text-base font-black text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">每月固定支出</span>
              <input 
                type="number" 
                value={formData.fixed_expenses || ''}
                onChange={e => setFormData(s => ({ ...s, fixed_expenses: parseInt(e.target.value) || 0 }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 text-base font-black text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">夢想撲滿名稱</span>
              <input 
                type="text" 
                value={formData.piggy_bank_name}
                onChange={e => setFormData(s => ({ ...s, piggy_bank_name: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 text-base font-black text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">目標金額</span>
              <input 
                type="number" 
                value={formData.piggy_bank_goal || ''}
                onChange={e => setFormData(s => ({ ...s, piggy_bank_goal: parseInt(e.target.value) || 0 }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 text-base font-black text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </label>
          </div>
          
          <button 
            onClick={() => { onSaveSettings(formData); alert('設定已儲存！'); }}
            className="w-full py-3 mt-4 bg-emerald-500 text-white text-on-accent rounded-2xl font-black text-sm shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 hover:bg-emerald-600 active:scale-95 transition-all"
          >
            <Save size={16} />
            儲存修改
          </button>
        </motion.div>

        {/* Section: System Settings & Status */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white/60 text-slate-800 backdrop-blur-md border border-white/60 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 space-y-4"
        >
          <h3 className="text-sm font-black text-slate-800 tracking-wide">系統狀態參數</h3>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white/50 p-4 border border-white/60 rounded-2xl flex flex-col gap-1">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">目前安全連擊</span>
               <div className="text-2xl font-black text-amber-500 flex items-center gap-2">
                 {settings.current_streak} <span className="text-sm">Days</span>
               </div>
             </div>
             
             <div className="bg-white/50 p-4 border border-white/60 rounded-2xl flex flex-col gap-1">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">懲罰分類名單</span>
               <div className="text-sm font-black text-rose-500 mt-1 line-clamp-2 leading-tight">
                 {settings.taxed_categories && settings.taxed_categories.length > 0 ? settings.taxed_categories.join(', ') : '無異常狀態'}
               </div>
             </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
