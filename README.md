# 🎟️ Richo Ekup — Ethiopian Telegram Lottery & Ekup System

A high-performance Ethiopian Lottery & Ekup Management platform engineered with **Telegraf (TypeScript)**, **React Admin Portal (Vercel)**, **Supabase PostgreSQL**, **CBE Direct Verification**, and an **8-Key Telebirr Veritas Multi-Key Pool**.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/dagimtilahun154-hue/telegram-lottery-system)

---

## 🚀 Live Deployments & URLs

| Component | Status | Production URL |
| :--- | :---: | :--- |
| **Admin Portal** | 🟢 **LIVE** | [https://admin-wine-two.vercel.app](https://admin-wine-two.vercel.app) (Login: `Richo@123` / `123`) |
| **Telegram Bot Engine** | 🟡 **Ready to Launch** | Deploy via Render (1-click Blueprint below) |
| **GitHub Repository** | 🟢 **Synced** | [dagimtilahun154-hue/telegram-lottery-system](https://github.com/dagimtilahun154-hue/telegram-lottery-system) |
| **Supabase DB** | 🟢 **Active** | `https://bottnxyxyvecvdladcoe.supabase.co` |

---

## ⚡ 1-Click Deploy to Render

Click the button above or visit:
👉 **[https://render.com/deploy?repo=https://github.com/dagimtilahun154-hue/telegram-lottery-system](https://render.com/deploy?repo=https://github.com/dagimtilahun154-hue/telegram-lottery-system)**

Render will automatically detect `render.yaml` and configure the **Free Web Service**:
- **Service Name**: `richo-ekub-bot`
- **Root Directory**: `bot`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Health Check Path**: `/health`

### Environment Variables on Render

When prompted by Render or under the Environment tab:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Web service port | `10000` |
| `BOT_TOKEN` | Telegram Bot API Token | `8761418312:AAFx...` |
| `SUPABASE_URL` | Supabase Project URL | `https://bottnxyxyvecvdladcoe.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | *(From project settings)* |
| `VERITAS_API_URL` | Veritas API Endpoint | `https://verifyapi.leulzenebe.pro` |
| `VERITAS_API_KEY` | Primary Veritas Key | *(From your Veritas keys)* |
| `VERITAS_API_KEYS` | Telebirr Veritas Multi-Key Pool | *(Comma-separated keys)* |

---

## 🛠️ Architecture Highlights

1. **Typing Simulation & Trilingual UI**:
   - Bot triggers immediate `sendChatAction('typing')` before every message.
   - Interactive language picker on `/start` supporting **Amharic (አማርኛ)**, **Afaan Oromoo**, and **English**.
   - Zero unhandled messages — users are never left on seen.

2. **Zero-Cost Direct CBE Verification**:
   - Handles standard FT receipts via `https://apps.cbe.com.et:100/?id=FT...`.
   - Handles new CBE Mobile Banking receipts via `https://mbreciept.cbe.com.et/{SHORT_ID}` (`GET https://Mb.cbe.com.et/api/v1/transactions/public/transaction-detail/{SHORT_ID}`).
   - Uses zero Veritas quota for CBE transactions.

3. **8-Key Telebirr Veritas Quota Pool**:
   - Automated round-robin & quota failover across 8 active live keys (`800+ verifications/month`).
   - Rate limit cooldown management and key health checks.

4. **In-Memory OCR Ref Extraction**:
   - Automatically scans uploaded payment screenshots with Tesseract.js.
   - Extracts reference numbers without ever writing user image files to disk.
