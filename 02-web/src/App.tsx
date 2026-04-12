import { useState, useEffect, useRef } from 'react';
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

/** 取得本地日期字串 YYYY-MM-DD，避免 toISOString() 的 UTC 時區偏移 */
function toLocalDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 從 ISO 時間字串取得本地日期 YYYY-MM-DD */
function localDateOf(isoStr: string): string {
  return toLocalDateStr(new Date(isoStr));
}

const TAB_ORDER: Tab[] = ['details', 'fund', 'home', 'history', 'report'];

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
  const prevTabRef = useRef<Tab>('home');
  const slideDirection = TAB_ORDER.indexOf(currentTab) >= TAB_ORDER.indexOf(prevTabRef.current) ? 1 : -1;
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
          const todayStr = toLocalDateStr();
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

    };
    load();
  }, []);

  const runAutoRollover = (settings: UserSettings, transactions: any[], todayStr: string) => {
    let currDateStr = settings.last_login_date;
    let changed = false;
    let s = { ...settings };

    // 補記/歷史匯入的紀錄不影響任何現在的狀態，rollover 只看 normal
    const liveTx = transactions.filter(t => (t.entry_mode || 'normal') === 'normal');

    // Safety cap to prevent infinite loop if weird dates exist
    let limit = 0;

    while (currDateStr < todayStr && limit < 100) {
      limit++;

      const settleStr = currDateStr;
      const monthStr = settleStr.substring(0, 7);

      // Calc allowance for settleStr（只算支出；收入另外加回預算池）
      const monthSpentEmergency = liveTx
        .filter(t => t.is_emergency && t.transaction_type === 'expense' && localDateOf(t.created_at).startsWith(monthStr) && localDateOf(t.created_at) <= settleStr)
        .reduce((acc, t) => acc + t.amount, 0);

      // 當月截至 settleStr 為止已入帳的收入（normal 內的）
      const monthIncomeBySettle = liveTx
        .filter(t => t.transaction_type === 'income' && localDateOf(t.created_at).startsWith(monthStr) && localDateOf(t.created_at) <= settleStr)
        .reduce((acc, t) => acc + t.amount, 0);

      const netMonthly = s.total_budget + monthIncomeBySettle - s.fixed_expenses - monthSpentEmergency;
      const [year, month, day] = settleStr.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      const remainingDays = daysInMonth - day + 1;

      const normalSpentBeforeSettle = liveTx
        .filter(t => !t.is_emergency && t.transaction_type === 'expense' && localDateOf(t.created_at).startsWith(monthStr) && localDateOf(t.created_at) < settleStr)
        .reduce((acc, t) => acc + t.amount, 0);

      const settleAllowance = Math.max(0, (netMonthly - normalSpentBeforeSettle) / remainingDays);

      const daySpend = liveTx
        .filter(t => !t.is_emergency && t.transaction_type === 'expense' && localDateOf(t.created_at) === settleStr)
        .reduce((acc, t) => acc + t.amount, 0);

      const surplus = settleAllowance - daySpend;
      const isOverspent = surplus < 0;

      if (!isOverspent) {
        const surplusInt = Math.floor(surplus);
        s.piggy_bank_saved += surplusInt;
        s.current_streak += 1;
        s.total_perfect_days = (s.total_perfect_days || 0) + 1;
        if (s.current_streak > (s.longest_streak || 0)) {
          s.longest_streak = s.current_streak;
        }
        if (surplusInt > 0) {
          addFundRecord(surplusInt, `結算 ${settleStr} 節餘存入`, 'surplus');
        }
        if (s.current_streak % 7 === 0 && s.current_streak > 0) {
          const reward = Math.floor(settleAllowance * 7 * (s.streak_reward_rate ?? 0.1));
          s.piggy_bank_saved += reward;
          addFundRecord(reward, `🏆 連擊 ${s.current_streak} 天附加獎勵 (${settleStr})`, 'streak_reward');
        }
      } else {
        s.current_streak = 0;
        const overspendAmount = Math.abs(surplus);
        if (overspendAmount > settleAllowance * (s.overspend_threshold ?? 0.5)) {
           const penalty = Math.floor(overspendAmount * 0.1);
           s.total_budget -= penalty;
           addFundRecord(-penalty, `☠️ 嚴重超支罰金 (${settleStr})`, 'penalty');
        }
        // 奧侈稅判斷也只看正常紀錄，不被補記/歷史汙染
        const naughtyCategories = liveTx
          .filter(t => localDateOf(t.created_at) === settleStr && ['快樂水/零食', '娛樂社交'].includes(t.category))
          .map(t => t.category);
        s.taxed_categories = Array.from(new Set(naughtyCategories)) as Category[];
      }
      
      // Advance exactly one day（用 local date 避免 UTC 偏移導致迴圈卡住）
      const d = new Date(year, month - 1, day + 1);
      currDateStr = toLocalDateStr(d);
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
    const todayStr = toLocalDateStr(now);
    const monthStr = todayStr.substring(0, 7);

    // 補記 (backfill) = 真的花掉的錢，要進入本月預算池影響今日剩餘
    // 歷史匯入 (historical) = 跨月/開發前的純歷史，不影響任何現在的數字
    // → calculateState 只排除 historical，保留 normal + backfill
    // 注意：runAutoRollover 仍然只看 normal，避免回頭重算過去那天的 streak / 撲滿
    const liveTx = transactions.filter(t => (t.entry_mode || 'normal') !== 'historical');

    // Emergency total THIS MONTH（只算支出）
    const monthSpentEmergency = liveTx
      .filter(t => t.is_emergency && t.transaction_type === 'expense' && localDateOf(t.created_at).startsWith(monthStr))
      .reduce((acc, t) => acc + t.amount, 0);

    // 本月收入（normal + backfill），要加回本月預算池
    const monthIncome = liveTx
      .filter(t => t.transaction_type === 'income' && localDateOf(t.created_at).startsWith(monthStr))
      .reduce((acc, t) => acc + t.amount, 0);

    // Remaining budget for distribution
    const netMonthly = settings.total_budget + monthIncome - settings.fixed_expenses - monthSpentEmergency;

    // Days remaining
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const remainingDays = daysInMonth - now.getDate() + 1;

    // Daily allowance for TODAY（只算支出，收入已加進 netMonthly）
    const normalSpentBeforeToday = liveTx
      .filter(t => !t.is_emergency && t.transaction_type === 'expense' && localDateOf(t.created_at).startsWith(monthStr) && localDateOf(t.created_at) !== todayStr)
      .reduce((acc, t) => acc + t.amount, 0);

    const todayAllowance = Math.max(0, (netMonthly - normalSpentBeforeToday) / remainingDays);

    // Today's balance（只算支出）
    const todaySpentNormal = liveTx
      .filter(t => !t.is_emergency && t.transaction_type === 'expense' && localDateOf(t.created_at) === todayStr)
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
    entry_mode?: import('./types').EntryMode;
  }) => {
    const settings = state.settings;
    if (!settings) return;

    const isIncome = data.transaction_type === 'income';
    const entryMode = data.entry_mode || 'normal';
    // historical = 跨月/開發前的純歷史，完全不對任何 current state 做副作用
    // backfill = 真的花掉/收到的錢，要影響本月預算池（讓今日剩餘正確）
    //            但「過去那天的結算結果」（streak/撲滿/奧侈稅）保持不動，
    //            那是 runAutoRollover 的責任，這邊管不到
    const affectsBudget = entryMode !== 'historical';
    const isNormalLive = entryMode === 'normal';
    let taxSaved = 0;

    if (isIncome) {
      // 💹 收入補血：normal + backfill 會進入本月預算池（由 calculateState 聚合時加回）
      // 注意：total_budget 是使用者設定的「每月生活費基準」，屬於設定值，
      // 絕對不要在這裡動它 — 否則 Details 的「每月總生活費」會被灌水。
      if (affectsBudget) {
        console.log(`💹 收入補血 [${entryMode}]:`, data.item, '+$', data.amount, '→ 進入本月預算池');
      } else {
        console.log('📚 歷史收入（純歷史，不影響本月預算池）:', data.item, '+$', data.amount);
      }
    } else {
      // 奧侈稅只有 normal 紀錄會觸發（補記不要回頭被過去的稅況罰）
      const taxRate = settings.luxury_tax_rate ?? 0.2;
      if (isNormalLive && !data.isEmergency && taxRate > 0 && settings.taxed_categories.includes(data.category as Category)) {
        taxSaved = Math.floor(data.amount * taxRate);
        console.log(`💸 徵收 ${Math.round(taxRate * 100)}% 奧侈稅:`, taxSaved, '將存入撲滿');
      } else if (entryMode === 'backfill') {
        console.log('🕒 補記支出:', data.item, '$', data.amount, '— 進入本月預算池但不觸發奧侈稅');
      } else if (entryMode === 'historical') {
        console.log('📚 歷史支出（純歷史，不影響任何現在的數字）:', data.item, '$', data.amount);
      }
    }

    // Add to DB（不論模式都寫進去）
    addTransaction({
      amount: data.amount,
      category: data.category,
      is_emergency: data.isEmergency,
      item: data.item,
      created_at: data.created_at,
      transaction_type: data.transaction_type,
      entry_mode: entryMode,
    });

    // Update piggy bank if tax applies (only normal entries can trigger this)
    if (taxSaved > 0) {
      saveSettings({
        piggy_bank_saved: settings.piggy_bank_saved + taxSaved
      });
      addFundRecord(
        taxSaved,
        `來自「${data.item || data.category}」的獻祯點數`,
        'tax',
        data.category as string
      );
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
    let newLongestStreak = s.longest_streak || 0;
    let newTotalPerfectDays = s.total_perfect_days || 0;
    let nextTaxedCategories: Category[] = [];

    if (!isOverspent) {
      const surplusInt = Math.floor(surplus);
      newSaved += surplusInt;
      newStreak += 1;
      newTotalPerfectDays += 1;
      if (newStreak > newLongestStreak) newLongestStreak = newStreak;
      if (surplusInt > 0) {
        addFundRecord(surplusInt, `今日節餘自動存入`, 'surplus');
      }

      if (newStreak % 7 === 0 && newStreak > 0) {
        const reward = Math.floor(allowance * 7 * (s.streak_reward_rate ?? 0.1));
        newSaved += reward;
        addFundRecord(reward, `🏆 連擊 ${newStreak} 天額外獎勵`, 'streak_reward');
        alert(`🏆 達成 ${newStreak} 天連擊！獲贈 ${s.currency_symbol || '$'}${reward} 夢想獎金！`);
      }
    } else {
      newStreak = 0;
      if (overspendAmount > allowance * (s.overspend_threshold ?? 0.5)) {
        const penalty = Math.floor(overspendAmount * 0.1);
        newTotalBudget -= penalty;
        addFundRecord(-penalty, `☠️ 嚴重超支罰金`, 'penalty');
        alert(`☠️ 嚴重超支！額外從月預算沒收 ${s.currency_symbol || '$'}${penalty} 罰金。`);
      }

      const today = toLocalDateStr();
      // 奧侈稅判斷只看 normal 紀錄，補記/歷史不會觸發
      const naughtyCategories = state.transactions
        .filter(t => (t.entry_mode || 'normal') === 'normal' && localDateOf(t.created_at) === today && ['快樂水/零食', '娛樂社交'].includes(t.category))
        .map(t => t.category);

      nextTaxedCategories = Array.from(new Set(naughtyCategories)) as Category[];
    }

    saveSettings({
      piggy_bank_saved: newSaved,
      current_streak: newStreak,
      longest_streak: newLongestStreak,
      total_perfect_days: newTotalPerfectDays,
      total_budget: newTotalBudget,
      taxed_categories: nextTaxedCategories,
      last_login_date: toLocalDateStr()
    });

    // 🕒 Simulate day rollover: backdate today's transactions to yesterday
    // so calculateState treats it as a new day with fresh daily allowance
    const todayStr = toLocalDateStr();
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    // 只把「今天的 normal 紀錄」往前推一天；補記/歷史紀錄的日期是使用者設定的，不能動
    state.transactions
      .filter(t => (t.entry_mode || 'normal') === 'normal' && localDateOf(t.created_at) === todayStr)
      .forEach(t => updateTransaction(t.id, { created_at: yesterday }));

    const updatedSettings = getSettings();
    const updatedTransactions = getTransactions();
    setState(calculateState(updatedSettings, updatedTransactions));
    
    if (!isOverspent) {
      alert(`🎉 結算完成！今日節餘 ${s.currency_symbol || '$'}${Math.floor(surplus)} 已存入撲滿。`);
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
    addFundRecord(-roundedAmount, '手動從基金拿出', 'manual');
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
    ? (state.currentDailyBalance > 0 ? 'safe-bg' : 'bg-rose-50 dark:bg-[#1c1917]')
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
            className="fixed top-8 left-1/2 z-50 bg-emerald-500 text-white text-on-accent px-6 py-3 rounded-full font-black shadow-lg shadow-emerald-500/30 w-max"
          >
            🌙 已為您執行未登入天數的自動結算！
          </motion.div>
        )}
      </AnimatePresence>

      {!state.settings ? (
        <Onboarding onComplete={handleApplySettings} />
      ) : (
        <div className="flex-1 flex flex-col pb-24 relative overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentTab}
              initial={{ x: slideDirection * 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: slideDirection * -60, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex-1 flex flex-col"
            >
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
            </motion.div>
          </AnimatePresence>

          {/* Bottom Navigation Bar */}
          <nav aria-label="主導航" className="fixed bottom-0 left-0 right-0 bg-white/70 dark:bg-[#0f172a]/80 backdrop-blur-2xl border-t border-slate-100/50 shadow-[0_-10px_40px_rgba(0,0,0,0.02)] z-40 pb-safe">
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
                  aria-label={item.label}
                  aria-current={currentTab === item.id ? 'page' : undefined}
                  onClick={() => { prevTabRef.current = currentTab; setCurrentTab(item.id as Tab); }}
                  className={cn(
                    "flex flex-col items-center gap-1 transition-all p-2 rounded-2xl flex-1",
                    currentTab === item.id
                      ? "text-slate-900 dark:text-[#f1f5f9] scale-105"
                      : "hover:text-slate-600 dark:hover:text-[#cbd5e1] hover:scale-105"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-xl transition-all duration-300",
                    currentTab === item.id
                      ? "bg-slate-900 text-white text-on-accent shadow-md shadow-slate-900/20 dark:bg-[#334155] dark:text-[#f1f5f9]"
                      : "bg-transparent text-slate-400 dark:text-[#94a3b8]"
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
          </nav>

          <AnimatePresence>
            {isModalOpen && (
              <TransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleAddTransaction}
                taxedCategories={state.settings.taxed_categories}
                piggyBankSaved={state.settings.piggy_bank_saved}
                onWithdrawFund={handleWithdrawFund}
                currencySymbol={state.settings.currency_symbol}
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
                settings={state.settings}
                transactions={state.transactions}
                onSaveSettings={(s) => {
                  saveSettings(s);
                  setState(calculateState(getSettings(), getTransactions()));
                }}
              />
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
