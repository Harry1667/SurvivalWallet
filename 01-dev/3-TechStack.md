# 技術棧 (Tech Stack)

---

## 🏗️ 核心框架 (Core Framework)
* **React.js 18 (Vite)**：作為 Web App 的基礎，提供極速的開發與建置體驗。
* **TypeScript**：強化代碼型別檢索，避免資料模型 (Transaction/Settings) 在計算時的型別錯誤。

---

## 🎨 使用者介面 (UI & UX)
* **Tailwind CSS v4**：
  * 使用新一代 CSS 變數主題映射（Modern CSS Themeing）。
  * 結合 `color-mix` 實作半透明毛玻璃質感。
  * `safelist` 與 `theme` 設定用於壓力背景色切換。
* **Framer Motion (motion/react)**：
  * 實作 Spring 物理動畫效果（Modal 彈出、分頁切換）。
  * 手指觸碰 (Tap) 的規模回饋特效 (`whileTap={{ scale: 0.95 }}`)。
* **Lucide React**：
  * 精選 24px/20px 生活化圖示，提升視覺易讀性。
* **clsx & tailwind-merge**：
  * 精確組合工具類類名，解決 Tailwind 類優先級衝突。

---

## 💾 資料管理與資料庫 (Data & Storage)
* **sql.js (WebAssembly)**：
  * 將 SQLite 資料庫完整運行於瀏覽器端，支援 SQL 語法查詢。
* **Local-First 同步架構**：
  * **前端讀寫**：透過 `db.ts` 抽象層進行 CRUD 操作。
  * **磁碟備份**：利用 Vite Dev Server 的 POST API (/api/db/save) 將 `Uint8Array` 資料塊序列化存回本地 `/database` 資料夾。
* **LocalStorage**：
  * 用於存儲輕量、非關鍵的 UI 狀態（如：主題切換模式 `dark`）。

---

## 📱 行動端增強 (Mobile & PWA)
* **PWA Meta Tags**：
  * `apple-mobile-web-app-capable`：開啟 iOS 全螢幕 Standalone 模式。
  * `viewport-fit=cover`：適配 iOS 瀏海屏 (Notch) 環境。
* **Safe Area 適配**：
  * 自定義 `pt-safe`、`pb-safe` 工具類，解決底部導航欄與 iOS 橫條的衝突。
* **互動優化**：
  * 禁用 iOS 預設長按反白、雙擊縮放（防止 Input 聚焦時介面抖動）。
  * 強制 Input 字體為 16px 以上，防止 iOS 自動 Zoom-in。

---

## 🛠️ 開發與建置工具 (Dev Tools)
* **ESLint**：嚴格檢查未使用變數與 型別衝突。
* **Node.js (FileSystem API)**：後端負責 `fs.writeFileSync` 持久化 SQLite 檔案。
