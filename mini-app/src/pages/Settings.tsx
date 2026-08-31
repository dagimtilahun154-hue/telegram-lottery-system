import { Settings as SettingsIcon, Globe, User, Phone, Check, LogOut } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { supabase } from '../services/supabase';
import type { UserProfile } from '../utils/constants';

interface SettingsProps {
  user: UserProfile;
  onLanguageChange: (lang: string) => void;
}

const languages = [
  { code: 'am', name: 'አማርኛ (Amharic)' },
  { code: 'en', name: 'English' },
  { code: 'om', name: 'Afaan Oromoo' },
];

export function Settings({ user, onLanguageChange }: SettingsProps) {
  const { close } = useTelegram();

  const handleLanguageChange = async (langCode: string) => {
    await supabase
      .from('users')
      .update({ language_code: langCode })
      .eq('telegram_id', user.telegram_id);

    onLanguageChange(langCode);
  };

  return (
    <div className="page">
      <div style={{ marginBottom: 16 }}>
        <h2>Settings</h2>
        <p>Preferences and account information.</p>
      </div>

      <div className="settings-group">
        <div className="settings-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Globe size={14} /> Language / ቋንቋ
        </div>
        {languages.map((lang) => (
          <button
            key={lang.code}
            className={`settings-option ${user.language_code === lang.code ? 'selected' : ''}`}
            onClick={() => handleLanguageChange(lang.code)}
          >
            <span>{lang.name}</span>
            {user.language_code === lang.code && <Check size={16} color="var(--primary-accent)" />}
          </button>
        ))}
      </div>

      <div className="settings-group">
        <div className="settings-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <User size={14} /> Account Profile
        </div>
        <div className="settings-option" style={{ cursor: 'default' }}>
          <span style={{ color: 'var(--text-muted)' }}>Name</span>
          <span>
            {user.first_name} {user.last_name || ''}
          </span>
        </div>
        <div className="settings-option" style={{ cursor: 'default' }}>
          <span style={{ color: 'var(--text-muted)' }}>Phone</span>
          <span>{user.phone_number}</span>
        </div>
      </div>

      <button
        className="btn btn-outline btn-block"
        style={{ marginTop: 24 }}
        onClick={close}
      >
        <LogOut size={16} /> Exit App
      </button>
    </div>
  );
}
