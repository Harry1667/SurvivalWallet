# SurvivalWallet（生存記帳）

遊戲化記帳 PWA — 每日 HP 預算制，超支自動平攤未來，結餘存入撲滿，讓存錢變成闖關遊戲。

## 功能
- **今日 HP**：大字顯示今日剩餘預算，顏色隨壓力變化（綠 / 橘 / 紅）
- **快速記帳**：懸浮按鈕 → Bottom Sheet，3 秒完成輸入
- **撲滿系統**：每日結餘自動存入，圓環進度條追蹤存款目標
- **奢侈稅**：特定分類自動加徵 20% 虛擬稅，稅金存入撲滿
- **突發避險**：緊急消費不扣當日額度，直接重算月預算
- **5 分頁**：主頁 / 撲滿 / 詳細 / 帳單 / 報表（圓餅圖）

## 技術棧
- React + TypeScript + Vite
- Tailwind CSS v4 + Framer Motion
- sql.js（瀏覽器端 SQLite，Local-First）
- PWA（Standalone 模式，iOS Safe Area 適配）

## 快速開始
```bash
cd 02-web
npm install
npm run dev
```
