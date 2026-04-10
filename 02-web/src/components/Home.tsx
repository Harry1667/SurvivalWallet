import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence, useSpring, useTransform, useMotionValue } from 'motion/react';
import { Calendar, Plus, AlertCircle, Coffee, ShieldAlert, Settings as SettingsIcon, MoreHorizontal } from 'lucide-react';
import type { AppState, Category, Transaction } from '../types';
import { deleteTransaction, updateTransaction } from '../lib/db';
import { EditTransactionModal } from './EditTransactionModal';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CATEGORIES: { name: Category; color: string }[] = [
  { name: '生存正餐', color: 'bg-emerald-500' },
  { name: '快樂水/零食', color: 'bg-amber-500' },
  { name: '生活日用', color: 'bg-blue-500' },
  { name: '交通通勤', color: 'bg-indigo-500' },
  { name: '娛樂社交', color: 'bg-purple-500' },
  { name: '自我投資', color: 'bg-rose-500' },
  { name: '其他雜項', color: 'bg-slate-500' },
];

const TITLES = [
  { min: 0, name: '守財新手', icon: '🥉' },
  { min: 7, name: '節流達人', icon: '🥈' },
  { min: 21, name: '生存大師', icon: '🥇' },
];

const Toast = ({ children, colorClass }: { children: React.ReactNode, colorClass: string }) => {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;
  return (
    <motion.div 
      initial={{ opacity: 0, y: -50, scale: 0.9 }} 
      animate={{ opacity: 1, y: 0, scale: 1 }} 
      exit={{ opacity: 0, scale: 0.9 }} 
      className={cn("backdrop-blur-xl p-4 rounded-2xl flex items-center gap-4 shadow-2xl pointer-events-auto", colorClass)}
    >
      {children}
    </motion.div>
  );
};

// 計數器滾動動畫元件
const AnimatedNumber = ({ value, className }: { value: number; className?: string }) => {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) => `$${Math.floor(v)}`);

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  return <motion.span className={className}>{display}</motion.span>;
};

interface Props {
  state: AppState;
  onOpenRecord: () => void;
  onOpenSettings: () => void;
  onRefresh: () => void;
}

export const Home = ({ state, onOpenRecord, onOpenSettings, onRefresh }: Props) => {
  const { settings, transactions, todayAllowance, currentDailyBalance } = state;
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  if (!settings) return null;

  const title = useMemo(() => {
    return [...TITLES].reverse().find(t => settings.current_streak >= t.min) || TITLES[0];
  }, [settings.current_streak]);

  const percentRemaining = currentDailyBalance / (todayAllowance || 1);
  const status = percentRemaining <= 0 ? 'danger' : percentRemaining < 0.3 ? 'warning' : 'safe';

  // Bankruptcy Risk Calc
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const remainingDays = daysInMonth - new Date().getDate() + 1;
  const recentDays = 7;
  const last7DaysStart = new Date();
  last7DaysStart.setDate(last7DaysStart.getDate() - recentDays);
  
  const recentNormalSpend = transactions
    .filter(t => !t.is_emergency && new Date(t.created_at) >= last7DaysStart)
    .reduce((acc, t) => acc + t.amount, 0);
  
  const totalRemainingInSettings = settings.total_budget - settings.fixed_expenses - transactions.filter(t => !t.is_emergency).reduce((acc, t) => acc + t.amount, 0);
  
  let isBankruptcyRisk = false;
  if (recentNormalSpend > 0) {
    const avgDailySpend = recentNormalSpend / recentDays;
    const daysUntilZero = totalRemainingInSettings / avgDailySpend;
    // Warn if they will hit zero before the month ends, assuming they still have money now.
    isBankruptcyRisk = daysUntilZero < remainingDays && totalRemainingInSettings > 0;
  }

  // Latte factor (快樂水)
  const coffeeSpend = transactions
    .filter(t => t.category === '快樂水/零食' && new Date(t.created_at) >= last7DaysStart)
    .reduce((acc, t) => acc + t.amount, 0);

  // Category distribution for today
  const todayTransactions = transactions.filter(t => {
    const today = new Date().toISOString().split('T')[0];
    return t.created_at.split('T')[0] === today;
  });

  const categoryShares = CATEGORIES.map(cat => ({
    ...cat,
    amount: todayTransactions.filter(t => t.category === cat.name && !t.is_emergency).reduce((acc, t) => acc + t.amount, 0)
  }));

  return (
    <div className={cn(
      "flex-1 flex flex-col p-6 safe-area-inset-top transition-colors duration-700 relative",
      status === 'safe' ? 'safe-bg' : status === 'warning' ? 'warning-bg' : 'danger-bg'
    )}>
      
      {/* Floating Toasts (Top fixed) */}
      <div className="fixed top-6 left-6 right-6 z-50 space-y-3 pointer-events-none">
        <AnimatePresence>
          {isBankruptcyRisk && (
            <Toast key="bankruptcy" colorClass="bg-red-500/95 border border-red-400 text-white text-on-accent shadow-red-900/20">
              <div className="p-2 bg-white/20 rounded-xl shadow-sm">
                <AlertCircle size={20} />
              </div>
              <p className="text-sm font-black tracking-wide">破產預警：按花費速度，本月將提前透支！</p>
            </Toast>
          )}
          {coffeeSpend > 500 && (
            <Toast key="coffee" colorClass="bg-orange-500/95 border border-orange-400 text-white text-on-accent shadow-orange-900/20">
              <div className="p-2 bg-white/20 rounded-xl shadow-sm">
                <Coffee size={20} />
              </div>
              <p className="text-sm font-black tracking-wide">漏財雷達：本週快樂水已花費 ${coffeeSpend}！</p>
            </Toast>
          )}
          {settings.taxed_categories.length > 0 && (
            <Toast key="tax" colorClass="bg-slate-800/95 border border-slate-700 text-white shadow-slate-900/40">
               <div className="p-2 bg-white/20 rounded-xl shadow-sm">
                <ShieldAlert size={20} />
              </div>
              <p className="text-sm font-black tracking-wide">獻祭懲罰：昨日超支，部分分類徵收 20% 稅。</p>
            </Toast>
          )}
        </AnimatePresence>
      </div>

      {/* Header Bar */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex justify-between items-start pt-2"
      >
        <div className="flex flex-col gap-2">
          <span className="text-[11px] bg-white/80 dark:bg-[#1e293b]/80 backdrop-blur-md px-3 py-1.5 rounded-full font-black text-slate-800 shadow-lg shadow-black/5 border border-white/60 dark:border-[#334155] flex items-center gap-1.5 w-max">
            <span className="text-sm drop-shadow-sm">{title.icon}</span> {title.name}
          </span>
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1 bg-white/40 dark:bg-[#1e293b]/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/40 dark:border-[#334155] shadow-sm w-max">
            <Calendar size={13} strokeWidth={3} /> 本月還剩 {remainingDays} 天
          </span>
        </div>
        <button
          aria-label="開啟設定"
          onClick={onOpenSettings}
          className="p-3 bg-white/60 backdrop-blur-md rounded-2xl shadow-sm text-slate-600 hover:text-slate-800 border border-white/40 hover:scale-105 active:scale-95 transition-all"
        >
          <SettingsIcon size={20} />
        </button>
      </motion.header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center space-y-8 py-8 w-full max-w-sm mx-auto">
        <div className="text-center space-y-4 w-full">
          <p className="text-slate-600 font-black text-sm uppercase tracking-[0.25em] drop-shadow-sm">今日剩餘可用</p>
          <motion.h1
            key="hp-display"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            className={cn(
              "text-8xl font-black tracking-tighter drop-shadow-sm",
              status === 'danger' ? 'text-red-600 animate-shake' : 'text-slate-900'
            )}
          >
            <AnimatedNumber value={Math.floor(currentDailyBalance)} />
          </motion.h1>

          {/* Today's Expense Progress */}
          <div className="w-full h-3 bg-white/40 rounded-full overflow-hidden flex shadow-inner border border-white/50 backdrop-blur-md mt-8">
            {categoryShares.map(cat => (
              <motion.div 
                key={cat.name}
                initial={{ width: 0 }}
                animate={{ width: `${(cat.amount / todayAllowance) * 100}%` }}
                className={cn("h-full transition-all duration-1000 ease-out", cat.color)}
              />
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, type: 'spring', bounce: 0.4 }}
          className="w-full flex gap-4 mt-8"
        >
          <motion.button
            onClick={() => onOpenRecord()}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            className="flex-1 py-5 bg-slate-900/95 dark:bg-[#1e293b] backdrop-blur-xl text-white text-on-accent rounded-[2rem] font-black text-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] flex items-center justify-center gap-3 transition-all group border border-slate-700/50 dark:border-[#475569]"
          >
            <motion.div
              animate={{ rotate: [0, 90, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2 }}
              className="p-1.5 bg-white/20 rounded-xl"
            >
              <Plus size={20} strokeWidth={3} />
            </motion.div>
            記一筆
          </motion.button>
        </motion.div>
      </main>

      {/* Today's Transaction List */}
      {todayTransactions.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="bg-white/70 backdrop-blur-2xl rounded-[2.5rem] mx-0 mb-0 -mx-6 -mb-6 px-6 pt-6 pb-8 shadow-[0_-15px_30px_rgba(0,0,0,0.04)] border-t border-white/50 space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">今日花銷</p>
          <div className="space-y-2">
            {todayTransactions.slice(0, 4).map(t => (
              <HomeTransactionCard key={t.id} t={t} onRefresh={onRefresh} onEdit={() => setEditingTransaction(t)} />
            ))}
            {todayTransactions.length > 4 && (
              <p className="text-center text-[11px] font-bold text-slate-400 pt-2">還有 {todayTransactions.length - 4} 筆...</p>
            )}
          </div>
        </motion.section>
      )}

      <AnimatePresence>
        {editingTransaction && (
          <EditTransactionModal
            transaction={editingTransaction}
            onClose={() => setEditingTransaction(null)}
            onSave={(id, data) => {
              updateTransaction(id, data);
              onRefresh();
            }}
            onDelete={(id) => {
              deleteTransaction(id);
              onRefresh();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const HomeTransactionCard = ({ t, onRefresh, onEdit }: { t: Transaction; onRefresh: () => void; onEdit: () => void }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  
  const EMOJI: Record<string, string> = {
    '生存正餐': '🍚', '快樂水/零食': '🦹', '生活日用': '🛍️',
    '交通通勤': '😌', '娛樂社交': '🎮', '自我投資': '📚', '其他雜項': '📦',
    '基礎補給': '💰', '任務賞金': '⚔️', '天降寶箱': '🎁',
    '裝備變現': '♻️', '被動生息': '📈', '其他補血': '📦'
  };

  const handleDelete = () => {
    deleteTransaction(t.id);
    onRefresh();
  };

  return (
    <div className="flex justify-between items-center py-2 px-1 relative">
      <div className="flex items-center gap-3">
        <span className="text-xl">{EMOJI[t.category] || '📦'}</span>
        <div>
          <p className="font-black text-slate-800 text-sm leading-tight">{t.item || t.category}</p>
          <p className="text-[10px] font-bold text-slate-400">{new Date(t.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <p className={`font-black ${t.transaction_type === 'income' ? 'text-emerald-600' : 'text-slate-700'}`}>
          {t.transaction_type === 'income' ? '+' : '-'}${t.amount}
        </p>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="p-1.5 rounded-xl text-slate-300 hover:text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
          >
            <MoreHorizontal size={18} />
          </button>
          
          <AnimatePresence>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 5 }}
                  className="absolute right-0 bottom-8 z-40 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden w-36"
                >
                  <button
                    onClick={() => { setMenuOpen(false); onEdit(); }}
                    className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    ✏️ 編輯記錄
                  </button>
                  <div className="h-px bg-slate-100" />
                  <button
                    onClick={() => { setMenuOpen(false); handleDelete(); }}
                    className="w-full px-4 py-3 text-left text-sm font-bold text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                    🗑️ 刪除記錄
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
