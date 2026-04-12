import { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Settings as SettingsIcon,
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  Trophy,
} from 'lucide-react';
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

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

export const Report = ({ state, onOpenSettings }: { state: AppState, onOpenSettings: () => void }) => {
  const { transactions, settings } = state;
  const C = settings?.currency_symbol || '$';

  const currentMonth = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })();
  const prevMonthStr = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // 本月 / 上月交易切片（用 local date 比對）
  const localDateOf = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const monthTx = useMemo(
    () => transactions.filter(t => localDateOf(t.created_at).startsWith(currentMonth) && (t.entry_mode || 'normal') !== 'historical'),
    [transactions, currentMonth]
  );
  const prevMonthTx = useMemo(
    () => transactions.filter(t => localDateOf(t.created_at).startsWith(prevMonthStr) && (t.entry_mode || 'normal') !== 'historical'),
    [transactions, prevMonthStr]
  );

  const monthNormalExpenses = useMemo(
    () => monthTx.filter(t => !t.is_emergency && t.transaction_type === 'expense'),
    [monthTx]
  );

  const totalSpent = useMemo(
    () => monthNormalExpenses.reduce((acc, t) => acc + t.amount, 0),
    [monthNormalExpenses]
  );

  const monthIncome = useMemo(
    () => monthTx.filter(t => t.transaction_type === 'income').reduce((a, t) => a + t.amount, 0),
    [monthTx]
  );

  // 類別佔比 + vs 上月對比
  const categoryStats = useMemo(() => {
    return CATEGORIES.map(cat => {
      const amount = monthNormalExpenses.filter(t => t.category === cat.name).reduce((acc, t) => acc + t.amount, 0);
      const prevAmount = prevMonthTx
        .filter(t => !t.is_emergency && t.transaction_type === 'expense' && t.category === cat.name)
        .reduce((acc, t) => acc + t.amount, 0);
      const delta = amount - prevAmount;
      const deltaPct = prevAmount > 0 ? (delta / prevAmount) * 100 : amount > 0 ? 100 : 0;
      return {
        ...cat,
        amount,
        prevAmount,
        delta,
        deltaPct,
        percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
      };
    });
  }, [monthNormalExpenses, prevMonthTx, totalSpent]);

  const visibleCategoryStats = useMemo(
    () => categoryStats.filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount),
    [categoryStats]
  );
  const compareCategoryStats = useMemo(
    () => categoryStats.filter(c => c.amount > 0 || c.prevAmount > 0).sort((a, b) => b.amount - a.amount),
    [categoryStats]
  );

  // 圓餅 conic gradient
  let cumulativePercent = 0;
  const conicStops = visibleCategoryStats.map(cat => {
    const start = cumulativePercent;
    cumulativePercent += cat.percentage;
    return `${cat.hex} ${start}% ${cumulativePercent}%`;
  }).join(', ');
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const pieStyle = totalSpent > 0 ? { background: `conic-gradient(${conicStops})` } : { background: isDark ? '#1e293b' : '#f1f5f9' };

  // 每日花費 & 月曆熱力圖
  const calendarData = useMemo(() => {
    const [year, month] = currentMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayWeekday = new Date(year, month - 1, 1).getDay(); // 0 = Sunday
    const todayDate = new Date().getDate();

    const dailySpend = Array.from({ length: daysInMonth }, (_, i) => {
      const dStr = `${currentMonth}-${String(i + 1).padStart(2, '0')}`;
      return monthNormalExpenses
        .filter(t => {
          const td = new Date(t.created_at);
          return `${td.getFullYear()}-${String(td.getMonth() + 1).padStart(2, '0')}-${String(td.getDate()).padStart(2, '0')}` === dStr;
        })
        .reduce((acc, t) => acc + t.amount, 0);
    });
    const maxDaily = Math.max(...dailySpend, 1);

    return {
      daysInMonth,
      firstDayWeekday,
      todayDate,
      dailySpend,
      maxDaily,
    };
  }, [currentMonth, monthNormalExpenses]);

  // 顏色刻度：根據相對強度分級
  const heatColorFor = (amount: number, max: number) => {
    if (amount <= 0) return 'bg-slate-100 text-slate-400';
    const ratio = amount / max;
    if (ratio < 0.25) return 'bg-emerald-200 text-emerald-800';
    if (ratio < 0.5) return 'bg-emerald-300 text-emerald-900';
    if (ratio < 0.75) return 'bg-amber-300 text-amber-900';
    return 'bg-rose-400 text-white';
  };

  // 週幾平均 ($/天)
  const dayOfWeekStats = useMemo(() => {
    const [year, month] = currentMonth.split('-').map(Number);
    const todayDate = new Date().getDate();
    const daysInMonth = new Date(year, month, 0).getDate();
    const totals = [0, 0, 0, 0, 0, 0, 0];
    const counts = [0, 0, 0, 0, 0, 0, 0];

    for (let d = 1; d <= Math.min(daysInMonth, todayDate); d++) {
      const dow = new Date(year, month - 1, d).getDay();
      counts[dow]++;
    }
    monthNormalExpenses.forEach(t => {
      const dow = new Date(t.created_at).getDay();
      totals[dow] += t.amount;
    });
    const avg = totals.map((total, i) => (counts[i] > 0 ? Math.floor(total / counts[i]) : 0));
    const maxAvg = Math.max(...avg, 1);
    return { totals, counts, avg, maxAvg };
  }, [currentMonth, monthNormalExpenses]);

  // Top 5 單筆大額消費
  const topExpenses = useMemo(() => {
    return [...monthNormalExpenses]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [monthNormalExpenses]);

  // 最近 7 日趨勢
  const last7Days = useMemo(() => {
    const arr: { date: string; amount: number; label: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const amount = transactions
        .filter(t => {
          if (t.is_emergency || t.transaction_type !== 'expense' || (t.entry_mode || 'normal') === 'historical') return false;
          const td = new Date(t.created_at);
          const txDate = `${td.getFullYear()}-${String(td.getMonth() + 1).padStart(2, '0')}-${String(td.getDate()).padStart(2, '0')}`;
          return txDate === dStr;
        })
        .reduce((a, t) => a + t.amount, 0);
      arr.push({ date: dStr, amount, label: `${d.getMonth() + 1}/${d.getDate()}` });
    }
    return arr;
  }, [transactions]);
  const max7 = Math.max(...last7Days.map(d => d.amount), 1);

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

        {/* 支出 vs 收入 Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/40 border border-slate-100 space-y-5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 bg-blue-50/50 dark:bg-blue-950/30 rounded-bl-[100px] pointer-events-none" />

          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">本月總開銷</span>
              <span className="text-3xl font-black text-rose-600 tracking-tighter">{C}{totalSpent}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">本月總收入</span>
              <span className="text-3xl font-black text-emerald-600 tracking-tighter">{C}{monthIncome}</span>
            </div>
          </div>

          {/* 收支對比條 */}
          {(totalSpent > 0 || monthIncome > 0) && (
            <div className="relative z-10">
              <div className="w-full h-3 bg-slate-100 rounded-full flex overflow-hidden shadow-inner">
                {(() => {
                  const total = totalSpent + monthIncome;
                  const expensePct = total > 0 ? (totalSpent / total) * 100 : 0;
                  const incomePct = total > 0 ? (monthIncome / total) * 100 : 0;
                  return (
                    <>
                      <motion.div className="bg-rose-500 h-full" initial={{ width: 0 }} animate={{ width: `${expensePct}%` }} transition={{ duration: 0.8 }} />
                      <motion.div className="bg-emerald-500 h-full" initial={{ width: 0 }} animate={{ width: `${incomePct}%` }} transition={{ duration: 0.8, delay: 0.1 }} />
                    </>
                  );
                })()}
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-[10px] font-bold text-slate-500">淨流: </span>
                <span className={cn("text-sm font-black", monthIncome - totalSpent >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  {monthIncome - totalSpent >= 0 ? '+' : ''}${monthIncome - totalSpent}
                </span>
              </div>
            </div>
          )}
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
                    <span className="block text-2xl font-black text-slate-800">{visibleCategoryStats[0]?.percentage.toFixed(0)}%</span>
                    <span className="block text-[10px] font-bold text-slate-400 mt-0.5 max-w-16 truncate">{visibleCategoryStats[0]?.name}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">佔比排行</h3>
              {visibleCategoryStats.map((cat, i) => (
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
                      transition={{ delay: 0.2 + i * 0.1, duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="w-12 text-right">
                    <span className="text-sm font-black text-slate-800">{C}{cat.amount}</span>
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

        {/* 每日支出熱力圖月曆 */}
        {totalSpent > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 border border-slate-100 space-y-4"
          >
            <h3 className="text-sm font-black text-slate-800 tracking-wide border-b border-slate-100 pb-3">
              📅 每日熱力圖
            </h3>

            {/* 星期標頭 */}
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAY_LABELS.map(label => (
                <div key={label} className="text-center text-[10px] font-black text-slate-400">{label}</div>
              ))}
            </div>

            {/* 日期格 */}
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: calendarData.firstDayWeekday }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {calendarData.dailySpend.map((amount, i) => {
                const day = i + 1;
                const isToday = day === calendarData.todayDate;
                const isFuture = day > calendarData.todayDate;
                const colorClass = isFuture
                  ? 'bg-white/40 text-slate-300'
                  : heatColorFor(amount, calendarData.maxDaily);
                return (
                  <div
                    key={day}
                    className={cn(
                      "aspect-square rounded-lg flex items-center justify-center text-[10px] font-black transition-all",
                      colorClass,
                      isToday ? "ring-2 ring-slate-700 ring-offset-1" : ""
                    )}
                    title={isFuture ? '' : `${day} 日 · ${C}${amount}`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 border-dashed">
              <span className="text-[10px] font-bold text-slate-400">少</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-sm bg-slate-100" />
                <div className="w-3 h-3 rounded-sm bg-emerald-200" />
                <div className="w-3 h-3 rounded-sm bg-emerald-300" />
                <div className="w-3 h-3 rounded-sm bg-amber-300" />
                <div className="w-3 h-3 rounded-sm bg-rose-400" />
              </div>
              <span className="text-[10px] font-bold text-slate-400">多</span>
            </div>
          </motion.div>
        )}

        {/* 每週分布 */}
        {totalSpent > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.17 }}
            className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 border border-slate-100 space-y-4"
          >
            <h3 className="text-sm font-black text-slate-800 tracking-wide border-b border-slate-100 pb-3">
              📊 週幾平均花費
            </h3>

            <div className="flex items-end justify-between gap-2 h-32">
              {dayOfWeekStats.avg.map((avg, i) => {
                const heightPct = dayOfWeekStats.maxAvg > 0 ? (avg / dayOfWeekStats.maxAvg) * 100 : 0;
                const isMax = avg === dayOfWeekStats.maxAvg && avg > 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] font-black text-slate-600">{C}{avg}</span>
                    <div className="w-full flex-1 bg-slate-100 rounded-md relative overflow-hidden flex items-end">
                      <motion.div
                        className={cn(
                          "w-full rounded-md",
                          isMax ? "bg-rose-500" : "bg-blue-400"
                        )}
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-[10px] font-black text-slate-500">{WEEKDAY_LABELS[i]}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* 7 日趨勢 */}
        {totalSpent > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.19 }}
            className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 border border-slate-100 space-y-4"
          >
            <h3 className="text-sm font-black text-slate-800 tracking-wide border-b border-slate-100 pb-3">
              📈 最近 7 日趨勢
            </h3>

            <div className="flex items-end justify-between gap-1.5 h-24">
              {last7Days.map((d, i) => {
                const heightPct = (d.amount / max7) * 100;
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex-1 bg-slate-100 rounded-md flex items-end overflow-hidden">
                      <motion.div
                        className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-md"
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPct}%` }}
                        transition={{ duration: 0.5, delay: i * 0.05 }}
                      />
                    </div>
                    <span className="text-[9px] font-bold text-slate-400">{d.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-2 border-t border-slate-100 border-dashed text-[10px] font-bold text-slate-500">
              <span>7 日總計: ${last7Days.reduce((a, b) => a + b.amount, 0)}</span>
              <span>日均: ${Math.floor(last7Days.reduce((a, b) => a + b.amount, 0) / 7)}</span>
            </div>
          </motion.div>
        )}

        {/* 類別月對比 */}
        {compareCategoryStats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.21 }}
            className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 border border-slate-100 space-y-4"
          >
            <h3 className="text-sm font-black text-slate-800 tracking-wide border-b border-slate-100 pb-3">
              🆚 類別月對比（vs 上月）
            </h3>

            <div className="space-y-3">
              {compareCategoryStats.map(cat => (
                <div key={cat.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className={cn("w-3 h-3 rounded-full shrink-0", cat.colorClass)} />
                    <span className="text-xs font-bold text-slate-700 truncate">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-800 w-14 text-right">{C}{cat.amount}</span>
                    <div className="w-16 text-right">
                      {cat.prevAmount > 0 || cat.amount > 0 ? (
                        <span className={cn(
                          "text-[10px] font-black flex items-center gap-0.5 justify-end",
                          cat.delta > 0 ? "text-rose-600" : cat.delta < 0 ? "text-emerald-600" : "text-slate-400"
                        )}>
                          {cat.delta > 0 ? <TrendingUp size={10} /> : cat.delta < 0 ? <TrendingDown size={10} /> : null}
                          {cat.delta === 0 ? '—' : `${cat.deltaPct >= 0 ? '+' : ''}${cat.deltaPct.toFixed(0)}%`}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Top 5 單筆大額 */}
        {topExpenses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.23 }}
            className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 border border-slate-100 space-y-3"
          >
            <h3 className="text-sm font-black text-slate-800 tracking-wide border-b border-slate-100 pb-3 flex items-center gap-2">
              <Trophy size={14} className="text-amber-500" /> 本月 Top 5 爆擊
            </h3>

            <div className="space-y-2">
              {topExpenses.map((t, i) => {
                const colorClass = CATEGORIES.find(c => c.name === t.category)?.colorClass || 'bg-slate-500';
                return (
                  <div key={t.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                    <span className={cn(
                      "w-6 h-6 rounded-full text-white text-[11px] font-black flex items-center justify-center shrink-0",
                      i === 0 ? "bg-amber-500" : i === 1 ? "bg-slate-400" : i === 2 ? "bg-amber-700" : "bg-slate-300"
                    )}>{i + 1}</span>
                    <div className={cn("w-1 h-8 rounded-full shrink-0", colorClass)} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-black text-slate-800 truncate">{t.item || '未命名消費'}</div>
                      <div className="text-[10px] font-bold text-slate-400 truncate">{t.category} · {t.created_at.substring(5, 10)}</div>
                    </div>
                    <span className="text-base font-black text-slate-800">{C}{t.amount}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
};
