import { useState, useEffect } from 'react';
import { Onboarding } from './components/Onboarding';
import { Home } from './components/Home';
import { HistoryList } from './components/HistoryList';
import { TransactionModal } from './components/TransactionModal';
import { SettingsModal } from './components/SettingsModal';
import { Report } from './components/Report';
import {
  initDB, getSettings, saveSettings, addTransaction, getTransactions, clearDB,
} from './lib/db';
import { deriveBudget } from './lib/budget';
import type { AppState, UserSettings } from './types';
import { EMPTY_BUDGET } from './types';
import { AnimatePresence, motion } from 'motion/react';
import { Wallet, History as HistoryIcon, PieChart as PieChartIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type Tab = 'home' | 'history' | 'report';

const TAB_ORDER: Tab[] = ['home', 'history', 'report'];

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

function buildState(settings: UserSettings | null, transactions: AppState['transactions']): AppState {
  return {
    settings,
    transactions,
    budget: settings ? deriveBudget(settings, transactions) : EMPTY_BUDGET,
  };
}

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [state, setState] = useState<AppState>({ settings: null, transactions: [], budget: EMPTY_BUDGET });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<Tab>('home');
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
      try {
        await initDB();
        refresh();
      } catch (e) {
        console.error('❌ 初始化失敗:', e);
      } finally {
        setDbReady(true);
      }
    };
    load();
  }, []);

  const refresh = () => {
    setState(buildState(getSettings(), getTransactions()));
  };

  const handleApplySettings = async (settings: UserSettings) => {
    await saveSettings(settings);
    refresh();
  };

  const handleAddTransaction = async (data: {
    amount: number;
    category: string;
    note: string;
    is_big: boolean;
    created_at?: string;
  }) => {
    await addTransaction(data);
    refresh();
  };

  const handleReset = async () => {
    localStorage.removeItem('theme');
    await clearDB();
    window.location.reload();
  };

  if (!dbReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-black text-2xl tracking-tighter">
        載入中…
      </div>
    );
  }

  if (!state.settings) {
    return <Onboarding onComplete={handleApplySettings} />;
  }

  return (
    <div className="min-h-screen flex flex-col font-sans antialiased text-slate-900 overflow-x-hidden bg-slate-50 dark:bg-[#0f172a] transition-colors duration-500">
      <div className="flex-1 flex flex-col pb-24 relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="flex-1 flex flex-col"
          >
            {currentTab === 'home' && (
              <Home
                state={state}
                onOpenRecord={() => setIsModalOpen(true)}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onRefresh={refresh}
              />
            )}
            {currentTab === 'history' && <HistoryList state={state} onRefresh={refresh} />}
            {currentTab === 'report' && <Report state={state} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#1e293b]/90 backdrop-blur-xl border-t border-slate-100 dark:border-[#334155] px-6 py-3 flex justify-around items-center">
        {([
          { tab: 'home', icon: Wallet, label: '首頁' },
          { tab: 'history', icon: HistoryIcon, label: '歷史' },
          { tab: 'report', icon: PieChartIcon, label: '報表' },
        ] as { tab: Tab; icon: typeof Wallet; label: string }[]).map(({ tab, icon: Icon, label }) => (
          <button
            key={tab}
            onClick={() => setCurrentTab(tab)}
            className={cn(
              'flex flex-col items-center gap-1 px-4 py-1 rounded-2xl transition-all',
              currentTab === tab ? 'text-slate-900 dark:text-white' : 'text-slate-400',
            )}
            aria-label={label}
          >
            <Icon size={22} strokeWidth={currentTab === tab ? 3 : 2} />
            <span className="text-[10px] font-black tracking-wide">{label}</span>
          </button>
        ))}
      </nav>

      <AnimatePresence>
        {isModalOpen && (
          <TransactionModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onConfirm={async (data) => { await handleAddTransaction(data); setIsModalOpen(false); }}
            categories={state.settings.categories}
            currencySymbol={state.settings.currency_symbol}
            dailyAllowance={state.budget.dailyAllowance}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSettingsOpen && (
            <SettingsModal
              settings={state.settings}
              onClose={() => setIsSettingsOpen(false)}
              onSave={handleApplySettings}
              isDarkMode={isDarkMode}
              onToggleDark={() => setIsDarkMode(v => !v)}
              onReset={handleReset}
          />
        )}
      </AnimatePresence>

      {TAB_ORDER.length === 0 && null}
    </div>
  );
}
