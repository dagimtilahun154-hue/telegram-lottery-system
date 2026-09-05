---
title: Ethiopian Telegram Lottery Bot
emoji: 🎟️
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
---

# 🎟️ Ethiopian Telegram Lottery Bot Engine

Autonomous Telegram Lottery System built with **Telegraf**, **Supabase (PostgreSQL RPC)**, and Ethiopian Payment Verification (Commercial Bank of Ethiopia & Telebirr).

Designed for deployment on **Hugging Face Spaces** using the **Docker SDK**.

---

## 🚀 Quick Deployment to Hugging Face Spaces

### Step 1: Create Space on Hugging Face
1. Go to [Hugging Face Spaces](https://huggingface.co/spaces) and click **"Create new Space"**.
2. Give your space a name (e.g. `telegram-lottery-bot`).
3. Select **License**: `MIT` or `Apache 2.0`.
4. Select **Space SDK**: **Docker** (Blank).
5. Choose **Public** or **Private** (Free 2 vCPU / 16GB RAM tier is fully sufficient).
6. Click **"Create Space"**.

### Step 2: Push Bot Code to Your Hugging Face Space
Clone your newly created Space repository and push this `bot` directory:
```bash
git clone https://huggingface.co/spaces/YOUR_USERNAME/telegram-lottery-bot
cd telegram-lottery-bot

# Copy all files from the lottery/bot directory into this repo
# (Dockerfile, package.json, src/, tsconfig.json, README.md)

git add .
git commit -m "Deploy telegram lottery bot with direct payment verification"
git push
```

### Step 3: Configure Environment Secrets in Hugging Face
In your Space dashboard:
1. Click **"Settings"** tab.
2. Scroll to **"Variables and secrets"** -> Click **"New secret"**.
3. Add the following secrets:

| Secret Name | Value | Description |
| :--- | :--- | :--- |
| `BOT_TOKEN` | `123456:ABC...` | Telegram Bot Token from [@BotFather](https://t.me/BotFather) |
| `SUPABASE_URL` | `https://xxxx.supabase.co` | Your Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | Supabase Service Role Key (bypasses RLS for bot backend) |
| `TELEBIRR_PROXY` | `http://user:pass@ip:port` | *(Optional)* Ethiopian proxy for Telebirr verifications abroad |
| `VERITAS_API_KEY` | `sk_live_...` | *(Optional)* Veritas API Key if using Veritas cloud OCR |

> [!NOTE]
> Hugging Face Spaces will automatically build the Docker container and start the HTTP healthcheck server on port `7860`. The Space will display `Running`.

---

## ⚡ Payment Verification Architecture

1. **CBE Direct Verification (Commercial Bank of Ethiopia):**
   - Automatically parses `FT...` references against the official CBE banking portal (`apps.cbe.com.et:100`).
   - Works globally without Ethiopian IP blocking!
   - Does not consume third-party API quotas.

2. **Telebirr Verification:**
   - If `TELEBIRR_PROXY` is configured, routes requests through an Ethiopian IP proxy.
   - If running abroad without proxy or if verification requires inspection, transactions are automatically forwarded to the **Admin Verification Queue** on the Dashboard for instant 1-click approval.

3. **Veritas API (Optional):**
   - If a Veritas API key is provided and within quota, the bot can use image OCR.
   - If the free tier limit (100/mo) is reached, the bot automatically fails over to direct verification and Admin Queue with zero downtime.

---

## 🛠️ Local Development & Testing

```bash
cd bot
npm install
npm run build
npm start
```
