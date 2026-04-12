import { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Settings as SettingsIcon,
  AlertTriangle,
  Save,
  Flame,
  Trophy,
  TrendingUp,
  TrendingDown,
  Gauge,
  PiggyBank,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import type { AppState, UserSettings, FundRecord } from '../types';
import { getFundRecords } from '../lib/db';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 類別顏色 map — 跟 Report.tsx 保持一致
const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  '生存正餐': 'bg-emerald-500',
  '快樂水/零食': 'bg-amber-500',
  '生活日用': 'bg-blue-500',
  '交通通勤': 'bg-indigo-500',
  '娛樂社交': 'bg-purple-500',
  '自我投資': 'bg-rose-500',
  '其他雜項': 'bg-slate-500',
};

const INCOME_CATEGORY_COLORS: Record<string, string> = {
  '基礎補給': 'bg-emerald-500',
  '任務賞金': 'bg-blue-500',
  '天降寶箱': 'bg-amber-500',
  '裝備變現': 'bg-indigo-500',
  '被動生息': 'bg-purple-500',
  '其他補血': 'bg-slate-500',
};

export const Details = ({ state, onOpenSettings, onSaveSettings }: { state: AppState, onOpenSettings: () => void, onSaveSettings: (s: Partial<UserSettings>) => void }) => {
  const { settings, transactions } = state;
  const [formData, setFormData] = useState({
    total_budget: settings?.total_budget,
    fixed_expenses: settings?.fixed_expenses,
    piggy_bank_name: settings?.piggy_bank_name || '夢想撲滿',
    piggy_bank_goal: settings?.piggy_bank_goal || 0,
  });
  const [fundRecords, setFundRecords] = useState<FundRecord[]>([]);

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

  // fund_records 跟著撲滿金額變動 refresh
  useEffect(() => {
    setFundRecords(getFundRecords() as FundRecord[]);
  }, [settings?.piggy_bank_saved, transactions.length]);

  const currentMonth = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })();
  const prevMonthStr = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const todayDay = new Date().getDate();
  const C = settings?.currency_symbol || '$';

  const localDateOf = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

  // === 核心月度統計 ===
  const stats = useMemo(() => {
    if (!settings) return null;

    // 本月 / 上月交易切片（歷史匯入不計，用 local date 比對）
    const monthTx = transactions.filter(t => localDateOf(t.created_at).startsWith(currentMonth) && (t.entry_mode || 'normal') !== 'historical');
    const prevMonthTx = transactions.filter(t => localDateOf(t.created_at).startsWith(prevMonthStr) && (t.entry_mode || 'normal') !== 'historical');

    const monthNormalExpenses = monthTx.filter(t => !t.is_emergency && t.transaction_type === 'expense');
    const monthEmergencyExpenses = monthTx.filter(t => t.is_emergency && t.transaction_type === 'expense');
    const monthIncomes = monthTx.filter(t => t.transaction_type === 'income');

    const normalSpent = monthNormalExpenses.reduce((a, t) => a + t.amount, 0);
    const emergencySpent = monthEmergencyExpenses.reduce((a, t) => a + t.amount, 0);
    const emergencyCount = monthEmergencyExpenses.length;
    const monthIncome = monthIncomes.reduce((a, t) => a + t.amount, 0);

    const netBudget = settings.total_budget + monthIncome - settings.fixed_expenses - emergencySpent;
    const remainingMoney = netBudget - normalSpent;
    const spentPercent = netBudget > 0 ? Math.min((normalSpent / netBudget) * 100, 100) : 0;

    // 本月淨損益 = 額外收入 − 日常支出 − 突發避險
    //   fixed_expenses 故意不扣 — 因為在本 app 的模型裡 total_budget 已經是「扣掉 fixed 後可用」的概念上下文，
    //   把 fixed 再扣一次會跟 Hero 的「本月剩餘可用資金」邏輯打架，讓使用者看到 +$26800 剩餘卻是 -$8200 淨損益。
    //   → 這個欄位想表達的是：本月「額外」收支平衡（相對於月預算基準線）
    const monthNetPL = monthIncome - normalSpent - emergencySpent;

    // 類別總計
    const categoryTotals = monthNormalExpenses.reduce((acc, t) => {
      acc[t.category as string] = (acc[t.category as string] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);
    const topEntry = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
    const topCategory = topEntry ? topEntry[0] : '無紀錄';
    const topCategoryAmount = topEntry ? topEntry[1] : 0;

    // 日均 / 預估
    const now = new Date();
    const daysElapsed = Math.max(1, now.getDate());
    const avgDailySpent = Math.floor(normalSpent / daysElapsed);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const remainingDays = daysInMonth - now.getDate() + 1;
    const projectedBalance = Math.floor(netBudget - (avgDailySpent * daysInMonth));

    // 燃料剩餘天數：剩餘可用 ÷ 近 7 日均花費
    const last7Start = new Date();
    last7Start.setDate(last7Start.getDate() - 7);
    const last7Spend = transactions
      .filter(t => !t.is_emergency
        && t.transaction_type === 'expense'
        && (t.entry_mode || 'normal') !== 'historical'
        && new Date(t.created_at) >= last7Start)
      .reduce((a, t) => a + t.amount, 0);
    const avg7Day = last7Spend / 7;
    const fuelDaysRaw = avg7Day > 0 ? remainingMoney / avg7Day : Infinity;
    const fuelDays = Number.isFinite(fuelDaysRaw) ? Math.max(0, Math.floor(fuelDaysRaw)) : Infinity;

    // === vs 上月同期 ===
    const prevMonthNormalTillSameDay = prevMonthTx
      .filter(t => !t.is_emergency && t.transaction_type === 'expense' && new Date(t.created_at).getDate() <= todayDay)
      .reduce((a, t) => a + t.amount, 0);
    const prevMonthNormalFull = prevMonthTx
      .filter(t => !t.is_emergency && t.transaction_type === 'expense')
      .reduce((a, t) => a + t.amount, 0);
    const prevMonthIncomeFull = prevMonthTx
      .filter(t => t.transaction_type === 'income')
      .reduce((a, t) => a + t.amount, 0);
    const prevMonthEmergencyFull = prevMonthTx
      .filter(t => t.is_emergency && t.transaction_type === 'expense')
      .reduce((a, t) => a + t.amount, 0);
    const samePeriodDelta = normalSpent - prevMonthNormalTillSameDay; // 正 = 比上月更兇
    const samePeriodDeltaPct = prevMonthNormalTillSameDay > 0
      ? (samePeriodDelta / prevMonthNormalTillSameDay) * 100
      : 0;

    // === 收入分類分布 ===
    const incomeByCategory = monthIncomes.reduce((acc, t) => {
      acc[t.category as string] = (acc[t.category as string] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);
    const incomeByCatSorted = Object.entries(incomeByCategory).sort((a, b) => b[1] - a[1]);
    const latestIncome = monthIncomes.slice().sort((a, b) => b.created_at.localeCompare(a.created_at))[0] || null;

    // === 衝動消費率 ===
    const impulseSpent = (categoryTotals['快樂水/零食'] || 0) + (categoryTotals['娛樂社交'] || 0);
    const impulseRate = normalSpent > 0 ? (impulseSpent / normalSpent) * 100 : 0;

    // === 月底爆買指數：最後 3 天 vs 前 3 天 ===
    const sortedDaily = Array.from({ length: daysElapsed }, (_, i) => {
      const dStr = `${currentMonth}-${String(i + 1).padStart(2, '0')}`;
      return monthNormalExpenses
        .filter(t => {
          const td = new Date(t.created_at);
          return `${td.getFullYear()}-${String(td.getMonth() + 1).padStart(2, '0')}-${String(td.getDate()).padStart(2, '0')}` === dStr;
        })
        .reduce((a, t) => a + t.amount, 0);
    });
    const first3 = sortedDaily.slice(0, 3).reduce((a, b) => a + b, 0);
    const last3 = sortedDaily.slice(-3).reduce((a, b) => a + b, 0);
    const endOfMonthSpikeRatio = first3 > 0 ? last3 / first3 : 0;

    const txCount = monthNormalExpenses.length;

    return {
      totalBudget: settings.total_budget,
      fixed: settings.fixed_expenses,
      monthIncome,
      emergencySpent,
      emergencyCount,
      netBudget,
      normalSpent,
      monthNetPL,
      remainingMoney,
      spentPercent,
      avgDailySpent,
      remainingDays,
      projectedBalance,
      fuelDays,
      prevMonthNormalTillSameDay,
      prevMonthNormalFull,
      prevMonthIncomeFull,
      prevMonthEmergencyFull,
      samePeriodDelta,
      samePeriodDeltaPct,
      incomeByCatSorted,
      latestIncome,
      impulseRate,
      impulseSpent,
      endOfMonthSpikeRatio,
      last3,
      first3,
      categoryTotals,
      topCategory,
      topCategoryAmount,
      txCount,
    };
  }, [settings, transactions, currentMonth, prevMonthStr, todayDay]);

  // === 撲滿金流 / 奧侈稅分析 ===
  const fundStats = useMemo(() => {
    const byKind: Record<string, number> = { tax: 0, surplus: 0, streak_reward: 0, penalty: 0, manual: 0 };
    const monthTax: FundRecord[] = [];
    const allTax: FundRecord[] = [];
    const taxByCategory: Record<string, number> = {};
    let monthTaxTotal = 0;
    let allTaxTotal = 0;
    let streakRewardTotal = 0;
    let maxTax: FundRecord | null = null;

    fundRecords.forEach(r => {
      const kind = r.kind || 'surplus';
      byKind[kind] = (byKind[kind] || 0) + r.amount;
      if (kind === 'tax') {
        allTax.push(r);
        allTaxTotal += r.amount;
        if (!maxTax || r.amount > maxTax.amount) maxTax = r;
        if (r.created_at && r.created_at.startsWith(currentMonth)) {
          monthTax.push(r);
          monthTaxTotal += r.amount;
          const cat = r.source_category || '未知';
          taxByCategory[cat] = (taxByCategory[cat] || 0) + r.amount;
        }
      }
      if (kind === 'streak_reward') {
        streakRewardTotal += r.amount;
      }
    });

    const taxByCategorySorted = Object.entries(taxByCategory).sort((a, b) => b[1] - a[1]);
    // 撲滿「正向」構成（罰金 penalty 是負數，不放進圓餅但會顯示）
    const positiveTotal = (byKind.tax || 0) + (byKind.surplus || 0) + (byKind.streak_reward || 0) + (byKind.manual || 0);

    return {
      byKind,
      monthTaxTotal,
      monthTaxCount: monthTax.length,
      allTaxTotal,
      allTaxCount: allTax.length,
      taxByCategorySorted,
      streakRewardTotal,
      maxTax: maxTax as FundRecord | null,
      positiveTotal,
    };
  }, [fundRecords, currentMonth]);

  if (!settings || !stats) return null;

  // 連擊里程碑
  const currentStreak = settings.current_streak || 0;
  const longestStreak = settings.longest_streak || 0;
  const totalPerfectDays = settings.total_perfect_days || 0;
  const nextMilestone = (Math.floor(currentStreak / 7) + 1) * 7;
  const daysToMilestone = nextMilestone - currentStreak;

  // 撲滿構成百分比
  const piggyPct = (v: number) => (fundStats.positiveTotal > 0 ? (v / fundStats.positiveTotal) * 100 : 0);

  // samePeriodDelta 的顯示樣式
  const isSaving = stats.samePeriodDelta < 0; // 正在省 = 負的 delta

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

        {/* Hero: Remaining Money */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-[2rem] p-6 shadow-xl border flex flex-col items-center justify-center text-center backdrop-blur-xl",
            stats.remainingMoney > 0
              ? "bg-white/60 border-white/60 shadow-emerald-900/5 text-emerald-900"
              : "bg-white/60 border-white/60 shadow-red-900/5 text-red-900"
          )}
        >
          <span className="text-xs font-black uppercase tracking-widest mb-1 opacity-60">本月剩餘可用資金</span>
          <span className={cn(
            "text-6xl font-black tracking-tighter",
            stats.remainingMoney > 0 ? "text-emerald-500 bg-clip-text text-transparent bg-gradient-to-br from-emerald-400 to-emerald-600" : "text-rose-500 bg-clip-text text-transparent bg-gradient-to-br from-rose-400 to-rose-600"
          )}>
            ${stats.remainingMoney}
          </span>
          <div className="w-full bg-slate-200/50 h-2 rounded-full mt-6 flex overflow-hidden">
            <div className={cn("rounded-full transition-all duration-1000", stats.remainingMoney > 0 ? "bg-emerald-500" : "bg-rose-500")} style={{ width: `${stats.spentPercent}%` }} />
          </div>
          <span className="text-[10px] mt-2 font-bold opacity-60">
            已消耗分配預算的 {Math.floor(stats.spentPercent)}%
          </span>
        </motion.div>

        {/* Forecast 6-tile grid */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-4"
        >
          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/60">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">今日建議配額</span>
            <span className="text-2xl font-black text-slate-800">{C}{Math.floor(state.todayAllowance)}</span>
          </div>
          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/60">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">月均日消耗</span>
            <span className="text-2xl font-black text-blue-600">{C}{stats.avgDailySpent}</span>
          </div>
          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/60">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">預估月底結餘</span>
            <span className={cn("text-2xl font-black", stats.projectedBalance > 0 ? "text-emerald-500" : "text-rose-500")}>
              ${stats.projectedBalance}
            </span>
          </div>
          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/60">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">本月剩餘天數</span>
            <span className="text-2xl font-black text-slate-800">{stats.remainingDays} <span className="text-sm">Days</span></span>
          </div>
          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/60">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 flex items-center gap-1">
              <Flame size={10} className="text-orange-400" /> 燃料剩餘天數
            </span>
            <span className={cn(
              "text-2xl font-black",
              !Number.isFinite(stats.fuelDays) ? "text-slate-400" :
              stats.fuelDays >= stats.remainingDays ? "text-emerald-500" :
              stats.fuelDays >= stats.remainingDays * 0.7 ? "text-amber-500" : "text-rose-500"
            )}>
              {!Number.isFinite(stats.fuelDays) ? '∞' : stats.fuelDays} <span className="text-sm">Days</span>
            </span>
          </div>
          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/60">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 flex items-center gap-1">
              {stats.monthNetPL >= 0 ? <TrendingUp size={10} className="text-emerald-500" /> : <TrendingDown size={10} className="text-rose-500" />} 本月淨損益
            </span>
            <span className={cn("text-2xl font-black", stats.monthNetPL >= 0 ? "text-emerald-500" : "text-rose-500")}>
              {stats.monthNetPL >= 0 ? '+' : ''}${stats.monthNetPL}
            </span>
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
            <span className="text-sm font-bold text-slate-500">💰 每月生活費基準</span>
            <span className="text-base font-black text-slate-800">{C}{stats.totalBudget}</span>
          </div>

          {stats.monthIncome > 0 && (
            <div className="flex justify-between items-center text-emerald-600 bg-emerald-50 p-2 -mx-2 rounded-xl">
              <span className="text-sm font-bold flex items-center gap-1">💹 本月收入補血</span>
              <span className="text-base font-black">+${stats.monthIncome}</span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-slate-500">🔒 固定開銷預扣</span>
            <span className="text-base font-black text-slate-400">-${stats.fixed}</span>
          </div>

          {stats.emergencySpent > 0 && (
            <div className="flex justify-between items-center text-red-500 bg-red-50 p-2 -mx-2 rounded-xl">
              <span className="text-sm font-bold flex items-center gap-1">
                <AlertTriangle size={14} /> 突發避險 ({stats.emergencyCount} 筆)
              </span>
              <span className="text-base font-black">-${stats.emergencySpent}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t border-slate-100 border-dashed">
            <span className="text-sm font-black text-slate-800">淨餘可用額度 (分攤基準)</span>
            <span className="text-base font-black text-slate-800">{C}{stats.netBudget}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-slate-500">🛒 本月日常已花費</span>
            <span className="text-base font-black text-blue-500">-${stats.normalSpent}</span>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100 border-dashed">
            <span className="text-sm font-black text-slate-800">本月淨損益</span>
            <span className={cn("text-lg font-black", stats.monthNetPL >= 0 ? "text-emerald-500" : "text-rose-500")}>
              {stats.monthNetPL >= 0 ? '+' : ''}${stats.monthNetPL}
            </span>
          </div>
        </motion.div>

        {/* Section: vs 上月同期對照 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.17 }}
          className="bg-white/80 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 border border-slate-100 space-y-4 backdrop-blur-xl"
        >
          <h3 className="text-sm font-black text-slate-800 tracking-wide border-b border-slate-100 pb-3 flex items-center gap-2">
            📊 同期對照（vs 上月同日為止）
          </h3>

          {stats.prevMonthNormalTillSameDay > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">本月至今</span>
                  <span className="text-xl font-black text-slate-800">{C}{stats.normalSpent}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">上月同期</span>
                  <span className="text-xl font-black text-slate-400">{C}{stats.prevMonthNormalTillSameDay}</span>
                </div>
              </div>

              <div className={cn(
                "p-3 rounded-2xl flex items-center justify-between",
                isSaving ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
              )}>
                <span className="text-xs font-black flex items-center gap-1">
                  {isSaving ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                  {isSaving ? '比上月省' : '比上月兇'}
                </span>
                <span className="text-lg font-black">
                  {isSaving ? '' : '+'}${stats.samePeriodDelta}
                  <span className="text-xs ml-1 opacity-70">({stats.samePeriodDeltaPct >= 0 ? '+' : ''}{stats.samePeriodDeltaPct.toFixed(0)}%)</span>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100 border-dashed">
                <div className="text-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">上月總支出</span>
                  <span className="text-sm font-black text-slate-700">{C}{stats.prevMonthNormalFull}</span>
                </div>
                <div className="text-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">上月收入</span>
                  <span className="text-sm font-black text-emerald-600">{C}{stats.prevMonthIncomeFull}</span>
                </div>
                <div className="text-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">上月避險</span>
                  <span className="text-sm font-black text-rose-500">{C}{stats.prevMonthEmergencyFull}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-4 text-sm font-bold text-slate-400">
              上個月沒有紀錄，無法對照
            </div>
          )}
        </motion.div>

        {/* Section: 奧侈稅紀錄 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.19 }}
          className="bg-white/80 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 border border-slate-100 space-y-4 backdrop-blur-xl"
        >
          <h3 className="text-sm font-black text-slate-800 tracking-wide border-b border-slate-100 pb-3 flex items-center gap-2">
            💸 奧侈稅紀錄
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-amber-50 p-4 rounded-2xl">
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-1">本月被稅</span>
              <span className="text-2xl font-black text-amber-700">{C}{fundStats.monthTaxTotal}</span>
              <span className="text-[10px] font-bold text-amber-500 block mt-0.5">{fundStats.monthTaxCount} 次手滑</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">歷史累計</span>
              <span className="text-2xl font-black text-slate-700">{C}{fundStats.allTaxTotal}</span>
              <span className="text-[10px] font-bold text-slate-400 block mt-0.5">{fundStats.allTaxCount} 次總和</span>
            </div>
          </div>

          {fundStats.maxTax && (
            <div className="bg-rose-50 p-3 rounded-2xl flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block">最肥一筆稅</span>
                <span className="text-xs font-bold text-rose-700 truncate block mt-0.5">{fundStats.maxTax.source_category || '未知'} · {(fundStats.maxTax.created_at || '').substring(0, 10)}</span>
              </div>
              <span className="text-lg font-black text-rose-600 ml-2">{C}{fundStats.maxTax.amount}</span>
            </div>
          )}

          {fundStats.taxByCategorySorted.length > 0 ? (
            <div className="space-y-2 pt-2 border-t border-slate-100 border-dashed">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">本月類別貢獻榜</h4>
              {fundStats.taxByCategorySorted.map(([cat, amount]) => {
                const pct = fundStats.monthTaxTotal > 0 ? (amount / fundStats.monthTaxTotal) * 100 : 0;
                const colorClass = EXPENSE_CATEGORY_COLORS[cat] || 'bg-slate-400';
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-24 shrink-0">
                      <div className={cn("w-2.5 h-2.5 rounded-full", colorClass)} />
                      <span className="text-[11px] font-bold text-slate-600 truncate">{cat}</span>
                    </div>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        className={cn("h-full", colorClass)}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-xs font-black text-slate-800 w-12 text-right">{C}{amount}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-3 text-xs font-bold text-slate-400">
              本月目前零稅收 — 繼續保持 ✨
            </div>
          )}
        </motion.div>

        {/* Section: 撲滿金流構成 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.21 }}
          className="bg-white/80 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 border border-slate-100 space-y-4 backdrop-blur-xl"
        >
          <h3 className="text-sm font-black text-slate-800 tracking-wide border-b border-slate-100 pb-3 flex items-center gap-2">
            <PiggyBank size={14} /> 撲滿金流構成
          </h3>

          {fundStats.positiveTotal > 0 ? (
            <>
              {/* 堆疊條 */}
              <div className="w-full h-4 bg-slate-100 rounded-full flex overflow-hidden shadow-inner">
                <motion.div className="bg-emerald-500 h-full" initial={{ width: 0 }} animate={{ width: `${piggyPct(fundStats.byKind.surplus || 0)}%` }} transition={{ duration: 0.8 }} />
                <motion.div className="bg-amber-500 h-full" initial={{ width: 0 }} animate={{ width: `${piggyPct(fundStats.byKind.tax || 0)}%` }} transition={{ duration: 0.8, delay: 0.1 }} />
                <motion.div className="bg-blue-500 h-full" initial={{ width: 0 }} animate={{ width: `${piggyPct(fundStats.byKind.streak_reward || 0)}%` }} transition={{ duration: 0.8, delay: 0.2 }} />
                <motion.div className="bg-slate-400 h-full" initial={{ width: 0 }} animate={{ width: `${piggyPct(fundStats.byKind.manual || 0)}%` }} transition={{ duration: 0.8, delay: 0.3 }} />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-xl">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-600 truncate">節餘存入</span>
                  </div>
                  <span className="text-xs font-black text-emerald-700">{C}{fundStats.byKind.surplus || 0}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-amber-50 rounded-xl">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-600 truncate">奧侈稅</span>
                  </div>
                  <span className="text-xs font-black text-amber-700">{C}{fundStats.byKind.tax || 0}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded-xl">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-600 truncate">連擊獎勵</span>
                  </div>
                  <span className="text-xs font-black text-blue-700">{C}{fundStats.byKind.streak_reward || 0}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-600 truncate">其他</span>
                  </div>
                  <span className="text-xs font-black text-slate-700">{C}{fundStats.byKind.manual || 0}</span>
                </div>
              </div>

              {(fundStats.byKind.penalty || 0) < 0 && (
                <div className="flex items-center justify-between p-2 bg-rose-50 rounded-xl mt-2">
                  <span className="text-[11px] font-black text-rose-500 uppercase tracking-widest">☠️ 爆預算罰金</span>
                  <span className="text-xs font-black text-rose-600">{C}{fundStats.byKind.penalty || 0}</span>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 text-xs font-bold text-slate-400">
              撲滿還沒收到任何金流
            </div>
          )}
        </motion.div>

        {/* Section: 本月收入摘要 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.23 }}
          className="bg-white/80 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 border border-slate-100 space-y-4 backdrop-blur-xl"
        >
          <h3 className="text-sm font-black text-slate-800 tracking-wide border-b border-slate-100 pb-3 flex items-center gap-2">
            💹 本月收入摘要
          </h3>

          {stats.monthIncome > 0 ? (
            <>
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">本月收入總額</span>
                <span className="text-3xl font-black text-emerald-600">+${stats.monthIncome}</span>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 border-dashed">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">來源分布</h4>
                {stats.incomeByCatSorted.map(([cat, amount]) => {
                  const pct = stats.monthIncome > 0 ? (amount / stats.monthIncome) * 100 : 0;
                  const colorClass = INCOME_CATEGORY_COLORS[cat] || 'bg-slate-400';
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-24 shrink-0">
                        <div className={cn("w-2.5 h-2.5 rounded-full", colorClass)} />
                        <span className="text-[11px] font-bold text-slate-600 truncate">{cat}</span>
                      </div>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          className={cn("h-full", colorClass)}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="text-xs font-black text-slate-800 w-12 text-right">{C}{amount}</span>
                    </div>
                  );
                })}
              </div>

              {stats.latestIncome && (
                <div className="bg-emerald-50 p-3 rounded-2xl flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block">最近一筆補血</span>
                    <span className="text-xs font-bold text-emerald-700 truncate block mt-0.5">
                      {stats.latestIncome.category} · {stats.latestIncome.item || '未命名'}
                    </span>
                  </div>
                  <span className="text-lg font-black text-emerald-600 ml-2">+${stats.latestIncome.amount}</span>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 text-sm font-bold text-slate-400">
              本月尚未進帳 — 等待下一輪補給
            </div>
          )}
        </motion.div>

        {/* Section: 成就 & 連擊 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white/80 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 border border-slate-100 space-y-4 backdrop-blur-xl"
        >
          <h3 className="text-sm font-black text-slate-800 tracking-wide border-b border-slate-100 pb-3 flex items-center gap-2">
            <Trophy size={14} className="text-amber-500" /> 成就 & 連擊
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-amber-50 p-4 rounded-2xl">
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-1 flex items-center gap-1">
                <Flame size={10} /> 目前連擊
              </span>
              <span className="text-2xl font-black text-amber-600">{currentStreak}<span className="text-sm ml-1">Days</span></span>
            </div>
            <div className="bg-purple-50 p-4 rounded-2xl">
              <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest block mb-1">歷史最長</span>
              <span className="text-2xl font-black text-purple-600">{longestStreak}<span className="text-sm ml-1">Days</span></span>
            </div>
            <div className="bg-emerald-50 p-4 rounded-2xl">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1 flex items-center gap-1">
                <Sparkles size={10} /> 累計完美日
              </span>
              <span className="text-2xl font-black text-emerald-600">{totalPerfectDays}<span className="text-sm ml-1">Days</span></span>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">連擊獎金累計</span>
              <span className="text-2xl font-black text-blue-600">{C}{fundStats.streakRewardTotal}</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Target size={12} /> 下個里程碑 ({nextMilestone} 天)
            </span>
            <span className="text-sm font-black text-slate-800">還差 {daysToMilestone} 天</span>
          </div>
        </motion.div>

        {/* Section: 風險指標 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.27 }}
          className="bg-white/80 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 border border-slate-100 space-y-4 backdrop-blur-xl"
        >
          <h3 className="text-sm font-black text-slate-800 tracking-wide border-b border-slate-100 pb-3 flex items-center gap-2">
            <Gauge size={14} className="text-rose-400" /> 風險指標
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-rose-50/60 rounded-2xl">
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block">本月突發避險</span>
                <span className="text-[10px] font-bold text-slate-500">共 {stats.emergencyCount} 次</span>
              </div>
              <span className="text-lg font-black text-rose-600">{C}{stats.emergencySpent}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-amber-50/60 rounded-2xl">
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block flex items-center gap-1">
                  <Zap size={10} /> 衝動消費率
                </span>
                <span className="text-[10px] font-bold text-slate-500">快樂水 + 娛樂社交 佔比</span>
              </div>
              <span className={cn(
                "text-lg font-black",
                stats.impulseRate > 40 ? "text-rose-600" :
                stats.impulseRate > 20 ? "text-amber-600" : "text-emerald-600"
              )}>
                {stats.impulseRate.toFixed(0)}%
              </span>
            </div>

            {stats.first3 > 0 && stats.endOfMonthSpikeRatio > 1 && (
              <div className="flex items-center justify-between p-3 bg-purple-50/60 rounded-2xl">
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest block">末日爆買指數</span>
                  <span className="text-[10px] font-bold text-slate-500">最近 3 天 vs 月初 3 天</span>
                </div>
                <span className={cn(
                  "text-lg font-black",
                  stats.endOfMonthSpikeRatio > 2 ? "text-rose-600" :
                  stats.endOfMonthSpikeRatio > 1.5 ? "text-amber-600" : "text-slate-600"
                )}>
                  {stats.endOfMonthSpikeRatio.toFixed(1)}×
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Section: Spending Profile */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.29 }}
          className="bg-white/80 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 border border-slate-100 space-y-4 backdrop-blur-xl"
        >
          <h3 className="text-sm font-black text-slate-800 tracking-wide border-b border-slate-100 pb-3">近期消費輪廓</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">本月總筆數</span>
              <div className="text-xl font-black text-slate-800">
                {stats.txCount} <span className="text-sm text-slate-400">筆</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">最大資金缺口</span>
              <div className="text-sm font-black text-rose-600 leading-tight">
                {stats.topCategory}
                {stats.topCategoryAmount > 0 && <span className="block text-rose-400 opacity-80">{C}{stats.topCategoryAmount}</span>}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section: Edit Settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.31 }}
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
          transition={{ delay: 0.33 }}
          className="bg-white/60 text-slate-800 backdrop-blur-md border border-white/60 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 space-y-4"
        >
          <h3 className="text-sm font-black text-slate-800 tracking-wide">系統狀態參數</h3>

          <div className="bg-white/50 p-4 border border-white/60 rounded-2xl flex flex-col gap-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">懲罰分類名單</span>
            <div className="text-sm font-black text-rose-500 mt-1 line-clamp-2 leading-tight">
              {settings.taxed_categories && settings.taxed_categories.length > 0 ? settings.taxed_categories.join(', ') : '無異常狀態'}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
