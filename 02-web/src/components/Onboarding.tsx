import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Wallet, Plus, X, ArrowRight } from 'lucide-react';
import type { UserSettings, FixedExpense } from '../types';
import { DEFAULT_CATEGORIES } from '../types';

interface Props {
  onComplete: (settings: UserSettings) => void;
}

export const Onboarding = ({ onComplete }: Props) => {
  const [income, setIncome] = useState('');
  const [fixed, setFixed] = useState<FixedExpense[]>([
    { name: '健身房', amount: 0 },
    { name: '水電', amount: 0 },
  ]);

  const updateFixed = (i: number, patch: Partial<FixedExpense>) => {
    setFixed(prev => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  };
  const addFixed = () => setFixed(prev => [...prev, { name: '', amount: 0 }]);
  const removeFixed = (i: number) => setFixed(prev => prev.filter((_, idx) => idx !== i));

  const fixedTotal = fixed.reduce((a, f) => a + (Number(f.amount) || 0), 0);
  const incomeNum = Number(income) || 0;
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dailyPreview = Math.max(0, Math.floor((incomeNum - fixedTotal) / daysInMonth));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (incomeNum <= 0) { alert('請輸入月收入'); return; }
    onComplete({
      monthly_income: incomeNum,
      fixed_expenses: fixed.filter(f => f.name.trim() && Number(f.amount) > 0).map(f => ({ name: f.name.trim(), amount: Number(f.amount) })),
      currency_symbol: '$',
      categories: DEFAULT_CATEGORIES,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-[#0f172a]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-[#1e293b] rounded-[2.5rem] p-9 shadow-2xl space-y-8 border border-slate-100 dark:border-[#334155]"
      >
        <div className="text-center space-y-3">
          <div className="mx-auto w-20 h-20 bg-slate-900 dark:bg-white rounded-[2rem] flex items-center justify-center text-white dark:text-slate-900 shadow-xl">
            <Wallet size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">每日記帳</h1>
          <p className="text-slate-500 font-bold text-sm">設定月收入與固定支出，算出每天能花多少</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-7">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">這個月的收入</label>
            <div className="flex items-baseline gap-2 border-b-2 border-slate-100 focus-within:border-slate-900 transition-colors">
              <span className="text-2xl font-black text-slate-300">$</span>
              <input
                type="number" inputMode="numeric" autoFocus required
                value={income} onChange={e => setIncome(e.target.value)}
                className="w-full text-3xl font-black text-slate-900 dark:text-white outline-none p-1 bg-transparent placeholder:text-slate-200"
                placeholder="12000"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">每月固定支出</label>
              <button type="button" onClick={addFixed} className="flex items-center gap-1 text-[11px] font-black text-slate-500 hover:text-slate-900">
                <Plus size={13} strokeWidth={3} /> 新增
              </button>
            </div>
            <div className="space-y-2">
              {fixed.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text" value={f.name} onChange={e => updateFixed(i, { name: e.target.value })}
                    className="flex-1 py-2 px-3 text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-[#0f172a] rounded-xl outline-none"
                    placeholder="項目，如 健身房"
                  />
                  <input
                    type="number" inputMode="numeric" value={f.amount || ''} onChange={e => updateFixed(i, { amount: Number(e.target.value) })}
                    className="w-24 py-2 px-3 text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-[#0f172a] rounded-xl outline-none"
                    placeholder="金額"
                  />
                  <button type="button" onClick={() => removeFixed(i)} className="p-2 text-slate-300 hover:text-red-500" aria-label="移除">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-[#0f172a] rounded-2xl p-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">每日可花</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white">${dailyPreview}</p>
            <p className="text-[11px] font-bold text-slate-400 mt-1">
              ({incomeNum} − {fixedTotal}) ÷ {daysInMonth} 天
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black text-xl shadow-xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all"
          >
            開始記帳 <ArrowRight size={24} />
          </button>
        </form>
      </motion.div>
    </div>
  );
};
