export type Category = 
  | '生存正餐' 
  | '快樂水/零食' 
  | '生活日用' 
  | '交通通勤' 
  | '娛樂社交' 
  | '自我投資' 
  | '其他雜項';

export type IncomeCategory =
  | '基礎補給'
  | '任務賞金'
  | '天降寶箱'
  | '裝備變現'
  | '被動生息'
  | '其他補血';

// 紀錄輸入模式：
// - 'normal'     一般即時記錄，會影響今日剩餘 / 撲滿 / streak / 奧侈稅 / 本月預算池
//                （收入會加進本月預算池，但不會改寫使用者設定的 total_budget）
// - 'backfill'   補記（最近忘了記），會進入本月預算池影響今日剩餘，
//                但不會回頭重算過去那天的 streak / 撲滿 / 奧侈稅
// - 'historical' 歷史匯入（開發前的紀錄），只當歷史資料用，不影響任何現在的狀態
export type EntryMode = 'normal' | 'backfill' | 'historical';

export interface Transaction {
  id: string;
  amount: number;
  category: Category | IncomeCategory;
  is_emergency: boolean;
  item: string;
  created_at: string; // ISO string
  transaction_type: 'expense' | 'income';
  entry_mode: EntryMode;
}

export interface UserSettings {
  total_budget: number;
  fixed_expenses: number;
  daily_base_budget: number;
  piggy_bank_name: string;
  piggy_bank_goal: number;
  piggy_bank_saved: number;
  current_streak: number;
  longest_streak: number;       // 歷史最長連擊
  total_perfect_days: number;   // 累計完美日（歷史上 surplus ≥ 0 的天數）
  last_login_date: string;
  taxed_categories: Category[]; // Categories with +20% tax
  // 可調參數
  luxury_tax_rate: number;      // 奢侈稅稅率，預設 0.2 (20%)
  overspend_threshold: number;  // 嚴重超支門檻，預設 0.5 (超過配額 50%)
  streak_reward_rate: number;   // 連擊獎勵倍率，預設 0.1 (10%)
  currency_symbol: string;      // 幣別符號，預設 '$'
  week_start_day: number;       // 每週起始日，0=日 1=一 ... 6=六，預設 1
}

// 撲滿金流紀錄 — 有結構化 kind，方便做撲滿構成分析
export interface FundRecord {
  id: string;
  amount: number;
  reason: string;
  kind: 'tax' | 'surplus' | 'streak_reward' | 'penalty' | 'manual';
  source_category?: string | null;
  created_at: string;
}

export interface AppState {
  settings: UserSettings | null;
  transactions: Transaction[];
  currentDailyBalance: number;
  todayAllowance: number;
}
