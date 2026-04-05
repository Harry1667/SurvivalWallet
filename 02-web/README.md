# 🎮 Dynamic Survival Wallet

> 一款以「生存遊戲」為核心概念的個人記帳 App。每天分配一定的生存額度，超支就破防，節省就存入夢想撲滿。透過遊戲化設計讓記帳變成每日挑戰，而不是痛苦的義務。

---

## 🚀 快速開始

```bash
cd 02-web
npm install
npm run dev
```

瀏覽器開啟 `http://localhost:5173` 即可使用。

> ⚠️ **Vite dev server 必須在執行中**，才能讓 SQLite 本地儲存與 API Key 管理功能正常運作。

---

## ✨ 功能特性

### 🏠 生存主頁
- **今日剩餘額度**：以超大數字顯示，配合動態背景色（安全綠 → 警戒橙 → 破產紅）
- **一鍵記帳**：點擊「＋ 記一筆」開啟記帳面板
- **今日花銷清單**：即時列出今天的所有交易記錄

### ✍️ 記帳面板（Bottom Sheet）
- **✨ AI 魔法輸入**（預設）：自然語言輸入，AI 自動判斷收支、分類、金額
- **✍️ 手動輸入**：選擇收支類型、分類、金額、備註、記錄時間

#### 支出分類（7 種）
| 分類 | 說明 |
|------|------|
| 🍜 生存正餐 | 正餐、飯食 |
| ☕ 快樂水/零食 | 飲料、零食 |
| 🛍️ 生活日用 | 日常用品 |
| 🚌 交通通勤 | 車費、油費 |
| 🎮 娛樂社交 | 娛樂、聚餐 |
| 📚 自我投資 | 課程、書籍 |
| 📦 其他雜項 | 難以分類的支出 |

#### 收入分類（6 種）
| 分類 | 說明 |
|------|------|
| 💰 基礎補給 | 月薪、生活費 |
| ⚔️ 任務賞金 | 兼職、接案收入 |
| 🎁 天降寶箱 | 中獎、紅包 |
| ♻️ 裝備變現 | 二手拍賣 |
| 📈 被動生息 | 股息、利息 |
| 📦 其他補血 | 其他收入來源 |

### 🌟 夢想基金
- 圓環進度條顯示儲蓄進度
- 每日節餘自動存入，7 天連擊獎勵加碼
- 詳細的存入記錄

### 📜 歷史帳單
- 所有交易記錄清單
- 每筆記錄支援 ⋯ 選單（編輯 / 刪除）

### ⚙️ 設定
- 每月總生活費、固定支出
- 夢想撲滿名稱與目標金額
- **Gemini API Key 管理**（加密存儲，支援新增 / 編輯 / 刪除）
- 模擬換日結算（測試用）
- 重置所有資料

---

## 🎯 遊戲化機制

| 機制 | 說明 |
|------|------|
| 📅 每日額度 | `(月預算 - 固定支出 - 緊急支出) ÷ 剩餘天數` |
| 💚 收入補血 | 收入直接加入月預算，提升後續每日額度 |
| 🩸 超支扣血 | 超支額度從下一日開始均攤 |
| 🏦 奢侈稅 | 昨日違規分類今日被加徵 +20% 稅，稅金存撲滿 |
| ☠️ 嚴重超支罰金 | 超支 > 50% 額度時，從月預算沒收 10% 罰金 |
| 🏆 連擊獎勵 | 連續節省 7 天，獲得每日額度 × 7 × 10% 獎金 |
| 🚨 突發避險 | 緊急支出不扣今日額度，但降低未來每日上限 |

---

## 🛠️ 技術棧

| 類別 | 技術 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 建構工具 | Vite |
| 樣式 | Tailwind CSS v4 |
| 動畫 | Motion (Framer Motion) |
| 資料庫 | sql.js（SQLite in-browser） |
| AI 解析 | Google Gemini 1.5 Flash |
| 圖示 | lucide-react |

---

## 📁 專案結構

```
02-web/
├── database/                  # 本地持久化資料
│   ├── survival_wallet.sqlite # SQLite 資料庫（自動生成）
│   └── api.key                # 加密儲存的 Gemini API Key（自動生成）
├── src/
│   ├── App.tsx                # 主應用入口、路由、全域狀態
│   ├── components/
│   │   ├── Home.tsx           # 生存主頁（今日額度、記帳按鈕、今日花銷）
│   │   ├── Fund.tsx           # 夢想基金頁（圓環進度、存入記錄）
│   │   ├── HistoryList.tsx    # 歷史帳單頁（所有交易 + 編輯/刪除）
│   │   ├── TransactionModal.tsx # 記帳面板（AI 輸入 + 手動輸入）
│   │   ├── EditTransactionModal.tsx # 編輯既有交易
│   │   ├── SettingsModal.tsx  # 設定面板（預算 + API Key 管理）
│   │   └── Onboarding.tsx     # 首次使用設定引導
│   ├── lib/
│   │   ├── db.ts              # SQLite CRUD 操作
│   │   └── gemini.ts          # Gemini AI 自然語言解析
│   └── types/
│       └── index.ts           # TypeScript 型別定義
├── vite.config.ts             # Vite 設定 + Dev Server Middleware（DB 讀寫、API Key 加解密）
└── .env                       # 環境變數（可在此設定 VITE_GEMINI_API_KEY）
```

---

## 🔑 API Key 設定

有兩種方式設定 Gemini API Key：

**方式一（推薦）**：在 App 內設定介面設定，Key 會加密存至 `database/api.key`，重啟後自動載入。

**方式二**：在 `02-web/.env` 中設定：

```env
VITE_GEMINI_API_KEY=你的金鑰
```

> 未設定 API Key 時，AI 輸入會使用關鍵字模式進行模擬解析。

---

## 💾 資料持久化

資料透過自訂的 Vite Dev Server Middleware 進行本地讀寫：

- `GET /api/db/load` — 讀取 SQLite 資料庫
- `POST /api/db/save` — 儲存 SQLite 資料庫
- `GET /api/key/load` — 讀取並解密 API Key
- `POST /api/key/save` — 加密並儲存 API Key
- `POST /api/key/delete` — 刪除 API Key 檔案

> ⚠️ 此機制僅適用於本地開發環境。正式部署需要改用 IndexedDB 或後端服務。
