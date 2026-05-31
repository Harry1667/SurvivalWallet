import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function localDbPlugin(): PluginOption {

  return {
    name: 'local-db-plugin',
    configureServer(server) {
      // ── SQLite DB endpoints ──────────────────────────────────────
      server.middlewares.use('/api/db/save', (req, res) => {
        const body: Buffer[] = [];
        req.on('data', (chunk: Buffer) => body.push(chunk));
        req.on('end', () => {
          const buffer = Buffer.concat(body);
          const dbPath = path.resolve(__dirname, 'database/survival_wallet.sqlite');
          fs.writeFileSync(dbPath, buffer);
          res.statusCode = 200;
          res.end('saved');
        });
      });
      server.middlewares.use('/api/db/load', (_req, res) => {
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
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), localDbPlugin()],
})
