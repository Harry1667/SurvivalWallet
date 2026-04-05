import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function localDbPlugin() {
  // Simple XOR encryption with a fixed local passphrase for file-level obfuscation
  const PASSPHRASE = 'SurvivalWallet_LocalKey_2024';
  const xorEncrypt = (text: string): string => {
    const bytes = Buffer.from(text, 'utf8');
    const key = Buffer.from(PASSPHRASE, 'utf8');
    const result = Buffer.alloc(bytes.length);
    for (let i = 0; i < bytes.length; i++) result[i] = bytes[i] ^ key[i % key.length];
    return result.toString('base64');
  };
  const xorDecrypt = (encoded: string): string => {
    const bytes = Buffer.from(encoded, 'base64');
    const key = Buffer.from(PASSPHRASE, 'utf8');
    const result = Buffer.alloc(bytes.length);
    for (let i = 0; i < bytes.length; i++) result[i] = bytes[i] ^ key[i % key.length];
    return result.toString('utf8');
  };

  return {
    name: 'local-db-plugin',
    configureServer(server: any) {
      // ── SQLite DB endpoints ──────────────────────────────────────
      server.middlewares.use('/api/db/save', (req: any, res: any) => {
        let body: any[] = [];
        req.on('data', (chunk: any) => body.push(chunk));
        req.on('end', () => {
          const buffer = Buffer.concat(body);
          const dbPath = path.resolve(__dirname, 'database/survival_wallet.sqlite');
          fs.writeFileSync(dbPath, buffer);
          res.statusCode = 200;
          res.end('saved');
        });
      });
      server.middlewares.use('/api/db/load', (req: any, res: any) => {
        const dbPath = path.resolve(__dirname, 'database/survival_wallet.sqlite');
        if (fs.existsSync(dbPath)) {
          const buffer = fs.readFileSync(dbPath);
          res.setHeader('Content-Type', 'application/octet-stream');
          res.end(buffer);
        } else {
          res.statusCode = 404;
          res.end('Not found');
        }
      });

      // ── API Key endpoints ────────────────────────────────────────
      server.middlewares.use('/api/key/save', (req: any, res: any) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        let body = '';
        req.setEncoding('utf8');
        req.on('data', (chunk: string) => body += chunk);
        req.on('end', () => {
          try {
            const { key } = JSON.parse(body);
            const encrypted = xorEncrypt(key || '');
            const keyPath = path.resolve(__dirname, 'database/api.key');
            fs.writeFileSync(keyPath, encrypted, 'utf8');
            console.log('🔑 API Key 已加密儲存至 database/api.key');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
          } catch (e) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: String(e) }));
          }
        });
      });
      server.middlewares.use('/api/key/load', (req: any, res: any) => {
        const keyPath = path.resolve(__dirname, 'database/api.key');
        res.setHeader('Content-Type', 'application/json');
        if (fs.existsSync(keyPath)) {
          try {
            const encrypted = fs.readFileSync(keyPath, 'utf8');
            const key = xorDecrypt(encrypted);
            res.end(JSON.stringify({ ok: true, key }));
          } catch (e) {
            res.end(JSON.stringify({ ok: false, key: '' }));
          }
        } else {
          res.end(JSON.stringify({ ok: true, key: '' }));
        }
      });
      server.middlewares.use('/api/key/delete', (req: any, res: any) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        const keyPath = path.resolve(__dirname, 'database/api.key');
        if (fs.existsSync(keyPath)) fs.unlinkSync(keyPath);
        console.log('🗑️ API Key 已刪除');
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true }));
      });
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), localDbPlugin()],
})
