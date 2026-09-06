import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://bottnxyxyvecvdladcoe.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvdHRueHl4eXZlY3ZkbGFkY29lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODU1MDE4NiwiZXhwIjoyMTA0MTI2MTg2fQ.SDwCwscGwBRYXZVz7f9iKmnW7i9z-ruWySYJZRhHJaU',
  VERITAS_API_KEY: process.env.VERITAS_API_KEY || '',
  VERITAS_API_KEYS: process.env.VERITAS_API_KEYS || '',
  VERITAS_API_URL: process.env.VERITAS_API_URL || 'https://verifyapi.leulzenebe.pro',
  PORT: parseInt(process.env.PORT || '7860', 10),
  NODE_ENV: process.env.NODE_ENV || 'production',
  RENDER_EXTERNAL_URL: process.env.RENDER_EXTERNAL_URL || 'https://richo-ekub-bot.onrender.com'
};


