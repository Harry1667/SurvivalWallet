import { useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const nowLocalInput = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export interface ConfirmData {
  amount: number;
  category: string;
  note: string;
  is_big: boolean;
  created_at?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: ConfirmData) => Promise<void>;
  categories: string[];
  currencySymbol?: string;
  dailyAllowance?: number;
}

export const TransactionModal = ({ isOpen, onClose, onConfirm, categories, currencySymbol = '$', dailyAllowance = 0 }: Props) => {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [isBig, setIsBig] = useState(false);
  const [recordTime, setRecordTime] = useState(() => nowLocalInput());

  const reset = () => {
    setAmount(''); setNote(''); setCategory(null); setIsBig(false); setRecordTime(nowLocalInput());
  };
  const handleClose = () => { reset(); onClose(); };

  const handleConfirm = async () => {
    if (!amount || !category) return;
    await onConfirm({
      amount: Number(amount),
      category,
      note: note.trim(),
      is_big: isBig,
      created_at: recordTime
        ? `${recordTime}:00`.slice(0, 19) // 本地 ISO，無時區後綴
        : undefined,
    });
    reset();
  };

  // 非侵入式提示：金額大於每日額度 3 倍且尚未勾大筆時，輕輕提醒（不自動勾選）
  const suggestBig = !isBig && dailyAllowance > 0 && Number(amount) > dailyAllowance * 3;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={handleClose}
      />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full max-w-md bg-white dark:bg-[#1e293b] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)]"
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0 border-b border-slate-100 dark:border-[#334155]">
          <h2 className="font-black text-lg text-slate-800 dark:text-white">記一筆</h2>
          <button aria-label="關閉" onClick={handleClose} className="p-2 bg-slate-100 dark:bg-[#0f172a] rounded-full text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5 pb-8 overflow-y-auto">
          {/* Amount */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">金額</label>
            <div className="flex items-baseline gap-2 border-b-2 border-slate-100 focus-within:border-slate-900 transition-colors py-1">
              <span className="text-2xl font-black text-slate-300">{currencySymbol}</span>
              <input
                autoFocus type="number" inputMode="numeric" value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full text-5xl font-black text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-100 dark:placeholder:text-slate-700 bg-transparent"
                placeholder="0"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">分類</label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map(cat => (
                <button
                  key={cat} onClick={() => setCategory(cat)}
                  className={cn(
                    'py-3 rounded-2xl border-2 font-bold text-sm transition-all active:scale-95',
                    category === cat
                      ? 'border-slate-900 bg-slate-50 dark:bg-[#0f172a] dark:border-white text-slate-900 dark:text-white'
                      : 'border-transparent bg-slate-50 dark:bg-[#0f172a] text-slate-500 hover:text-slate-800',
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">備註 (選填)</label>
            <input
              type="text" value={note} onChange={e => setNote(e.target.value)}
              className="w-full py-2 text-slate-700 dark:text-slate-200 font-bold bg-slate-50 dark:bg-[#0f172a] px-4 rounded-xl focus:outline-none"
              placeholder="例: 午餐、電磁爐…"
            />
          </div>

          {/* Date */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">日期</label>
            <input
              type="datetime-local" value={recordTime} onChange={e => setRecordTime(e.target.value)}
              className="w-full py-2 px-4 font-bold rounded-xl text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-[#0f172a] focus:outline-none text-sm"
            />
          </div>

          {/* 非侵入式提示 */}
          {suggestBig && (
            <p className="text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-xl px-3 py-2 -mb-1">
              這筆比平常大不少（超過每日額度 3 倍），是不是「大筆 / 一次性支出」？
            </p>
          )}

          {/* Big expense toggle */}
          <button
            type="button" onClick={() => setIsBig(v => !v)}
            className={cn(
              'w-full flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all',
              isBig ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30' : 'border-slate-100 dark:border-[#334155] bg-slate-50 dark:bg-[#0f172a]',
            )}
          >
            <div className={cn('w-6 h-6 rounded-lg shrink-0 mt-0.5 flex items-center justify-center transition-all', isBig ? 'bg-amber-500 text-white' : 'bg-white dark:bg-[#1e293b] border-2 border-slate-200')}>
              {isBig && '✓'}
            </div>
            <div>
              <p className="font-black text-sm text-slate-800 dark:text-slate-100">大筆 / 一次性支出</p>
              <p className="text-[11px] font-bold text-slate-400 leading-snug mt-0.5">
                勾選後這筆會從預算扣除，之後每天可花的額度會略降；不勾則算當日日常花費。
              </p>
            </div>
          </button>

          {/* Submit */}
          <button
            onClick={handleConfirm} disabled={!amount || !category}
            className={cn(
              'w-full py-5 rounded-[2rem] font-black text-xl shadow-xl transition-all active:scale-95',
              amount && category
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-[#334155] text-slate-300 cursor-not-allowed',
            )}
          >
            確定記錄
          </button>
        </div>
      </motion.div>
    </div>
  );
};
