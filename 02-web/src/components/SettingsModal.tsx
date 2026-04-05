import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSimulateDay?: () => void;
  onReset?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}



export const SettingsModal = ({ isOpen, onClose, onSimulateDay, onReset, isDarkMode, onToggleDarkMode }: Props) => {

  if (!isOpen) return null;

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
        className="relative bg-white rounded-[2.5rem] p-6 w-full max-w-sm shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto safe-area-inset-bottom"
      >
        <div className="flex justify-between items-center px-2">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">系統設定</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 text-slate-400 rounded-full hover:bg-slate-200 active:scale-95 transition-all">
            <X size={20} />
          </button>
        </div>



        {/* ── Theme Settings ── */}
        <div className="border-t border-slate-100 pt-3 flex items-center justify-between px-2">
          <span className="text-sm font-bold text-slate-700">黑暗模式切換</span>
          <button 
            onClick={onToggleDarkMode}
            className="w-14 h-8 rounded-full transition-colors relative flex items-center px-1 shadow-inner bg-slate-200"
          >
            <div className={`w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}>
              <span className="text-[10px]">{isDarkMode ? '🌙' : '☀️'}</span>
            </div>
          </button>
        </div>

        {/* ── Danger Zone ── */}
        <div className="border-t border-slate-100 pt-3 space-y-3">
          {onSimulateDay && (
            <button
              onClick={() => { onSimulateDay(); onClose(); }}
              className="w-full py-3 text-sm font-bold text-slate-500 bg-slate-50 rounded-full border border-slate-200 active:scale-95 transition-all"
            >
              🌙 模擬換日結算
            </button>
          )}
          {onReset && (
            <button
              onClick={() => { if (confirm('確定要重置所有設定與費用記錄？此動作不可還原。')) { onReset(); }}}
              className="w-full py-3 text-sm font-bold text-red-500 bg-red-50 rounded-full border border-red-100 active:scale-95 transition-all"
            >
              ⚠️ 重置所有資料
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
