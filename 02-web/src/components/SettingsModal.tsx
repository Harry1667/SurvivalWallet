import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Save, Key, Eye, EyeOff, Trash2, CheckCircle2 } from 'lucide-react';
import type { UserSettings } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (val: Partial<UserSettings>) => void;
  onSimulateDay?: () => void;
  onReset?: () => void;
}

// ── API Key helpers (talks to the Vite dev server middleware) ──────────────────
const loadApiKey = async (): Promise<string> => {
  try {
    const res = await fetch('/api/key/load');
    const data = await res.json();
    return data.key || '';
  } catch {
    return '';
  }
};

const saveApiKey = async (key: string): Promise<boolean> => {
  try {
    const res = await fetch('/api/key/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    return res.ok;
  } catch {
    return false;
  }
};

const deleteApiKey = async (): Promise<void> => {
  await fetch('/api/key/delete', { method: 'POST' });
};

export const SettingsModal = ({ isOpen, onClose, settings, onSave, onSimulateDay, onReset }: Props) => {
  const [formData, setFormData] = useState({
    total_budget: settings.total_budget,
    fixed_expenses: settings.fixed_expenses,
    piggy_bank_name: settings.piggy_bank_name || '夢想撲滿',
    piggy_bank_goal: settings.piggy_bank_goal || 0,
  });

  // API Key state
  const [apiKey, setApiKey] = useState('');
  const [savedApiKey, setSavedApiKey] = useState(''); // what's on disk
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        total_budget: settings.total_budget,
        fixed_expenses: settings.fixed_expenses,
        piggy_bank_name: settings.piggy_bank_name || '夢想撲滿',
        piggy_bank_goal: settings.piggy_bank_goal || 0,
      });
      // Load stored API key
      loadApiKey().then(k => {
        setSavedApiKey(k);
        setApiKey(k);
      });
      setApiKeySaved(false);
    }
  }, [isOpen, settings]);

  const handleSaveApiKey = async () => {
    setApiKeySaving(true);
    // Also update the in-memory Gemini key for immediate effect
    (window as any).__GEMINI_API_KEY_OVERRIDE__ = apiKey;
    const ok = await saveApiKey(apiKey);
    setApiKeySaving(false);
    if (ok) {
      setSavedApiKey(apiKey);
      setApiKeySaved(true);
      setTimeout(() => setApiKeySaved(false), 3000);
    }
  };

  const handleDeleteApiKey = async () => {
    if (!confirm('確定要刪除 API Key？AI 魔法輸入將無法使用。')) return;
    await deleteApiKey();
    setSavedApiKey('');
    setApiKey('');
    (window as any).__GEMINI_API_KEY_OVERRIDE__ = '';
    console.log('🗑️ API Key 已刪除');
  };

  if (!isOpen) return null;

  const maskedKey = savedApiKey
    ? savedApiKey.slice(0, 8) + '••••••••••••••••••••' + savedApiKey.slice(-4)
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
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

        {/* ── Budget Settings ── */}
        <div className="space-y-4 px-2">
          <label className="block">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">每月總生活費</span>
            <input 
              type="number" 
              value={formData.total_budget || ''}
              onChange={e => setFormData(s => ({ ...s, total_budget: parseInt(e.target.value) || 0 }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-lg font-black text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </label>

          <label className="block">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">每月固定支出<span className="text-[10px] ml-2 text-slate-300 tracking-normal">(房租、訂閱等)</span></span>
            <input 
              type="number" 
              value={formData.fixed_expenses || ''}
              onChange={e => setFormData(s => ({ ...s, fixed_expenses: parseInt(e.target.value) || 0 }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-lg font-black text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </label>

          <label className="block">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">夢想撲滿名稱</span>
            <input 
              type="text" 
              value={formData.piggy_bank_name}
              onChange={e => setFormData(s => ({ ...s, piggy_bank_name: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-lg font-black text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </label>

          <label className="block">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">目標金額</span>
            <input 
              type="number" 
              value={formData.piggy_bank_goal || ''}
              onChange={e => setFormData(s => ({ ...s, piggy_bank_goal: parseInt(e.target.value) || 0 }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-lg font-black text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </label>
        </div>

        <button 
          onClick={() => { onSave(formData); onClose(); }}
          className="w-full py-4 bg-blue-600 text-white rounded-full font-black text-lg shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition-all"
        >
          <Save size={20} />
          儲存設定
        </button>

        {/* ── API Key Management ── */}
        <div className="border-t border-slate-100 pt-4 space-y-3 px-2">
          <div className="flex items-center gap-2 mb-3">
            <Key size={16} className="text-violet-500" />
            <span className="text-sm font-black text-slate-600 uppercase tracking-widest">Gemini API Key</span>
          </div>

          {savedApiKey && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <span className="text-xs font-mono text-emerald-700 truncate flex-1">{maskedKey}</span>
              <button
                onClick={handleDeleteApiKey}
                className="p-1 text-red-400 hover:text-red-600 transition-colors shrink-0"
              >
                <Trash2 size={15} />
              </button>
            </div>
          )}

          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={savedApiKey ? '輸入新 Key 以取代' : '貼上 Gemini API Key...'}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400/50 pr-12"
            />
            <button
              onClick={() => setShowApiKey(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
            >
              {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button
            onClick={handleSaveApiKey}
            disabled={!apiKey.trim() || apiKey === savedApiKey || apiKeySaving}
            className="w-full py-3 rounded-full font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 bg-violet-600 text-white shadow-sm shadow-violet-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-violet-700"
          >
            {apiKeySaved ? (
              <><CheckCircle2 size={16} /> 已儲存！加密完成 🔒</>
            ) : apiKeySaving ? (
              '加密儲存中...'
            ) : (
              <><Key size={16} /> 加密儲存 API Key</>
            )}
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
