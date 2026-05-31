import initSqlJs, { type Database } from 'sql.js';
import type { Transaction, UserSettings, FixedExpense } from '../types';
import { DEFAULT_CATEGORIES } from '../types';
import { toLocalDateStr } from './budget';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

let db: Database | null = null;

const SCHEMA_VERSION = '2';

// === 跨裝置同步設定 ===
const IS_PROD = import.meta.env.PROD;
const API_LOAD_URL = IS_PROD ? '/api.php?action=load' : '/api/db/load';
const API_SAVE_URL = IS_PROD ? '/api.php?action=save' : '/api/db/save';
const SYNC_TOKEN = import.meta.env.VITE_SYNC_TOKEN || '';

function createSchema(database: Database) {
  database.run(`
    CREATE TABLE settings (
      id                  INTEGER PRIMARY KEY CHECK (id = 1),
      monthly_income      INTEGER NOT NULL DEFAULT 0,
      fixed_expenses_json TEXT    NOT NULL DEFAULT '[]',
      currency_symbol     TEXT    NOT NULL DEFAULT '$',
      categories_json     TEXT    NOT NULL DEFAULT '[]'
    );
    CREATE TABLE transactions (
      id          TEXT PRIMARY KEY,
      amount      INTEGER  NOT NULL,
      category    TEXT     NOT NULL DEFAULT '其他',
      note        TEXT     DEFAULT '',
      is_big      INTEGER  NOT NULL DEFAULT 0,
      created_at  DATETIME NOT NULL
    );
    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
  `);
  database.run(`INSERT INTO meta (key, value) VALUES ('schema_version', ?)`, [SCHEMA_VERSION]);
}

/** 是否已是新 schema（meta.schema_version === '2'） */
function isCurrentSchema(database: Database): boolean {
  try {
    const res = database.exec(`SELECT value FROM meta WHERE key = 'schema_version'`);
    return res.length > 0 && res[0].values[0][0] === SCHEMA_VERSION;
  } catch {
    return false;
  }
}

export const initDB = async (): Promise<Database> => {
  if (db) return db;

  const SQL = await initSqlJs({ locateFile: () => wasmUrl });

  let loaded: Database | null = null;
  try {
    const res = await fetch(API_LOAD_URL, {
      headers: IS_PROD ? { Authorization: `Bearer ${SYNC_TOKEN}` } : undefined,
    });
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      if (buffer.byteLength > 0) {
        loaded = new SQL.Database(new Uint8Array(buffer));
      }
    }
  } catch (e) {
    console.warn('⚠️ 無法載入遠端資料庫，將建立新的', e);
  }

  if (loaded && isCurrentSchema(loaded)) {
    db = loaded;
    console.log('✅ 讀取資料庫');
  } else {
    // 舊 schema 或全新 → 直接建乾淨的新庫（使用者已同意捨棄舊資料）
    if (loaded) console.log('🗑️ 偵測到舊版資料，依設定捨棄並重建');
    db = new SQL.Database();
    createSchema(db);
    console.log('🚀 初始化全新資料庫');
    await saveDB();
  }

  return db;
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
        ...(IS_PROD ? { Authorization: `Bearer ${SYNC_TOKEN}` } : {}),
      },
    });
  } catch (e) {
    console.error('❌ 同步資料庫失敗:', e);
  }
};

// --- Settings ---

export const getSettings = (): UserSettings | null => {
  if (!db) return null;
  const res = db.exec('SELECT * FROM settings WHERE id = 1');
  if (res.length === 0 || res[0].values.length === 0) return null;

  const cols = res[0].columns;
  const row = res[0].values[0];
  const obj: Record<string, unknown> = {};
  cols.forEach((c, i) => { obj[c] = row[i]; });

  let fixed: FixedExpense[] = [];
  let categories: string[] = [];
  try { fixed = JSON.parse((obj.fixed_expenses_json as string) || '[]'); } catch { /* keep [] */ }
  try { categories = JSON.parse((obj.categories_json as string) || '[]'); } catch { /* keep [] */ }

  return {
    monthly_income: (obj.monthly_income as number) ?? 0,
    fixed_expenses: fixed,
    currency_symbol: (obj.currency_symbol as string) || '$',
    categories: categories.length > 0 ? categories : DEFAULT_CATEGORIES,
  };
};

export const saveSettings = async (settings: UserSettings) => {
  if (!db) return;
  db.run(
    `INSERT INTO settings (id, monthly_income, fixed_expenses_json, currency_symbol, categories_json)
     VALUES (1, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       monthly_income = excluded.monthly_income,
       fixed_expenses_json = excluded.fixed_expenses_json,
       currency_symbol = excluded.currency_symbol,
       categories_json = excluded.categories_json`,
    [
      settings.monthly_income || 0,
      JSON.stringify(settings.fixed_expenses || []),
      settings.currency_symbol || '$',
      JSON.stringify(settings.categories || []),
    ],
  );
  await saveDB();
};

// --- Transactions ---

const rowToTransaction = (cols: string[], row: (string | number | Uint8Array | null)[]): Transaction => {
  const obj: Record<string, unknown> = {};
  cols.forEach((c, i) => { obj[c] = row[i]; });
  return {
    id: obj.id as string,
    amount: obj.amount as number,
    category: (obj.category as string) || '其他',
    note: (obj.note as string) || '',
    is_big: !!obj.is_big,
    created_at: obj.created_at as string,
  };
};

export const getTransactions = (): Transaction[] => {
  if (!db) return [];
  const res = db.exec('SELECT * FROM transactions ORDER BY created_at DESC');
  if (res.length === 0) return [];
  return res[0].values.map(row => rowToTransaction(res[0].columns, row));
};

export const addTransaction = async (t: {
  amount: number;
  category: string;
  note?: string;
  is_big?: boolean;
  created_at?: string;
}) => {
  if (!db) return;
  const id = crypto.randomUUID();
  const created_at = t.created_at || `${toLocalDateStr()}T${new Date().toTimeString().slice(0, 8)}`;
  db.run(
    `INSERT INTO transactions (id, amount, category, note, is_big, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, t.amount ?? 0, t.category || '其他', t.note || '', t.is_big ? 1 : 0, created_at],
  );
  await saveDB();
};

export const updateTransaction = async (id: string, t: Partial<Transaction>) => {
  if (!db) return;
  const updates: string[] = [];
  const values: (string | number)[] = [];
  if (t.amount !== undefined) { updates.push('amount = ?'); values.push(t.amount); }
  if (t.category !== undefined) { updates.push('category = ?'); values.push(t.category); }
  if (t.note !== undefined) { updates.push('note = ?'); values.push(t.note); }
  if (t.is_big !== undefined) { updates.push('is_big = ?'); values.push(t.is_big ? 1 : 0); }
  if (t.created_at !== undefined) { updates.push('created_at = ?'); values.push(t.created_at); }
  if (updates.length === 0) return;
  values.push(id);
  db.run(`UPDATE transactions SET ${updates.join(', ')} WHERE id = ?`, values);
  await saveDB();
};

export const deleteTransaction = async (id: string) => {
  if (!db) return;
  db.run('DELETE FROM transactions WHERE id = ?', [id]);
  await saveDB();
};

export const clearDB = async () => {
  if (!db) return;
  db.run('DELETE FROM settings;');
  db.run('DELETE FROM transactions;');
  await saveDB();
  console.log('🗑️ 資料庫已重置');
};
