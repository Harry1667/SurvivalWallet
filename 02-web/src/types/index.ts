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
// - 'normal'     一般即時記錄，會影響今日剩餘 / 撲滿 / streak / 奧侈稅 / total_budget
// - 'backfill'   補記（最近忘了記），只進歷史，不影響任何現在的狀態
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
  last_login_date: string;
  taxed_categories: Category[]; // Categories with +20% tax
}

export interface AppState {
  settings: UserSettings | null;
  transactions: Transaction[];
  currentDailyBalance: number;
  todayAllowance: number;
}
