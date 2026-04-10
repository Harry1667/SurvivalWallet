import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, AlertTriangle, History, BookMarked,
  Utensils, Coffee, ShoppingBag, Bus, Gamepad2, BookOpen, Package,
  DollarSign, Sword, Gift, Recycle, TrendingUp, Archive,
} from 'lucide-react';
import type { Category, IncomeCategory, EntryMode } from '../types';
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
  entry_mode: EntryMode;
}

// 補記模式快速日期選項
const nowLocalISO = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

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
  // 補記模式：normal=即時記、backfill=最近忘了補記、historical=匯入很早以前的歷史
  const [entryMode, setEntryMode] = useState<EntryMode>('normal');

  // Manual mode state
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<Category | IncomeCategory | null>(null);
  const [isEmergency, setIsEmergency] = useState(false);
  const [isEmergencyConfirm, setIsEmergencyConfirm] = useState(false);
  const [recordTime, setRecordTime] = useState(() => nowLocalISO());

  // Reset when closed
  const handleClose = () => {
    setAmount('');
    setNote('');
    setCategory(null);
    setIsEmergency(false);
    setIsEmergencyConfirm(false);
    setTransactionType('expense');
    setEntryMode('normal');
    setRecordTime(nowLocalISO());
    onClose();
  };

  // 切換補記模式時，預設日期跟著變
  // - normal: 現在
  // - backfill: 預設昨天（最常見的補記情境）
  // - historical: 預設一個月前
  const switchEntryMode = (mode: EntryMode) => {
    setEntryMode(mode);
    if (mode === 'normal') setRecordTime(nowLocalISO());
    else if (mode === 'backfill') setRecordTime(nowLocalISO(-1));
    else if (mode === 'historical') setRecordTime(nowLocalISO(-30));
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
      entry_mode: entryMode,
    });
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
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
        className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0 border-b border-slate-100">
          <h2 className="font-black text-lg text-slate-800 flex items-center gap-2">
            {entryMode === 'normal' && '記一筆'}
            {entryMode === 'backfill' && (
              <>
                <History size={18} className="text-amber-500" />
                補記一筆
              </>
            )}
            {entryMode === 'historical' && (
              <>
                <BookMarked size={18} className="text-slate-500" />
                匯入歷史
              </>
            )}
          </h2>
          <button aria-label="關閉" onClick={handleClose} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors ml-2">
            <X size={20} />
          </button>
        </div>

        {/* ── Manual Form ── */}
        <div className="p-6 space-y-5 pb-8 overflow-y-auto">
            {/* Entry Mode Selector — 三段式：一般 / 補記 / 歷史匯入 */}
            <div className="flex gap-1 bg-slate-50 border border-slate-100 rounded-2xl p-1">
              <button
                onClick={() => switchEntryMode('normal')}
                className={cn(
                  "flex-1 py-2 rounded-xl font-black text-[11px] tracking-wide transition-all",
                  entryMode === 'normal'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                )}
              >
                ⚡ 即時記
              </button>
              <button
                onClick={() => switchEntryMode('backfill')}
                className={cn(
                  "flex-1 py-2 rounded-xl font-black text-[11px] tracking-wide transition-all flex items-center justify-center gap-1",
                  entryMode === 'backfill'
                    ? 'bg-white text-amber-600 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                )}
              >
                <History size={12} />
                補記
              </button>
              <button
                onClick={() => switchEntryMode('historical')}
                className={cn(
                  "flex-1 py-2 rounded-xl font-black text-[11px] tracking-wide transition-all flex items-center justify-center gap-1",
                  entryMode === 'historical'
                    ? 'bg-white text-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                )}
              >
                <BookMarked size={12} />
                歷史
              </button>
            </div>
            {entryMode !== 'normal' && (
              <div className={cn(
                "text-[11px] font-bold rounded-2xl px-4 py-3 leading-relaxed",
                entryMode === 'backfill'
                  ? 'bg-amber-50 text-amber-700 border border-amber-100'
                  : 'bg-slate-50 text-slate-600 border border-slate-100'
              )}>
                {entryMode === 'backfill'
                  ? '🕒 補記模式：這筆是真的花掉的錢，會進入本月預算池讓今日剩餘正確反映實際錢包。但過去那天的連擊／撲滿節餘／奧侈稅不會被回頭重算（保留過去的成就）。'
                  : '📚 歷史匯入模式：用來補上開發這個 app 之前的紀錄，純歷史資料，不影響任何現在的數字。'}
              </div>
            )}

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
                    ? 'bg-emerald-600 text-white text-on-accent shadow-md'
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
                          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-on-accent text-[7px] font-black px-1.5 py-0.5 rounded-full shadow-sm">
                            +20%
                          </div>
                        )}
                        <div className={cn("p-2.5 rounded-xl text-white text-on-accent shadow-md transition-transform", cat.color, isSelected ? "scale-110" : "")}>
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
                          isSelected ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950" : "border-transparent hover:bg-emerald-50/50"
                        )}
                      >
                        <div className={cn("p-2.5 rounded-xl text-white text-on-accent shadow-md", cat.color, isSelected ? "scale-110" : "")}>
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

            {/* Record Time — 補記/歷史模式下醒目顯示 + 快速選日期 */}
            <div>
              <label className={cn(
                "text-[10px] font-black uppercase tracking-widest block mb-2",
                entryMode === 'normal' ? "text-slate-400" : entryMode === 'backfill' ? "text-amber-600" : "text-slate-700"
              )}>
                {entryMode === 'normal' ? '記錄時間' : entryMode === 'backfill' ? '🕒 補記日期 (必填)' : '📚 歷史日期 (必填)'}
              </label>
              <input
                type="datetime-local"
                value={recordTime}
                onChange={e => setRecordTime(e.target.value)}
                className={cn(
                  "w-full py-2 px-4 font-bold rounded-xl focus:outline-none focus:ring-2 transition-all text-sm",
                  entryMode === 'normal'
                    ? "text-slate-700 bg-slate-50 focus:ring-slate-100"
                    : entryMode === 'backfill'
                      ? "text-amber-900 bg-amber-50 border border-amber-200 focus:ring-amber-200"
                      : "text-slate-800 bg-slate-100 border border-slate-200 focus:ring-slate-300"
                )}
              />
              {/* 快速日期選項，補記/歷史模式才出現 */}
              {entryMode === 'backfill' && (
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={() => setRecordTime(nowLocalISO(-1))} className="flex-1 py-1.5 text-[11px] font-black text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors">昨天</button>
                  <button type="button" onClick={() => setRecordTime(nowLocalISO(-3))} className="flex-1 py-1.5 text-[11px] font-black text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors">3 天前</button>
                  <button type="button" onClick={() => setRecordTime(nowLocalISO(-7))} className="flex-1 py-1.5 text-[11px] font-black text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors">一週前</button>
                </div>
              )}
              {entryMode === 'historical' && (
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={() => setRecordTime(nowLocalISO(-30))} className="flex-1 py-1.5 text-[11px] font-black text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">1 個月前</button>
                  <button type="button" onClick={() => setRecordTime(nowLocalISO(-90))} className="flex-1 py-1.5 text-[11px] font-black text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">3 個月前</button>
                  <button type="button" onClick={() => setRecordTime(nowLocalISO(-365))} className="flex-1 py-1.5 text-[11px] font-black text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">1 年前</button>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              onClick={handleManualConfirm}
              disabled={!amount || !category}
              className={cn(
                "w-full py-5 rounded-[2rem] font-black text-xl shadow-xl transition-all active:scale-95",
                amount && category
                  ? transactionType === 'income'
                    ? 'bg-emerald-600 text-white text-on-accent shadow-emerald-200'
                    : isEmergency ? 'bg-red-600 text-white text-on-accent shadow-red-200' : 'bg-slate-900 text-white shadow-slate-200'
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
                  className="flex-1 py-4 bg-red-600 text-white text-on-accent rounded-2xl font-bold active:scale-95 transition-all shadow-lg shadow-red-200"
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
