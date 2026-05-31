import type { AppState } from '../types';
import { localDateOf, toLocalDateStr } from '../lib/budget';

interface Props {
  state: AppState;
}

const BAR_COLORS = ['bg-slate-900 dark:bg-white', 'bg-emerald-500', 'bg-amber-500', 'bg-blue-500', 'bg-purple-500', 'bg-rose-500', 'bg-teal-500'];

export const Report = ({ state }: Props) => {
  const { transactions, settings } = state;
  const cur = settings?.currency_symbol || '$';
  const monthStr = toLocalDateStr().slice(0, 7);

  const monthTx = transactions.filter(t => localDateOf(t.created_at).startsWith(monthStr));
  const total = monthTx.reduce((a, t) => a + t.amount, 0);

  const byCategory = monthTx.reduce((m, t) => {
    m[t.category] = (m[t.category] || 0) + t.amount;
    return m;
  }, {} as Record<string, number>);
  const rows = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  const dailyTotal = monthTx.filter(t => !t.is_big).reduce((a, t) => a + t.amount, 0);
  const bigTotal = monthTx.filter(t => t.is_big).reduce((a, t) => a + t.amount, 0);

  return (
    <div className="flex-1 flex flex-col p-6 pt-12">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-1">本月報表</h1>
        <p className="text-sm font-bold text-slate-400">{monthStr} 的花費分布</p>
      </header>

      <div className="bg-white dark:bg-[#1e293b] rounded-[2rem] p-6 border border-slate-100 dark:border-[#334155] mb-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">本月總支出</p>
        <p className="text-4xl font-black text-slate-900 dark:text-white">{cur}{total}</p>
        <div className="flex gap-4 mt-3 text-[12px] font-bold text-slate-400">
          <span>日常 {cur}{dailyTotal}</span>
          <span>大筆 {cur}{bigTotal}</span>
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="space-y-4">
          {rows.map(([cat, amt], i) => {
            const pct = total > 0 ? Math.round((amt / total) * 100) : 0;
            return (
              <div key={cat} className="space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <span className="font-black text-sm text-slate-700 dark:text-slate-200">{cat}</span>
                  <span className="text-sm font-bold text-slate-400">{cur}{amt} · {pct}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-[#0f172a] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-center text-sm font-bold text-slate-400 py-16">本月還沒有花費紀錄</p>
      )}
    </div>
  );
};
