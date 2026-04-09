import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package, AlertTriangle, MoreHorizontal } from 'lucide-react';
import type { AppState, Transaction, Category } from '../types';
import { deleteTransaction, updateTransaction } from '../lib/db';
import { EditTransactionModal } from './EditTransactionModal';
const CATEGORIES_EMOJI: Record<string, string> = {
  '生存正餐': '🍚',
  '快樂水/零食': '🧋',
  '生活日用': '🛍️',
  '交通通勤': '🚌',
  '娛樂社交': '🎮',
  '自我投資': '📚',
  '其他雜項': '📦',
  // 收入分類
  '基礎補給': '💰',
  '任務賞金': '⚔️',
  '天降寶箱': '🎁',
  '裝備變現': '♻️',
  '被動生息': '📈',
  '其他補血': '📦',
};

interface Props {
  state: AppState;
  onRefresh: () => void;
}

const TransactionCard = ({ t, isTaxed, onRefresh }: { t: Transaction; isTaxed: boolean; onRefresh: () => void }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const emoji = CATEGORIES_EMOJI[t.category as Category] || '📦';

  const handleDelete = () => {
    deleteTransaction(t.id);
    onRefresh();
  };

  const handleSave = (id: string, data: Partial<Transaction>) => {
    updateTransaction(id, data);
    onRefresh();
  };

  return (
    <>
      <div className="flex justify-between items-center p-4 hover:bg-slate-50 rounded-[1.5rem] transition-colors relative group">
        {/* Left: Emoji & Info */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-100/80 flex items-center justify-center text-2xl shadow-sm border border-slate-50 transition-transform group-hover:scale-110">
            {emoji}
          </div>
          <div>
            <div className="font-black text-slate-900 text-base">{t.item || t.category}</div>
            <span className="text-[11px] font-bold text-slate-400 tracking-wide mt-0.5 block">
              {t.category} · {new Date(t.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Right: Amount & Status + Menu */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="flex items-center gap-1.5 justify-end">
              {t.is_emergency && <AlertTriangle size={14} className="text-red-500" strokeWidth={3} />}
              <p className={`font-black text-xl tracking-tight ${t.transaction_type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                {t.transaction_type === 'income' ? '+' : '-'}${t.amount}
              </p>
            </div>
            {isTaxed && (
              <div className="text-[10px] font-black text-red-500 bg-red-50 px-1.5 py-0.5 rounded mt-1">
                (含 20% 獻祭)
              </div>
            )}
          </div>

          {/* ⋯ Menu */}
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
                    initial={{ opacity: 0, scale: 0.9, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -5 }}
                    className="absolute right-0 top-8 z-40 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden w-36"
                  >
                    <button
                      onClick={() => { setMenuOpen(false); setEditing(true); }}
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

      <AnimatePresence>
        {editing && (
          <EditTransactionModal
            transaction={t}
            onClose={() => setEditing(false)}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export const HistoryList = ({ state, onRefresh }: Props) => {
  const { transactions, settings } = state;

  // Group transactions by date
  const grouped = transactions.reduce((groups, t) => {
    const date = t.created_at.split('T')[0];
    if (!groups[date]) groups[date] = [];
    groups[date].push(t);
    return groups;
  }, {} as Record<string, typeof transactions>);

  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const getRelativeDateLabel = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (dateStr === today) return '今天';
    if (dateStr === yesterday) return '昨天';
    return new Date(dateStr).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'short' });
  };

  return (
    <div className="flex-1 flex flex-col p-6 pt-12 relative">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">歷史帳單</h1>
        <p className="text-sm font-bold text-slate-400">你所有的生存軌跡</p>
      </header>

      <div className="space-y-8 pb-10">
        {sortedDates.length > 0 ? (
          sortedDates.map((date) => {
            const dayExpense = grouped[date].filter(t => t.transaction_type !== 'income').reduce((acc, t) => acc + t.amount, 0);
            const dayIncome = grouped[date].filter(t => t.transaction_type === 'income').reduce((acc, t) => acc + t.amount, 0);
            return (
              <div key={date} className="space-y-4">
                <div className="flex items-center justify-between pl-2">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    {getRelativeDateLabel(date)}
                  </h3>
                  <span className="text-xs font-bold text-slate-400">
                    {dayExpense > 0 && <span>支出 -${dayExpense}</span>}
                    {dayExpense > 0 && dayIncome > 0 && ' · '}
                    {dayIncome > 0 && <span className="text-emerald-500">收入 +${dayIncome}</span>}
                  </span>
                </div>

                <div className="bg-white rounded-[2rem] p-2 shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col gap-1">
                  {grouped[date].map((t, i) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                    >
                    <TransactionCard
                      t={t}
                      isTaxed={!!(settings?.taxed_categories?.includes(t.category as Category) && !t.is_emergency)}
                      onRefresh={onRefresh}
                    />
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-20 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center text-slate-300 mb-4">
              <Package size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-500 mb-1">尚無任何紀錄</h3>
            <p className="text-sm font-bold text-slate-400">記下一筆消費來開始你的生存考驗吧</p>
          </div>
        )}
      </div>
    </div>
  );
};
