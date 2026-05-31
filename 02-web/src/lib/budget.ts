import type { UserSettings, Transaction, BudgetState } from '../types';

/** 本地日期字串 YYYY-MM-DD，避免 toISOString() 的 UTC 偏移 */
export function toLocalDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 從 ISO 字串取本地日期 YYYY-MM-DD */
export function localDateOf(isoStr: string): string {
  return toLocalDateStr(new Date(isoStr));
}

/** 把日期字串轉成「當天中午」本地 ISO，避免 UTC 偏移 */
export function localNoonOf(dateStr: string): string {
  return `${dateStr}T12:00:00`;
}

/**
 * 核心預算計算（純函數，逐日模擬，無副作用、無儲存狀態）。
 *
 * 模型：
 *  - 每日額度 = 剩餘預算池 ÷ 剩餘天數；正常日不變（差額由基金吸收）。
 *  - 日常支出（is_big=false）打在當天額度上 → 差額進出「基金」。
 *  - 大筆支出（is_big=true）從預算池扣掉 → 往後每日額度重算變小；過去基金不變。
 */
export function deriveBudget(
  settings: UserSettings,
  transactions: Transaction[],
  now: Date = new Date(),
): BudgetState {
  const y = now.getFullYear();
  const m = now.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const monthStr = toLocalDateStr(new Date(y, m, 1)).slice(0, 7); // YYYY-MM
  const todayDay = now.getDate();
  const fixedTotal = settings.fixed_expenses.reduce((acc, e) => acc + (e.amount || 0), 0);

  // 本月交易依「第幾天」歸戶
  const dailyByDay = new Array<number>(daysInMonth + 1).fill(0); // 日常支出
  const bigByDay = new Array<number>(daysInMonth + 1).fill(0);   // 大筆支出
  for (const t of transactions) {
    const d = localDateOf(t.created_at);
    if (!d.startsWith(monthStr)) continue;
    const day = Number(d.slice(8, 10));
    if (day < 1 || day > daysInMonth) continue;
    if (t.is_big) bigByDay[day] += t.amount;
    else dailyByDay[day] += t.amount;
  }

  let remainingPool = settings.monthly_income - fixedTotal;
  let fund = 0;
  let dailyAllowance = 0;
  let todayRemaining = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    // 當天的大筆支出先從池扣 → 觸發往後重算
    remainingPool -= bigByDay[day];
    const daysRemaining = daysInMonth - day + 1;
    const allowance = Math.max(0, Math.floor(remainingPool / daysRemaining));

    if (day < todayDay) {
      // 已完成的日子：差額併入基金，該日額度從池扣掉
      fund += allowance - dailyByDay[day];
      remainingPool -= allowance;
    } else if (day === todayDay) {
      dailyAllowance = allowance;
      todayRemaining = allowance - dailyByDay[day];
    }
  }

  const dailySpentMonth = dailyByDay.reduce((a, b) => a + b, 0);
  const bigSpentMonth = bigByDay.reduce((a, b) => a + b, 0);

  return { dailyAllowance, todayRemaining, fund, dailySpentMonth, bigSpentMonth };
}
