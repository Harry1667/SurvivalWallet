import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Plus, Moon, Sun } from 'lucide-react';
import type { UserSettings, FixedExpense } from '../types';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  settings: UserSettings;
  onClose: () => void;
  onSave: (settings: UserSettings) => Promise<void>;
  isDarkMode: boolean;
  onToggleDark: () => void;
  onReset: () => void;
}

export const SettingsModal = ({ settings, onClose, onSave, isDarkMode, onToggleDark, onReset }: Props) => {
  const [income, setIncome] = useState(String(settings.monthly_income || ''));
  const [fixed, setFixed] = useState<FixedExpense[]>(settings.fixed_expenses.length ? settings.fixed_expenses : []);
  const [currency, setCurrency] = useState(settings.currency_symbol || '$');
  const [categories, setCategories] = useState<string[]>(settings.categories);
  const [newCat, setNewCat] = useState('');

  const updateFixed = (i: number, patch: Partial<FixedExpense>) => setFixed(p => p.map((f, idx) => idx === i ? { ...f, ...patch } : f));
  const addFixed = () => setFixed(p => [...p, { name: '', amount: 0 }]);
  const removeFixed = (i: number) => setFixed(p => p.filter((_, idx) => idx !== i));

  const addCat = () => {
    const c = newCat.trim();
    if (c && !categories.includes(c)) setCategories(p => [...p, c]);
    setNewCat('');
  };
  const removeCat = (c: string) => setCategories(p => p.filter(x => x !== c));

  const handleSave = async () => {
    await onSave({
      monthly_income: Number(income) || 0,
      fixed_expenses: fixed.filter(f => f.name.trim() && Number(f.amount) > 0).map(f => ({ name: f.name.trim(), amount: Number(f.amount) })),
      currency_symbol: currency.trim() || '$',
      categories: categories.length ? categories : settings.categories,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center p-4 sm:p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full max-w-md bg-white dark:bg-[#1e293b] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)]"
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-[#334155]">
          <h2 className="font-black text-lg text-slate-800 dark:text-white">設定</h2>
          <button aria-label="關閉" onClick={onClose} className="p-2 bg-slate-100 dark:bg-[#0f172a] rounded-full text-slate-400"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-7 pb-8 overflow-y-auto">
          {/* Income */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">月收入</label>
            <div className="flex items-baseline gap-2 border-b-2 border-slate-100 focus-within:border-slate-900">
              <span className="text-xl font-black text-slate-300">{currency}</span>
              <input type="number" inputMode="numeric" value={income} onChange={e => setIncome(e.target.value)}
                className="w-full text-2xl font-black text-slate-900 dark:text-white outline-none p-1 bg-transparent" />
            </div>
          </div>

          {/* Fixed expenses */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">每月固定支出</label>
              <button type="button" onClick={addFixed} className="flex items-center gap-1 text-[11px] font-black text-slate-500 hover:text-slate-900"><Plus size={13} strokeWidth={3} /> 新增</button>
            </div>
            {fixed.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="text" value={f.name} onChange={e => updateFixed(i, { name: e.target.value })}
                  className="flex-1 py-2 px-3 text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-[#0f172a] rounded-xl outline-none" placeholder="項目" />
                <input type="number" inputMode="numeric" value={f.amount || ''} onChange={e => updateFixed(i, { amount: Number(e.target.value) })}
                  className="w-24 py-2 px-3 text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-[#0f172a] rounded-xl outline-none" placeholder="金額" />
                <button type="button" onClick={() => removeFixed(i)} className="p-2 text-slate-300 hover:text-red-500" aria-label="移除"><X size={16} /></button>
              </div>
            ))}
          </div>

          {/* Categories */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">支出分類</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <span key={c} className="flex items-center gap-1 bg-slate-100 dark:bg-[#0f172a] text-slate-700 dark:text-slate-200 text-sm font-bold px-3 py-1.5 rounded-full">
                  {c}
                  <button onClick={() => removeCat(c)} className="text-slate-400 hover:text-red-500" aria-label={`移除 ${c}`}><X size={13} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addCat(); }}
                className="flex-1 py-2 px-3 text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-[#0f172a] rounded-xl outline-none" placeholder="新增分類" />
              <button onClick={addCat} className="px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-sm">加入</button>
            </div>
          </div>

          {/* Currency + dark mode */}
          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">幣別符號</label>
              <input type="text" value={currency} onChange={e => setCurrency(e.target.value)} maxLength={3}
                className="w-full py-2 px-3 text-lg font-black text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-[#0f172a] rounded-xl outline-none" />
            </div>
            <button onClick={onToggleDark}
              className="self-end flex items-center gap-2 py-2.5 px-4 rounded-xl bg-slate-50 dark:bg-[#0f172a] font-bold text-sm text-slate-700 dark:text-slate-200">
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
              {isDarkMode ? '淺色' : '深色'}
            </button>
          </div>

          <button onClick={handleSave}
            className="w-full py-4 rounded-2xl font-black text-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 active:scale-95 transition-all">儲存設定</button>

          <button onClick={() => { if (confirm('確定清空所有資料並重置？此動作無法復原。')) onReset(); }}
            className={cn('w-full py-3 rounded-2xl font-bold text-sm text-red-500 bg-red-50 dark:bg-red-950/40 active:scale-95 transition-all')}>
            清空所有資料並重置
          </button>
        </div>
      </motion.div>
    </div>
  );
};
