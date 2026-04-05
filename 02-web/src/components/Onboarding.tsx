import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Wallet, PiggyBank, Target, Calendar, ArrowRight } from 'lucide-react';
import type { UserSettings } from '../types';

interface Props {
  onComplete: (settings: UserSettings) => void;
}

export const Onboarding = ({ onComplete }: Props) => {
  const [formData, setFormData] = useState({
    total_budget: '',
    fixed_expenses: '',
    piggy_bank_name: '東京機票',
    piggy_bank_goal: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const total = Number(formData.total_budget);
    const fixed = Number(formData.fixed_expenses);
    const goal = Number(formData.piggy_bank_goal);

    if (total <= 0 || fixed < 0 || !formData.piggy_bank_name || goal <= 0) {
      alert('請填寫完整資訊');
      return;
    }

    const net = total - fixed;
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const elapsedDays = now.getDate() - 1;
    const remainingDays = Math.max(1, daysInMonth - elapsedDays);
    const dailyBase = Math.max(0, net / remainingDays);

    const settings: UserSettings = {
      total_budget: total,
      fixed_expenses: fixed,
      daily_base_budget: Math.floor(dailyBase),
      piggy_bank_name: formData.piggy_bank_name,
      piggy_bank_goal: goal,
      piggy_bank_saved: 0,
      current_streak: 0,
      last_login_date: new Date().toISOString().split('T')[0],
      taxed_categories: []
    };

    console.log('🏁 啟動生存計畫:', settings);
    onComplete(settings);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl space-y-10 border border-slate-100"
      >
        <div className="text-center space-y-3">
          <div className="mx-auto w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-slate-200">
            <Wallet size={40} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">生存錢包</h1>
          <p className="text-slate-500 font-bold">設定你的生存規則與夢想</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-6">
            <div className="space-y-2 group">
              <div className="flex items-center gap-2 text-slate-400 group-focus-within:text-slate-900 transition-colors">
                <Wallet size={16} />
                <label className="text-[10px] font-black uppercase tracking-widest">每月總生活費 (Total Budget)</label>
              </div>
              <input 
                type="number"
                inputMode="numeric"
                required
                value={formData.total_budget}
                onChange={e => setFormData({...formData, total_budget: e.target.value})}
                className="w-full text-2xl font-black text-slate-900 border-b-2 border-slate-100 focus:border-slate-900 outline-none p-2 bg-transparent transition-all placeholder:text-slate-100"
                placeholder="例如: 15000"
              />
            </div>

            <div className="space-y-2 group">
              <div className="flex items-center gap-2 text-slate-400 group-focus-within:text-slate-900 transition-colors">
                <Calendar size={16} />
                <label className="text-[10px] font-black uppercase tracking-widest">每月固定支出 (Fixed Expenses)</label>
              </div>
              <input 
                type="number"
                inputMode="numeric"
                required
                value={formData.fixed_expenses}
                onChange={e => setFormData({...formData, fixed_expenses: e.target.value})}
                className="w-full text-2xl font-black text-slate-900 border-b-2 border-slate-100 focus:border-slate-900 outline-none p-2 bg-transparent transition-all placeholder:text-slate-100"
                placeholder="例如: 5000"
              />
            </div>

            <div className="h-0.5 bg-slate-50 rounded-full" />

            <div className="space-y-2 group">
              <div className="flex items-center gap-2 text-slate-400 group-focus-within:text-slate-900 transition-colors">
                <Target size={16} />
                <label className="text-[10px] font-black uppercase tracking-widest">夢想撲滿名稱 (Goal Name)</label>
              </div>
              <input 
                type="text"
                required
                value={formData.piggy_bank_name}
                onChange={e => setFormData({...formData, piggy_bank_name: e.target.value})}
                className="w-full text-2xl font-black text-slate-900 border-b-2 border-slate-100 focus:border-slate-900 outline-none p-2 bg-transparent transition-all placeholder:text-slate-100"
                placeholder="例如: 東京機票"
              />
            </div>

            <div className="space-y-2 group">
              <div className="flex items-center gap-2 text-slate-400 group-focus-within:text-slate-900 transition-colors">
                <PiggyBank size={16} />
                <label className="text-[10px] font-black uppercase tracking-widest">撲滿目標金額 (Goal Amount)</label>
              </div>
              <input 
                type="number"
                inputMode="numeric"
                required
                value={formData.piggy_bank_goal}
                onChange={e => setFormData({...formData, piggy_bank_goal: e.target.value})}
                className="w-full text-2xl font-black text-slate-900 border-b-2 border-slate-100 focus:border-slate-900 outline-none p-2 bg-transparent transition-all placeholder:text-slate-100"
                placeholder="例如: 20000"
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-2xl shadow-xl shadow-slate-200 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all"
          >
            開始生存 <ArrowRight size={24} />
          </button>
        </form>
      </motion.div>
    </div>
  );
};
