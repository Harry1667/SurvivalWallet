import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package, MoreHorizontal } from 'lucide-react';
import type { AppState, Transaction } from '../types';
import { deleteTransaction, updateTransaction } from '../lib/db';
import { localDateOf, toLocalDateStr } from '../lib/budget';
import { EditTransactionModal } from './EditTransactionModal';

interface Props {
  state: AppState;
  onRefresh: () => void;
}

const TransactionCard = ({ t, categories, onRefresh, cur }: { t: Transaction; categories: string[]; onRefresh: () => void; cur: string }) => {
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);

  return (
    <>
      <div className="flex justify-between items-center p-4 hover:bg-slate-50 dark:hover:bg-[#0f172a] rounded-[1.5rem] transition-colors relative group">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-[#0f172a] flex items-center justify-center text-lg shrink-0">
            {t.is_big ? '📦' : '🧾'}
          </div>
          <div>
            <div className="font-black text-slate-900 dark:text-white text-base flex items-center gap-1.5">
              {t.note || t.category}
              {t.is_big && <span className="text-[9px] font-black text-amber-600 bg-amber-100 dark:bg-amber-950 px-1.5 py-0.5 rounded">大筆</span>}
            </div>
            <span className="text-[11px] font-bold text-slate-400 tracking-wide mt-0.5 block">
              {t.category} · {new Date(t.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <p className="font-black text-xl tracking-tight text-slate-900 dark:text-white">-{cur}{t.amount}</p>
          <div className="relative">
            <button onClick={() => setMenu(v => !v)} className="p-1.5 rounded-xl text-slate-300 hover:text-slate-600" aria-label="更多">
              <MoreHorizontal size={18} />
            </button>
            <AnimatePresence>
              {menu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute right-0 top-8 z-40 bg-white dark:bg-[#1e293b] rounded-2xl shadow-xl border border-slate-100 dark:border-[#334155] overflow-hidden w-32">
                    <button onClick={() => { setMenu(false); setEditing(true); }} className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#0f172a]">✏️ 編輯</button>
                    <button onClick={async () => { setMenu(false); await deleteTransaction(t.id); onRefresh(); }} className="w-full px-4 py-3 text-left text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950">🗑️ 刪除</button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {editing && (
          <EditTransactionModal
            transaction={t} categories={categories} currencySymbol={cur}
            onClose={() => setEditing(false)}
            onSave={async (id, data) => { await updateTransaction(id, data); onRefresh(); }}
            onDelete={async (id) => { await deleteTransaction(id); onRefresh(); }}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export const HistoryList = ({ state, onRefresh }: Props) => {
  const { transactions, settings } = state;
  const cur = settings?.currency_symbol || '$';
  const categories = settings?.categories || [];

  const grouped = transactions.reduce((g, t) => {
    const date = localDateOf(t.created_at);
    (g[date] ||= []).push(t);
    return g;
  }, {} as Record<string, Transaction[]>);
  const sortedDates = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));

  const label = (dateStr: string) => {
    const today = toLocalDateStr();
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yesterday = toLocalDateStr(y);
    if (dateStr === today) return '今天';
    if (dateStr === yesterday) return '昨天';
    return new Date(dateStr).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'short' });
  };

  return (
    <div className="flex-1 flex flex-col p-6 pt-12">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-1">歷史帳單</h1>
        <p className="text-sm font-bold text-slate-400">所有花費紀錄</p>
      </header>

      <div className="space-y-8 pb-10">
        {sortedDates.length > 0 ? sortedDates.map(date => {
          const dayTotal = grouped[date].reduce((a, t) => a + t.amount, 0);
          return (
            <div key={date} className="space-y-3">
              <div className="flex items-center justify-between pl-2">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{label(date)}</h3>
                <span className="text-xs font-bold text-slate-400">支出 -{cur}{dayTotal}</span>
              </div>
              <div className="bg-white dark:bg-[#1e293b] rounded-[2rem] p-2 shadow-sm border border-slate-100 dark:border-[#334155] flex flex-col gap-1">
                {grouped[date].map((t, i) => (
                  <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <TransactionCard t={t} categories={categories} onRefresh={onRefresh} cur={cur} />
                  </motion.div>
                ))}
              </div>
            </div>
          );
        }) : (
          <div className="py-20 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-white dark:bg-[#1e293b] rounded-full border border-slate-100 dark:border-[#334155] flex items-center justify-center text-slate-300 mb-4">
              <Package size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-500 mb-1">尚無任何紀錄</h3>
            <p className="text-sm font-bold text-slate-400">記下第一筆消費吧</p>
          </div>
        )}
      </div>
    </div>
  );
};
