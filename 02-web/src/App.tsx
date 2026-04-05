import React, { useState, useEffect } from 'react';
import { Onboarding } from './components/Onboarding';
import { Home } from './components/Home';
import { Fund } from './components/Fund';
import { HistoryList } from './components/HistoryList';
import { TransactionModal } from './components/TransactionModal';
import { SettingsModal } from './components/SettingsModal';
import { Report } from './components/Report';
import { Details } from './components/Details';
import { initDB, getSettings, saveSettings, addTransaction, getTransactions, addFundRecord, updateTransaction, clearDB } from './lib/db';
import type { AppState, Category, IncomeCategory, UserSettings } from './types';
import { AnimatePresence, motion } from 'motion/react';
import { PiggyBank, Wallet, History as HistoryIcon, PieChart as PieChartIcon, ClipboardList } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type Tab = 'details' | 'fund' | 'home' | 'history' | 'report';

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
  const [showRolloverToast, setShowRolloverToast] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const load = async () => {
      console.log('📱 核心組件啟動...');
      try {
        await initDB();
        let settings = getSettings();
        const transactions = getTransactions();
        
        if (settings && settings.last_login_date) {
          const todayStr = new Date().toISOString().split('T')[0];
          if (settings.last_login_date < todayStr) {
            const hasChanged = runAutoRollover(settings, transactions, todayStr);
            if (hasChanged) {
              settings = getSettings(); // Refresh from DB
              setShowRolloverToast(true);
              setTimeout(() => setShowRolloverToast(false), 5000);
            }
          }
        }

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

  const runAutoRollover = (settings: UserSettings, transactions: any[], todayStr: string) => {
    let currDateStr = settings.last_login_date;
    let changed = false;
    let s = { ...settings };
    
    // Safety cap to prevent infinite loop if weird dates exist
    let limit = 0;
    
    while (currDateStr < todayStr && limit < 100) {
      limit++;
      
      const settleStr = currDateStr;
      const monthStr = settleStr.substring(0, 7);
      
      // Calc allowance for settleStr
      const monthSpentEmergency = transactions
        .filter(t => t.is_emergency && t.created_at.startsWith(monthStr) && t.created_at.split('T')[0] <= settleStr)
        .reduce((acc, t) => acc + t.amount, 0);
        
      const netMonthly = s.total_budget - s.fixed_expenses - monthSpentEmergency;
      const [year, month, day] = settleStr.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      const remainingDays = daysInMonth - day + 1;
      
      const normalSpentBeforeSettle = transactions
        .filter(t => !t.is_emergency && t.created_at.startsWith(monthStr) && t.created_at.split('T')[0] < settleStr)
        .reduce((acc, t) => acc + t.amount, 0);
        
      const settleAllowance = Math.max(0, (netMonthly - normalSpentBeforeSettle) / remainingDays);
      
      const daySpend = transactions
        .filter(t => !t.is_emergency && t.created_at.split('T')[0] === settleStr)
        .reduce((acc, t) => acc + t.amount, 0);
        
      const surplus = settleAllowance - daySpend;
      const isOverspent = surplus < 0;

      if (!isOverspent) {
        const surplusInt = Math.floor(surplus);
        s.piggy_bank_saved += surplusInt;
        s.current_streak += 1;
        if (surplusInt > 0) {
          addFundRecord(surplusInt, `結算 ${settleStr} 節餘存入`);
        }
        if (s.current_streak % 7 === 0 && s.current_streak > 0) {
          const reward = Math.floor(settleAllowance * 7 * 0.1);
          s.piggy_bank_saved += reward;
          addFundRecord(reward, `🏆 連擊 ${s.current_streak} 天附加獎勵 (${settleStr})`);
        }
      } else {
        s.current_streak = 0;
        const overspendAmount = Math.abs(surplus);
        if (overspendAmount > settleAllowance * 0.5) {
           const penalty = Math.floor(overspendAmount * 0.1);
           s.total_budget -= penalty;
        }
        const naughtyCategories = transactions
          .filter(t => t.created_at.split('T')[0] === settleStr && ['快樂水/零食', '娛樂社交'].includes(t.category))
          .map(t => t.category);
        s.taxed_categories = Array.from(new Set(naughtyCategories)) as Category[];
      }
      
      // Advance exactly one day
      const d = new Date(year, month - 1, day + 1);
      currDateStr = d.toISOString().split('T')[0];
      changed = true;
    }
    
    if (changed) {
      s.last_login_date = todayStr;
      saveSettings(s);
      return true;
    }
    return false;
  };

  const calculateState = (settings: UserSettings | null, transactions: any[]): AppState => {
    if (!settings) return { settings, transactions, currentDailyBalance: 0, todayAllowance: 0 };
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const monthStr = todayStr.substring(0, 7);
    
    // Emergency total THIS MONTH
    const monthSpentEmergency = transactions
      .filter(t => t.is_emergency && t.created_at.startsWith(monthStr))
      .reduce((acc, t) => acc + t.amount, 0);

    // Remaining budget for distribution
    const netMonthly = settings.total_budget - settings.fixed_expenses - monthSpentEmergency;
    
    // Days remaining
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const remainingDays = daysInMonth - now.getDate() + 1;

    // Daily allowance for TODAY
    const normalSpentBeforeToday = transactions
      .filter(t => !t.is_emergency && t.created_at.startsWith(monthStr) && t.created_at.split('T')[0] !== todayStr)
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

  const handleReset = async () => {
    localStorage.clear();
    await clearDB();
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

  const appBgColor = currentTab === 'home' 
    ? (state.currentDailyBalance > 0 ? 'bg-emerald-50' : 'bg-rose-50')
    : 'bg-slate-50';

  return (
    <div className={cn("min-h-screen flex flex-col font-sans antialiased text-slate-900 overflow-x-hidden transition-colors duration-700", appBgColor)}>
      {/* Auto Rollover Toast Alert */}
      <AnimatePresence>
        {showRolloverToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-8 left-1/2 z-50 bg-emerald-500 text-white px-6 py-3 rounded-full font-black shadow-lg shadow-emerald-500/30 w-max"
          >
            🌙 已為您執行未登入天數的自動結算！
          </motion.div>
        )}
      </AnimatePresence>

      {!state.settings ? (
        <Onboarding onComplete={handleApplySettings} />
      ) : (
        <div className="flex-1 flex flex-col pb-24 relative">
          {currentTab === 'details' && (
            <Details 
              state={state} 
              onOpenSettings={() => setIsSettingsOpen(true)}
              onSaveSettings={(newSettings) => {
                saveSettings(newSettings);
                setState(calculateState(getSettings(), getTransactions()));
              }}
            />
          )}
          {currentTab === 'fund' && <Fund state={state} onOpenSettings={() => setIsSettingsOpen(true)} />}
          {currentTab === 'home' && (
            <Home 
              state={state} 
              onOpenRecord={() => setIsModalOpen(true)} 
              onOpenSettings={() => setIsSettingsOpen(true)}
              onRefresh={() => setState(calculateState(getSettings(), getTransactions()))}
            />
          )}
          {currentTab === 'history' && <HistoryList state={state} onRefresh={() => setState(calculateState(getSettings(), getTransactions()))} />}
          {currentTab === 'report' && <Report state={state} onOpenSettings={() => setIsSettingsOpen(true)} />}

          {/* Bottom Navigation Bar */}
          <div className="fixed bottom-0 left-0 right-0 bg-white/70 backdrop-blur-2xl border-t border-slate-100/50 shadow-[0_-10px_40px_rgba(0,0,0,0.02)] z-40 pb-safe">
            <div className="max-w-md mx-auto flex justify-between items-center text-slate-400 px-4 py-2">
              {[
                { id: 'details', icon: ClipboardList, label: '詳細' },
                { id: 'fund', icon: PiggyBank, label: '撲滿' },
                { id: 'home', icon: Wallet, label: '主控台' },
                { id: 'history', icon: HistoryIcon, label: '帳單' },
                { id: 'report', icon: PieChartIcon, label: '報表' }
              ].map((item) => (
                <button 
                  key={item.id}
                  onClick={() => setCurrentTab(item.id as Tab)}
                  className={cn(
                    "flex flex-col items-center gap-1 transition-all p-2 rounded-2xl flex-1",
                    currentTab === item.id 
                      ? "text-slate-900 scale-105" 
                      : "hover:text-slate-600 hover:scale-105"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-xl transition-all duration-300", 
                    currentTab === item.id ? "bg-slate-900 text-white shadow-md shadow-slate-900/20" : "bg-transparent text-slate-400"
                  )}>
                    <item.icon size={22} strokeWidth={currentTab === item.id ? 2.5 : 2} />
                  </div>
                  <span className={cn(
                    "text-[10px] whitespace-nowrap tracking-wider hidden sm:block",
                    currentTab === item.id ? "font-bold" : "font-medium"
                  )}>{item.label}</span>
                </button>
              ))}
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
                onSimulateDay={handleSettleDay}
                onReset={handleReset}
                isDarkMode={isDarkMode}
                onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
              />
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
