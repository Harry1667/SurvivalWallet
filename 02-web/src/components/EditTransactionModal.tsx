import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Save, Utensils, Coffee, ShoppingBag, Bus, Gamepad2, BookOpen, Package } from 'lucide-react';
import type { Transaction, Category, IncomeCategory } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CATEGORIES: { name: Category; icon: any; color: string }[] = [
  { name: '生存正餐', icon: Utensils, color: 'bg-emerald-500' },
  { name: '快樂水/零食', icon: Coffee, color: 'bg-amber-500' },
  { name: '生活日用', icon: ShoppingBag, color: 'bg-blue-500' },
  { name: '交通通勤', icon: Bus, color: 'bg-indigo-500' },
  { name: '娛樂社交', icon: Gamepad2, color: 'bg-purple-500' },
  { name: '自我投資', icon: BookOpen, color: 'bg-rose-500' },
  { name: '其他雜項', icon: Package, color: 'bg-slate-500' },
];

interface Props {
  transaction: Transaction;
  onClose: () => void;
  onSave: (id: string, data: Partial<Transaction>) => void;
  onDelete: (id: string) => void;
}

export const EditTransactionModal = ({ transaction, onClose, onSave, onDelete }: Props) => {
  const [amount, setAmount] = useState(String(transaction.amount));
  const [category, setCategory] = useState<Category | IncomeCategory>(transaction.category);
  const [note, setNote] = useState(transaction.item || '');
  const [isEmergency, setIsEmergency] = useState(transaction.is_emergency);
  const [recordTime, setRecordTime] = useState(() => {
    const d = new Date(transaction.created_at);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });

  const handleSave = () => {
    if (!amount || !category) return;
    onSave(transaction.id, {
      amount: Number(amount),
      category,
      is_emergency: isEmergency,
      item: note.trim() || '未命名消費',
      created_at: recordTime ? new Date(recordTime).toISOString() : transaction.created_at,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 80, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 80, scale: 0.97 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl flex flex-col max-h-[calc(100dvh-2rem)] overflow-hidden"
      >
        <div className="flex justify-between items-center px-8 pt-8 pb-4 shrink-0 border-b border-slate-100">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">編輯記錄</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 pt-6 space-y-6 overflow-y-auto">
        {/* Amount */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">金額</label>
          <div className="flex items-baseline gap-2 border-b-2 border-slate-100 focus-within:border-slate-900 transition-colors py-1">
            <span className="text-2xl font-black text-slate-300">$</span>
            <input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full text-4xl font-black text-slate-900 focus:outline-none bg-transparent"
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">生存分類</label>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.name}
                onClick={() => setCategory(cat.name)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2 pt-3 rounded-2xl border-2 transition-all active:scale-95",
                  category === cat.name ? "border-slate-900 bg-slate-50" : "border-transparent hover:bg-slate-50"
                )}
              >
                <div className={cn("p-2.5 rounded-xl text-white text-on-accent shadow-md transition-transform", cat.color, category === cat.name ? "scale-110" : "")}>
                  <cat.icon size={18} />
                </div>
                <span className="text-[9px] font-bold text-slate-600 truncate w-full text-center">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">備註</label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full py-2 text-slate-700 font-bold bg-slate-50 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-100 transition-all"
            placeholder="例如: 珍奶、便當..."
          />
        </div>

        {/* Record Time */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">記錄時間</label>
          <input
            type="datetime-local"
            value={recordTime}
            onChange={e => setRecordTime(e.target.value)}
            className="w-full py-2 text-slate-700 font-bold bg-slate-50 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-100 transition-all text-sm"
          />
        </div>

        {/* Emergency toggle */}
        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-bold text-slate-600">突發避險</span>
          <button
            onClick={() => setIsEmergency(!isEmergency)}
            className={cn(
              "w-10 h-5 rounded-full transition-all relative flex items-center px-1 shadow-inner",
              isEmergency ? "bg-red-500" : "bg-slate-200"
            )}
          >
            <div className={cn("w-3 h-3 rounded-full bg-white shadow-sm transition-all", isEmergency ? "translate-x-5" : "translate-x-0")} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => {
              if (confirm('確定要刪除這筆記錄嗎？')) {
                onDelete(transaction.id);
                onClose();
              }
            }}
            className="flex-1 py-4 bg-red-50 text-red-500 rounded-2xl font-bold hover:bg-red-100 active:scale-95 transition-all border border-red-100"
          >
            刪除記錄
          </button>
          <button
            onClick={handleSave}
            disabled={!amount || !category}
            className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-95 transition-all shadow-lg shadow-slate-200 disabled:opacity-40"
          >
            <Save size={18} />
            儲存
          </button>
        </div>
        </div>
      </motion.div>
    </div>
  );
};
