// 單純記帳模型：每日固定額度 + 基金吸收日常差額 + 大筆支出從預算池扣並重算每日。

export interface FixedExpense {
  name: string;
  amount: number;
}

export interface UserSettings {
  monthly_income: number;       // 月收入（例: 12000）
  fixed_expenses: FixedExpense[]; // 每月固定大筆（健身房、水電…）
  currency_symbol: string;      // 幣別符號，預設 '$'
  categories: string[];         // 自訂支出分類；空則用 DEFAULT_CATEGORIES
}

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  note: string;
  is_big: boolean;              // true = 大筆/一次性（從預算池扣、重算每日額度）
  created_at: string;           // 本地 ISO：YYYY-MM-DDTHH:mm:ss
}

// 從交易即時算出的衍生值（純函數，無儲存狀態）
export interface BudgetState {
  dailyAllowance: number;   // 今日的每日額度（隨大筆支出往後變動）
  todayRemaining: number;   // 今日可用 = 今日額度 − 今日日常花費（可為負）
  fund: number;             // 基金 = 截至昨天累積的（額度 − 日常花費）
  dailySpentMonth: number;  // 本月日常支出總額
  bigSpentMonth: number;    // 本月大筆支出總額
}

export interface AppState {
  settings: UserSettings | null;
  transactions: Transaction[];
  budget: BudgetState;
}

export const DEFAULT_CATEGORIES = ['飲食', '交通', '日用', '娛樂', '醫療', '其他'];

export const EMPTY_BUDGET: BudgetState = {
  dailyAllowance: 0,
  todayRemaining: 0,
  fund: 0,
  dailySpentMonth: 0,
  bigSpentMonth: 0,
};
