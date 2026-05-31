import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings as SettingsIcon, Plus, MoreHorizontal, Calendar } from 'lucide-react';
import type { AppState, Transaction } from '../types';
import { deleteTransaction, updateTransaction } from '../lib/db';
import { localDateOf, toLocalDateStr } from '../lib/budget';
import { EditTransactionModal } from './EditTransactionModal';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  state: AppState;
  onOpenRecord: () => void;
  onOpenSettings: () => void;
  onRefresh: () => void;
}

export const Home = ({ state, onOpenRecord, onOpenSettings, onRefresh }: Props) => {
  const { settings, transactions, budget } = state;
  const [editing, setEditing] = useState<Transaction | null>(null);
  if (!settings) return null;

  const cur = settings.currency_symbol || '$';
  const todayStr = toLocalDateStr();
  const todayTx = transactions.filter(t => localDateOf(t.created_at) === todayStr);

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = daysInMonth - now.getDate() + 1;

  const isOver = budget.todayRemaining < 0;
  const fixedTotal = settings.fixed_expenses.reduce((a, f) => a + f.amount, 0);
  const exhausted = budget.dailyAllowance === 0;

  return (
    <div className="flex-1 flex flex-col p-6 pt-8">
      {/* Header */}
      <header className="flex justify-between items-center">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 bg-white/60 dark:bg-[#1e293b]/60 px-3 py-1.5 rounded-full border border-white/40 dark:border-[#334155]">
          <Calendar size={13} strokeWidth={3} /> 本月還剩 {remainingDays} 天
        </span>
        <button
          aria-label="設定" onClick={onOpenSettings}
          className="p-3 bg-white/60 dark:bg-[#1e293b]/60 rounded-2xl text-slate-600 dark:text-slate-300 border border-white/40 dark:border-[#334155] hover:scale-105 active:scale-95 transition-all"
        >
          <SettingsIcon size={20} />
        </button>
      </header>

      {/* Hero: today remaining */}
      <main className="flex-1 flex flex-col items-center justify-center space-y-8 py-8 w-full max-w-sm mx-auto">
        <div className="text-center space-y-3 w-full">
          <p className="text-slate-500 font-black text-sm uppercase tracking-[0.25em]">今日可用</p>
          <motion.h1
            key={budget.todayRemaining}
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.4 }}
            className={cn('text-7xl font-black tracking-tighter', isOver ? 'text-red-600' : 'text-slate-900 dark:text-white')}
          >
            {isOver ? '-' : ''}{cur}{Math.abs(Math.floor(budget.todayRemaining))}
          </motion.h1>
          <p className="text-[11px] font-bold text-slate-400">每日額度 {cur}{budget.dailyAllowance}</p>
          {exhausted && (
            <p className="text-[11px] font-black text-red-500 bg-red-50 dark:bg-red-950/30 rounded-full px-3 py-1 inline-block">本月預算已用罄</p>
          )}
        </div>

        {/* Fund + month summary */}
        <div className="w-full grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-4 text-center border border-slate-100 dark:border-[#334155]">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">基金</p>
            <p className={cn('text-xl font-black', budget.fund < 0 ? 'text-red-500' : 'text-emerald-600')}>
              {cur}{Math.floor(budget.fund)}
            </p>
            <p className="text-[8px] font-bold text-slate-300 mt-0.5">累積結餘</p>
          </div>
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-4 text-center border border-slate-100 dark:border-[#334155]">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">本月日常</p>
            <p className="text-xl font-black text-slate-700 dark:text-slate-200">{cur}{budget.dailySpentMonth}</p>
          </div>
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-4 text-center border border-slate-100 dark:border-[#334155]">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">本月大筆</p>
            <p className="text-xl font-black text-slate-700 dark:text-slate-200">{cur}{budget.bigSpentMonth}</p>
          </div>
        </div>

        {fixedTotal > 0 && (
          <p className="text-[11px] font-bold text-slate-400 -mt-3">
            本月已預扣固定支出 {cur}{fixedTotal}
          </p>
        )}

        <motion.button
          onClick={onOpenRecord} whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}
          className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black text-xl shadow-xl flex items-center justify-center gap-3"
        >
          <Plus size={22} strokeWidth={3} /> 記一筆
        </motion.button>
      </main>

      {/* Today's transactions */}
      {todayTx.length > 0 && (
        <section className="bg-white/70 dark:bg-[#1e293b]/70 backdrop-blur-xl rounded-[2rem] -mx-6 -mb-6 px-6 pt-6 pb-8 border-t border-white/50 dark:border-[#334155] space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">今日花銷</p>
          <div className="space-y-1">
            {todayTx.slice(0, 5).map(t => (
              <TxRow key={t.id} t={t} cur={cur} onEdit={() => setEditing(t)} onRefresh={onRefresh} />
            ))}
            {todayTx.length > 5 && <p className="text-center text-[11px] font-bold text-slate-400 pt-1">還有 {todayTx.length - 5} 筆…</p>}
          </div>
        </section>
      )}

      <AnimatePresence>
        {editing && (
          <EditTransactionModal
            transaction={editing}
            onClose={() => setEditing(null)}
            currencySymbol={cur}
            categories={settings.categories}
            onSave={async (id, data) => { await updateTransaction(id, data); onRefresh(); }}
            onDelete={async (id) => { await deleteTransaction(id); onRefresh(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const TxRow = ({ t, cur, onEdit, onRefresh }: { t: Transaction; cur: string; onEdit: () => void; onRefresh: () => void }) => {
  const [menu, setMenu] = useState(false);
  return (
    <div className="flex justify-between items-center py-2">
      <div className="flex items-center gap-3">
        <div>
          <p className="font-black text-slate-800 dark:text-slate-100 text-sm leading-tight">
            {t.note || t.category}
            {t.is_big && <span className="ml-1.5 text-[9px] font-black text-amber-600 bg-amber-100 dark:bg-amber-950 px-1.5 py-0.5 rounded">大筆</span>}
          </p>
          <p className="text-[10px] font-bold text-slate-400">{t.category} · {new Date(t.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <p className="font-black text-lg text-slate-900 dark:text-white">-{cur}{t.amount}</p>
        <div className="relative">
          <button onClick={() => setMenu(v => !v)} className="p-1.5 rounded-xl text-slate-300 hover:text-slate-600" aria-label="更多">
            <MoreHorizontal size={18} />
          </button>
          <AnimatePresence>
            {menu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute right-0 top-8 z-40 bg-white dark:bg-[#1e293b] rounded-2xl shadow-xl border border-slate-100 dark:border-[#334155] overflow-hidden w-32"
                >
                  <button onClick={() => { setMenu(false); onEdit(); }} className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#0f172a]">✏️ 編輯</button>
                  <button onClick={async () => { setMenu(false); await deleteTransaction(t.id); onRefresh(); }} className="w-full px-4 py-3 text-left text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950">🗑️ 刪除</button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
