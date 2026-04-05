import initSqlJs, { type Database } from 'sql.js';
import type { Transaction, UserSettings, Category } from '../types';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

let db: Database | null = null;

export const initDB = async (): Promise<Database> => {
  if (db) return db;

  const SQL = await initSqlJs({
    locateFile: () => wasmUrl
  });

  try {
    const res = await fetch('/api/db/load');
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
        category TEXT NOT NULL CHECK(category IN ('生存正餐', '快樂水/零食', '生活日用', '交通通勤', '娛樂社交', '自我投資', '其他雜項')),
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

export const addFundRecord = (amount: number, reason: string) => {
  if (!db) return;
  const id = crypto.randomUUID();
  db.run('INSERT INTO fund_records (id, amount, reason) VALUES (?, ?, ?)', [id, amount, reason]);
  saveDB();
};

export const saveDB = async () => {
  if (!db) return;
  const data = db.export();
  try {
    await fetch('/api/db/save', {
      method: 'POST',
      body: new Blob([data.buffer as ArrayBuffer]),
      headers: {
        'Content-Type': 'application/octet-stream'
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
    taxed_categories: JSON.parse(obj.taxed_categories_json || '[]')
  };
};

export const saveSettings = (settings: Partial<UserSettings>) => {
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
  } else {
    // Insert new
    const keys = ['id', 'total_budget', 'fixed_expenses', 'daily_base_budget', 'piggy_bank_name', 'piggy_bank_goal', 'piggy_bank_saved', 'current_daily_balance', 'current_streak', 'last_login_date', 'taxed_categories_json'];
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
      s.last_login_date || new Date().toISOString().split('T')[0],
      JSON.stringify(s.taxed_categories || [])
    ];
    db.run(`INSERT INTO user_settings (${keys.join(', ')}) VALUES (${placeholders})`, values);
  }
  saveDB();
};

export const addTransaction = (t: Partial<Transaction>) => {
  if (!db) return;
  const id = crypto.randomUUID();
  const created_at = t.created_at || new Date().toISOString();
  const transaction_type = t.transaction_type || 'expense';
  const values = [
    id, 
    t.amount ?? 0, 
    t.category ?? '其他雜項', 
    t.is_emergency ? 1 : 0, 
    t.item || '未分類消費', 
    created_at,
    transaction_type
  ];
  db.run(
    `INSERT INTO transactions (id, amount, category, is_emergency, item, created_at, transaction_type) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    values
  );
  saveDB();
  console.log('📝 已新增交易:', transaction_type, t.item || t.category, '$', t.amount);
};

export const deleteTransaction = (id: string) => {
  if (!db) return;
  db.run('DELETE FROM transactions WHERE id = ?', [id]);
  saveDB();
};

export const updateTransaction = (id: string, t: Partial<Transaction>) => {
  if (!db) return;
  
  const updates: string[] = [];
  const values: any[] = [];

  if (t.amount !== undefined) { updates.push('amount = ?'); values.push(t.amount); }
  if (t.category !== undefined) { updates.push('category = ?'); values.push(t.category); }
  if (t.is_emergency !== undefined) { updates.push('is_emergency = ?'); values.push(t.is_emergency ? 1 : 0); }
  if (t.item !== undefined) { updates.push('item = ?'); values.push(t.item); }
  if (t.created_at !== undefined) { updates.push('created_at = ?'); values.push(t.created_at); }
  if (t.transaction_type !== undefined) { updates.push('transaction_type = ?'); values.push(t.transaction_type); }

  if (updates.length > 0) {
    values.push(id);
    db.run(`UPDATE transactions SET ${updates.join(', ')} WHERE id = ?`, values);
    saveDB();
  }
};

export const getTransactions = (limit = 50): Transaction[] => {
  if (!db) return [];
  const res = db.exec(`SELECT * FROM transactions ORDER BY created_at DESC LIMIT ${limit}`);
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
    };
  });
};
