import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Download, Swords, Sparkles, Globe, Info } from 'lucide-react';
import type { UserSettings, Transaction } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSimulateDay?: () => void;
  onReset?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  settings: UserSettings;
  transactions: Transaction[];
  onSaveSettings: (s: Partial<UserSettings>) => void;
}

const CURRENCY_OPTIONS = [
  { label: '$', value: '$' },
  { label: 'NT$', value: 'NT$' },
  { label: '¥', value: '¥' },
  { label: '€', value: '€' },
  { label: '£', value: '£' },
  { label: '₩', value: '₩' },
];

const WEEK_DAYS = [
  { label: '日', value: 0 },
  { label: '一', value: 1 },
  { label: '二', value: 2 },
  { label: '三', value: 3 },
  { label: '四', value: 4 },
  { label: '五', value: 5 },
  { label: '六', value: 6 },
];

const APP_VERSION = '1.2.0';

export const SettingsModal = ({
  isOpen, onClose, onSimulateDay, onReset,
  isDarkMode, onToggleDarkMode,
  settings, transactions, onSaveSettings,
}: Props) => {
  const [luxuryTaxRate, setLuxuryTaxRate] = useState(settings.luxury_tax_rate);
  const [overspendThreshold, setOverspendThreshold] = useState(settings.overspend_threshold);
  const [streakRewardRate, setStreakRewardRate] = useState(settings.streak_reward_rate);
  const [currencySymbol, setCurrencySymbol] = useState(settings.currency_symbol);
  const [weekStartDay, setWeekStartDay] = useState(settings.week_start_day);
  const [hasChanges, setHasChanges] = useState(false);

  if (!isOpen) return null;

  const markChanged = () => setHasChanges(true);

  const handleSave = () => {
    onSaveSettings({
      luxury_tax_rate: luxuryTaxRate,
      overspend_threshold: overspendThreshold,
      streak_reward_rate: streakRewardRate,
      currency_symbol: currencySymbol,
      week_start_day: weekStartDay,
    });
    setHasChanges(false);
  };

  // 匯出 CSV
  const handleExportCSV = () => {
    if (transactions.length === 0) {
      alert('目前沒有任何交易紀錄可匯出。');
      return;
    }

    const headers = ['日期', '時間', '類型', '分類', '品項', '金額', '緊急', '模式'];
    const rows = transactions.map(t => {
      const d = new Date(t.created_at);
      const date = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
      const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      return [
        date,
        time,
        t.transaction_type === 'income' ? '收入' : '支出',
        t.category,
        `"${(t.item || '').replace(/"/g, '""')}"`,
        t.amount,
        t.is_emergency ? '是' : '否',
        t.entry_mode === 'normal' ? '一般' : t.entry_mode === 'backfill' ? '補記' : '歷史',
      ].join(',');
    });

    const bom = '\uFEFF';
    const csv = bom + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    a.download = `survival-wallet-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.95 }}
        className="relative bg-white dark:bg-[#1e293b] rounded-[2.5rem] p-6 w-full max-w-sm shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto safe-area-inset-bottom"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-2">
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">系統設定</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-400 rounded-full hover:bg-slate-200 active:scale-95 transition-all">
            <X size={20} />
          </button>
        </div>

        {/* ── 遊戲化參數 ── */}
        <SectionHeader icon={<Swords size={16} />} title="遊戲化參數" />

        <SliderSetting
          label="奢侈稅稅率"
          value={luxuryTaxRate}
          min={0} max={0.5} step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => { setLuxuryTaxRate(v); markChanged(); }}
          description="快樂水/娛樂消費自動扣稅存入撲滿"
        />
        <SliderSetting
          label="嚴重超支門檻"
          value={overspendThreshold}
          min={0.1} max={1} step={0.1}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => { setOverspendThreshold(v); markChanged(); }}
          description="超過今日配額此比例才觸發罰金"
        />
        <SliderSetting
          label="連擊獎勵倍率"
          value={streakRewardRate}
          min={0} max={0.3} step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => { setStreakRewardRate(v); markChanged(); }}
          description="每 7 天連擊，獎勵 = 7日配額 × 此倍率"
        />

        {/* 儲存按鈕 */}
        {hasChanges && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleSave}
            className="w-full py-3 text-sm font-black text-white bg-blue-500 rounded-full active:scale-95 transition-all shadow-lg shadow-blue-500/30"
          >
            儲存變更
          </motion.button>
        )}

        {/* ── 體驗設定 ── */}
        <SectionHeader icon={<Globe size={16} />} title="體驗設定" />

        {/* 幣別符號 */}
        <div className="px-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">幣別符號</span>
          <div className="flex gap-2 mt-2 flex-wrap">
            {CURRENCY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setCurrencySymbol(opt.value); markChanged(); }}
                className={`px-4 py-2 rounded-full text-sm font-bold border transition-all active:scale-95 ${
                  currencySymbol === opt.value
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200'
                    : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 每週起始日 */}
        <div className="px-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">每週起始日</span>
          <div className="flex gap-1.5 mt-2">
            {WEEK_DAYS.map(d => (
              <button
                key={d.value}
                onClick={() => { setWeekStartDay(d.value); markChanged(); }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                  weekStartDay === d.value
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200'
                    : 'bg-white text-slate-500 border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* 黑暗模式 */}
        <div className="border-t border-slate-100 dark:border-slate-700 pt-3 flex items-center justify-between px-2">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">黑暗模式</span>
          <button
            onClick={onToggleDarkMode}
            className="w-14 h-8 rounded-full transition-colors relative flex items-center px-1 shadow-inner bg-slate-200 dark:bg-[#334155]"
          >
            <div className={`w-6 h-6 rounded-full bg-white dark:bg-[#e2e8f0] shadow-sm flex items-center justify-center transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}>
              <span className="text-[10px]">{isDarkMode ? '🌙' : '☀️'}</span>
            </div>
          </button>
        </div>

        {/* ── 資料管理 ── */}
        <SectionHeader icon={<Download size={16} />} title="資料管理" />

        <button
          onClick={handleExportCSV}
          className="w-full py-3 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 rounded-full border border-slate-200 dark:border-slate-600 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Download size={16} />
          匯出交易紀錄 (CSV)
        </button>

        {/* ── Danger Zone ── */}
        <SectionHeader icon={<Sparkles size={16} />} title="開發工具" />

        <div className="space-y-3">
          {onSimulateDay && (
            <button
              onClick={() => { onSimulateDay(); onClose(); }}
              className="w-full py-3 text-sm font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 rounded-full border border-slate-200 dark:border-slate-600 active:scale-95 transition-all"
            >
              🌙 模擬換日結算
            </button>
          )}
          {onReset && (
            <button
              onClick={() => { if (confirm('確定要重置所有設定與費用記錄？此動作不可還原。')) { onReset(); } }}
              className="w-full py-3 text-sm font-bold text-red-500 bg-red-50 dark:bg-red-900/20 rounded-full border border-red-100 dark:border-red-800 active:scale-95 transition-all"
            >
              ⚠️ 重置所有資料
            </button>
          )}
        </div>

        {/* ── 關於 ── */}
        <SectionHeader icon={<Info size={16} />} title="關於" />
        <div className="px-2 pb-2 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400 font-medium">版本</span>
            <span className="font-black text-slate-700 dark:text-slate-300">v{APP_VERSION}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400 font-medium">交易筆數</span>
            <span className="font-black text-slate-700 dark:text-slate-300">{transactions.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400 font-medium">累計完美日</span>
            <span className="font-black text-slate-700 dark:text-slate-300">{settings.total_perfect_days} 天</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400 font-medium">最長連擊</span>
            <span className="font-black text-slate-700 dark:text-slate-300">{settings.longest_streak} 天</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ── 子元件 ──

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 px-2 pt-2 border-t border-slate-100 dark:border-slate-700">
      <span className="text-slate-400 dark:text-slate-500">{icon}</span>
      <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{title}</span>
    </div>
  );
}

function SliderSetting({
  label, value, min, max, step, format, onChange, description,
}: {
  label: string; value: number; min: number; max: number; step: number;
  format: (v: number) => string; onChange: (v: number) => void; description: string;
}) {
  return (
    <div className="px-2 space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{label}</span>
        <span className="text-sm font-black text-blue-600 dark:text-blue-400 tabular-nums">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-full appearance-none bg-slate-200 dark:bg-slate-600 accent-blue-500 cursor-pointer"
      />
      <p className="text-[11px] text-slate-400 dark:text-slate-500">{description}</p>
    </div>
  );
}
