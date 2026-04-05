import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, AlertTriangle,
  Utensils, Coffee, ShoppingBag, Bus, Gamepad2, BookOpen, Package,
  DollarSign, Sword, Gift, Recycle, TrendingUp, Archive,
} from 'lucide-react';
import type { Category, IncomeCategory } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Category Data ────────────────────────────────────────────────────────────
const EXPENSE_CATEGORIES: { name: Category; icon: any; color: string }[] = [
  { name: '生存正餐', icon: Utensils, color: 'bg-emerald-500' },
  { name: '快樂水/零食', icon: Coffee, color: 'bg-amber-500' },
  { name: '生活日用', icon: ShoppingBag, color: 'bg-blue-500' },
  { name: '交通通勤', icon: Bus, color: 'bg-indigo-500' },
  { name: '娛樂社交', icon: Gamepad2, color: 'bg-purple-500' },
  { name: '自我投資', icon: BookOpen, color: 'bg-rose-500' },
  { name: '其他雜項', icon: Package, color: 'bg-slate-500' },
];

const INCOME_CATEGORIES: { name: IncomeCategory; icon: any; color: string; label: string }[] = [
  { name: '基礎補給', icon: DollarSign, color: 'bg-emerald-500', label: '💰 基礎補給' },
  { name: '任務賞金', icon: Sword, color: 'bg-amber-500', label: '⚔️ 任務賞金' },
  { name: '天降寶箱', icon: Gift, color: 'bg-purple-500', label: '🎁 天降寶箱' },
  { name: '裝備變現', icon: Recycle, color: 'bg-blue-500', label: '♻️ 裝備變現' },
  { name: '被動生息', icon: TrendingUp, color: 'bg-teal-500', label: '📈 被動生息' },
  { name: '其他補血', icon: Archive, color: 'bg-slate-500', label: '📦 其他補血' },
];

// ─── Props ────────────────────────────────────────────────────────────────────
interface ConfirmData {
  amount: number;
  category: Category | IncomeCategory;
  isEmergency: boolean;
  item: string;
  created_at?: string;
  transaction_type: 'expense' | 'income';
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: ConfirmData) => void;
  taxedCategories: Category[];
  piggyBankSaved?: number;
  onWithdrawFund?: (amount: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const TransactionModal = ({
  isOpen, onClose, onConfirm, taxedCategories,
  piggyBankSaved = 0, onWithdrawFund
}: Props) => {
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');

  // Manual mode state
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<Category | IncomeCategory | null>(null);
  const [isEmergency, setIsEmergency] = useState(false);
  const [isEmergencyConfirm, setIsEmergencyConfirm] = useState(false);
  const [recordTime, setRecordTime] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });

  // Reset when closed
  const handleClose = () => {
    setAmount('');
    setNote('');
    setCategory(null);
    setIsEmergency(false);
    setIsEmergencyConfirm(false);
    setTransactionType('expense');
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setRecordTime(now.toISOString().slice(0, 16));
    onClose();
  };

  // ── Manual Submit ───────────────────────────────────────────────────────────
  const handleManualConfirm = () => {
    if (!amount || !category) return;
    if (transactionType === 'expense' && isEmergency && !isEmergencyConfirm) {
      setIsEmergencyConfirm(true);
      return;
    }
    onConfirm({
      amount: Number(amount),
      category,
      isEmergency: transactionType === 'expense' ? isEmergency : false,
      item: note.trim() || '未命名消費',
      created_at: recordTime ? new Date(recordTime).toISOString() : undefined,
      transaction_type: transactionType,
    });
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pb-20">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={handleClose}
      />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0 border-b border-slate-100">
          <h2 className="font-black text-lg text-slate-800">記一筆</h2>
          <button onClick={handleClose} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors ml-2">
            <X size={20} />
          </button>
        </div>

        {/* ── Manual Form ── */}
        <div className="p-6 space-y-5 pb-8 overflow-y-auto">
            {/* Income/Expense Toggle */}
            <div className="flex gap-2 bg-slate-100 rounded-2xl p-1.5">
              <button
                onClick={() => { setTransactionType('expense'); setCategory(null); }}
                className={cn(
                  "flex-1 py-3 rounded-xl font-black text-sm transition-all",
                  transactionType === 'expense'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-600'
                )}
              >
                🩸 支出 (扣血)
              </button>
              <button
                onClick={() => { setTransactionType('income'); setCategory(null); setIsEmergency(false); }}
                className={cn(
                  "flex-1 py-3 rounded-xl font-black text-sm transition-all",
                  transactionType === 'income'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-600'
                )}
              >
                💚 收入 (補血)
              </button>
            </div>

            {/* Amount */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">金額</label>
                {/* Emergency Toggle (expense only) */}
                {transactionType === 'expense' && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">突發避險</span>
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
                )}
              </div>
              <div className={cn(
                "flex items-baseline gap-2 border-b-2 transition-colors py-1",
                transactionType === 'income' ? 'border-emerald-200 focus-within:border-emerald-600' : 'border-slate-100 focus-within:border-slate-900'
              )}>
                <span className={cn("text-2xl font-black", transactionType === 'income' ? 'text-emerald-300' : 'text-slate-300')}>$</span>
                <input
                  autoFocus
                  type="number"
                  inputMode="numeric"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full text-5xl font-black text-slate-900 focus:outline-none placeholder:text-slate-100 bg-transparent"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">
                {transactionType === 'expense' ? '生存分類' : '補血來源'}
              </label>
              {transactionType === 'expense' ? (
                <div className="grid grid-cols-4 gap-2">
                  {EXPENSE_CATEGORIES.map(cat => {
                    const isTaxed = taxedCategories.includes(cat.name);
                    const isSelected = category === cat.name;
                    return (
                      <button
                        key={cat.name}
                        onClick={() => setCategory(cat.name)}
                        className={cn(
                          "relative flex flex-col items-center gap-1.5 p-2 pt-3 rounded-2xl border-2 transition-all active:scale-95",
                          isSelected ? "border-slate-900 bg-slate-50" : "border-transparent hover:bg-slate-50"
                        )}
                      >
                        {isTaxed && (
                          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full shadow-sm">
                            +20%
                          </div>
                        )}
                        <div className={cn("p-2.5 rounded-xl text-white shadow-md transition-transform", cat.color, isSelected ? "scale-110" : "")}>
                          <cat.icon size={18} />
                        </div>
                        <span className="text-[9px] font-bold text-slate-600 truncate w-full text-center">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {INCOME_CATEGORIES.map(cat => {
                    const isSelected = category === cat.name;
                    return (
                      <button
                        key={cat.name}
                        onClick={() => setCategory(cat.name)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all active:scale-95",
                          isSelected ? "border-emerald-600 bg-emerald-50" : "border-transparent hover:bg-emerald-50/50"
                        )}
                      >
                        <div className={cn("p-2.5 rounded-xl text-white shadow-md", cat.color, isSelected ? "scale-110" : "")}>
                          <cat.icon size={18} />
                        </div>
                        <span className="text-[9px] font-bold text-slate-600 text-center w-full truncate">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">備註 (選填)</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full py-2 text-slate-700 font-bold bg-slate-50 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-100 transition-all"
                placeholder={transactionType === 'expense' ? '例: 珍奶、便當...' : '例: 三月薪資、接案費用...'}
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

            {/* Submit */}
            <button
              onClick={handleManualConfirm}
              disabled={!amount || !category}
              className={cn(
                "w-full py-5 rounded-[2rem] font-black text-xl shadow-xl transition-all active:scale-95",
                amount && category
                  ? transactionType === 'income'
                    ? 'bg-emerald-600 text-white shadow-emerald-200'
                    : isEmergency ? 'bg-red-600 text-white shadow-red-200' : 'bg-slate-900 text-white shadow-slate-200'
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed'
              )}
            >
              {transactionType === 'income' ? '💚 補血確認' : '確定記錄'}
            </button>

            {/* Withdraw Fund */}
            {onWithdrawFund && piggyBankSaved > 0 && (
              <button
                onClick={() => {
                  const val = prompt(`從夢想基金拿出多少？\n目前基金餘額：$${Math.floor(piggyBankSaved)}`);
                  const num = Number(val);
                  if (val && !isNaN(num) && num > 0) {
                    onWithdrawFund(num);
                    handleClose();
                  }
                }}
                className="w-full py-4 rounded-[2rem] font-bold text-sm border-2 border-slate-200 text-slate-500 bg-transparent hover:bg-slate-50 active:scale-95 transition-all"
              >
                💰 從夢想基金拿出（餘 ${Math.floor(piggyBankSaved)}）
              </button>
            )}
          </div>
        {/* ── Emergency Confirm Overlay ── */}
        <AnimatePresence>
          {isEmergencyConfirm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 bg-white p-8 flex flex-col items-center justify-center text-center space-y-6 z-10 rounded-t-[2.5rem] sm:rounded-[2.5rem]"
            >
              <div className="bg-red-100 p-6 rounded-full text-red-600">
                <AlertTriangle size={60} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900">不可抗力確認？</h3>
                <p className="text-slate-500 font-bold">
                  確定這是一筆突發支出嗎？<br/>
                  <span className="text-red-500">此筆將不扣除今日額度</span>，<br/>
                  但會平均降低你未來的每日預算。
                </p>
              </div>
              <div className="flex gap-4 w-full">
                <button
                  onClick={() => setIsEmergencyConfirm(false)}
                  className="flex-1 py-4 bg-slate-100 rounded-2xl font-bold text-slate-600 active:scale-95 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleManualConfirm}
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold active:scale-95 transition-all shadow-lg shadow-red-200"
                >
                  確定避險
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
