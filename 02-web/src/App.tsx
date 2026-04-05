import React, { useState, useEffect } from 'react';
import { Onboarding } from './components/Onboarding';
import { Home } from './components/Home';
import { Fund } from './components/Fund';
import { HistoryList } from './components/HistoryList';
import { TransactionModal } from './components/TransactionModal';
import { SettingsModal } from './components/SettingsModal';
import { initDB, getSettings, saveSettings, addTransaction, getTransactions, addFundRecord, updateTransaction } from './lib/db';
import type { AppState, Category, IncomeCategory, UserSettings } from './types';
import { AnimatePresence } from 'motion/react';
import { PiggyBank, Wallet, History as HistoryIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type Tab = 'fund' | 'home' | 'history';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [state, setState] = useState<AppState>({
    settings: null,
    transactions: [],
    currentDailyBalance: 0,
    todayAllowance: 0,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<Tab>('home');

  useEffect(() => {
    const load = async () => {
      console.log('📱 核心組件啟動...');
      try {
        await initDB();
        const settings = getSettings();
        const transactions = getTransactions();
        
        const appState = calculateState(settings, transactions);
        setState(appState);
        setDbReady(true);
      } catch (e) {
        console.error('❌ 初始化失敗:', e);
      }

      // Auto-load encrypted API key from database/api.key
      try {
        const res = await fetch('/api/key/load');
        const data = await res.json();
        if (data.key) {
          (window as any).__GEMINI_API_KEY_OVERRIDE__ = data.key;
          console.log('🔑 已自動載入加密 API Key');
        }
      } catch (e) {
        console.warn('⚠️ 無法載入 API Key:', e);
      }
    };
    load();
  }, []);

  const calculateState = (settings: UserSettings | null, transactions: any[]): AppState => {
    if (!settings) return { settings, transactions, currentDailyBalance: 0, todayAllowance: 0 };
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Emergency total
    const monthSpentEmergency = transactions
      .filter(t => t.is_emergency)
      .reduce((acc, t) => acc + t.amount, 0);

    // Remaining budget for distribution
    const netMonthly = settings.total_budget - settings.fixed_expenses - monthSpentEmergency;
    
    // Days remaining
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const remainingDays = daysInMonth - now.getDate() + 1;

    // Daily allowance for TODAY
    const normalSpentBeforeToday = transactions
      .filter(t => !t.is_emergency && t.created_at.split('T')[0] !== todayStr)
      .reduce((acc, t) => acc + t.amount, 0);

    const todayAllowance = Math.max(0, (netMonthly - normalSpentBeforeToday) / remainingDays);
    
    // Today's balance
    const todaySpentNormal = transactions
      .filter(t => !t.is_emergency && t.created_at.split('T')[0] === todayStr)
      .reduce((acc, t) => acc + t.amount, 0);

    const currentDailyBalance = todayAllowance - todaySpentNormal;

    return {
      settings,
      transactions,
      currentDailyBalance,
      todayAllowance
    };
  };

  const handleApplySettings = (settings: UserSettings) => {
    saveSettings(settings);
    const transactions = getTransactions();
    setState(calculateState(settings, transactions));
  };

  const handleAddTransaction = (data: { 
    amount: number; 
    category: Category | IncomeCategory; 
    isEmergency: boolean; 
    item: string; 
    created_at?: string;
    transaction_type: 'expense' | 'income';
  }) => {
    const settings = state.settings;
    if (!settings) return;

    const isIncome = data.transaction_type === 'income';
    let taxSaved = 0;

    if (isIncome) {
      // 💹 Income: add to total_budget (補血)
      console.log('💹 收入補血:', data.item, '+$', data.amount);
      saveSettings({ total_budget: settings.total_budget + data.amount });
    } else {
      // Virtual Luxury Tax Logic (expense only)
      if (!data.isEmergency && settings.taxed_categories.includes(data.category as Category)) {
        taxSaved = Math.floor(data.amount * 0.2);
        console.log('💸 徵收 20% 奧侈稅:', taxSaved, '將存入撲滿');
      }
    }

    // Add to DB
    addTransaction({
      amount: data.amount,
      category: data.category,
      is_emergency: data.isEmergency,
      item: data.item,
      created_at: data.created_at,
      transaction_type: data.transaction_type,
    });

    // Update piggy bank if tax applies
    if (taxSaved > 0) {
      saveSettings({
        piggy_bank_saved: settings.piggy_bank_saved + taxSaved
      });
      addFundRecord(taxSaved, `來自「${data.item || data.category}」的獻祯點數`);
    }

    // Refresh state
    const updatedSettings = getSettings();
    const updatedTransactions = getTransactions();
    setState(calculateState(updatedSettings, updatedTransactions));
  };

  const handleSettleDay = () => {
    const s = state.settings;
    if (!s) return;

    console.log('🌙 開始午夜結算...');
    const surplus = state.currentDailyBalance;
    const isOverspent = surplus < 0;
    const overspendAmount = Math.abs(surplus);
    const allowance = state.todayAllowance;

    let newStreak = s.current_streak;
    let newSaved = s.piggy_bank_saved;
    let newTotalBudget = s.total_budget;
    let nextTaxedCategories: Category[] = [];

    if (!isOverspent) {
      const surplusInt = Math.floor(surplus);
      newSaved += surplusInt;
      newStreak += 1;
      if (surplusInt > 0) {
        addFundRecord(surplusInt, `今日節餘自動存入`);
      }
      
      if (newStreak % 7 === 0 && newStreak > 0) {
        const reward = Math.floor(allowance * 7 * 0.1);
        newSaved += reward;
        addFundRecord(reward, `🏆 連擊 ${newStreak} 天額外獎勵`);
        alert(`🏆 達成 ${newStreak} 天連擊！獲贈 $${reward} 夢想獎金！`);
      }
    } else {
      newStreak = 0;
      if (overspendAmount > allowance * 0.5) { 
        const penalty = Math.floor(overspendAmount * 0.1);
        newTotalBudget -= penalty;
        alert(`☠️ 嚴重超支！額外從月預算沒收 $${penalty} 罰金。`);
      }

      const today = new Date().toISOString().split('T')[0];
      const naughtyCategories = state.transactions
        .filter(t => t.created_at.split('T')[0] === today && ['🧋 快樂水/零食', '娛樂社交'].includes(t.category))
        .map(t => t.category);
      
      nextTaxedCategories = Array.from(new Set(naughtyCategories)) as Category[];
    }

    saveSettings({
      piggy_bank_saved: newSaved,
      current_streak: newStreak,
      total_budget: newTotalBudget,
      taxed_categories: nextTaxedCategories,
      last_login_date: new Date().toISOString().split('T')[0]
    });

    // 🕒 Simulate day rollover: backdate today's transactions to yesterday
    // so calculateState treats it as a new day with fresh daily allowance
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    state.transactions
      .filter(t => t.created_at.split('T')[0] === todayStr)
      .forEach(t => updateTransaction(t.id, { created_at: yesterday }));

    const updatedSettings = getSettings();
    const updatedTransactions = getTransactions();
    setState(calculateState(updatedSettings, updatedTransactions));
    
    if (!isOverspent) {
      alert(`🎉 結算完成！今日節餘 $${Math.floor(surplus)} 已存入撲滿。`);
    }
  };

  const handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  const handleWithdrawFund = (amount: number) => {
    const s = state.settings;
    if (!s) return;
    if (amount <= 0 || amount > s.piggy_bank_saved) {
      alert('無效的提領金額！超過可用餘額或低於零。');
      return;
    }

    const roundedAmount = Math.floor(amount);
    addFundRecord(-roundedAmount, '手動從基金拿出');
    saveSettings({
      piggy_bank_saved: s.piggy_bank_saved - roundedAmount
    });
    setState(calculateState(getSettings(), getTransactions()));
  };

  if (!dbReady) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-black text-2xl tracking-tighter">
      LOADING SURVIVAL ENGINE...
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col font-sans antialiased text-slate-900 overflow-x-hidden">
      {!state.settings ? (
        <Onboarding onComplete={handleApplySettings} />
      ) : (
        <div className="flex-1 flex flex-col pb-24 relative">
          {currentTab === 'fund' && <Fund state={state} onOpenSettings={() => setIsSettingsOpen(true)} />}
          {currentTab === 'home' && (
            <Home 
              state={state} 
              onOpenRecord={() => setIsModalOpen(true)} 
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          )}
          {currentTab === 'history' && <HistoryList state={state} onRefresh={() => setState(calculateState(getSettings(), getTransactions()))} />}

          {/* Bottom Navigation Bar */}
          <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t border-slate-100 px-6 py-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40 pb-safe">
            <div className="max-w-md mx-auto flex justify-between items-center text-slate-400">
              <button 
                onClick={() => setCurrentTab('fund')}
                className={cn(
                  "flex flex-col items-center gap-1.5 transition-all p-2 rounded-2xl w-20",
                  currentTab === 'fund' ? "text-slate-900 font-bold" : "hover:text-slate-600 font-medium"
                )}
              >
                <div className={cn("p-2 rounded-2xl transition-all", currentTab === 'fund' && "bg-slate-100 shadow-inner")}>
                  <PiggyBank size={24} />
                </div>
                <span className="text-[10px]">夢想基金</span>
              </button>

              <button 
                onClick={() => setCurrentTab('home')}
                className={cn(
                  "flex flex-col items-center gap-1.5 transition-all p-2 rounded-2xl w-20 transform -translate-y-4",
                  currentTab === 'home' ? "text-slate-900 font-bold" : "hover:text-slate-600 font-medium"
                )}
              >
                <div className={cn(
                  "p-4 rounded-full shadow-xl transition-all text-white", 
                  currentTab === 'home' ? "bg-slate-900 shadow-slate-900/20 scale-110" : "bg-slate-400 shadow-slate-300/50"
                )}>
                  <Wallet size={28} />
                </div>
                <span className="text-[10px]">主頁面</span>
              </button>

              <button 
                onClick={() => setCurrentTab('history')}
                className={cn(
                  "flex flex-col items-center gap-1.5 transition-all p-2 rounded-2xl w-20",
                  currentTab === 'history' ? "text-slate-900 font-bold" : "hover:text-slate-600 font-medium"
                )}
              >
                <div className={cn("p-2 rounded-2xl transition-all", currentTab === 'history' && "bg-slate-100 shadow-inner")}>
                  <HistoryIcon size={24} />
                </div>
                <span className="text-[10px]">歷史帳單</span>
              </button>
            </div>
          </div>

          <AnimatePresence>
            {isModalOpen && (
              <TransactionModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleAddTransaction}
                taxedCategories={state.settings.taxed_categories}
                piggyBankSaved={state.settings.piggy_bank_saved}
                onWithdrawFund={handleWithdrawFund}
              />
            )}
            {isSettingsOpen && state.settings && (
              <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                settings={state.settings}
                onSave={(newSettings) => {
                  saveSettings(newSettings);
                  setState(calculateState(getSettings(), getTransactions()));
                }}
                onSimulateDay={handleSettleDay}
                onReset={handleReset}
              />
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
