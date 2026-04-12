import initSqlJs, { type Database } from 'sql.js';
import type { Transaction, UserSettings } from '../types';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

let db: Database | null = null;

// === 跨裝置備份 API 設定 ===
const IS_PROD = import.meta.env.PROD;
const API_LOAD_URL = IS_PROD ? '/api.php?action=load' : '/api/db/load';
const API_SAVE_URL = IS_PROD ? '/api.php?action=save' : '/api/db/save';
const SYNC_TOKEN = import.meta.env.VITE_SYNC_TOKEN || '';

export const initDB = async (): Promise<Database> => {
  if (db) return db;

  const SQL = await initSqlJs({
    locateFile: () => wasmUrl
  });

  try {
    const res = await fetch(API_LOAD_URL, {
      headers: IS_PROD ? { 'Authorization': `Bearer ${SYNC_TOKEN}` } : undefined
    });
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      db = new SQL.Database(uint8Array);
      console.log('✅ 讀取本地端資料庫');
    }
  } catch (e) {
    console.warn('⚠️ 無法載入本地資料庫，將創建新的資料庫', e);
  }

  // If load failed or not found, create new
  if (!db) {
    db = new SQL.Database();
    console.log('🚀 初始化全新資料庫');
    // Create tables based on PRD
    db.run(`
      CREATE TABLE user_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        total_budget INTEGER NOT NULL,
        fixed_expenses INTEGER NOT NULL,
        daily_base_budget INTEGER NOT NULL,
        piggy_bank_name TEXT,
        piggy_bank_goal INTEGER,
        piggy_bank_saved INTEGER DEFAULT 0,
        current_daily_balance INTEGER,
        current_streak INTEGER DEFAULT 0,
        last_login_date DATE,
        taxed_categories_json TEXT DEFAULT '[]'
      );

      CREATE TABLE transactions (
        id TEXT PRIMARY KEY,
        amount INTEGER NOT NULL,
        category TEXT NOT NULL,
        is_emergency BOOLEAN DEFAULT 0,
        item TEXT DEFAULT '未分類消費',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  // Run migrations that apply to both new and existing DBs
  db.run(`
    CREATE TABLE IF NOT EXISTS fund_records (
      id TEXT PRIMARY KEY,
      amount INTEGER NOT NULL,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  // Migration: add transaction_type column if not exists
  try {
    db.run(`ALTER TABLE transactions ADD COLUMN transaction_type TEXT NOT NULL DEFAULT 'expense'`);
    console.log('✅ DB Migration: added transaction_type column');
  } catch (_e) {
    // Column already exists, ignore
  }
  // Migration: add entry_mode column for 補記 / 歷史匯入 功能
  // 'normal' = 一般即時記錄；'backfill' = 補記；'historical' = 歷史匯入
  try {
    db.run(`ALTER TABLE transactions ADD COLUMN entry_mode TEXT NOT NULL DEFAULT 'normal'`);
    console.log('✅ DB Migration: added entry_mode column');
  } catch {
    // Column already exists, ignore
  }
  // Migration: 為 fund_records 加上結構化 kind 與 source_category
  //   kind: 'tax' | 'surplus' | 'streak_reward' | 'penalty' | 'manual'
  //   source_category: 稅從哪個消費類別收的
  try {
    db.run(`ALTER TABLE fund_records ADD COLUMN kind TEXT NOT NULL DEFAULT 'surplus'`);
    console.log('✅ DB Migration: added fund_records.kind column');
    // 對舊資料做一次 best-effort 回填：用 reason 文字判斷 kind
    db.run(`UPDATE fund_records SET kind = 'tax' WHERE reason LIKE '%獻祯%'`);
    db.run(`UPDATE fund_records SET kind = 'streak_reward' WHERE reason LIKE '%連擊%'`);
    db.run(`UPDATE fund_records SET kind = 'surplus' WHERE reason LIKE '%節餘%'`);
  } catch {
    // Column already exists, ignore
  }
  try {
    db.run(`ALTER TABLE fund_records ADD COLUMN source_category TEXT`);
    console.log('✅ DB Migration: added fund_records.source_category column');
  } catch {
    // Column already exists, ignore
  }
  // Migration: 加上歷史最長連擊 / 累計完美日欄位
  try {
    db.run(`ALTER TABLE user_settings ADD COLUMN longest_streak INTEGER NOT NULL DEFAULT 0`);
    console.log('✅ DB Migration: added longest_streak column');
  } catch {
    // Column already exists, ignore
  }
  try {
    db.run(`ALTER TABLE user_settings ADD COLUMN total_perfect_days INTEGER NOT NULL DEFAULT 0`);
    console.log('✅ DB Migration: added total_perfect_days column');
  } catch {
    // Column already exists, ignore
  }
  // Migration: 可調遊戲化參數 + 體驗設定
  const settingsMigrations: [string, string][] = [
    [`ALTER TABLE user_settings ADD COLUMN luxury_tax_rate REAL NOT NULL DEFAULT 0.2`, 'luxury_tax_rate'],
    [`ALTER TABLE user_settings ADD COLUMN overspend_threshold REAL NOT NULL DEFAULT 0.5`, 'overspend_threshold'],
    [`ALTER TABLE user_settings ADD COLUMN streak_reward_rate REAL NOT NULL DEFAULT 0.1`, 'streak_reward_rate'],
    [`ALTER TABLE user_settings ADD COLUMN currency_symbol TEXT NOT NULL DEFAULT '$'`, 'currency_symbol'],
    [`ALTER TABLE user_settings ADD COLUMN week_start_day INTEGER NOT NULL DEFAULT 1`, 'week_start_day'],
  ];
  for (const [sql, col] of settingsMigrations) {
    try { db.run(sql); console.log(`✅ DB Migration: added ${col} column`); } catch { /* exists */ }
  }

  saveDB();
  return db;
};

export const getFundRecords = () => {
  if (!db) return [];
  try {
    const res = db.exec('SELECT * FROM fund_records ORDER BY created_at DESC');
    if (res.length === 0) return [];
    
    const columns = res[0].columns;
    return res[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });
  } catch (e) {
    return [];
  }
};

export type FundRecordKind = 'tax' | 'surplus' | 'streak_reward' | 'penalty' | 'manual';

export const addFundRecord = async (
  amount: number,
  reason: string,
  kind: FundRecordKind = 'surplus',
  source_category?: string | null
) => {
  if (!db) return;
  const id = crypto.randomUUID();
  db.run(
    'INSERT INTO fund_records (id, amount, reason, kind, source_category) VALUES (?, ?, ?, ?, ?)',
    [id, amount, reason, kind, source_category ?? null]
  );
  await saveDB();
};

export const saveDB = async () => {
  if (!db) return;
  const data = db.export();
  try {
    await fetch(API_SAVE_URL, {
      method: 'POST',
      body: new Blob([data.buffer as ArrayBuffer]),
      headers: {
        'Content-Type': 'application/octet-stream',
        ...(IS_PROD ? { 'Authorization': `Bearer ${SYNC_TOKEN}` } : {})
      }
    });
    console.log('💾 資料庫已同步至本地資料夾 /database');
  } catch (e) {
    console.error('❌ 寫入本地資料庫失敗:', e);
  }
};

// --- Helper Functions ---

export const getSettings = (): UserSettings | null => {
  if (!db) return null;
  const res = db.exec("SELECT * FROM user_settings WHERE id = 1");
  if (res.length === 0) return null;
  
  const row = res[0].values[0];
  const columns = res[0].columns;
  const obj: any = {};
  columns.forEach((col, i) => {
    obj[col] = row[i];
  });

  return {
    ...obj,
    taxed_categories: JSON.parse(obj.taxed_categories_json || '[]'),
    luxury_tax_rate: obj.luxury_tax_rate ?? 0.2,
    overspend_threshold: obj.overspend_threshold ?? 0.5,
    streak_reward_rate: obj.streak_reward_rate ?? 0.1,
    currency_symbol: obj.currency_symbol || '$',
    week_start_day: obj.week_start_day ?? 1,
  };
};

export const saveSettings = async (settings: Partial<UserSettings>) => {
  if (!db) return;
  const existing = getSettings();
  if (existing) {
    const keys = Object.keys(settings).filter(k => k !== 'taxed_categories');
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => (settings as any)[k]);
    
    // Handle taxed_categories separately
    let finalSetClause = setClause;
    let finalValues = [...values];
    if (settings.taxed_categories) {
      finalSetClause += (finalSetClause ? ', ' : '') + 'taxed_categories_json = ?';
      finalValues.push(JSON.stringify(settings.taxed_categories));
    }

    db.run(`UPDATE user_settings SET ${finalSetClause} WHERE id = 1`, finalValues);
  } else if (Object.keys(settings).length > 0) {
    // Insert new
    const keys = ['id', 'total_budget', 'fixed_expenses', 'daily_base_budget', 'piggy_bank_name', 'piggy_bank_goal', 'piggy_bank_saved', 'current_daily_balance', 'current_streak', 'longest_streak', 'total_perfect_days', 'last_login_date', 'taxed_categories_json', 'luxury_tax_rate', 'overspend_threshold', 'streak_reward_rate', 'currency_symbol', 'week_start_day'];
    const placeholders = keys.map(() => '?').join(', ');
    const s = settings as any;
    const values = [
      1,
      s.total_budget || 0,
      s.fixed_expenses || 0,
      s.daily_base_budget || 0,
      s.piggy_bank_name || '夢想撲滿',
      s.piggy_bank_goal || 0,
      s.piggy_bank_saved || 0,
      s.current_daily_balance || 0,
      s.current_streak || 0,
      s.longest_streak || 0,
      s.total_perfect_days || 0,
      s.last_login_date || (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })(),
      JSON.stringify(s.taxed_categories || []),
      s.luxury_tax_rate ?? 0.2,
      s.overspend_threshold ?? 0.5,
      s.streak_reward_rate ?? 0.1,
      s.currency_symbol || '$',
      s.week_start_day ?? 1,
    ];
    db.run(`INSERT INTO user_settings (${keys.join(', ')}) VALUES (${placeholders})`, values);
  }
  await saveDB();
};

export const addTransaction = async (t: Partial<Transaction>) => {
  if (!db) return;
  const id = crypto.randomUUID();
  const created_at = t.created_at || new Date().toISOString();
  const transaction_type = t.transaction_type || 'expense';
  const entry_mode = t.entry_mode || 'normal';
  const values = [
    id,
    t.amount ?? 0,
    t.category ?? '其他雜項',
    t.is_emergency ? 1 : 0,
    t.item || '未分類消費',
    created_at,
    transaction_type,
    entry_mode
  ];
  db.run(
    `INSERT INTO transactions (id, amount, category, is_emergency, item, created_at, transaction_type, entry_mode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    values
  );
  await saveDB();
  console.log('📝 已新增交易:', transaction_type, entry_mode, t.item || t.category, '$', t.amount);
};

export const deleteTransaction = async (id: string) => {
  if (!db) return;
  db.run('DELETE FROM transactions WHERE id = ?', [id]);
  await saveDB();
};

export const updateTransaction = async (id: string, t: Partial<Transaction>) => {
  if (!db) return;
  
  const updates: string[] = [];
  const values: any[] = [];

  if (t.amount !== undefined) { updates.push('amount = ?'); values.push(t.amount); }
  if (t.category !== undefined) { updates.push('category = ?'); values.push(t.category); }
  if (t.is_emergency !== undefined) { updates.push('is_emergency = ?'); values.push(t.is_emergency ? 1 : 0); }
  if (t.item !== undefined) { updates.push('item = ?'); values.push(t.item); }
  if (t.created_at !== undefined) { updates.push('created_at = ?'); values.push(t.created_at); }
  if (t.transaction_type !== undefined) { updates.push('transaction_type = ?'); values.push(t.transaction_type); }
  if (t.entry_mode !== undefined) { updates.push('entry_mode = ?'); values.push(t.entry_mode); }

  if (updates.length > 0) {
    values.push(id);
    db.run(`UPDATE transactions SET ${updates.join(', ')} WHERE id = ?`, values);
    await saveDB();
  }
};

export const getTransactions = (limit?: number): Transaction[] => {
  if (!db) return [];
  const query = limit
    ? `SELECT * FROM transactions ORDER BY created_at DESC LIMIT ${limit}`
    : `SELECT * FROM transactions ORDER BY created_at DESC`;
  const res = db.exec(query);
  if (res.length === 0) return [];
  
  const columns = res[0].columns;
  return res[0].values.map(row => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return {
      ...obj,
      is_emergency: !!obj.is_emergency,
      transaction_type: obj.transaction_type || 'expense',
      entry_mode: obj.entry_mode || 'normal',
    };
  });
};

export const clearDB = async () => {
  if (!db) return;
  db.run('DELETE FROM user_settings;');
  db.run('DELETE FROM transactions;');
  db.run('DELETE FROM fund_records;');
  await saveDB();
  console.log('🗑️ 資料庫已完全清空重置！');
};
