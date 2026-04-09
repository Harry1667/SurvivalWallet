這是一份為 AI Agent 定製的 **「全鏈路基礎設施架構圖 (April 2026)」**。

它整合了你的 **Cloudflare DNS 層**、**Nginx 代理層** 與 **後端服務層**。你可以將這段 Markdown 內容存入任何 AI 的知識庫，它看完後就能精準判斷該如何幫你建置新網站，而不會搞混 Port 或路徑。

---

# 🌐 looptw.com 全鏈路基礎設施架構 (AI Memory Module)

## 1. 外部流量層 (Edge & DNS)
- **服務商**: Cloudflare
- **解析模式**: **DNS Only (灰色小雲朵)**
  - *注意：目前 SSL 由伺服器端的 aaPanel Nginx (Let's Encrypt) 處理，非 Cloudflare Proxy。*
- **主域名**: `looptw.com` (IP: `137.131.7.230`)
- **子域名清單**:
  - `mentora.looptw.com` -> 伺服器入口
  - `mathbox.looptw.com` -> 伺服器入口
  - `survivalwallet.looptw.com` -> 伺服器入口
  - `zhijian.looptw.com` -> 伺服器入口

## 2. 伺服器核心規格 (Origin Server)
- **環境**: Ubuntu 24.04 (ARM64) @ Oracle Cloud
- **面板**: aaPanel 8.0.1
- **入口**: Nginx 1.24.0 (Gatekeeper)
- **後端管理**: PM2 (Node.js) / PHP-FPM (PHP)

## 3. 專案路由與門牌號碼 (Internal Routing Map)


| 域名 (Domain) | 內部路徑 (Root Path) | 類型 | 內部 Port | 進程名稱 (PM2) |
| :--- | :--- | :--- | :--- | :--- |
| `mentora.looptw.com` | `/www/wwwroot/mentora.looptw.com/02-web` | Next.js | **3000** | `mentora-web` |
| `mathbox.looptw.com` | `/www/wwwroot/mathbox.looptw.com/02-web` | Node ESM | **3001** | `mathbox-web` |
| `wallet.looptw.com` | `/www/wwwroot/survivalwallet` | PHP/SPA | **N/A** | N/A (PHP-FPM) |

## 4. AI 部署自動化指令集 (Agent Deployment SOP)

### A. 若要新增 Node.js 專案
1. **Port 分配**: 必須檢查現有 Port，下一個預設為 **3002**。
2. **PM2 啟動**: `PORT=[PORT] pm2 start server.mjs --name [name]`。
3. **Nginx 轉發設定**:
   ```nginx
   location / {
       proxy_pass http://127.0.0.1:[PORT];
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       proxy_set_header Host $host;
   }
   ```

### B. 若要新增 SPA/PHP 專案
1. **Nginx 路由**: 必須加入 `try_files $uri $uri/ /index.html;` (解決 React/Vue Router 重新整理 404)。
2. **權限設定**: `chown -R www:www [path]`。

## 5. 已知環境限制 (Critical Constraints)
- **隱藏檔清理**: 部署前必須清除 Mac 生成的二進位垃圾檔：`find . -name "._*" -delete`。
- **SSL 協議**: 全站強制 HTTPS，由 aaPanel SSL 模組管理。
- **API 驗證**: SurvivalWallet 系列專案需檢查 `VITE_SYNC_TOKEN` 與 `api.php` 的對齊。
- **ARM 相容性**: 機器為 ARM 結構，部分需編譯的 C++ Addons 需確保有 ARM 版本。

---

**Last Synced**: 2026-04-09
**Status**: 穩定運行中 (Mentora, MathBox, SurvivalWallet)

---

### 💡 如何使用這個檔案？
下次你開啟一個新的 AI 對話時，直接把這段貼給它並說：
> 「這是我目前的伺服器與 Cloudflare 架構記憶檔，請根據這個結構幫我規劃新專案 [專案名稱] 的部署步驟。」

這樣它就不會再問你 IP 是多少、或是該用哪個 Port 這種基礎問題了！對於今天這一連串的部署大作戰，你覺得這個「記憶模組」夠完整嗎？