import { useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import type { Transaction } from '../types';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  transaction: Transaction;
  categories: string[];
  onClose: () => void;
  onSave: (id: string, data: Partial<Transaction>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  currencySymbol?: string;
}

const toInput = (iso: string) => {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export const EditTransactionModal = ({ transaction, categories, onClose, onSave, onDelete, currencySymbol = '$' }: Props) => {
  const [amount, setAmount] = useState(String(transaction.amount));
  const [category, setCategory] = useState(transaction.category);
  const [note, setNote] = useState(transaction.note || '');
  const [isBig, setIsBig] = useState(transaction.is_big);
  const [recordTime, setRecordTime] = useState(() => toInput(transaction.created_at));

  const handleSave = async () => {
    if (!amount || !category) return;
    await onSave(transaction.id, {
      amount: Number(amount),
      category,
      note: note.trim(),
      is_big: isBig,
      created_at: `${recordTime}:00`.slice(0, 19),
    });
    onClose();
  };

  const handleDelete = async () => {
    await onDelete(transaction.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 sm:p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full max-w-md bg-white dark:bg-[#1e293b] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)]"
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-[#334155]">
          <h2 className="font-black text-lg text-slate-800 dark:text-white">編輯記錄</h2>
          <button aria-label="關閉" onClick={onClose} className="p-2 bg-slate-100 dark:bg-[#0f172a] rounded-full text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5 pb-8 overflow-y-auto">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">金額</label>
            <div className="flex items-baseline gap-2 border-b-2 border-slate-100 focus-within:border-slate-900 py-1">
              <span className="text-2xl font-black text-slate-300">{currencySymbol}</span>
              <input type="number" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)}
                className="w-full text-4xl font-black text-slate-900 dark:text-white focus:outline-none bg-transparent" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">分類</label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  className={cn('py-3 rounded-2xl border-2 font-bold text-sm transition-all',
                    category === cat ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white' : 'border-transparent bg-slate-50 dark:bg-[#0f172a] text-slate-500')}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">備註</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)}
              className="w-full py-2 text-slate-700 dark:text-slate-200 font-bold bg-slate-50 dark:bg-[#0f172a] px-4 rounded-xl focus:outline-none" />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">日期</label>
            <input type="datetime-local" value={recordTime} onChange={e => setRecordTime(e.target.value)}
              className="w-full py-2 px-4 font-bold rounded-xl text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-[#0f172a] focus:outline-none text-sm" />
          </div>

          <button type="button" onClick={() => setIsBig(v => !v)}
            className={cn('w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all',
              isBig ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30' : 'border-slate-100 dark:border-[#334155] bg-slate-50 dark:bg-[#0f172a]')}>
            <div className={cn('w-6 h-6 rounded-lg shrink-0 flex items-center justify-center', isBig ? 'bg-amber-500 text-white' : 'bg-white dark:bg-[#1e293b] border-2 border-slate-200')}>{isBig && '✓'}</div>
            <p className="font-black text-sm text-slate-800 dark:text-slate-100">大筆 / 一次性支出</p>
          </button>

          <div className="flex gap-3">
            <button onClick={handleDelete}
              className="px-5 py-4 rounded-2xl font-bold text-red-500 bg-red-50 dark:bg-red-950/40 active:scale-95 transition-all">刪除</button>
            <button onClick={handleSave} disabled={!amount || !category}
              className={cn('flex-1 py-4 rounded-2xl font-black text-lg transition-all active:scale-95',
                amount && category ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-100 text-slate-300')}>
              儲存
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
