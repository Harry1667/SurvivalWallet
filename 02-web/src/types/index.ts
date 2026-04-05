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

export interface Transaction {
  id: string;
  amount: number;
  category: Category | IncomeCategory;
  is_emergency: boolean;
  item: string;
  created_at: string; // ISO string
  transaction_type: 'expense' | 'income';
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
