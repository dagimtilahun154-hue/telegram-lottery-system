import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kbtrohguymjxnzizkimq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtidHJvaGd1eW1qeG56aXpraW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMTMzMzQsImV4cCI6MjA1Njc4OTMzNH0.placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function registerUser({
  telegramId,
  firstName,
  lastName,
  username,
  phoneNumber,
  languageCode = 'am',
}: {
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  phoneNumber: string;
  languageCode?: string;
}) {
  const { data, error } = await supabase
    .from('users')
    .upsert({
      telegram_id: telegramId,
      first_name: firstName,
      last_name: lastName || '',
      username: username || '',
      phone_number: phoneNumber,
      language_code: languageCode,
    }, { onConflict: 'telegram_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}
