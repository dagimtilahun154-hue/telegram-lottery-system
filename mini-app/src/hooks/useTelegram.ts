import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';

export function useTelegram() {
  const [telegramId, setTelegramId] = useState<number | null>(null);
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      WebApp.ready();
      WebApp.expand();

      const user = WebApp.initDataUnsafe?.user;
      if (user && user.id) {
        setTelegramId(user.id);
        setFirstName(user.first_name || '');
        setLastName(user.last_name || '');
        setUsername(user.username || '');
      } else {
        // Direct browser access fallback
        setTelegramId(12345678);
        setFirstName('Guest');
      }
    } catch (err) {
      console.warn('TWA SDK running outside Telegram:', err);
      setTelegramId(12345678);
      setFirstName('Guest');
    } finally {
      setIsReady(true);
    }
  }, []);

  const hapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    try {
      WebApp.HapticFeedback.impactOccurred(type);
    } catch {
      // Silently fail outside Telegram
    }
  };

  const showAlert = (message: string) => {
    try {
      WebApp.showAlert(message);
    } catch {
      alert(message);
    }
  };

  const close = () => {
    try {
      WebApp.close();
    } catch {
      // Silently fail outside Telegram
    }
  };

  return {
    telegramId,
    firstName,
    lastName,
    username,
    isReady,
    hapticFeedback,
    showAlert,
    close,
  };
}
